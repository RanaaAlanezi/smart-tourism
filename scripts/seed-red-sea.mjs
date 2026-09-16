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
  id: "red-sea",
  name: "البحر الأحمر",
  category: "nature",
  city: "أملج",
  summary: "شواطئ وشعاب مرجانية نقية على أحد أقل السواحل البحرية اضطرابًا في العالم.",
  facts:
    "يضم الساحل السعودي على البحر الأحمر شعابًا مرجانية تُعد من الأقل تضررًا عالميًا، وموطنًا لأكثر من 1100 نوع من الأسماك. تشتهر منطقة أملج بمياهها الفيروزية الصافية التي أكسبتها لقب 'مالديف السعودية'، وتحتضن المنطقة مشروع البحر الأحمر السياحي الفاخر والمستدام، إضافة إلى فرص الغطس والرحلات البحرية.",
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
