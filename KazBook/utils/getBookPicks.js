const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://qgxiisgzwcsevzyaoxvl.supabase.co";
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE_URL = `${SUPABASE_URL}/rest/v1/book_picks`;

export default async function getBookPicks() {
  if (!KEY) throw new Error("VITE_SUPABASE_ANON_KEY is not configured");

  const response = await fetch(`${TABLE_URL}?select=books&limit=1`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? "Could not load Book Picks");
  }

  const rows = await response.json();
  const books = rows[0]?.books;
  return Array.isArray(books)
    ? books.filter((book) => book?.title && book?.url && book?.image)
    : [];
}
