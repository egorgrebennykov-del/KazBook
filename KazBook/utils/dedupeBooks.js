export default async function dedupeBooks(books, query) {
  if (books.length < 2) return books;

  try {
    const response = await fetch("/api/dedupe-books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ books, query }),
    });

    if (!response.ok)
      throw new Error(`Comparison API returned ${response.status}`);
    const result = await response.json();
    return Array.isArray(result.books) ? result.books : books;
  } catch (error) {
    console.error("Could not compare book covers:", error.message);
    return books;
  }
}
