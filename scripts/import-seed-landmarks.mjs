// One-time bulk import of the curated 95-record Saudi landmarks seed
// dataset (smart_tourism_saudi_landmarks_seed.json). 13 records that
// duplicate an existing Firestore landmark (by name/location) are skipped;
// the remaining 82 are written as new landmark docs, keyed by the
// dataset's own `slug`. Per the import instructions: coordinates and
// images are left null/empty (never invented), category is lowercased
// onto the app's LandmarkCategory scheme, and Arabic summary/facts are a
// faithful translation of the dataset's short English description only —
// no new specifics are added beyond what the source gives.
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const SEED_PATH = "C:\\Users\\rana0\\Downloads\\smart_tourism_saudi_landmarks_seed.json";

// Records that duplicate one of the 9 landmarks already in Firestore
// (matched by name + location), identified by their dataset `id`.
const SKIP_IDS = new Set([
  "sa-0001", // At-Turaif District (Diriyah) -> existing "diriyah"
  "sa-0002", // At-Turaif District -> existing "diriyah"
  "sa-0005", // Edge of the World -> existing "edge-of-world"
  "sa-0006", // Kingdom Centre -> existing "kingdom-tower"
  "sa-0007", // Al Faisaliah Tower -> existing "faisaliah-tower"
  "sa-0028", // Hegra (Al-Hijr) -> existing "madain-saleh"
  "sa-0038", // Asir Mountains -> existing "asir-mountains"
  "sa-0039", // Al-Soudah Park -> same Jabal Sawda area as "asir-mountains"
  "sa-0040", // Jabal Soudah -> same Jabal Sawda area as "asir-mountains"
  "sa-0073", // Al-Hada Mountain -> existing "jabal-al-hada"
  "sa-0077", // Historic Jeddah (Al-Balad) -> existing "jeddah-historic"
  "sa-0083", // Red Sea Coast of Umluj -> existing "red-sea"
  "sa-0084", // Umluj Islands -> same Umluj coast as "red-sea"
]);

const CATEGORY_MAP = {
  Historical: "historical",
  Archaeological: "archaeological",
  Natural: "natural",
  Beaches: "beaches",
  Urban: "urban",
  Cultural: "cultural",
};

// Faithful Arabic translation of each record's short `descriptionEn`,
// keyed by dataset `id`. Deliberately no added specifics (dates, heights,
// visitor stats) beyond what the English source states — the seed's own
// `descriptionAr` is empty for every record, and the import instructions
// say not to invent facts.
const AR_DESCRIPTIONS = {
  "sa-0003": "مجمع قصر تاريخي في حي الطريف بالدرعية.",
  "sa-0004": "وادٍ رئيسي ومعلم طبيعي يمتد عبر مدينة الرياض.",
  "sa-0008": "مجمع ثقافي وتاريخي في وسط الرياض.",
  "sa-0009": "متحف وطني رئيسي يعرض تاريخ وتراث المملكة العربية السعودية.",
  "sa-0010": "قصر تاريخي مرتبط بالتاريخ الحديث المبكر لمدينة الرياض.",
  "sa-0011": "حصن تاريخي ومعلم بارز في وسط الرياض.",
  "sa-0012": "منطقة سوق تقليدية تشتهر بالمنتجات والحرف التراثية.",
  "sa-0013": "بوابة رئيسية لمشروع تطوير ثقافي وسياحي كبير في الدرعية.",
  "sa-0014": "حديقة عامة كبيرة ووجهة ترفيهية.",
  "sa-0015": "المسجد الكبير المحيط بالكعبة، وأحد أقدس الأماكن في الإسلام.",
  "sa-0016": "جبل مرتبط بغار حراء بالقرب من مكة المكرمة.",
  "sa-0017": "كهف تاريخي يقع على جبل النور.",
  "sa-0018": "جبل يقع جنوب مكة المكرمة ويرتبط بغار ثور.",
  "sa-0019": "كهف تاريخي يقع على جبل ثور.",
  "sa-0020": "مسجد معروف ونقطة ميقات بالقرب من مكة المكرمة.",
  "sa-0021": "معلم إسلامي رئيسي ومسجد في المدينة المنورة.",
  "sa-0022": "مسجد تاريخي في المدينة المنورة.",
  "sa-0023": "جبل تاريخي ومعلم رئيسي شمال المدينة المنورة.",
  "sa-0024": "مقبرة تاريخية بالقرب من جبل أحد.",
  "sa-0025": "مسجد تاريخي مرتبط بتحويل القبلة.",
  "sa-0026": "مسجد تاريخي في المدينة المنورة.",
  "sa-0027": "موقع تاريخي في قلب المدينة المنورة القديمة.",
  "sa-0029": "تكوين صخري طبيعي بارز في صحراء العلا.",
  "sa-0030": "مستوطنة تاريخية من الطوب اللبن في العلا.",
  "sa-0031": "موقع تراثي صخري يشتهر بالنقوش القديمة.",
  "sa-0032": "مملكة ومستوطنة أثرية قديمة في العلا.",
  "sa-0033": "منطقة مقابر ضخمة قديمة في العلا.",
  "sa-0034": "منظر طبيعي لواحة تاريخية تحيط بها مواقع تراث العلا.",
  "sa-0035": "وادٍ خلاب يشتهر بالمنحدرات الرملية والنخيل والينابيع الطبيعية.",
  "sa-0036": "حصن تاريخي في مدينة تبوك.",
  "sa-0037": "ينبوع تاريخي مرتبط بمنطقة تبوك.",
  "sa-0041": "قرية جبلية تاريخية تشتهر بعمارتها الحجرية التقليدية.",
  "sa-0042": "قصر تاريخي ومعلم تراثي في أبها.",
  "sa-0043": "قرية فنية وثقافية في أبها.",
  "sa-0044": "معلم جبلي يشتهر بمنحدراته ومناظره الخلابة.",
  "sa-0045": "وادٍ ضيق ومعلم طبيعي في منطقة جازان.",
  "sa-0046": "أرخبيل في البحر الأحمر يشتهر بالشواطئ والجزر والبيئة البحرية.",
  "sa-0047": "وجهة ساحلية في جزر فرسان.",
  "sa-0048": "معلم دفاعي تاريخي يطل على منطقة جازان.",
  "sa-0049": "وجهة ثقافية تعرض التراث المحلي للمنطقة.",
  "sa-0050": "مركز ثقافي كبير يضم متاحف ومعارض ومكتبة وفعاليات.",
  "sa-0051": "ممشى بحري شهير على الخليج العربي.",
  "sa-0052": "جزيرة بحرية ووجهة ترفيهية في الدمام.",
  "sa-0053": "منطقة ترفيهية بحرية كبيرة على الخليج العربي.",
  "sa-0054": "قصر وحصن تاريخي في الهفوف.",
  "sa-0055": "تكوين جبلي مميز بالقرب من الهفوف وواحة الأحساء.",
  "sa-0056": "واحة تاريخية ومنظر زراعي رئيسي.",
  "sa-0057": "سوق تقليدي تاريخي في الهفوف.",
  "sa-0058": "سوق تقليدي يعرض التراث والحرف المحلية.",
  "sa-0059": "بيت تراثي نجدي تقليدي في عنيزة.",
  "sa-0060": "معلم حضري بارز في بريدة.",
  "sa-0061": "متحف يعرض التاريخ والتراث المحلي.",
  "sa-0062": "مناظر جبلية مميزة تحيط بمدينة حائل.",
  "sa-0063": "حصن تاريخي يطل على مدينة حائل.",
  "sa-0064": "موقع أثري مهم يضم نقوشاً صخرية قديمة.",
  "sa-0065": "موقع فني صخري ما قبل التاريخ رئيسي في منطقة حائل.",
  "sa-0066": "معلم معماري تاريخي في نجران.",
  "sa-0067": "موقع أثري مهم في نجران.",
  "sa-0068": "قصر تراثي تقليدي في نجران.",
  "sa-0069": "معلم دفاعي تاريخي في نجران.",
  "sa-0070": "قرية تراثية مبنية بالحجارة على منحدر جبلي.",
  "sa-0071": "غابة جبلية ووجهة ترفيهية في الباحة.",
  "sa-0072": "حديقة حضرية وترفيهية في الباحة.",
  "sa-0074": "وجهة جبلية تشتهر بمناظرها الطبيعية ومناخها المعتدل.",
  "sa-0075": "قصر تاريخي ومعلم معماري في الطائف.",
  "sa-0076": "وجهة ثقافية مستوحاة من سوق عكاظ التاريخي.",
  "sa-0078": "بيت تاريخي ومعلم بارز في حي البلد.",
  "sa-0079": "بوابة تاريخية مرتبطة بمدينة جدة القديمة.",
  "sa-0080": "نافورة بحرية شهيرة في جدة.",
  "sa-0081": "وجهة بحرية رئيسية على البحر الأحمر.",
  "sa-0082": "معلم بحري وأكواريوم على واجهة جدة.",
  "sa-0085": "وجهة ساحلية على البحر الأحمر.",
  "sa-0086": "منطقة ترفيهية بحرية سياحية في ينبع.",
  "sa-0087": "قلعة تاريخية تطل على سكاكا.",
  "sa-0088": "أعمدة حجرية قديمة تشكل موقعاً أثرياً مميزاً.",
  "sa-0089": "حصن تاريخي يطل على دومة الجندل.",
  "sa-0090": "مسجد تاريخي بالقرب من قلعة مارد والبلدة القديمة.",
  "sa-0091": "بحيرة داخلية كبيرة ووجهة ترفيهية.",
  "sa-0092": "حي أعمال ومعماري حديث رئيسي في الرياض.",
  "sa-0093": "مشروع حديقة حضرية كبير في الرياض.",
  "sa-0094": "وجهة ترفيهية ونمط حياة رئيسية في الرياض.",
  "sa-0095": "حي إبداعي وثقافي في الدرعية.",
};

async function main() {
  const raw = JSON.parse(readFileSync(SEED_PATH, "utf-8"));
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  let written = 0;
  let skipped = 0;
  const missingTranslation = [];

  for (const record of raw) {
    if (SKIP_IDS.has(record.id)) {
      skipped++;
      continue;
    }
    const summary = AR_DESCRIPTIONS[record.id];
    if (!summary) {
      missingTranslation.push(record.id);
      continue;
    }
    const category = CATEGORY_MAP[record.category];
    if (!category) {
      throw new Error(`Unknown category "${record.category}" for ${record.id}`);
    }

    await setDoc(
      doc(db, "landmarks", record.slug),
      {
        name: record.nameAr,
        nameEn: record.nameEn,
        category,
        city: record.city,
        region: record.region,
        summary,
        facts: summary,
        image: record.imageUrl || null,
        latitude: record.latitude,
        longitude: record.longitude,
        verified: false,
        featured: Boolean(record.isFeatured),
      },
      { merge: true }
    );
    written++;
    console.log(`wrote: ${record.slug}`);
  }

  if (missingTranslation.length) {
    console.error("Missing Arabic translation for:", missingTranslation);
    process.exit(1);
  }

  console.log(`Done. Written: ${written}, skipped as duplicates: ${skipped}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
