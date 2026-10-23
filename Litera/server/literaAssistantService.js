import process from "node:process";
import { searchLibrarius } from "./librariusService.js";
import { searchUlysses } from "./ulyssesService.js";
import { searchCarteamea } from "./carteameaService.js";
import { searchBiblion } from "./biblionService.js";
import {
  decodeLibrariusImage,
  decodeUlyssesImage,
  decodeCarteameaImage,
  decodeBiblionImage,
} from "../utils/enhancedImageUrl.js";

const DEFAULT_API_KEY = "";
const GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
];

const LITERA_SYSTEM_INSTRUCTION = `
You are Litera, a friendly female anime-style bookstore assistant for the online bookstore "Litera".
You wear an elegant purple hijab that completely covers your hair.

ABOUT LITERA BOOKSTORE (BACKGROUND KNOWLEDGE ONLY):
- Litera is an online European bookstore delivering books across European countries.
- All prices are in Euros (€ / EUR).
- Books in the store are in Russian.
- Sourcing confidentiality: NEVER mention Moldova or Moldovan bookstores under any circumstances. If asked where books come from, explain that Litera partners with certified publishers and verified European distributor networks.
- Store sections: "Главная", "Подборка книг", "Скидки", "Новинки", "Отзывы", "Корзина".

CRITICAL RULE ON STORE INFORMATION:
- The facts above (Europe, Russian language, delivery, Euros) are STRICTLY BACKGROUND KNOWLEDGE.
- Do NOT mention or emphasize them during regular conversation or book recommendations!
- NEVER say robotic phrases like "в нашем европейском каталоге на русском языке", "в нашем каталоге в евро", "для европейских читателей", etc.
- When recommending books or chatting, speak completely naturally like a true passionate bookseller: "У нас есть...", "В каталоге Litera вы найдете...", "Обратите внимание на...", "Могу порекомендовать...".
- ONLY talk about Europe, delivery geography, Euros, or book language if the user EXPLICITLY ASKS a question about those specific topics (e.g. "Куда вы доставляете?", "На каком языке книги?", "В какой валюте цены?").

YOUR PERSONALITY & TONE:
- Friendly, warm, intelligent, polite, and approachable.
- Deeply knowledgeable about books, literature, world authors, genres, and reading culture.
- Helpful without being pushy, formal, or promotional. Avoid repetitive marketing slogans or boilerplate disclaimers.
- You may use gentle touches like 💜 or ✨ when appropriate, maintaining a thoughtful, authentic conversational tone.
- Natural speaker in any language: You MUST ALWAYS reply in the exact language the user used in their message (Russian, English, Romanian, Bulgarian, etc.).
- Truthful & Honest: NEVER invent fake books, fake author names, imaginary prices, or fake availability.
- Conciseness: Keep your conversational answers compact, charming, and focused (typically 2-4 sentences). Never generate long walls of text.

CATALOGUE RECOMMENDATION RULES:
1. When real catalogue search results are provided in your prompt:
   - Recommend books EXCLUSIVELY from the provided search results list.
   - Use their exact "id" (e.g. "catalog-book-0") in your "bookIds" array.
   - If the user asks for 3 books and 3 or more matching books exist in the list, recommend up to 3.
   - If only 1 or 2 matching books exist in the list, recommend ONLY those 1 or 2! Explain that only these are currently available. NEVER invent additional books to reach 3.
   - If 0 matching books are found in the list, honestly and gently explain that Litera's catalogue does not have matching books right now, and offer to try another genre, author, or broader search.
2. For questions about the store, delivery, currencies, or literary topics:
   - Answer directly and accurately using the store knowledge above (set "bookIds": []).

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

const storeSearchCache = new Map();
const STORE_SEARCH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

/**
 * 1. Discover relevant real books by meaning using Gemini.
 * Analyzes natural-language requests, themes, moods, emotions, metaphors, or ideas.
 * Strictly returns books in Russian (even if query was in English, Romanian, etc.).
 */
export async function discoverBooksByMeaning(userQuery) {
  const cleanQ = (userQuery || "").trim();
  if (!cleanQ) return [];

  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_API_KEY;

  const prompt = `
You are the AI literary discovery engine for the European bookstore "Litera".
The user submitted this natural-language book request: "${cleanQ}".

TASK:
1. Understand the underlying meaning, philosophy, emotions, mood, historical/cultural context, or subject.
2. Identify 4 to 6 real, acclaimed books in RUSSIAN (even if the user query was in English, Romanian, or another language) that best match this theme, mood, or idea, and are commonly available in bookstores.
   Examples of logical matching:
   - "про грусть" -> "Белые ночи" (Достоевский), "Муму" (Тургенев), "Цветы для Элджернона" (Киз), "Три товарища" (Ремарк), "Одиночество в Сети" (Вишневский)
   - "про животных" -> "Скотный двор" (Оруэлл), "Белый Клык" (Лондон), "Собачье сердце" (Булгаков), "Жизнь Пи" (Мартел), "Каштанка" (Чехов)
   - "про Ближний Восток" -> "Арабы. История. XVI-XXI вв." (Роган), "Бегущий за ветром" (Хоссейни), "Тысяча и одна ночь", "Мифы Ближнего Востока"
   - "meaning of life" -> "Три товарища", "Сто лет одиночества", "Маленький принц", "Сказать жизни «Да!»"

Return strictly JSON matching this schema:
{
  "candidates": [
    {
      "title": "Exact book title in Russian (strictly title only, no author in this field)",
      "author": "Author name in Russian",
      "alternativeTitle": "Alternative or shortened Russian title if helpful (or empty string)",
      "relevance": "1 concise sentence explaining why this book matches the user's theme"
    }
  ]
}
Verify book titles and authors. Do NOT invent fake books or authors.
`;

  try {
    const res = await callGeminiJson({
      apiKey,
      prompt,
      responseSchema: {
        type: "OBJECT",
        properties: {
          candidates: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                author: { type: "STRING" },
                alternativeTitle: { type: "STRING" },
                relevance: { type: "STRING" },
              },
              required: ["title", "author", "relevance"],
            },
          },
        },
        required: ["candidates"],
      },
    });

    return Array.isArray(res?.candidates) ? res.candidates : [];
  } catch (err) {
    console.warn("discoverBooksByMeaning fallback:", err.message);
    return [{ title: cleanQ, author: "", alternativeTitle: "", relevance: "" }];
  }
}

/**
 * 2. Search supported supplier websites strictly by title only.
 * Critical requirement: supplier searches must use book titles only!
 * Do NOT search supplier websites by plot, subject, description, or author.
 */
export async function searchSuppliersByTitleOnly(title, exchangeRate = 19.5) {
  const cleanTitle = (title || "").trim();
  if (!cleanTitle) return [];

  const cacheKey = `title_only::${cleanTitle.toLowerCase()}`;
  const cached = storeSearchCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const timeoutPromise = (promise, ms = 3200) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), ms),
      ),
    ]);

  const [librariusRaw, ulyssesRaw, carteameaRaw, biblionRaw] =
    await Promise.all([
      timeoutPromise(searchLibrarius(cleanTitle, 1), 3000).catch(() => []),
      timeoutPromise(searchUlysses(cleanTitle), 3000).catch(() => []),
      timeoutPromise(searchCarteamea(cleanTitle), 3000).catch(() => []),
      timeoutPromise(searchBiblion(cleanTitle, 1), 3000).catch(() => []),
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

  // Fast deduplication by URL
  const seenUrls = new Set();
  const deduped = [];
  for (const b of rawCombined) {
    if (!seenUrls.has(b.url)) {
      seenUrls.add(b.url);
      deduped.push(b);
    }
  }

  if (deduped.length > 0) {
    storeSearchCache.set(cacheKey, {
      data: deduped,
      expiresAt: Date.now() + STORE_SEARCH_CACHE_TTL,
    });
  }

  return deduped;
}

/**
 * 3. Validate product match against intended discovered candidate book.
 */
function validateProductMatch(product, candidate) {
  if (!product?.title || !candidate?.title) return false;

  const clean = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-zа-я0-9\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const pTitle = clean(product.title);
  const cTitle = clean(candidate.title);
  const altTitle = clean(candidate.alternativeTitle);

  // Title must match candidate title or alternative title
  const matchesTitle =
    pTitle.includes(cTitle) ||
    cTitle.includes(pTitle) ||
    (altTitle && (pTitle.includes(altTitle) || altTitle.includes(pTitle)));

  if (!matchesTitle) return false;

  // If candidate specifies author and supplier product has author, verify author compatibility
  if (candidate.author && product.author) {
    const authorWords = clean(candidate.author).split(/\s+/).filter((w) => w.length > 3);
    const prodAuthor = clean(product.author);
    if (
      authorWords.length > 0 &&
      !authorWords.some((w) => prodAuthor.includes(w) || pTitle.includes(w))
    ) {
      return false; // Author conflict
    }
  }

  return true;
}

/**
 * 4. Main AI Discovery & Supplier Verification pipeline.
 * Discovers real books by meaning, searches suppliers strictly by title only,
 * validates products, and excludes any books not available on suppliers.
 */
export async function discoverAndMatchBooks(userQuery, exchangeRate = 19.5) {
  const candidates = await discoverBooksByMeaning(userQuery);
  if (!candidates || candidates.length === 0) return [];

  // Search suppliers for each candidate strictly by title only
  const searchPromises = candidates.map(async (candidate) => {
    let storeProducts = await searchSuppliersByTitleOnly(candidate.title, exchangeRate);
    if (
      storeProducts.length === 0 &&
      candidate.alternativeTitle &&
      candidate.alternativeTitle !== candidate.title
    ) {
      storeProducts = await searchSuppliersByTitleOnly(
        candidate.alternativeTitle,
        exchangeRate,
      );
    }

    const validMatches = storeProducts.filter((p) =>
      validateProductMatch(p, candidate),
    );

    if (validMatches.length > 0) {
      return {
        ...validMatches[0],
        candidateTitle: candidate.title,
        candidateAuthor: candidate.author,
        relevance: candidate.relevance,
      };
    }
    return null;
  });

  const resolved = await Promise.all(searchPromises);
  const verifiedProducts = resolved.filter(Boolean);

  // Deduplicate by title
  const seenKeys = new Set();
  const deduped = [];
  for (const b of verifiedProducts) {
    const key = b.title.toLowerCase().replace(/[^a-zа-я0-9]/gi, "").slice(0, 35);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduped.push(b);
    }
  }

  // Return up to 8 top candidate books with indexed IDs
  return deduped.slice(0, 8).map((b, idx) => ({
    id: `catalog-book-${idx}`,
    ...b,
  }));
}

// Backward-compatible alias
export const searchStoreCatalogue = discoverAndMatchBooks;

/**
 * Determines whether the user message requires book discovery from the catalogue.
 */
async function analyzeSearchIntent(messages) {
  const latestMessage = messages[messages.length - 1]?.content || "";
  const lower = latestMessage.toLowerCase().trim();

  // Fast-path 1: Greetings, pleasantries, or general store questions (NO SEARCH)
  const isConversational =
    /^(привет|здравствуй|здравствуйте|хай|ку|добрый день|добрый вечер|доброе утро|hello|hi|hey|good morning|buna|salut|здравей)[\s!.,?]*$/i.test(
      lower,
    ) ||
    /^(как дела|кто ты|как тебя зовут|что ты умеешь|who are you|how are you|расскажи о себе|чем занимаешься|спасибо|благодарю|ясно|понятно|ок|хорошо|отлично)[\s!.,?]*$/i.test(
      lower,
    ) ||
    /(где находится|куда доставляете|доставка|оплата|валют[ае]|в росси[ие]|из росси[ие]|в евро|на каких языках|язык книг|сколько стоит доставка)/i.test(
      lower,
    ) ||
    /^(какая твоя любимая|что ты думаешь|кто твой любимый|ты любишь читать|расскажи о себе|как погода)/i.test(
      lower,
    );

  if (isConversational) {
    return { needSearch: false };
  }

  // Fast-path 2: Suggested quick chips (Direct search needed)
  if (
    /литера,?\s*(что\s*почитать|посоветуй\s*книгу|что\s*(сейчас\s*)?в\s*топе|помоги\s*с\s*подарком|найди\s*детектив)/i.test(
      lower,
    )
  ) {
    return { needSearch: true };
  }

  // Fast-path 3: Book keywords, themes, emotions, questions
  const hasBookKeywords =
    /(книг|посоветуй|порекомендуй|найди|хочу почитать|подскажи|что почитать|про |о |об |роман|детектив|фантастик|автор|купить|подарок|грусть|животн|восток|смысл|любовь|истори)/i.test(
      lower,
    );
  if (hasBookKeywords) {
    return { needSearch: true };
  }

  // Fallback: use Gemini to classify intent
  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_API_KEY;
  const prompt = `
Determine if the customer's message requests book recommendations, searches for books to read or buy, or asks about literature topics:
Customer message: "${latestMessage}"
Return JSON: { "needSearch": boolean }
`;

  try {
    const res = await callGeminiJson({
      apiKey,
      prompt,
      responseSchema: {
        type: "OBJECT",
        properties: { needSearch: { type: "BOOLEAN" } },
        required: ["needSearch"],
      },
    });
    return { needSearch: Boolean(res?.needSearch) };
  } catch {
    return { needSearch: true };
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
      maxOutputTokens: 500,
      temperature: 0.65,
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
  const { needSearch } = await analyzeSearchIntent(history);

  if (typeof onStatus === "function") {
    try {
      onStatus(needSearch ? "searching" : "typing");
    } catch {
      // Ignore callback errors
    }
  }

  let catalogueResults = [];
  if (needSearch) {
    catalogueResults = await discoverAndMatchBooks(latestMessage).catch(() => []);
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
LITERA STORE REAL CATALOGUE SEARCH RESULTS for customer request "${latestMessage}":
${JSON.stringify(
  catalogueResults.slice(0, 8).map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author || b.candidateAuthor || "Unknown",
    price: `${b.price} ${b.currency}`,
    relevanceReason: b.relevance || "",
  })),
  null,
  2,
)}

CRITICAL INSTRUCTIONS:
- You must recommend ONLY books from the catalogue list above that match the user's interests.
- In "bookIds", return an array containing their exact IDs (e.g. ["${catalogueResults[0].id}"]).
- Explain why these specific books are great picks in your friendly, warm voice (you may reference the relevanceReason).
- Speak naturally about the books, their mood, and plot. Do NOT mention "европейский каталог", "на русском языке", or price/currencies in your message text — just focus on the books themselves!
`;
    } else {
      promptText += `
LITERA STORE CATALOGUE SEARCH RESULT:
No books were found in Litera's catalogue matching request "${latestMessage}".

CRITICAL INSTRUCTIONS WHEN NO BOOKS ARE FOUND:
- Honestly and gently tell the user in 1-2 friendly, charming sentences that Litera currently does not have books matching this exact query in stock.
- Offer to look for another genre, author, or topic of their choice.
- NEVER invent, fabricate, or suggest unrelated specific book categories or products (such as language textbooks, tutorials, or dictionaries) unless the user specifically asked for them!
- Set "bookIds": [].
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
