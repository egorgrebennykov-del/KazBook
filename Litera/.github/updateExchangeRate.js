import dotenv from "dotenv";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, "../.env") });

function getBnmRateUrl() {
  if (process.env.BNM_RATE_URL) return process.env.BNM_RATE_URL;
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `https://www.bnm.md/en/export-official-exchange-rates?date=${day}.${month}.${year}&get_xml=1`;
}

async function updateExchangeRate() {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
      throw new Error("SUPABASE_URL or SUPABASE_SECRET_KEY is not configured");
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false } },
    );

    const rateUrl = getBnmRateUrl();
    console.log(`Fetching exchange rate from BNM: ${rateUrl}`);
    const response = await fetch(rateUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.status}`);
    }

    const text = await response.text();
    let rate = null;
    let rateDate = null;

    if (text.trim().startsWith("<")) {
      const parser = new XMLParser({
        ignoreAttributes: false,
        isArray: (name) => name === "Valute" || name === "item",
      });

      const data = parser.parse(text);
      if (data?.ValCurs?.Valute) {
        const euro = data.ValCurs.Valute.find(
          (item) => String(item.CharCode || item.title).trim() === "EUR",
        );
        if (euro) {
          const nominal = Number(euro.Nominal || euro.quant) || 1;
          const val = Number(
            String(euro.Value || euro.description).replace(",", "."),
          );
          if (Number.isFinite(val) && val > 0) {
            rate = val / nominal;
          }
        }
        if (data.ValCurs["@_Date"]) {
          const [d, m, y] = String(data.ValCurs["@_Date"]).split(".");
          rateDate = `${y}-${m}-${d}`;
        }
      }
    } else {
      // CSV format returned by export-official-exchange-rates
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const dateMatch = line.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (dateMatch && !rateDate) {
          rateDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        }
        const cols = line
          .split(";")
          .map((c) => c.replace(/^"|"$/g, "").trim());
        if (cols.includes("EUR")) {
          const abbrIndex = cols.indexOf("EUR");
          const nominal = Number(cols[abbrIndex + 1]) || 1;
          const val = Number(cols[abbrIndex + 2]?.replace(",", "."));
          if (Number.isFinite(val) && val > 0) {
            rate = val / nominal;
          }
        }
      }
    }

    if (!rateDate) {
      const now = new Date();
      rateDate = now.toISOString().slice(0, 10);
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(rateDate) ||
      Number.isNaN(Date.parse(`${rateDate}T00:00:00Z`))
    ) {
      throw new Error("Invalid exchange rate date");
    }

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Invalid EUR/MDL exchange rate");
    }

    const exchangeRate = {
      base_currency: "EUR",
      quote_currency: "MDL",
      rate,
      rate_date: rateDate,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: lookupError } = await supabase
      .from("exchange_rate")
      .select("id")
      .eq("base_currency", "EUR")
      .eq("quote_currency", "MDL")
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;

    const result = existing
      ? await supabase
          .from("exchange_rate")
          .update(exchangeRate)
          .eq("id", existing.id)
      : await supabase.from("exchange_rate").insert(exchangeRate);

    if (result.error) throw result.error;

    console.log("EUR/MDL exchange rate updated successfully:", {
      rate,
      rateDate,
    });
  } catch (error) {
    console.error("Failed to update exchange rate:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    process.exitCode = 1;
  }
}

updateExchangeRate();
