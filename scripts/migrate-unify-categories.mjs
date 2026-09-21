// One-time migration: moves the 9 existing landmarks from the old 4-value
// category scheme (heritage/nature/historic-district/urban) onto the new
// unified 6-value LandmarkCategory scheme shared with the seed dataset
// (historical/archaeological/natural/beaches/urban/cultural), and marks all
// 9 as `featured` so they keep appearing in the homepage's curated section
// once bulk-imported seed landmarks (unfeatured by default) are added.
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

// red-sea moves nature -> beaches (not natural) to match how the seed
// dataset itself classifies "Red Sea Coast of Umluj" (category: Beaches).
const NEW_CATEGORY = {
  diriyah: "historical",
  "madain-saleh": "historical",
  "jeddah-historic": "historical",
  "edge-of-world": "natural",
  "asir-mountains": "natural",
  "jabal-al-hada": "natural",
  "kingdom-tower": "urban",
  "faisaliah-tower": "urban",
  "red-sea": "beaches",
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const [id, category] of Object.entries(NEW_CATEGORY)) {
    await updateDoc(doc(db, "landmarks", id), { category, featured: true, verified: true });
    console.log(`updated: ${id} -> category=${category}, featured=true, verified=true`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
