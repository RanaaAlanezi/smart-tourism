import { Lang, Landmark } from "./types";

// English for the landmark data. Firestore holds the Arabic (plus an
// English name on most records); the English city, region, summary and
// description live here, keyed by landmark id. They are straight
// translations of the Arabic — nothing is added that the Arabic doesn't
// say. A landmark with no entry here falls back to its Arabic text.

export const CITY_EN: Record<string, string> = {
  حائل: "Hail",
  عنيزة: "Unaizah",
  جازان: "Jazan",
  "المدينة المنورة": "Madinah",
  الدمام: "Dammam",
  أبها: "Abha",
  الأحساء: "Al-Ahsa",
  الطائف: "Taif",
  "مكة المكرمة": "Makkah",
  نجران: "Najran",
  الرياض: "Riyadh",
  العلا: "AlUla",
  بريدة: "Buraidah",
  "دومة الجندل": "Dumat Al-Jandal",
  جدة: "Jeddah",
  فرسان: "Farasan",
  الدرعية: "Diriyah",
  جبة: "Jubbah",
  الخبر: "Khobar",
  الظهران: "Dhahran",
  الباحة: "Al-Baha",
  سكاكا: "Sakaka",
  أملج: "Umluj",
  "رجال ألمع": "Rijal Almaa",
  تبوك: "Tabuk",
  ينبع: "Yanbu",
};

export const REGION_EN: Record<string, string> = {
  "منطقة حائل": "Hail Region",
  "منطقة القصيم": "Qassim Region",
  "منطقة جازان": "Jazan Region",
  "منطقة المدينة المنورة": "Madinah Region",
  "المنطقة الشرقية": "Eastern Province",
  "منطقة عسير": "Asir Region",
  "منطقة مكة المكرمة": "Makkah Region",
  "منطقة نجران": "Najran Region",
  "منطقة الرياض": "Riyadh Region",
  "منطقة الجوف": "Al-Jouf Region",
  "منطقة الباحة": "Al-Baha Region",
  "منطقة تبوك": "Tabuk Region",
};

interface LandmarkEnglish {
  // Only for records with no English name in Firestore.
  name?: string;
  summary: string;
  // Only where the description says more than the summary.
  facts?: string;
}

const LANDMARK_EN: Record<string, LandmarkEnglish> = {
  "aja-and-salma-mountains": { summary: "Distinctive mountain scenery surrounding the city of Hail." },
  "al-bassam-heritage-house": { summary: "A traditional Najdi heritage house in Unaizah." },
  "al-dosariyah-castle": { summary: "A historic defensive landmark overlooking the Jazan area." },
  "al-jum-ah-mosque": { summary: "A historic mosque in Madinah." },
  "al-marjan-island": { summary: "A sea island and leisure destination in Dammam." },
  "al-mousokaf-traditional-market": { summary: "A traditional market showcasing local heritage and crafts." },
  "al-muftaha-village": { summary: "An arts and culture village in Abha." },
  "al-qarah-mountain": { summary: "A distinctive mountain formation near Hofuf and the Al-Ahsa oasis." },
  "al-shafa": { summary: "A mountain destination known for its natural scenery and mild climate." },
  "al-tan-im-mosque": { summary: "A well-known mosque and miqat point near Makkah." },
  "al-ukhdud-archaeological-site": { summary: "An important archaeological site in Najran." },
  "al-zal-market": { summary: "A traditional market area known for heritage goods and crafts." },
  "alula-oasis": { summary: "A historic oasis landscape surrounded by AlUla's heritage sites." },
  "alula-old-town": { summary: "A historic mud-brick settlement in AlUla." },
  "asir-mountains": {
    name: "Asir Mountains (Al-Soudah)",
    summary: "The Kingdom's highest peaks, with a mild climate and historic farming terraces.",
    facts:
      "The Asir region is home to Jabal Sawda, the highest point in Saudi Arabia at more than 3,000 meters. The area is known for the stone farming terraces built by farmers over centuries, and for its mild summer climate.",
  },
  "boulevard-city": { summary: "A major entertainment and lifestyle destination in Riyadh." },
  "buraidah-museum": { summary: "A museum presenting local history and heritage." },
  "buraidah-tower": { summary: "A prominent urban landmark in Buraidah." },
  dadan: { summary: "An ancient kingdom and archaeological settlement in AlUla." },
  diriyah: {
    name: "Diriyah (At-Turaif District)",
    summary: "The historic cradle of the First Saudi State and a UNESCO World Heritage Site.",
    facts:
      "Diriyah was founded in 1446 CE and was the first capital of the First Saudi State (1727-1818). The At-Turaif district is built entirely of mud in the traditional Najdi style, and includes Salwa Palace and the Imam Muhammad bin Saud Mosque. It was added to the UNESCO World Heritage List in 2010.",
  },
  "diriyah-gate": { summary: "The main gateway to a major cultural and tourism development in Diriyah." },
  "dumat-al-jandal-lake": { summary: "A large inland lake and leisure destination." },
  "edge-of-world": {
    name: "Edge of the World",
    summary: "Towering cliffs overlooking a vast desert, one of the standout natural landmarks near Riyadh.",
    facts:
      "Part of the Tuwaiq mountains, the cliffs rise more than 300 meters above the surrounding plain. The terrain was shaped by erosion over millions of years, and it is a popular destination for hiking and photography.",
  },
  "elephant-rock": { summary: "A striking natural rock formation in the AlUla desert." },
  "faisaliah-tower": {
    name: "Al Faisaliah Tower",
    summary: "Saudi Arabia's first true skyscraper, with its distinctive golden top.",
    facts:
      "Al Faisaliah Tower was completed in 2000 to a design by British architect Norman Foster, and stands about 267 meters tall. It is known for the golden glass globe at its top, which houses a restaurant overlooking Riyadh, and it was for a time considered the first true skyscraper in Saudi Arabia.",
  },
  "fakieh-aquarium": { summary: "A marine attraction and aquarium on the Jeddah waterfront." },
  "farasan-island-beach": { summary: "A coastal destination in the Farasan Islands." },
  "farasan-islands": { summary: "A Red Sea archipelago known for its beaches, islands and marine life." },
  "hira-cave": { summary: "A historic cave on Jabal Al-Nour." },
  "ibrahim-palace": { summary: "A historic palace and fort in Hofuf." },
  "jabal-al-banat": { summary: "A large ancient tomb area in AlUla." },
  "jabal-al-hada": {
    name: "Jabal Al-Hada",
    summary: "A winding mountain road with stunning views, linking Taif to Makkah through the Sarawat range.",
    facts:
      "Jabal Al-Hada lies on the Taif-Makkah road and is known for its steep mountain slopes and panoramic views over the surrounding valleys. It has the well-known cable car linking the summit to the valley below, and baboons roam the area and attract visitors. Its mild summer climate makes it a favorite destination for the people of Taif and Makkah.",
  },
  "jabal-al-nour": { summary: "A mountain associated with Hira Cave, near Makkah." },
  "jabal-ikmah": { summary: "A rock heritage site known for its ancient inscriptions." },
  "jabal-thawr": { summary: "A mountain south of Makkah, associated with Thawr Cave." },
  "jax-district": { summary: "A creative and cultural district in Diriyah." },
  "jazan-heritage-village": { summary: "A cultural destination showcasing the region's local heritage." },
  "jeddah-historic": {
    name: "Historic Jeddah (Al-Balad)",
    summary: "Jeddah's historic quarter, with its famous coral-stone houses and wooden roshan windows.",
    facts:
      "Historic Jeddah was for centuries the gateway for pilgrims arriving by the Red Sea. It is distinguished by houses built of coral stone and decorated wooden roshan windows. It was added to the UNESCO World Heritage List in 2014.",
  },
  "jubbah-rock-art": { summary: "An important archaeological site with ancient rock carvings." },
  "khobar-corniche": { summary: "A popular seaside promenade on the Arabian Gulf." },
  "king-abdulaziz-center-for-world-culture-ithra": {
    summary: "A large cultural center with museums, exhibitions, a library and events.",
  },
  "king-abdulaziz-historical-center": { summary: "A cultural and historical complex in central Riyadh." },
  "king-abdullah-financial-district": { summary: "A major modern business and architectural district in Riyadh." },
  "king-abdullah-park": { summary: "A large public park and leisure destination." },
  "king-fahd-s-fountain": { summary: "A famous sea fountain in Jeddah." },
  "king-salman-park": { summary: "A major urban park project in Riyadh." },
  "kingdom-tower": {
    name: "Kingdom Tower",
    summary: "One of the icons of the Riyadh skyline, with its distinctive tower and famous sky bridge.",
    facts:
      "Kingdom Tower opened in 2002 in the Al Olaya district of Riyadh, and stands about 302 meters tall with 99 floors. It is distinguished by its unique design in the shape of an inverted arch, and includes the Sky Bridge, which connects its two upper ends and offers a panoramic view of the city, as well as a hotel, a shopping center and offices.",
  },
  "madain-saleh": {
    name: "Mada'in Salih (Hegra)",
    summary: "The first Saudi site on the UNESCO World Heritage List, with tombs carved into the rock.",
    facts:
      "Hegra is the second-largest Nabataean city after Petra in Jordan, with more than 100 tombs carved into huge rock facades dating back to the 1st century CE. It was added to the UNESCO list in 2008.",
  },
  "makkah-gate": { summary: "A historic gate associated with the old city of Jeddah." },
  "marid-castle": { summary: "A historic fort overlooking Dumat Al-Jandal." },
  "masjid-al-haram": { summary: "The Grand Mosque surrounding the Kaaba, and one of the holiest places in Islam." },
  "masmak-fortress": { summary: "A historic fort and prominent landmark in central Riyadh." },
  "mount-uhud": { summary: "A historic mountain and major landmark north of Madinah." },
  "murabba-palace": { summary: "A historic palace associated with the early modern history of Riyadh." },
  "naseef-house": { summary: "A historic house and prominent landmark in the Al-Balad district." },
  "national-museum-of-saudi-arabia": {
    summary: "A major national museum presenting the history and heritage of Saudi Arabia.",
  },
  "prophet-s-mosque": { summary: "A major Islamic landmark and mosque in Madinah." },
  "qaisariyah-souq": { summary: "A historic traditional market in Hofuf." },
  "qiblatain-mosque": { summary: "A historic mosque associated with the change of the qibla." },
  "quba-mosque": { summary: "A historic mosque in Madinah." },
  "raghadan-forest": { summary: "A mountain forest and leisure destination in Al-Baha." },
  "rajajil-columns": { summary: "Ancient stone columns forming a distinctive archaeological site." },
  "red-sea": {
    name: "The Red Sea",
    summary: "Pristine beaches and coral reefs on one of the least disturbed coastlines in the world.",
    facts:
      "Saudi Arabia's Red Sea coast has coral reefs considered among the least damaged in the world, and is home to more than 1,100 species of fish. The Umluj area is known for its clear turquoise waters, which earned it the nickname 'the Maldives of Saudi Arabia'. The region hosts the luxury, sustainable Red Sea tourism project, along with opportunities for diving and boat trips.",
  },
  "rijal-almaa-heritage-village": {
    summary: "A historic mountain village known for its traditional stone architecture.",
  },
  "salwa-palace": { summary: "A historic palace complex in the At-Turaif district of Diriyah." },
  "saqifah-bani-sa-idah": { summary: "A historic site in the heart of old Madinah." },
  "shada-palace": { summary: "A historic palace and heritage landmark in Abha." },
  "shubra-palace": { summary: "A historic palace and architectural landmark in Taif." },
  "souq-okaz": { summary: "A cultural destination inspired by the historic Souq Okaz." },
  "tabuk-castle": { summary: "A historic fort in the city of Tabuk." },
  "thawr-cave": { summary: "A historic cave on Jabal Thawr." },
  "thee-ain-heritage-village": { summary: "A heritage village built of stone on a mountain slope." },
  "umar-ibn-al-khattab-mosque": { summary: "A historic mosque near Marid Castle and the old town." },
  "wadi-hanifah": { summary: "A major valley and natural landmark running through the city of Riyadh." },
  "yanbu-sharm": { summary: "A coastal destination on the Red Sea." },
  "za-abal-castle": { summary: "A historic castle overlooking Sakaka." },
};

export function englishName(landmark: Landmark): string | undefined {
  return landmark.nameEn || LANDMARK_EN[landmark.id]?.name;
}

// The landmark as it should be shown in `lang`. Arabic is returned as-is;
// English swaps in whatever English exists, field by field.
export function localizeLandmark<T extends Landmark>(landmark: T, lang: Lang): T {
  if (lang === "ar") return landmark;
  const english = LANDMARK_EN[landmark.id];
  return {
    ...landmark,
    name: englishName(landmark) || landmark.name,
    city: CITY_EN[landmark.city] || landmark.city,
    region: REGION_EN[landmark.region] || landmark.region,
    summary: english?.summary || landmark.summary,
    facts: english?.facts || english?.summary || landmark.facts,
  };
}

export function localizeLandmarks<T extends Landmark>(landmarks: T[], lang: Lang): T[] {
  return lang === "ar" ? landmarks : landmarks.map((l) => localizeLandmark(l, lang));
}

// The Arabic city name for a city shown in either language — for lookups
// (e.g. weather) that are keyed by the Arabic name.
export function arabicCity(city: string): string {
  return Object.keys(CITY_EN).find((arabic) => CITY_EN[arabic] === city) || city;
}
