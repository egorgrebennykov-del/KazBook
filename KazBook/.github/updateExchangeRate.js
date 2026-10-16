import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
);

const RATE_URL = "https://nationalbank.kz/rss/rates_all.xml";

async function updateExchangeRate() {
  try {
    // Fetch the latest exchange rates
    const response = await fetch(RATE_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch XML: ${response.status}`);
    }

    const xml = await response.text();

    // Parse the XML response
    const parser = new XMLParser({
      ignoreAttributes: false,
      isArray: (name) => name === "item",
    });

    const data = parser.parse(xml);
    const items = data?.rss?.channel?.item;

    if (!Array.isArray(items)) {
      throw new Error("Could not find exchange rates in XML");
    }

    // Find the EUR exchange rate
    const euro = items.find((item) => String(item.title).trim() === "EUR");

    if (!euro) {
      throw new Error("EUR exchange rate not found in XML");
    }

    const description = Number(euro.description);
    const quantity = Number(euro.quant);
    const rate = description / quantity;

    if (
      !Number.isFinite(rate) ||
      rate <= 0 ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      throw new Error("Invalid EUR/KZT exchange rate");
    }

    // Convert the date from DD.MM.YYYY to YYYY-MM-DD
    const [day, month, year] = String(euro.pubDate).split(".");
    const rateDate = `${year}-${month}-${day}`;

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(rateDate) ||
      Number.isNaN(Date.parse(`${rateDate}T00:00:00Z`))
    ) {
      throw new Error("Invalid exchange rate date");
    }

    // Update the exchange rate in Supabase
    const { error } = await supabase.from("exchange_rate").upsert(
      {
        base_currency: "EUR",
        quote_currency: "KZT",
        rate,
        rate_date: rateDate,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "base_currency,quote_currency",
      },
    );

    if (error) {
      throw error;
    }

    console.log("EUR/KZT exchange rate updated successfully:", {
      rate,
      rateDate,
    });
  } catch (error) {
    console.error("Failed to update exchange rate:", error.message);
    process.exitCode = 1;
  }
}

updateExchangeRate();
