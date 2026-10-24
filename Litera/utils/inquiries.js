import { getAllUsers, resolveUserRoles, isPrivileged } from "./auth.js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const TABLE_URL = `${SUPABASE_URL}/rest/v1/inquiries`;
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

/**
 * Fetch all available admins for load balancing.
 * Finds all users with the 'admin' role. If none have 'admin', falls back to any privileged user.
 */
export async function getCandidateAdmins() {
  const allUsers = await getAllUsers();
  const admins = allUsers.filter((u) => resolveUserRoles(u).includes("admin"));

  if (admins.length > 0) {
    return admins;
  }

  // Fallback to any privileged user if no explicit admin role exists yet
  const privileged = allUsers.filter((u) => isPrivileged(u));
  if (privileged.length > 0) {
    return privileged;
  }

  // Fallback placeholder if no users exist
  return [
    {
      id: "litera_admin_default",
      firstName: "Администратор",
      lastName: "Litera",
      email: "support@litera.md",
    },
  ];
}

/**
 * Assigns an admin to an inquiry using load-balancing (least inquiries assigned).
 */
export async function assignAdminForNewInquiry() {
  const admins = await getCandidateAdmins();
  if (admins.length === 1) {
    return admins[0];
  }

  // Query all inquiries to count distribution
  try {
    const res = await fetch(`${TABLE_URL}?select=interlocutors_info`, { headers });
    if (res.ok) {
      const list = await res.json();
      const counts = {};
      admins.forEach((a) => {
        counts[a.id] = 0;
      });

      if (Array.isArray(list)) {
        list.forEach((inq) => {
          const aid = inq.interlocutors_info?.adminId;
          if (aid && counts[aid] !== undefined) {
            counts[aid] += 1;
          }
        });
      }

      // Pick admin with lowest count
      let selectedAdmin = admins[0];
      let minCount = counts[selectedAdmin.id] ?? 0;

      for (const admin of admins) {
        const count = counts[admin.id] ?? 0;
        if (count < minCount) {
          minCount = count;
          selectedAdmin = admin;
        }
      }

      return selectedAdmin;
    }
  } catch (err) {
    console.warn("Error calculating admin load balance:", err);
  }

  return admins[0];
}

/**
 * Fetch a single inquiry by its ID.
 */
export async function fetchInquiryById(inquiryId) {
  if (!inquiryId) return null;
  const res = await fetch(
    `${TABLE_URL}?id=eq.${encodeURIComponent(inquiryId)}&limit=1`,
    { headers }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0] || null;
}

/**
 * Fetch existing inquiry for a registered user or a guest email.
 */
export async function fetchUserInquiry({ userId = null, userEmail = null }) {
  try {
    let url = `${TABLE_URL}?select=*&order=created_at.desc`;
    if (userId) {
      url += `&interlocutors_info->>userId=eq.${encodeURIComponent(userId)}`;
    } else if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      url += `&interlocutors_info->>userEmail=eq.${encodeURIComponent(cleanEmail)}`;
    } else {
      return null;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const list = await res.json();
    return list?.[0] || null;
  } catch (err) {
    console.warn("Error fetching user inquiry:", err);
    return null;
  }
}

/**
 * Get or create an inquiry for the user / guest.
 */
export async function getOrCreateInquiry({ user = null, guestEmail = null, guestName = "Гость" }) {
  const userId = user?.id || null;
  const userEmail = (user?.email || guestEmail || "").trim().toLowerCase();
  const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : guestName;
  const isGuest = !user;

  if (!userEmail) {
    throw new Error("Email is required to start a chat with admin");
  }

  // Check if inquiry already exists
  const existing = await fetchUserInquiry({ userId, userEmail });
  if (existing) {
    return existing;
  }

  // Load-balance and pick an admin
  const assignedAdmin = await assignAdminForNewInquiry();
  const adminName = `${assignedAdmin.firstName || ""} ${assignedAdmin.lastName || ""}`.trim() || assignedAdmin.email || "Администратор";

  const newInquiryPayload = {
    interlocutors_info: {
      userId,
      userEmail,
      userName,
      isGuest,
      adminId: assignedAdmin.id,
      adminName,
      adminEmail: assignedAdmin.email,
    },
    chat: [],
    notifications_admin: 0,
    notifications_user: 0,
  };

  const createRes = await fetch(TABLE_URL, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(newInquiryPayload),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => null);
    throw new Error(err?.message || "Failed to create inquiry");
  }

  const created = await createRes.json();
  return created?.[0] || null;
}

/**
 * Send a message within an inquiry.
 * If sender === 'admin' and the recipient is a guest, sends an email notification.
 */
export async function sendInquiryMessage({
  inquiryId,
  text,
  sender = "user", // "user" | "admin"
  senderUser = null,
}) {
  if (!inquiryId || !text?.trim()) {
    throw new Error("Inquiry ID and message text are required");
  }

  const cleanText = text.trim();
  const inquiry = await fetchInquiryById(inquiryId);
  if (!inquiry) {
    throw new Error("Inquiry not found");
  }

  const info = inquiry.interlocutors_info || {};
  const isGuest = Boolean(info.isGuest);
  const currentChat = Array.isArray(inquiry.chat) ? inquiry.chat : [];

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const senderName =
    sender === "admin"
      ? senderUser
        ? `${senderUser.firstName || ""} ${senderUser.lastName || ""}`.trim() || senderUser.email
        : info.adminName || "Администратор"
      : senderUser
        ? `${senderUser.firstName || ""} ${senderUser.lastName || ""}`.trim() || senderUser.email
        : info.userName || "Пользователь";

  const newMsg = {
    id: messageId,
    sender,
    senderId: senderUser?.id || null,
    senderName,
    text: cleanText,
    timestamp: new Date().toISOString(),
    deliveredViaEmail: sender === "admin" && isGuest,
  };

  const updatedChat = [...currentChat, newMsg];
  const updatePayload = {
    chat: updatedChat,
  };

  if (sender === "user") {
    updatePayload.notifications_admin = (inquiry.notifications_admin || 0) + 1;
  } else {
    updatePayload.notifications_user = (inquiry.notifications_user || 0) + 1;
  }

  const patchRes = await fetch(
    `${TABLE_URL}?id=eq.${encodeURIComponent(inquiryId)}`,
    {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(updatePayload),
    }
  );

  if (!patchRes.ok) {
    throw new Error("Could not deliver message to inquiry");
  }

  // If sender is admin and user is guest, automatically send an email
  if (sender === "admin" && isGuest && info.userEmail) {
    try {
      await fetch("/api/send-inquiry-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: info.userEmail,
          subject: "Ответ от службы поддержки Litera",
          text: cleanText,
          adminName: senderName,
        }),
      });
    } catch (mailErr) {
      console.warn("Failed to dispatch email to guest:", mailErr);
    }
  }

  const updatedRow = await patchRes.json();
  return updatedRow?.[0] || { ...inquiry, ...updatePayload };
}

/**
 * Mark messages as read by the user (clears notifications_user).
 */
export async function markInquiryReadByUser(inquiryId) {
  if (!inquiryId) return;
  try {
    await fetch(`${TABLE_URL}?id=eq.${encodeURIComponent(inquiryId)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ notifications_user: 0 }),
    });
  } catch (err) {
    console.warn("Error marking inquiry read by user:", err);
  }
}

/**
 * Mark messages as read by the admin (clears notifications_admin).
 */
export async function markInquiryReadByAdmin(inquiryId) {
  if (!inquiryId) return;
  try {
    await fetch(`${TABLE_URL}?id=eq.${encodeURIComponent(inquiryId)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ notifications_admin: 0 }),
    });
  } catch (err) {
    console.warn("Error marking inquiry read by admin:", err);
  }
}

/**
 * Fetch all inquiries for admin panel.
 * Optionally filters by adminId, or returns all if null / superadmin.
 */
export async function fetchAllInquiries(adminId = null) {
  try {
    let url = `${TABLE_URL}?select=*&order=created_at.desc`;
    if (adminId) {
      url += `&interlocutors_info->>adminId=eq.${encodeURIComponent(adminId)}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    return (await res.json()) || [];
  } catch (err) {
    console.warn("Error fetching all inquiries:", err);
    return [];
  }
}
