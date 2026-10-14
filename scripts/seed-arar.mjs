// Adds the city of Arar (Northern Borders Region) by seeding its landmarks.
//
//   node --env-file=.env.local scripts/seed-arar.mjs
//
// Facts come from Saudipedia (Arar city, Tapline) and the Saudi Press Agency
// report on the region's parks; coordinates from OpenStreetMap. The records
// start unverified, like the other bulk-added ones.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const PLACE = { city: "عرعر", region: "منطقة الحدود الشمالية" };

const ARAR_LANDMARKS = [
  {
    id: "tapline-arar",
    name: "خط التابلاين",
    nameEn: "Tapline (Trans-Arabian Pipeline)",
    category: "historical",
    summary: "خط أنابيب النفط التاريخي الذي نشأت مدينة عرعر على امتداده، وأول موقع تراث صناعي في المملكة.",
    facts:
      "خط التابلاين خط أنابيب لنقل النفط عبر البلاد العربية، يمتد من شرق المملكة إلى ميناء صيدا في لبنان. استغرق إنشاؤه ثلاث سنوات وافتُتح عام 1950، وعُرفت عرعر في خمسينيات القرن العشرين باسم «محطة عرعر للنفط» ونمت المدينة لإسكان العاملين في الخط. توقف العمل به نهائياً عام 1990، واختارته هيئة التراث عام 2020 ليُسجَّل في سجل التراث الصناعي الوطني كأول موقع تراث صناعي في المملكة.",
    keyFacts:
      "Type: historic oil pipeline (Trans-Arabian Pipeline) | Route: eastern Saudi Arabia to Sidon port, Lebanon | Opened: 1950 | Construction time: 3 years | Decommissioned: 1990 | Heritage status: first industrial heritage site in Saudi Arabia, listed 2020 | Link to Arar: the city grew to house the pipeline's workers",
    // The city's own position: the line has no single mapped point in Arar.
    latitude: 30.9816,
    longitude: 41.0165,
  },
  {
    id: "wadi-arar",
    name: "وادي عرعر",
    nameEn: "Wadi Arar",
    category: "natural",
    summary: "وادٍ كبير يمر بمدينة عرعر، وهو من أكبر أودية المملكة.",
    facts:
      "وادي عرعر أحد ثلاثة أودية كبيرة تمر في أراضي عرعر مع وادي بدنة ووادي العويصي، وهي من أكبر أودية المملكة. يمر الوادي بمدينة عرعر، وتُستخرج من ضفاف هذه الأودية صخور الدولوميت والحجر الجيري، وهي من أهم الموارد البيئية في منطقة الحدود الشمالية.",
    keyFacts:
      "Type: large desert valley (wadi) | Location: passes through Arar city | Neighbouring valleys: Wadi Badanah, Wadi Al-Uwaysi | Rock from its banks: dolomite and limestone",
    latitude: 30.9778,
    longitude: 41.0262,
  },
  {
    id: "arar-flower-garden",
    name: "حديقة الزهور",
    nameEn: "Arar Flower Garden",
    category: "urban",
    summary: "حديقة عامة في عرعر تشتهر بمئات الآلاف من الزهور الموسمية.",
    facts:
      "حديقة الزهور من أبرز الوجهات الجمالية في مدينة عرعر، وتبلغ مساحتها نحو 35 ألف متر مربع. تضم أكثر من 350 ألف زهرة موسمية مع أشجار الأكاسيا والجهنمية، وفيها مجمع لألعاب الأطفال، وتستقبل العائلات والزوار على مدار العام.",
    keyFacts:
      "Type: public flower garden | Area: about 35,000 square meters | Flowers: more than 350,000 seasonal flowers | Plants: acacia trees, bougainvillea | Facilities: children's play complex | Run by: Northern Borders Region Municipality",
    // Not on OpenStreetMap, so no map marker until someone locates it.
    latitude: null,
    longitude: null,
  },
  {
    // Name and position from OpenStreetMap; no published description was
    // found, so the facts say no more than that.
    id: "al-nakheel-park-arar",
    name: "منتزه وحديقة النخيل",
    nameEn: "Al-Nakheel Park",
    category: "urban",
    summary: "منتزه وحديقة عامة في مدينة عرعر.",
    facts: "منتزه وحديقة النخيل منتزه عام داخل مدينة عرعر في منطقة الحدود الشمالية، وهو من حدائق المدينة ومتنزهاتها العامة.",
    keyFacts: "Type: public park and garden | Location: inside Arar city, Northern Borders Region",
    latitude: 30.9722,
    longitude: 41.0019,
  },
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  // Firestore's rules reject unauthenticated writes; this is the same guest
  // sign-in the site uses, removed again at the end.
  const guest = (await signInAnonymously(getAuth(app))).user;

  for (const landmark of ARAR_LANDMARKS) {
    const { id, ...data } = landmark;
    await setDoc(
      doc(db, "landmarks", id),
      { ...data, ...PLACE, image: null, verified: false, featured: false },
      { merge: true }
    );
    console.log(`seeded: ${id}`);
  }

  await guest.delete().catch(() => {});
  console.log(`Done. Added ${ARAR_LANDMARKS.length} landmarks in Arar.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
