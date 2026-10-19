const TABLE_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/books_on_home_page`;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default async function getHomepageBooks() {
  const response = await fetch(`${TABLE_URL}?select=books&limit=1`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? "Could not load featured books");
  }

  const rows = await response.json();
  const books = rows[0]?.books;
  return Array.isArray(books) ? books : [];
}
