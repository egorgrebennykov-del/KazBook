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
import getExchangeRate, { DEFAULT_RATE } from "../utils/getExchangeRate.js";

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

CRITICAL RULES ON RECOMMENDATIONS VS STORE/CART/SITE QUESTIONS:
1. STRICTLY NEVER OFFER OR SEARCH FOR BOOKS WHEN NOT ASKED!
   - If the user asks about their cart ("что в корзине", "проверь корзину", "сколько товаров", "общая сумма", "очисти корзину"), their orders, account, profile, site navigation, or general questions:
     DO NOT recommend or suggest any books!
     DO NOT invent book suggestions matching words in the user's prompt (e.g. NEVER suggest «Корзина с еловыми шишками» when asked about the shopping cart!).
     Set "bookIds": [].
     Answer the user's question directly, accurately, and politely using the provided CURRENT USER & SITE CONTEXT.
2. When the user asks about the cart:
   - If the user is logged in and has items: accurately name the books in their cart, their quantities, and the total sum in euros from the context.
   - If the user is logged in but cart is empty: state clearly that the cart is currently empty.
   - If the user is not logged in (guest): explain that they need to sign in or register to see their cart.
3. Site Navigation & Actions:
   - If the user asks to go to a page or open a section (e.g. "открой корзину", "перейди в профиль", "покажи скидки", "оформить заказ"):
     Include the optional "action" field in your JSON response:
     { "type": "navigate", "url": "/cart" } (or "/profile", "/discount", "/checkout", etc.).
4. When book recommendations ARE requested (needSearch = true):
   - Recommend books EXCLUSIVELY from the provided search results list.
   - Use their exact "id" in "bookIds".
   - PRICE AND VALUE PREFERENCE: Always prioritize accessible, affordable editions and books for customers! If there is a choice between an affordable edition (e.g. ~10 €) and an expensive one (e.g. 50–100 €), ALWAYS choose and recommend the affordable one. Customers want smart, budget-friendly choices. Never push expensive luxury editions when affordable options are available.

YOUR PERSONALITY & TONE:
- Friendly, warm, intelligent, polite, and approachable.
- Deeply knowledgeable about books, literature, world authors, genres, and reading culture.
- Helpful without being pushy, formal, or promotional. Avoid repetitive marketing slogans or boilerplate disclaimers.
- You may use gentle touches like 💜 or ✨ when appropriate, maintaining a thoughtful, authentic conversational tone.
- Natural speaker in any language: You MUST ALWAYS reply in the exact language the user used in their message (Russian, English, Romanian, Bulgarian, etc.).
- Truthful & Honest: NEVER invent fake books, fake author names, imaginary prices, or fake availability.
- Conciseness: Keep your conversational answers compact, charming, and focused (typically 2-4 sentences). Never generate long walls of text.

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
  "bookIds": ["id1", "id2"],
  "action": { "type": "navigate", "url": "/cart" }
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
1. Understand the user's request:
   - If the user explicitly names, asks for, or searches for a specific book title (e.g. "Идиот", "найди книгу Идиот", "Мастер и Маргарита", "1984", "книга Скотный двор"), you MUST include that exact book as candidate #1!
   - Identify 3 to 5 additional real, acclaimed books in RUSSIAN that match the theme, mood, author, or idea, and are commonly available in bookstores.
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
export async function searchSuppliersByTitleOnly(title, exchangeRate = DEFAULT_RATE) {
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
      b.price >= 2.0 &&
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
export async function discoverAndMatchBooks(userQuery, exchangeRate) {
  const activeRate =
    exchangeRate || (await getExchangeRate().catch(() => DEFAULT_RATE));
  const candidates = await discoverBooksByMeaning(userQuery);
  if (!candidates || candidates.length === 0) return [];

  const isGiftOrLuxuryRequest =
    /(подарочн|коллекционн|эксклюзивн|кожан|в коробе|люкс|дорог(ое|ую|ой|ие)|collector|luxury|gift)/i.test(
      userQuery || "",
    );

  // Search suppliers for each candidate strictly by title only
  const searchPromises = candidates.map(async (candidate) => {
    let storeProducts = await searchSuppliersByTitleOnly(
      candidate.title,
      activeRate,
    );
    if (
      storeProducts.length === 0 &&
      candidate.alternativeTitle &&
      candidate.alternativeTitle !== candidate.title
    ) {
      storeProducts = await searchSuppliersByTitleOnly(
        candidate.alternativeTitle,
        activeRate,
      );
    }

    const validMatches = storeProducts.filter((p) =>
      validateProductMatch(p, candidate),
    );

    if (validMatches.length === 0) return [];

    // Prioritize affordable editions: sort by price ascending (cheapest / best value first)
    if (isGiftOrLuxuryRequest) {
      validMatches.sort((a, b) => b.price - a.price);
    } else {
      validMatches.sort((a, b) => a.price - b.price);
    }

    // For specific single-book requests (1-2 candidates), return up to 2 distinct affordable editions
    const takeCount =
      candidates.length <= 2 ? Math.min(2, validMatches.length) : 1;
    return validMatches.slice(0, takeCount).map((match) => ({
      ...match,
      candidateTitle: candidate.title,
      candidateAuthor: candidate.author,
      relevance: candidate.relevance,
    }));
  });

  const resolved = await Promise.all(searchPromises);
  const verifiedProducts = resolved.flat().filter(Boolean);

  // Deduplicate by URL and normalized work title, ALWAYS keeping the cheaper edition
  const productMap = new Map();
  for (const b of verifiedProducts) {
    const key =
      b.url ||
      (b.candidateTitle || b.title)
        .toLowerCase()
        .replace(/[^a-zа-я0-9]/gi, "")
        .slice(0, 30);
    const existing = productMap.get(key);
    if (!existing) {
      productMap.set(key, b);
    } else if (!isGiftOrLuxuryRequest && b.price < existing.price) {
      productMap.set(key, b);
    } else if (isGiftOrLuxuryRequest && b.price > existing.price) {
      productMap.set(key, b);
    }
  }

  const deduped = Array.from(productMap.values());

  // Prioritize budget-friendly, accessible options first
  if (!isGiftOrLuxuryRequest) {
    deduped.sort((a, b) => {
      const aIsHigh = a.price > 45;
      const bIsHigh = b.price > 45;
      if (aIsHigh !== bIsHigh) return aIsHigh ? 1 : -1;
      return a.price - b.price;
    });
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

  // Fast-path 1: Cart, Account, Profile, Orders, Site Navigation (STRICTLY NO BOOK DISCOVERY)
  const isSiteOrCartQuery =
    /(корзин|в корзине|из корзины|очист(и|ить) корзину|содержимое корзины|товары в корзине|заказ|оформить заказ|оформление|мои заказы|профиль|аккаунт|войти|логин|регистрац|где найти раздел|куда нажать|как оплатить|доставка|валют|в евро|где вы находитесь)/i.test(
      lower,
    ) &&
    !/(книга про корзину|книги про корзину|книга корзина)/i.test(lower);

  if (isSiteOrCartQuery) {
    return { needSearch: false };
  }

  // Fast-path 2: Greetings, pleasantries, or questions about Litera (NO SEARCH)
  const isConversational =
    /^(привет|здравствуй|здравствуйте|хай|ку|добрый день|добрый вечер|доброе утро|hello|hi|hey|good morning|buna|salut|здравей)[\s!.,?]*$/i.test(
      lower,
    ) ||
    /^(как дела|кто ты|как тебя зовут|что ты умеешь|who are you|how are you|расскажи о себе|чем занимаешься|спасибо|благодарю|ясно|понятно|ок|хорошо|отлично)[\s!.,?]*$/i.test(
      lower,
    ) ||
    /^(какая твоя любимая|что ты думаешь|кто твой любимый|ты любишь читать|расскажи о себе|как погода)/i.test(
      lower,
    );

  if (isConversational) {
    return { needSearch: false };
  }

  // Fast-path 3: Suggested quick chips (Direct search needed)
  if (
    /литера,?\s*(что\s*почитать|посоветуй\s*книгу|что\s*(сейчас\s*)?в\s*топе|помоги\s*с\s*подарком|найди\s*детектив)/i.test(
      lower,
    )
  ) {
    return { needSearch: true };
  }

  // Fast-path 4: Explicit book requests
  const hasExplicitBookRequest =
    /(посоветуй|порекомендуй|найди|хочу почитать|подскажи что почитать|что почитать|подобрать книгу|выбери книгу|какие книги|книги про|книгу про|книги о|книги по|книга про|книга о|книга по|хочу книгу)/i.test(
      lower,
    );
  if (hasExplicitBookRequest) {
    return { needSearch: true };
  }

  // Fallback: use Gemini to classify intent
  const apiKey = process.env.GEMINI_API_KEY || DEFAULT_API_KEY;
  const prompt = `
Determine if the customer's message explicitly requests finding, recommending, or suggesting books to read or buy from the bookstore.

CRITICAL RULES:
- set needSearch = false if the customer is asking about:
  * Their shopping cart ("что в корзине", "проверь корзину", "сколько книг в заказе")
  * Their account, login, or orders ("мои заказы", "где профиль")
  * Store FAQ (shipping, payment, currency, locations, languages)
  * Casual conversation ("привет", "как дела", "спасибо")
  * Navigation ("открой корзину", "перейти к оформлению")
- set needSearch = true ONLY if the customer is genuinely asking for book recommendations or searching for reading material (e.g. "посоветуй что-то про космос", "найди детективы", "хочу почитать драму", "что почитать про смысл жизни").

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
    return { needSearch: false };
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
export async function processLiteraChat({ messages, language = "ru", context, onStatus } = {}) {
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
    const rate = await getExchangeRate().catch(() => DEFAULT_RATE);
    catalogueResults = await discoverAndMatchBooks(latestMessage, rate).catch(() => []);
  }

  // 2. Format live user, cart, and page context
  const cartInfo = context?.cart;
  const userInfo = context?.user;
  const pageInfo = context?.page;

  let siteContextText = `
CURRENT USER & SITE CONTEXT:
- User is logged in: ${userInfo?.isLoggedIn ? `Yes (Name: ${userInfo.name || "Customer"}, Email: ${userInfo.email || "Unknown"})` : "No (Guest visitor)"}
- Current page / route: ${pageInfo?.pathname || "/"}
- User's Shopping Cart:
`;

  if (!cartInfo?.isLoggedIn) {
    siteContextText += `  Status: User is NOT signed in (Guest). In Litera bookstore, the cart is linked to user accounts. If the user asks what is in their cart or asks to check their cart, explain politely that they need to sign in (/login) or register (/sign-up) to access and save their personal shopping cart.\n`;
  } else if (!cartInfo.items || cartInfo.items.length === 0) {
    siteContextText += `  Status: The user's cart is currently EMPTY (0 items, 0.00 €). If they ask what is in their cart, tell them accurately that their cart is empty, and ask if they would like recommendations for books.\n`;
  } else {
    siteContextText += `  Status: Cart has ${cartInfo.itemCount} books, Total: ${cartInfo.totalPrice} EUR.
  Items in cart:
${cartInfo.items.map((it, idx) => `  ${idx + 1}. «${it.title}» — ${it.quantity} шт. по ${it.price} € (${it.store})`).join("\n")}
`;
  }

  siteContextText += `
AVAILABLE SITE SECTIONS & ROUTES:
- Главная (/) — Bestsellers, catalog overview
- Корзина (/cart) — Shopping cart to view items, change quantities, and checkout
- Оформление заказа (/checkout) — Complete the order and enter delivery details
- Мои заказы (/orders) — View past and current orders
- Профиль (/profile) — Customer account profile
- Скидки (/discount) — Discounted books and offers
- Новинки (/new) — Newly released books
- Подборка книг (/featured) — Curated book selections
- Отзывы (/testimonial) — Customer reviews
- Вход (/login) / Регистрация (/sign-up) — Account authentication
`;

  // 3. Build prompt for Litera
  let promptText = `
User latest message: "${latestMessage}"
User interface language: "${language}"

${siteContextText}

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
- PRICE & VALUE PREFERENCE: Always take book prices into strong consideration! If there is a choice between an affordable edition (e.g. ~10 €) and an expensive one (e.g. 50–100 €), ALWAYS choose and recommend the affordable, accessible option. Never push expensive editions when a cheaper alternative is available.
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
Answer the user's question, greeting, cart inquiry, or store navigation inquiry directly and helpfully in your charming, friendly voice using the CURRENT USER & SITE CONTEXT.
Set "bookIds": [].
If the user explicitly asks to open or navigate to a page (e.g. "открой корзину", "перейди в профиль", "оформи заказ"), include the "action" field: { "type": "navigate", "url": "/cart" } (or corresponding route).
`;
  }

  // 4. Generate response with Gemini
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
          action: {
            type: "OBJECT",
            properties: {
              type: { type: "STRING" },
              url: { type: "STRING" },
            },
          },
        },
        required: ["message", "emotion", "bookIds"],
      },
    });

    // 5. Verify bookIds against actual catalogue results (Strict Data Integrity)
    const validBookIds = new Set(catalogueResults.map((b) => b.id));
    const verifiedBooks = (aiResponse.bookIds || [])
      .filter((id) => validBookIds.has(id))
      .map((id) => catalogueResults.find((b) => b.id === id))
      .filter(Boolean);

    return {
      message: aiResponse.message || "Здравствуйте! Чем я могу помочь вам в выборе книги? 💜",
      emotion: aiResponse.emotion || "happy",
      books: verifiedBooks,
      action: aiResponse.action || null,
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
