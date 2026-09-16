// One-time migration: consolidates data that used to live in separate
// lookup files (lib/landmark-coords.ts, lib/landmark-images.ts) directly
// onto each Firestore landmark document, so there is a single source of
// truth per landmark instead of three.
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const COORDS = {
  diriyah: { lat: 24.7332, lon: 46.5719 },
  "edge-of-world": { lat: 24.9686, lon: 46.2989 },
  "kingdom-tower": { lat: 24.7113, lon: 46.6748 },
  "faisaliah-tower": { lat: 24.6919, lon: 46.6853 },
  "madain-saleh": { lat: 26.7944, lon: 37.9531 },
  "red-sea": { lat: 25.0213, lon: 37.2685 },
  "asir-mountains": { lat: 18.2409, lon: 42.36 },
  "jeddah-historic": { lat: 21.4858, lon: 39.1925 },
  "jabal-al-hada": { lat: 21.3891, lon: 40.3033 },
};

const IMAGES = {
  diriyah: "/landmarks/diriyah.png",
  "madain-saleh": "/landmarks/madain-saleh.png",
  "red-sea": "/landmarks/red-sea.png",
  "faisaliah-tower": "/landmarks/faisaliah-tower.png",
  "kingdom-tower": "/landmarks/kingdom-tower.png",
  "asir-mountains": "/landmarks/asir-mountains.png",
  "jeddah-historic": "/landmarks/jeddah-historic.png",
  "edge-of-world": "/landmarks/edge-of-world.png",
  // jabal-al-hada: no photo supplied yet
};

const REGION_BY_CITY = {
  الرياض: "منطقة الرياض",
  العلا: "منطقة المدينة المنورة",
  جدة: "منطقة مكة المكرمة",
  أبها: "منطقة عسير",
  أملج: "منطقة تبوك",
  الطائف: "منطقة مكة المكرمة",
};

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const snap = await getDocs(collection(db, "landmarks"));
  for (const d of snap.docs) {
    const data = d.data();
    const coords = COORDS[d.id];
    if (!coords) {
      console.warn(`skip ${d.id}: no coordinates on file`);
      continue;
    }
    const region = REGION_BY_CITY[data.city] || null;
    await updateDoc(doc(db, "landmarks", d.id), {
      latitude: coords.lat,
      longitude: coords.lon,
      image: IMAGES[d.id] || null,
      region,
    });
    console.log(`migrated: ${d.id} (region: ${region}, image: ${IMAGES[d.id] || "none"})`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
