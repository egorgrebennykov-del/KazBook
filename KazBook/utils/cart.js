import { getCookieUser } from "./auth";

const TABLE_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/cart`;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

function requireUserId(userId) {
  const id = userId ?? getCookieUser()?.id;
  if (!id) throw new Error("Sign in to use your cart");
  return id;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message ?? body?.hint ?? "Could not access the cart");
  }
  return body;
}

export async function getCart(userId = getCookieUser()?.id) {
  const id = requireUserId(userId);
  const params = new URLSearchParams({
    select: "id,link,price,user_id,image,title,shop,quantity",
    user_id: `eq.${id}`,
    order: "id.desc",
  });
  return (await request(`${TABLE_URL}?${params}`)) ?? [];
}

export async function getCartItem(url, userId = getCookieUser()?.id) {
  const id = requireUserId(userId);
  const params = new URLSearchParams({
    select: "id",
    user_id: `eq.${id}`,
    link: `eq.${url}`,
    limit: "1",
  });
  const rows = await request(`${TABLE_URL}?${params}`);
  return rows?.[0] ?? null;
}

export async function hasCartItem(url, userId = getCookieUser()?.id) {
  return Boolean(await getCartItem(url, userId));
}

export async function addToCart(book, userId = getCookieUser()?.id) {
  const id = requireUserId(userId);
  const params = new URLSearchParams({
    select: "id,link,price,user_id,image,title,shop,quantity",
    user_id: `eq.${id}`,
    link: `eq.${book.url}`,
    limit: "1",
  });
  const existing = await request(`${TABLE_URL}?${params}`);
  if (existing?.length) return existing[0];

  const inserted = await request(TABLE_URL, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      link: book.url,
      price: book.price,
      user_id: id,
      image: book.image,
      title: book.title,
      shop: book.store,
      quantity: Math.max(1, Math.floor(Number(book.quantity) || 1)),
    }),
  });
  return inserted?.[0] ?? null;
}

export async function updateCartQuantity(
  cartItemId,
  quantity,
  userId = getCookieUser()?.id,
) {
  const id = requireUserId(userId);
  const nextQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  const params = new URLSearchParams({
    id: `eq.${cartItemId}`,
    user_id: `eq.${id}`,
  });
  await request(`${TABLE_URL}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity: nextQuantity }),
  });
  return nextQuantity;
}

export async function removeFromCart(cartItemId, userId = getCookieUser()?.id) {
  const id = requireUserId(userId);
  const params = new URLSearchParams({
    id: `eq.${cartItemId}`,
    user_id: `eq.${id}`,
  });
  await request(`${TABLE_URL}?${params}`, { method: "DELETE" });
}
