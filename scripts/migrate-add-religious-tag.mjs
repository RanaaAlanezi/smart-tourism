// One-time migration: adds tags: ["religious"] to landmarks the existing
// dataset already identifies as mosques or other explicitly religious
// Islamic historical sites. This is metadata only — it never touches
// `category`, so the Explore filter bar is completely unaffected.
//
// Selection was made by scanning every landmark's own name/summary/facts
// for religious keywords (مسجد, جامع, غار, الحرم, قبلتين, ميقات) and then
// manually reviewing each match — nothing here was invented:
//   - 7 are unambiguous mosques (name itself contains "مسجد").
//   - 2 (hira-cave, thawr-cave) are caves whose own dataset descriptions
//     explicitly tie them to core Islamic religious history (the first
//     Quranic revelation and the Hijra, respectively), not to Explore's
//     "natural" category — they're already categorized "historical".
// Excluded: "diriyah" (a keyword false-positive, not a religious site),
// and the mountains "jabal-al-nour"/"jabal-thawr" (the mountain itself
// isn't the religious site — the cave on it is, and that's tagged
// separately above) — tagging them would overreach what the dataset
// actually supports.
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const RELIGIOUS_IDS = [
  "al-jum-ah-mosque",
  "al-tan-im-mosque",
  "hira-cave",
  "masjid-al-haram",
  "prophet-s-mosque",
  "qiblatain-mosque",
  "quba-mosque",
  "thawr-cave",
  "umar-ibn-al-khattab-mosque",
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const id of RELIGIOUS_IDS) {
    await updateDoc(doc(db, "landmarks", id), { tags: ["religious"] });
    console.log(`tagged religious: ${id}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
