// One-time migration: adds a short "Label: value" keyFacts string per
// landmark, used only as AI grounding context (see lib/types.ts comment).
// Found empirically: the local quantized Qwen model reliably garbles
// numbers pulled from Arabic prose (e.g. "302 meters" -> "302 months")
// but gets them right when given as short English-labeled facts.
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

const KEY_FACTS = {
  diriyah:
    "Founded: 1446 CE | Role: first capital of the First Saudi State (1727-1818) | Style: Najdi mud-brick | Includes: Salwa Palace, Imam Muhammad bin Saud Mosque | UNESCO listing: 2010",
  "madain-saleh":
    "Civilization: Nabataean | Rank: second-largest Nabataean city after Petra | Tombs: over 100 carved rock facades | Era: 1st century CE | UNESCO listing: 2008 (Saudi Arabia's first)",
  "jeddah-historic":
    "Area: Al-Balad, Jeddah | Historic role: pilgrim gateway via the Red Sea | Architecture: coral-stone houses, wooden roshan balconies | UNESCO listing: 2014",
  "edge-of-world":
    "Location: Jebel Tuwaiq range, near Riyadh | Cliff height: about 300 meters | Formed by: erosion over millions of years | Activity: hiking, photography",
  "asir-mountains":
    "Peak: Jebel Sawda | Height: over 3,000 meters (Saudi Arabia's highest point) | Region: Asir, near Abha | Feature: stone agricultural terraces | Climate: mild in summer",
  "kingdom-tower":
    "Height: 302 meters | Floors: 99 | Opened: 2002 | Location: Al Olaya district, Riyadh | Notable feature: Sky Bridge connecting the two upper legs",
  "faisaliah-tower":
    "Height: 267 meters | Completed: 2000 | Architect: Norman Foster | Notable feature: golden globe at the top housing a restaurant | Historical note: one of Saudi Arabia's first skyscrapers",
  "red-sea":
    "Location: Umluj coast | Feature: coral reefs, over 1,100 fish species | Nickname: Maldives of Saudi Arabia | Project: Red Sea Global luxury tourism development",
  "jabal-al-hada":
    "Location: Taif-Mecca road | Feature: cable car (teleferique) connecting the summit to the valley | Wildlife: baboons | Climate: mild in summer",
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const [id, keyFacts] of Object.entries(KEY_FACTS)) {
    await updateDoc(doc(db, "landmarks", id), { keyFacts });
    console.log(`updated: ${id}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
