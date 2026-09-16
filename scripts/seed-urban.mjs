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

const URBAN_LANDMARKS = [
  {
    id: "kingdom-tower",
    name: "برج المملكة",
    category: "urban",
    city: "الرياض",
    summary: "أحد أبرز رموز أفق الرياض، ببرجه المميز وجسره العلوي الشهير.",
    facts:
      "افتُتح برج المملكة عام 2002 في حي العليا بالرياض، ويبلغ ارتفاعه نحو 302 مترًا بـ99 طابقًا. يتميز بتصميمه الفريد على شكل قوس مقلوب، ويضم جسر السماء (Sky Bridge) الذي يربط بين طرفيه العلويين ويوفر إطلالة بانورامية على المدينة، إضافة إلى فندق ومركز تسوق ومكاتب.",
  },
  {
    id: "faisaliah-tower",
    name: "برج الفيصلية",
    category: "urban",
    city: "الرياض",
    summary: "أول ناطحة سحاب حقيقية في السعودية، بقمته الذهبية المميزة.",
    facts:
      "اكتمل برج الفيصلية عام 2000 بتصميم المعماري البريطاني نورمان فوستر، ويبلغ ارتفاعه نحو 267 مترًا. يشتهر بكرته الزجاجية الذهبية في القمة التي تضم مطعمًا يطل على الرياض، وكان يُعد لفترة أول ناطحة سحاب حقيقية في المملكة العربية السعودية.",
  },
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const landmark of URBAN_LANDMARKS) {
    const { id, ...data } = landmark;
    await setDoc(doc(db, "landmarks", id), data, { merge: true });
    console.log(`seeded: ${id}`);
  }

  console.log(`Done. Added ${URBAN_LANDMARKS.length} urban landmarks.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
