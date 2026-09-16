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

const SEED_LANDMARKS = [
  {
    id: "diriyah",
    name: "الدرعية (At-Turaif District)",
    category: "heritage",
    city: "الرياض",
    summary: "المهد التاريخي للدولة السعودية الأولى، وموقع تراث عالمي لليونسكو.",
    facts:
      "تأسست الدرعية عام 1446م وكانت العاصمة الأولى للدولة السعودية الأولى (1727-1818). حي الطريف مبني بالكامل من الطين على الطراز النجدي التقليدي، ويضم قصر سلوى ومسجد الإمام محمد بن سعود. أُدرجت في قائمة التراث العالمي لليونسكو عام 2010.",
  },
  {
    id: "madain-saleh",
    name: "مدائن صالح (الحِجْر)",
    category: "heritage",
    city: "العلا",
    summary: "أول موقع سعودي مسجل في قائمة التراث العالمي لليونسكو، مقابر منحوتة في الصخر.",
    facts:
      "الحِجْر هي ثاني أكبر مدينة للأنباط بعد البتراء في الأردن، وتضم أكثر من 100 مقبرة منحوتة في واجهات صخرية ضخمة يعود تاريخها إلى القرن الأول الميلادي. أُدرجت في قائمة اليونسكو عام 2008.",
  },
  {
    id: "jeddah-historic",
    name: "جدة التاريخية (البلد)",
    category: "historic-district",
    city: "جدة",
    summary: "الحي التاريخي لجدة ببيوته المرجانية الشهيرة والرواشين الخشبية.",
    facts:
      "كانت جدة التاريخية بوابة الحجاج القادمين عبر البحر الأحمر لقرون. تتميز بالبيوت المبنية من الحجر المرجاني والرواشين الخشبية المزخرفة. أُدرجت في قائمة التراث العالمي لليونسكو عام 2014.",
  },
  {
    id: "edge-of-world",
    name: "حافة العالم (Edge of the World)",
    category: "nature",
    city: "الرياض",
    summary: "منحدرات صخرية شاهقة تطل على صحراء شاسعة، من أبرز المعالم الطبيعية قرب الرياض.",
    facts:
      "جزء من جبال طويق، ترتفع المنحدرات لأكثر من 300 متر فوق السهل المحيط. تكونت التضاريس نتيجة عوامل التعرية على مدى ملايين السنين، وهي وجهة شهيرة للتنزه والتصوير.",
  },
  {
    id: "asir-mountains",
    name: "جبال عسير (السودة)",
    category: "nature",
    city: "أبها",
    summary: "أعلى قمم المملكة، مناخ معتدل ومدرجات زراعية تاريخية.",
    facts:
      "تضم منطقة عسير جبل السودة، أعلى نقطة في السعودية بارتفاع يتجاوز 3000 متر. تشتهر المنطقة بالمدرجات الزراعية الحجرية التي بناها المزارعون على مدى قرون، وبمناخها المعتدل صيفًا.",
  },
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const landmark of SEED_LANDMARKS) {
    const { id, ...data } = landmark;
    await setDoc(doc(db, "landmarks", id), data);
    console.log(`seeded: ${id}`);
  }

  console.log(`Done. Seeded ${SEED_LANDMARKS.length} landmarks into Firestore project ${firebaseConfig.projectId}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
