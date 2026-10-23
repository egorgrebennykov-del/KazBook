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
 * Normalizes book queries: removes stopwords/prepositions and converts inflected case forms to nominative lemmas
 */
export function normalizeSearchQuery(rawQuery) {
  if (!rawQuery) return "";
  const q = rawQuery.toLowerCase().trim();

  // Strip common conversational filler and search prepositions
  const stopwords = new Set([
    "пожалуйста", "подскажи", "посоветуй", "порекомендуй", "найди", "хочу",
    "почитать", "что-нибудь", "купить", "книги", "книга", "книгу", "книжек",
    "книгах", "книгам", "книгами", "литература", "литературу", "литературы",
    "литературе", "сборник", "сборники", "издание", "издания",
    "по", "про", "о", "об", "обо", "для", "в", "на", "из", "с", "со", "от", "что"
  ]);

  const words = q.split(/[\s,.;:!?]+/).filter((w) => w && !stopwords.has(w));
  if (words.length === 0) {
    // If all words were stopwords, fallback to the stripped raw query
    return q.replace(/^(посоветуй|порекомендуй|найди|книги|книга|что-нибудь)\s*/gi, "").trim() || rawQuery.trim();
  }

  const normalizedWords = words.map((w) => {
    // -офии -> -офия (философии -> философия, теософии -> теософия)
    if (w.endsWith("офии")) return w.slice(0, -1) + "я";
    // -огии -> -огия (психологии -> психология, мифологии -> мифология)
    if (w.endsWith("огии")) return w.slice(0, -1) + "я";
    // -ии -> -ия (истории -> история, кулинарии -> кулинария, поэзии -> поэзия)
    if (w.endsWith("ии")) return w.slice(0, -1) + "я";
    // Accusative -офию / -огию / -ию -> -офия / -огия / -ия
    if (w.endsWith("офию")) return w.slice(0, -1) + "я";
    if (w.endsWith("огию")) return w.slice(0, -1) + "я";
    if (w.endsWith("ию")) return w.slice(0, -1) + "я";
    // Plural noun endings to singular base
    if (w.endsWith("детективы") || w.endsWith("детективов")) return "детектив";
    if (w.endsWith("романы") || w.endsWith("романов")) return "роман";
    if (w.endsWith("триллеры") || w.endsWith("триллеров")) return "триллер";
    if (w.endsWith("ужасы") || w.endsWith("ужасов")) return "ужасы";
    if (w.endsWith("комиксы") || w.endsWith("комиксов")) return "комикс";
    if (w.endsWith("сказки") || w.endsWith("сказок")) return "сказки";
    if (w.endsWith("рассказы") || w.endsWith("рассказов")) return "рассказы";
    if (w.endsWith("стихи") || w.endsWith("стихов")) return "стихи";
    if (w.endsWith("энциклопедии") || w.endsWith("энциклопедий")) return "энциклопедия";
    if (w.endsWith("фантастику") || w.endsWith("фантастики") || w.endsWith("фантастике")) return "фантастика";
    if (w.endsWith("классику") || w.endsWith("классики") || w.endsWith("классике")) return "классика";
    if (w.endsWith("биографии") || w.endsWith("биографий") || w.endsWith("биографию")) return "биография";
    if (w.endsWith("мемуары") || w.endsWith("мемуаров")) return "мемуары";
    if (w.endsWith("саморазвитию") || w.endsWith("саморазвития")) return "саморазвитие";
    return w;
  });

  return normalizedWords.join(" ");
}

/**
 * Searches the bookstore stores, dedupes, and normalizes into trusted book cards
 */
export async function searchStoreCatalogue(query, exchangeRate = 19.5) {
  const rawQ = (query || "").trim();
  if (!rawQ) return [];

  const normalizedQ = normalizeSearchQuery(rawQ);
  const searchKey = (normalizedQ || rawQ).toLowerCase();

  const cached = storeSearchCache.get(searchKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  async function queryStores(q) {
    const timeoutPromise = (promise, ms = 3200) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), ms),
        ),
      ]);

    const [librariusRaw, ulyssesRaw, carteameaRaw, biblionRaw] =
      await Promise.all([
        timeoutPromise(searchLibrarius(q, 1), 3000).catch(() => []),
        timeoutPromise(searchUlysses(q), 3000).catch(() => []),
        timeoutPromise(searchCarteamea(q), 3000).catch(() => []),
        timeoutPromise(searchBiblion(q, 1), 3000).catch(() => []),
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

    // Fast deduplication by normalized title and URL
    const seenTitles = new Set();
    const dedupedItems = [];
    for (const b of rawCombined) {
      const key = b.title.toLowerCase().replace(/[^a-zа-я0-9]/gi, "").slice(0, 35);
      if (!seenTitles.has(key)) {
        seenTitles.add(key);
        dedupedItems.push(b);
        if (dedupedItems.length >= 8) break;
      }
    }

    return dedupedItems;
  }

  let deduped = await queryStores(normalizedQ);

  // If 0 results and normalizedQ has multiple words, try fallback with the primary longest word
  if (deduped.length === 0 && normalizedQ.includes(" ")) {
    const primaryWord = normalizedQ.split(/\s+/).sort((a, b) => b.length - a.length)[0];
    if (primaryWord && primaryWord.length >= 4) {
      deduped = await queryStores(primaryWord);
    }
  }

  // If still 0 results and rawQ differs from normalizedQ, try rawQ as fallback
  if (deduped.length === 0 && rawQ.toLowerCase() !== normalizedQ.toLowerCase()) {
    deduped = await queryStores(rawQ.toLowerCase());
  }

  // Return up to 8 top candidate books with indexed IDs
  const result = deduped.map((b, idx) => ({
    id: `catalog-book-${idx}`,
    ...b,
  }));

  if (result.length > 0) {
    storeSearchCache.set(searchKey, {
      data: result,
      expiresAt: Date.now() + STORE_SEARCH_CACHE_TTL,
    });
  }

  return result;
}

/**
 * Accurate intent analyzer with fast-paths and Gemini LLM semantic verification
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
    );

  if (isConversational) {
    return { needSearch: false, searchQuery: "" };
  }

  // Fast-path 2: Suggested quick chips
  if (/литера,?\s*что\s*почитать/i.test(lower)) {
    return { needSearch: true, searchQuery: "бестселлер" };
  }
  if (/литера,?\s*посоветуй\s*книгу/i.test(lower)) {
    return { needSearch: true, searchQuery: "роман" };
  }
  if (/литера,?\s*что\s*(сейчас\s*)?в\s*топе/i.test(lower)) {
    return { needSearch: true, searchQuery: "бестселлер" };
  }
  if (/литера,?\s*помоги\s*с\s*подарком/i.test(lower)) {
    return { needSearch: true, searchQuery: "подарочное издание" };
  }
  if (/литера,?\s*найди\s*детектив/i.test(lower)) {
    return { needSearch: true, searchQuery: "детектив" };
  }

  // Fast-path 2b: Direct book topics and genres
  const genreMatches = [
    { regex: /философ/i, query: "философия" },
    { regex: /психолог/i, query: "психология" },
    { regex: /детектив/i, query: "детектив" },
    { regex: /фантастик/i, query: "фантастика" },
    { regex: /фэнтези/i, query: "фэнтези" },
    { regex: /саморазвит/i, query: "саморазвитие" },
    { regex: /биографи/i, query: "биография" },
    { regex: /мемуар/i, query: "мемуары" },
    { regex: /истори[ияею]/i, query: "история" },
    { regex: /поэзи|стих/i, query: "поэзия" },
    { regex: /триллер/i, query: "триллер" },
    { regex: /классик/i, query: "классика" },
    { regex: /мифолог/i, query: "мифология" },
    { regex: /сказк/i, query: "сказки" },
    { regex: /космос/i, query: "космос" },
    { regex: /бизнес|маркетинг/i, query: "бизнес" },
    { regex: /кулинар/i, query: "кулинария" },
    { regex: /искусств/i, query: "искусство" },
    { regex: /живопис/i, query: "живопись" },
  ];

  const asksForBook =
    /(посоветуй|порекомендуй|найди|хочу почитать|подскажи|что почитать|книги|книгу|книг|что-нибудь|почитать)\b/i.test(
      lower,
    ) ||
    /^(книги\s+(по|про|о|об)\s+|что-нибудь\s+(по|про|о|об)\s+)/i.test(lower);

  if (asksForBook) {
    for (const item of genreMatches) {
      if (item.regex.test(lower)) {
        return { needSearch: true, searchQuery: item.query };
      }
    }
  }

  // Fast-path 3: Obvious non-book questions (e.g. asking Litera personal questions)
  if (
    /^(какая твоя любимая|что ты думаешь|кто твой любимый|какие книги ты любишь|ты любишь читать|расскажи о себе|как погода)/i.test(
      lower,
    )
  ) {
    return { needSearch: false, searchQuery: "" };
  }

  // Use fast Gemini flash-lite to determine intent accurately without guessing
  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_API_KEY;

  const prompt = `
You are an intent analyzer for the bookstore AI assistant "Litera".
Determine if the customer's message explicitly requests finding, recommending, buying, or checking availability of real books from the store catalogue.

RULES:
- set needSearch = true ONLY if the user asks for book recommendations, asks to find a book to buy/read from the store, or searches inventory (e.g. "посоветуй 2 книги про космос", "найди детектив", "есть ли у вас Гарри Поттер", "порекомендуй что-нибудь почитать").
  When needSearch is true, provide searchQuery as a single normalized nominative keyword or main title/author in Russian (e.g. "философия" instead of "по философии", "психология" instead of "о психологии", "детектив" instead of "детективы"). Never include prepositions like "по", "про", "о", "для" and never include generic words like "книги", "литература", "сборник".
- set needSearch = false if the user is just chatting, greeting, asking about the assistant's tastes or opinions, asking trivia/facts, asking about store policies/delivery/location, or discussing general topics (e.g. "какая твоя любимая книга", "кто написал Войну и мир", "что думаешь о Достоевском", "привет", "где ваш магазин").

Customer message: "${latestMessage}"

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

    const rawSearchQuery = (res?.searchQuery || "").trim();
    const cleanSearchQuery = normalizeSearchQuery(rawSearchQuery) || rawSearchQuery;

    return {
      needSearch: Boolean(res?.needSearch),
      searchQuery: cleanSearchQuery,
    };
  } catch (err) {
    console.warn("Intent analysis fallback:", err.message);
    const hasExplicitRequest =
      /(посоветуй|порекомендуй|найди|хочу почитать|подскажи что почитать|есть ли у вас|купить книгу)\b/i.test(
        lower,
      );
    return {
      needSearch: hasExplicitRequest,
      searchQuery: hasExplicitRequest ? normalizeSearchQuery(lower) : "",
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
  catalogueResults.slice(0, 5).map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author || "Unknown",
    price: `${b.price} ${b.currency}`,
  })),
  null,
  2,
)}

CRITICAL INSTRUCTIONS:
- You must recommend ONLY books from the catalogue list above that match the user's interests.
- In "bookIds", return an array containing their exact IDs (e.g. ["${catalogueResults[0].id}"]).
- If user asked for 3 books and only 1 or 2 are available in the catalogue list, recommend ONLY those 1 or 2! NEVER invent fake books.
- Explain why these specific books are great picks in your friendly, warm voice.
- Speak naturally about the books, their mood, and plot. Do NOT mention "европейский каталог", "на русском языке", or price/currencies in your message text — just focus on the books themselves!
`;
    } else {
      promptText += `
LITERA STORE CATALOGUE SEARCH RESULT:
No books were found in Litera's catalogue matching query "${searchQuery}".

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
