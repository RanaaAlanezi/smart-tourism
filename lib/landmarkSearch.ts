import { Landmark, LandmarkCategory } from "./types";
import { CITY_EN, REGION_EN, englishName } from "./landmark-i18n";

// Picks the handful of landmarks a chat question is actually about, so the
// assistant only ever sees those. Handing the small local model the whole
// dataset and asking it to filter doesn't work — asked about one city it
// happily lists landmarks from five others — so city/category/name matching
// happens here, deterministically, the same way the Discover flow's ranking
// keeps Qwen away from the raw dataset (see rankLandmarksForDiscovery).

// Folds the spelling variants people actually type (hamza forms, ta marbuta,
// diacritics) so "جده" matches "جدة" and "حايل" matches "حائل".
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ىئ]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ة/g, "ه");
}

// Drops the definite article (and a preposition fused onto it) so "العلا",
// "بالعلا" and "للعلا" all become "علا".
function stripArticle(token: string): string {
  const match = token.match(/^(?:[وفبك]?ال|لل)(.{2,})$/);
  return match ? match[1] : token;
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map(stripArticle);
}

// True if the question contains the word, bare or with a one-letter
// preposition attached ("بجدة", "لجدة"). "و" is only accepted on longer
// words: on a 3-letter one it's far more often part of a different word
// ("وجبة" is a meal, not "and Jubbah").
function hasWord(questionTokens: Set<string>, word: string): boolean {
  return (
    questionTokens.has(word) ||
    questionTokens.has(`ب${word}`) ||
    questionTokens.has(`ل${word}`) ||
    (word.length >= 4 && questionTokens.has(`و${word}`))
  );
}

// Word stems that signal an interest in a category, in Arabic and English.
// Matched as prefixes of a question word, so "تاريخ" covers "تاريخي",
// "تاريخية", "التاريخية", and "histor" covers "history", "historical".
const CATEGORY_STEMS: Record<LandmarkCategory, string[]> = {
  historical: [
    "تاريخ", "تراث", "قديم", "قلع", "قلاع", "قصر", "قصور", "حصن", "حصون",
    "histor", "heritage", "castle", "palace", "fort",
  ],
  archaeological: ["اثر", "اثار", "نقش", "نقوش", "حضار", "archaeolog", "ancient", "inscription", "ruins"],
  natural: [
    "طبيع", "جبل", "جبال", "وادي", "وديان", "هادي", "هدوء", "غاب", "منتزه", "صحرا", "واحه", "واحات",
    "natur", "mountain", "valley", "forest", "oasis", "desert", "quiet", "hiking",
  ],
  beaches: [
    "شاطي", "شواطي", "بحر", "سباح", "جزير", "جزر", "كورنيش", "غوص", "ساحل",
    "beach", "island", "coast", "swim", "snorkel", "diving", "seaside",
  ],
  urban: [
    "حضري", "حديث", "عصري", "تسوق", "برج", "ابراج", "ترفيه", "مول",
    "urban", "modern", "shopping", "tower", "skyscraper", "entertain", "mall",
  ],
  cultural: ["ثقاف", "متحف", "متاحف", "فنون", "فني", "معرض", "معارض", "cultur", "museum", "gallery", "exhibit"],
};

// Too short to match as prefixes ("فن" would also match "فندق", and "sea"
// would match "search").
const CATEGORY_EXACT: Partial<Record<LandmarkCategory, string[]>> = {
  cultural: ["فن", "art", "arts"],
  beaches: ["sea"],
};

const RELIGIOUS_STEMS = ["دين", "مسجد", "مساجد", "جامع", "اسلام", "mosque", "masjid", "relig", "islam"];

// Words that describe what kind of place a landmark is rather than which
// one — a question containing "جبل" isn't about every landmark named جبل.
const GENERIC_NAME_WORDS = new Set(
  [
    "جبل", "جبال", "قصر", "قلعه", "مسجد", "جامع", "سوق", "متحف", "قريه", "حديقه", "برج",
    "منتزه", "جزيره", "جزر", "شاطي", "بيت", "ملك", "مدينه", "مركز", "واحه", "بلده", "قديمه",
    "تاريخيه", "تاريخي", "تراثيه", "تراثي", "موقع", "اثري", "كورنيش", "حي", "وادي", "بوابه",
    "باب", "غار", "بحيره", "منطقه",
    "mosque", "mountain", "mountains", "king", "palace", "park", "market", "village", "castle",
    "island", "islands", "historical", "museum", "center", "city", "tower", "heritage", "site",
    "beach", "town", "district", "fortress", "archaeological", "traditional",
    "jabal", "mount", "souq", "house", "cave", "rock", "lake", "forest", "the", "and", "for",
  ].map(normalize)
);

// Short forms people use for a multi-word city name.
const CITY_ALIASES: Record<string, string> = {
  مكه: "مكة المكرمة",
};

interface QuestionSignals {
  city: string | null;
  region: string | null;
  categories: LandmarkCategory[];
  religious: boolean;
  // Landmark id → how many distinctive words of its name the question has.
  nameHits: Map<string, number>;
  // Landmarks whose name only shares a city's name with the question.
  cityNameHits: Set<string>;
  // Landmark id → how many of the question's subject words its description has.
  contentHits: Map<string, number>;
}

// Filler words of a question, which say nothing about its subject.
const STOP_WORDS = new Set(
  [
    "في", "من", "عن", "على", "إلى", "ما", "ماذا", "هل", "أين", "وين", "متى", "كيف", "لماذا", "ليش", "كم",
    "هو", "هي", "هذا", "هذه", "ذلك", "هنا", "هناك", "كان", "كانت", "أبغى", "أبي", "أريد", "وش", "ايش",
    "عند", "مع", "بعد", "قبل", "مكان", "أماكن", "معلم", "معالم", "وجهة", "وجهات", "أفضل", "أهم", "أشهر",
    "السعودية", "المملكة", "زيارة", "أزور", "يوم", "أيام", "يومين", "لي", "عنها", "عنه", "فيها", "فيه",
    "the", "and", "what", "where", "when", "which", "who", "how", "was", "were", "are", "did", "does",
    "can", "for", "from", "with", "about", "tell", "place", "places", "landmark", "landmarks", "saudi",
    "arabia", "visit", "best", "there", "this", "that", "have", "has", "show", "some", "any", "near", "you",
  ].flatMap(tokenize)
);

// A description has to share at least this many subject words with the
// question to count as being about it — one shared word is usually chance.
const MIN_CONTENT_HITS = 2;

function analyze(question: string, landmarks: Landmark[]): QuestionSignals {
  const tokens = new Set(tokenize(question));
  const mentions = (place: string, ignore: string[] = []) => {
    const words = tokenize(place).filter((w) => !ignore.includes(w));
    return words.length > 0 && words.every((w) => hasWord(tokens, w));
  };

  const cities = [...new Set(landmarks.map((l) => l.city).filter(Boolean))];
  const regions = [...new Set(landmarks.map((l) => l.region).filter(Boolean))];

  // Longest name first, so "مكة المكرمة" wins over a shorter city that
  // happens to share a word with it.
  // Either name of the place: "العلا" or "AlUla", "المنطقة الشرقية" or
  // "Eastern Province" (ignoring words like "al" and "region").
  const mentionsCity = (c: string) => mentions(c) || mentions(CITY_EN[c] || "", ["al"]);
  const mentionsRegion = (r: string) =>
    mentions(r, ["منطقه"]) || mentions(REGION_EN[r] || "", ["al", "region", "province"]);

  const city =
    cities.sort((a, b) => b.length - a.length).find(mentionsCity) ||
    Object.entries(CITY_ALIASES).find(([alias, target]) => hasWord(tokens, alias) && cities.includes(target))?.[1] ||
    null;
  const region = city ? null : regions.find(mentionsRegion) || null;

  const tokenList = [...tokens];
  const categories = (Object.keys(CATEGORY_STEMS) as LandmarkCategory[]).filter(
    (category) =>
      tokenList.some((t) => CATEGORY_STEMS[category].some((stem) => t.startsWith(stem))) ||
      (CATEGORY_EXACT[category] || []).some((word) => tokens.has(word))
  );
  const religious = tokenList.some((t) => RELIGIOUS_STEMS.some((stem) => t.startsWith(stem)));

  // A city word in a name is counted separately, as a weaker match:
  // "البلدة القديمة بالعلا" isn't being asked about by name just because
  // the question says "العلا" — but "الدرعية (At-Turaif District)", filed
  // under الرياض, should still turn up for a question about الدرعية.
  const cityWords = new Set(cities.flatMap((c) => [...tokenize(c), ...tokenize(CITY_EN[c] || "")]));
  const isCityWord = (w: string) => cityWords.has(w) || cityWords.has(w.replace(/^ب/, ""));
  const nameHits = new Map<string, number>();
  const cityNameHits = new Set<string>();
  for (const landmark of landmarks) {
    const nameWords = [...tokenize(landmark.name), ...tokenize(englishName(landmark) || "")].filter(
      (w) => w.length >= 3 && !GENERIC_NAME_WORDS.has(w)
    );
    const matched = nameWords.filter((w) => hasWord(tokens, w) || hasWord(tokens, w.replace(/^ب/, "")));
    const hits = new Set(matched.filter((w) => !isCityWord(w))).size;
    if (hits > 0) nameHits.set(landmark.id, hits);
    else if (matched.length > 0) cityNameHits.add(landmark.id);
  }

  // Subject words of the question found in a landmark's description — how
  // "أين نزل الوحي أول مرة؟" finds غار حراء, which it never names. Words
  // already handled above (places, kinds of place) are left out, so that a
  // question about "historical mosques" doesn't match every description
  // that happens to say "historical".
  const isTopicWord = (w: string) =>
    Object.values(CATEGORY_STEMS).some((stems) => stems.some((stem) => w.startsWith(stem))) ||
    Object.values(CATEGORY_EXACT).some((words) => words.includes(w)) ||
    RELIGIOUS_STEMS.some((stem) => w.startsWith(stem));
  const subject = tokenList.filter(
    (w) => w.length >= 3 && !STOP_WORDS.has(w) && !GENERIC_NAME_WORDS.has(w) && !isCityWord(w) && !isTopicWord(w)
  );
  const contentHits = new Map<string, number>();
  if (subject.length >= MIN_CONTENT_HITS) {
    for (const landmark of landmarks) {
      const description = new Set(tokenize(`${landmark.facts} ${landmark.keyFacts || ""}`));
      const hits = subject.filter((w) => hasWord(description, w)).length;
      if (hits >= MIN_CONTENT_HITS) contentHits.set(landmark.id, hits);
    }
  }

  return { city, region, categories, religious, nameHits, cityNameHits, contentHits };
}

// Curated/verified landmarks first — they have confirmed facts and photos.
function curation(landmark: Landmark): number {
  return (landmark.featured ? 2 : 0) + (landmark.verified ? 1 : 0);
}

// One landmark per category in turn, so a question with nothing to match on
// ("أماكن مناسبة للعائلة") gets a varied starting set rather than whichever
// category happens to sort first.
function diverse(landmarks: Landmark[], limit: number): Landmark[] {
  const byCategory = new Map<LandmarkCategory, Landmark[]>();
  for (const landmark of [...landmarks].sort((a, b) => curation(b) - curation(a))) {
    byCategory.set(landmark.category, [...(byCategory.get(landmark.category) || []), landmark]);
  }
  const picked: Landmark[] = [];
  while (picked.length < limit) {
    const before = picked.length;
    for (const group of byCategory.values()) {
      const next = group.shift();
      if (next && picked.length < limit) picked.push(next);
    }
    if (picked.length === before) break;
  }
  return picked;
}

// A few seed records carry their English name in parentheses, e.g. "حافة
// العالم (Edge of the World)". The assistant is given, and matched on, the
// Arabic part only — shown the English, it echoes or re-translates it.
export function arabicName(name: string): string {
  return name.replace(/\(([^)]*)\)/g, (group, inner) => (/[A-Za-z]/.test(inner) ? "" : group)).trim() || name;
}

// Landmarks named in a piece of text (used on the assistant's last answer,
// so "tell me more about the second one" still has the right facts).
// Matched on the name without any parenthetical, since the model tends to
// write "مدائن صالح" for the record named "مدائن صالح (الحِجْر)".
export function landmarksMentionedIn(text: string, landmarks: Landmark[]): Landmark[] {
  const haystack = normalize(text);
  return landmarks.filter((l) => {
    const baseName = l.name.replace(/\s*\([^)]*\)/g, "").trim() || l.name;
    return haystack.includes(normalize(baseName));
  });
}

// The city or region a question is about: the one it names or, failing
// that, the most recent one named earlier in the conversation.
export function placeAskedAbout(
  landmarks: Landmark[],
  question: string,
  previousQuestions: string[] = []
): { city: string | null; region: string | null } {
  for (const text of [question, ...[...previousQuestions].reverse()]) {
    const { city, region } = analyze(text, landmarks);
    if (city || region) return { city, region };
  }
  return { city: null, region: null };
}

export interface LandmarkSearchOptions {
  // Earlier user questions in this conversation, oldest first.
  previousQuestions?: string[];
  previousAnswer?: string;
  limit?: number;
}

export function findRelevantLandmarks(
  landmarks: Landmark[],
  question: string,
  { previousQuestions = [], previousAnswer = "", limit = 8 }: LandmarkSearchOptions = {}
): Landmark[] {
  const signals = analyze(question, landmarks);
  const hasTopic =
    signals.categories.length > 0 || signals.religious || signals.nameHits.size > 0 || signals.contentHits.size > 0;

  // A follow-up ("وماذا عن الشواطئ؟") usually still means the city the
  // conversation is about, so inherit the most recent one mentioned.
  let { city, region } = signals;
  let inherited = false;
  if (!city && !region) {
    for (const earlier of [...previousQuestions].reverse()) {
      const past = analyze(earlier, landmarks);
      if (past.city || past.region) {
        ({ city, region } = past);
        inherited = true;
        break;
      }
    }
  }

  const inPlace = (l: Landmark) => (city ? l.city === city : region ? l.region === region : true);
  const topicScore = (l: Landmark) =>
    (signals.categories.includes(l.category) ? 2 : 0) +
    (signals.religious && l.tags?.includes("religious") ? 2 : 0);
  const byScore = (score: (l: Landmark) => number) => (a: Landmark, b: Landmark) =>
    score(b) - score(a) || curation(b) - curation(a);

  // A landmark asked about by name is included wherever it is — "هل برج
  // المملكة في جدة؟" needs the tower's real facts to answer correctly.
  const named = landmarks
    .filter((l) => signals.nameHits.has(l.id))
    .sort(byScore((l) => signals.nameHits.get(l.id) || 0));

  // Landmarks whose description is about what was asked, within the place
  // asked about (if any).
  const describedIn = (candidates: Landmark[]) =>
    candidates.filter((l) => signals.contentHits.has(l.id)).sort(byScore((l) => signals.contentHits.get(l.id) || 0));

  let pool = landmarks.filter(inPlace);
  let onTopic = pool.filter((l) => topicScore(l) > 0).sort(byScore(topicScore));
  let described = describedIn(pool);
  // The inherited city has nothing of the kind now being asked for (beaches
  // after a conversation about AlUla) — the question has moved on from it.
  if (inherited && hasTopic && !onTopic.length && !named.length && !described.length) {
    city = region = null;
    pool = landmarks;
    onTopic = pool.filter((l) => topicScore(l) > 0).sort(byScore(topicScore));
    described = describedIn(pool);
  }

  const result: Landmark[] = [];
  const add = (items: Landmark[]) => {
    for (const item of items) {
      if (result.length < limit && !result.includes(item)) result.push(item);
    }
  };

  add(named);
  add(described);
  add(onTopic);
  add(landmarks.filter((l) => signals.cityNameHits.has(l.id)).sort(byScore(() => 0)));
  if (city || region) {
    // Fill with the rest of the place, so the model can say what the city
    // does have when it has nothing of the kind asked for.
    add([...pool].sort(byScore(() => 0)));
  } else if (!hasTopic) {
    add(landmarksMentionedIn(previousAnswer, landmarks));
    if (!result.length) add(diverse(landmarks, limit));
  }
  return result;
}
