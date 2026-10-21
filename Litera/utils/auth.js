import bcrypt from "bcryptjs";

const TABLE_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user`;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const checkEmail = (email) => {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) throw new Error("Enter a valid email");
  return normalized;
};

export const isLoggedIn = () =>
  document.cookie.split("; ").some((c) => c.startsWith("user="));

const setUserCookie = ({ id, firstName }) => {
  const value = encodeURIComponent(JSON.stringify({ id, firstName }));
  document.cookie = `user=${value}; max-age=${7 * 24 * 60 * 60}; path=/; SameSite=Lax`;
};

async function findByEmail(email) {
  const response = await fetch(
    `${TABLE_URL}?select=id,firstName,lastName,email,password_hash&email=eq.${encodeURIComponent(email)}&limit=1`,
    { headers },
  );
  if (!response.ok) throw new Error("Server error, try again later");
  return (await response.json())[0] ?? null;
}

export async function register({ firstName, lastName, email, password }) {
  const normalized = checkEmail(email);
  if (await findByEmail(normalized)) {
    throw new Error("This email is already registered");
  }

  const response = await fetch(TABLE_URL, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalized,
      password_hash: await bcrypt.hash(password, 10),
    }),
  });
  if (
    response.status === 409 ||
    (await response.clone().text()).includes("23505")
  ) {
    throw new Error("This email is already registered");
  }
  if (!response.ok) throw new Error("Could not create the account");

  setUserCookie((await response.json())[0]);
}

export async function login(email, password) {
  const user = await findByEmail(checkEmail(email));
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new Error("Invalid email or password");
  }
  setUserCookie(user);
}

export function getCookieUser() {
  const pair = document.cookie.split("; ").find((c) => c.startsWith("user="));
  if (!pair) return null;
  try {
    return JSON.parse(decodeURIComponent(pair.slice(5)));
  } catch {
    return null;
  }
}

export function logout() {
  document.cookie = "user=; max-age=0; path=/; SameSite=Lax";
}

export async function getProfile() {
  const cookieUser = getCookieUser();
  if (!cookieUser) return null;

  const response = await fetch(
    `${TABLE_URL}?select=id,firstName,lastName,email,adresses&id=eq.${encodeURIComponent(cookieUser.id)}&limit=1`,
    { headers },
  );
  const row = response.ok ? (await response.json())[0] : null;
  return {
    id: cookieUser.id,
    firstName: cookieUser.firstName,
    lastName: "",
    email: "",
    adresses: [],
    ...(row || {}),
  };
}

export async function getUserAddresses(userId) {
  const id = userId ?? getCookieUser()?.id;
  if (!id) return [];
  const response = await fetch(
    `${TABLE_URL}?select=adresses&id=eq.${encodeURIComponent(id)}&limit=1`,
    { headers },
  );
  if (!response.ok) return [];
  const data = await response.json();
  const raw = data?.[0]?.adresses;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return [raw];
  return [];
}

export async function saveUserAddress(userId, newAddress) {
  const id = userId ?? getCookieUser()?.id;
  if (!id) throw new Error("User ID is required");
  const current = await getUserAddresses(id);
  const addressToSave = {
    id:
      newAddress.id ||
      `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...newAddress,
    savedAt: new Date().toISOString(),
  };
  const updated = [...current, addressToSave];
  const response = await fetch(
    `${TABLE_URL}?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ adresses: updated }),
    },
  );
  if (!response.ok) {
    throw new Error("Could not save address to profile");
  }
  return addressToSave;
}

export async function deleteUserAddress(userId, addressId) {
  const id = userId ?? getCookieUser()?.id;
  if (!id) throw new Error("User ID is required");
  const current = await getUserAddresses(id);
  const updated = current.filter((addr) => addr.id !== addressId);
  const response = await fetch(
    `${TABLE_URL}?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ adresses: updated }),
    },
  );
  if (!response.ok) {
    throw new Error("Could not delete address");
  }
  return updated;
}
