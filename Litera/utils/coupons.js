const TABLE_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/coupons`;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

export async function getAllCoupons() {
  try {
    const response = await fetch(`${TABLE_URL}?select=*&order=created_at.desc`, {
      headers,
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("Error fetching coupons:", err);
    return [];
  }
}

export async function createCoupon({ code, name, starts_at, ends_at, action }) {
  const response = await fetch(TABLE_URL, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      code: code.trim().toUpperCase(),
      name: name ? name.trim() : "",
      starts_at: starts_at || new Date().toISOString(),
      ends_at: ends_at || null,
      action: action || { type: "discount", percent: 10 },
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.message || "Failed to create coupon");
  }
  return (await response.json())[0];
}

export async function deleteCoupon(couponId) {
  const response = await fetch(`${TABLE_URL}?id=eq.${encodeURIComponent(couponId)}`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok) {
    throw new Error("Failed to delete coupon");
  }
  return true;
}
