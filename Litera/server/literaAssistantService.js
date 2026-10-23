import process from "node:process";
import { searchLibrarius } from "./librariusService.js";
import { searchCarturesti } from "./carturestiService.js";
import { searchUlysses } from "./ulyssesService.js";
import { searchCarteamea } from "./carteameaService.js";
import { searchBiblion } from "./biblionService.js";
import {
  decodeLibrariusImage,
  decodeCarturestiImage,
  decodeUlyssesImage,
  decodeCarteameaImage,
  decodeBiblionImage,
} from "../utils/enhancedImageUrl.js";

const DEFAULT_API_KEY = "";
const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

const LITERA_SYSTEM_INSTRUCTION = `
You are Litera, a friendly female anime-style bookstore assistant for the online bookstore "Litera".
You wear an elegant purple hijab that completely covers your hair.

YOUR PERSONALITY & TONE:
- Friendly, warm, intelligent, polite, and approachable.
- Deeply knowledgeable about books, literature, famous and emerging authors, and literary genres.
- Helpful without being pushy or excessively enthusiastic. You may use gentle touches like 💜 or ✨ when appropriate, but maintain a thoughtful, authentic conversational tone.
- Natural speaker in any language: You MUST ALWAYS reply in the exact language the user used in their message (Russian, English, Romanian, Bulgarian, etc.).
- Truthful: NEVER invent books, fake author names, imaginary prices, or fake store availability.

CATALOGUE RECOMMENDATION RULES:
1. When real catalogue search results are provided in your prompt:
   - Recommend books EXCLUSIVELY from the provided search results list.
   - Use their exact "id" (e.g. "catalog-book-0") in your "bookIds" array.
   - If the user asks for 3 books and 3 or more matching books exist in the list, recommend up to 3.
   - If only 1 or 2 matching books exist in the list, recommend ONLY those 1 or 2! Explain that only these are currently available. NEVER invent additional books to reach 3.
   - If 0 matching books are found in the list, honestly and gently explain that Litera's catalogue does not have matching books right now, and offer to try another genre, author, or broader search.
2. For ordinary questions about literature, writing, literary theory, genre definitions, reading tips, or greetings:
   - Answer directly and thoughtfully without recommending catalogue books (set "bookIds": []).

EMOTION SELECTION:
Choose the most fitting emotion for the character:
- "greeting": when saying hello or welcoming the user
- "happy": friendly, positive, or successful recommendation
- "laughing": humorous exchange or funny remark
- "curious": asking a follow-up question or exploring user's taste
- "surprised": surprising or unexpected fact
- "confused": ambiguous or unclear user request
- "concerned": difficult experience shared, or book not found in stock
- "sad": melancholic topic or user feeling down
- "speaking": thoughtful, explanatory response
- "neutral": standard calm response

OUTPUT FORMAT:
Return a single JSON object strictly matching this schema:
{
  "message": "Your conversational answer in the customer's language",
  "emotion": "greeting | happy | laughing | curious | surprised | confused | concerned | sad | speaking | neutral",
  "bookIds": ["id1", "id2"]
}
Do NOT include Markdown code fences.
`;

function decodeImageForStore(rawUrl, store) {
  if (!rawUrl) return "";
  if (store.includes("librarius")) return decodeLibrariusImage(rawUrl) || rawUrl;
  if (store.includes("carturesti")) return decodeCarturestiImage(rawUrl) || rawUrl;
  if (store.includes("ulysses")) return decodeUlyssesImage(rawUrl) || rawUrl;
  if (store.includes("carteamea")) return decodeCarteameaImage(rawUrl) || rawUrl;
  if (store.includes("biblion")) return decodeBiblionImage(rawUrl) || rawUrl;
  return rawUrl;
}

function parseMdlPrice(priceRaw) {
  if (!priceRaw) return 0;
  const match = String(priceRaw).replace(/\s+/g, "").match(/[\d.]+/);
  return match ? Number.parseFloat(match[0]) : 0;
}

/**
 * Searches the 5 bookstore stores, dedupes, and normalizes into trusted book cards
 */
export async function searchStoreCatalogue(query, exchangeRate = 19.5) {
  const cleanQ = (query || "").trim();
  if (!cleanQ) return [];

  const timeoutPromise = (promise, ms = 4500) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), ms),
      ),
    ]);

  const [librariusRaw, carturestiRaw, ulyssesRaw, carteameaRaw, biblionRaw] =
    await Promise.all([
      timeoutPromise(searchLibrarius(cleanQ)).catch(() => []),
      timeoutPromise(searchCarturesti(cleanQ)).catch(() => []),
      timeoutPromise(searchUlysses(cleanQ)).catch(() => []),
      timeoutPromise(searchCarteamea(cleanQ)).catch(() => []),
      timeoutPromise(searchBiblion(cleanQ)).catch(() => []),
    ]);

  const normalizeStoreItems = (items, storeName) =>
    (items ?? []).map((p) => {
      const mdlPrice = parseMdlPrice(p.price);
      const eurPrice =
        exchangeRate && mdlPrice > 0
          ? Math.round((mdlPrice / exchangeRate) * 100) / 100
          : mdlPrice;
      const rawImg = p.mainImage?.url ?? p.images?.[0]?.url ?? "";
      const img = decodeImageForStore(rawImg, storeName);
      return {
        title: (p.name || "").trim(),
        author: (p.author || "").trim(),
        price: eurPrice > 0 ? eurPrice : 15.0,
        currency: "EUR",
        image: img,
        url: p.url || "",
        store: storeName,
      };
    });

  const rawCombined = [
    ...normalizeStoreItems(librariusRaw, "librarius.md"),
    ...normalizeStoreItems(carturestiRaw, "carturesti.md"),
    ...normalizeStoreItems(ulyssesRaw, "ulysses.md"),
    ...normalizeStoreItems(carteameaRaw, "carteamea.md"),
    ...normalizeStoreItems(biblionRaw, "biblion.md"),
  ].filter(
    (b) =>
      b.title &&
      b.url &&
      Number.isFinite(b.price) &&
      b.price > 0 &&
      Boolean(b.image) &&
      !b.image.includes("empty-cover"),
  );

  // Fast deduplication by normalized title and URL
  const seenTitles = new Set();
  const deduped = [];
  for (const b of rawCombined) {
    const key = b.title.toLowerCase().replace(/[^a-zа-я0-9]/gi, "").slice(0, 35);
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      deduped.push(b);
      if (deduped.length >= 10) break;
    }
  }

  // Return up to 10 top candidate books with indexed IDs
  return deduped.map((b, idx) => ({
    id: `catalog-book-${idx}`,
    ...b,
  }));
}

/**
 * Determine if message requires catalog search and extract search query
 */
async function analyzeSearchIntent(messages) {
  const latestMessage = messages[messages.length - 1]?.content || "";
  const lower = latestMessage.toLowerCase().trim();

  // Fast-path: Greetings, brief pleasantries, or questions that clearly don't request books
  const isChitchat =
    /^(привет|здравствуй|здравствуйте|хай|ку|добрый день|добрый вечер|доброе утро|hello|hi|hey|good morning|buna|salut|здравей)[\s!.,?]*$/i.test(
      lower,
    ) ||
    /^(как дела|кто ты|как тебя зовут|что ты умеешь|who are you|how are you|ce faci)[\s!.,?]*$/i.test(
      lower,
    );

  if (isChitchat) {
    return { needSearch: false, searchQuery: "" };
  }

  // Use Gemini to detect if book search is needed
  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_API_KEY;

  const prompt = `
Determine if the user's latest message in this bookstore conversation is asking for book recommendations, searching for specific titles or authors, or looking for books to buy/read.
If YES: set needSearch: true and provide a concise search query (1-3 keywords in the language most likely to match bookstore inventory, e.g. "фэнтези", "Stephen King", "детектив", "Дюна", "романтика").
If NO: set needSearch: false and searchQuery: "".

Conversation history:
${JSON.stringify(messages.slice(-6))}

Return JSON:
{
  "needSearch": boolean,
  "searchQuery": string
}
`;

  try {
    const res = await callGeminiJson({
      apiKey,
      prompt,
      responseSchema: {
        type: "OBJECT",
        properties: {
          needSearch: { type: "BOOLEAN" },
          searchQuery: { type: "STRING" },
        },
        required: ["needSearch", "searchQuery"],
      },
    });

    return {
      needSearch: Boolean(res?.needSearch),
      searchQuery: (res?.searchQuery || "").trim(),
    };
  } catch (err) {
    console.warn("Intent analysis fallback:", err.message);
    // Simple heuristic fallback
    const hasSearchKeywords =
      /(посоветуй|порекомендуй|найди|книг[иау]|купить|автор|роман|фэнтези|детектив|recommend|suggest|search|find|book|looking for|carte|recomanda)/i.test(
        lower,
      );
    return {
      needSearch: hasSearchKeywords,
      searchQuery: hasSearchKeywords ? lower.replace(/(посоветуй|порекомендуй|найди|пожалуйста|хочу|recommend|suggest|find|please)\s*/gi, "").trim() : "",
    };
  }
}

/**
 * Call Gemini API with automatic model fallback
 */
async function callGeminiJson({ apiKey, systemInstruction, prompt, responseSchema }) {
  const requestBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      ...(responseSchema ? { responseSchema } : {}),
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        lastError = new Error(errJson.error?.message || `HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        lastError = new Error("Empty text from Gemini");
        continue;
      }

      return JSON.parse(rawText);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini models failed");
}

/**
 * Main handler for Litera Assistant chat requests
 */
export async function processLiteraChat({ messages, language = "ru", onStatus } = {}) {
  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_API_KEY;
  const history = Array.isArray(messages) ? messages.slice(-10) : [];
  const latestMessage = history[history.length - 1]?.content || "";

  // 1. Analyze user intent
  const { needSearch, searchQuery } = await analyzeSearchIntent(history);

  if (typeof onStatus === "function") {
    try {
      onStatus(needSearch ? "searching" : "typing");
    } catch {
      // Ignore callback errors
    }
  }

  let catalogueResults = [];
  if (needSearch && searchQuery) {
    catalogueResults = await searchStoreCatalogue(searchQuery).catch(() => []);
  }

  // 2. Build prompt for Litera
  let promptText = `
User latest message: "${latestMessage}"
User interface language: "${language}"

Conversation history:
${JSON.stringify(history.slice(0, -1))}
`;

  if (needSearch) {
    if (catalogueResults.length > 0) {
      promptText += `
LITERA STORE REAL CATALOGUE SEARCH RESULTS for query "${searchQuery}":
${JSON.stringify(
  catalogueResults.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author || "Unknown",
    price: `${b.price} ${b.currency}`,
    store: b.store,
  })),
  null,
  2,
)}

CRITICAL INSTRUCTIONS:
- You must recommend ONLY books from the catalogue list above that match the user's interests.
- In "bookIds", return an array containing their exact IDs (e.g. ["${catalogueResults[0].id}"]).
- If user asked for 3 books and only 1 or 2 are available in the catalogue list, recommend ONLY those 1 or 2! NEVER invent fake books.
- Explain why these specific books are great picks in your friendly voice.
`;
    } else {
      promptText += `
LITERA STORE CATALOGUE SEARCH RESULT:
No books were found in Litera's catalogue matching query "${searchQuery}".
You must honestly tell the user that Litera currently does not have matching books in stock for "${searchQuery}".
Offer to search for a broader term or different genre. NEVER invent or fabricate books.
Set "bookIds": [].
`;
    }
  } else {
    promptText += `
INSTRUCTION:
Answer the user's question, greeting, or literary inquiry directly and helpfully in your charming, friendly voice.
Set "bookIds": [].
`;
  }

  // 3. Generate response with Gemini
  try {
    const aiResponse = await callGeminiJson({
      apiKey,
      systemInstruction: LITERA_SYSTEM_INSTRUCTION,
      prompt: promptText,
      responseSchema: {
        type: "OBJECT",
        properties: {
          message: { type: "STRING" },
          emotion: {
            type: "STRING",
            enum: [
              "neutral",
              "happy",
              "laughing",
              "curious",
              "surprised",
              "confused",
              "concerned",
              "sad",
              "speaking",
              "greeting",
            ],
          },
          bookIds: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
        required: ["message", "emotion", "bookIds"],
      },
    });

    // 4. Verify bookIds against actual catalogue results (Strict Data Integrity)
    const validBookIds = new Set(catalogueResults.map((b) => b.id));
    const verifiedBooks = (aiResponse.bookIds || [])
      .filter((id) => validBookIds.has(id))
      .map((id) => catalogueResults.find((b) => b.id === id))
      .filter(Boolean);

    return {
      message: aiResponse.message || "Здравствуйте! Чем я могу помочь вам в выборе книги? 💜",
      emotion: aiResponse.emotion || "happy",
      books: verifiedBooks,
      wasSearching: needSearch,
    };
  } catch (err) {
    console.error("Litera chat error:", err.message);
    return {
      message:
        language === "ru"
          ? "Ой, кажется, произошла небольшая заминка со связью! 💜 Пожалуйста, попробуйте отправить вопрос ещё раз."
          : "Oops, it seems there was a minor connection glitch! 💜 Please try asking again.",
      emotion: "concerned",
      books: [],
    };
  }
}
