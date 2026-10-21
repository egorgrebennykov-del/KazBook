const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://qgxiisgzwcsevzyaoxvl.supabase.co";
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE_URL = `${SUPABASE_URL}/rest/v1/new_books`;

export default async function getNewBooks() {
  const response = await fetch(`${TABLE_URL}?select=books&limit=1`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? "Could not load new books");
  }

  const rows = await response.json();
  const raw = rows[0]?.books;
  if (!raw) return { updatedAt: null, products: [] };
  if (Array.isArray(raw)) return { updatedAt: null, products: raw };
  return {
    updatedAt: raw.updatedAt ?? null,
    products: Array.isArray(raw.products) ? raw.products : [],
  };
}
