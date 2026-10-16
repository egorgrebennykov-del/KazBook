const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  "https://qgxiisgzwcsevzyaoxvl.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Курс EUR/KZT из таблицы exchange_rate; null, если получить не удалось
export default async function getExchangeRate() {
  if (!SUPABASE_KEY) {
    console.warn("VITE_SUPABASE_ANON_KEY не задан в .env — курс не загружен");
    return null;
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/exchange_rate?select=rate&base_currency=eq.EUR&quote_currency=eq.KZT&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    },
  );
  if (!response.ok) {
    console.warn("Курс не загружен:", response.status, await response.text());
    return null;
  }

  const rate = Number((await response.json())[0]?.rate);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}
