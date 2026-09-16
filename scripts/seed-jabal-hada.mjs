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

const LANDMARK = {
  id: "jabal-al-hada",
  name: "جبل الهدا",
  category: "nature",
  city: "الطائف",
  summary: "طريق جبلي متعرج بإطلالات خلابة يربط الطائف بمكة المكرمة عبر سلسلة جبال السروات.",
  facts:
    "يقع جبل الهدا على طريق الطائف - مكة المكرمة، ويشتهر بمنحدراته الجبلية الحادة وإطلالاته البانورامية على الوديان المحيطة. يضم التلفريك الشهير الذي يربط قمة الجبل بالوادي أسفله، وتنتشر فيه قرود البابون التي تجذب الزوار، إضافة إلى مناخه المعتدل صيفًا الذي يجعله وجهة مفضلة لأهل الطائف ومكة.",
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const { id, ...data } = LANDMARK;
  await setDoc(doc(db, "landmarks", id), data);
  console.log(`seeded: ${id}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
