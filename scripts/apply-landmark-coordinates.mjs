// Applies reviewed coordinates from a JSON file to Firestore.
//
//   node --env-file=.env.local scripts/apply-landmark-coordinates.mjs scripts/data/landmark-coordinates.json [--dry-run] [--replace]
//
// Each entry: { "id": "...", "lat": 24.63, "lon": 46.71, "source": "..." }.
// Safety: only writes the `latitude`/`longitude` fields; skips landmarks that
// don't exist (never creates one); skips landmarks that already have
// coordinates unless --replace is given; rejects anything that isn't a finite
// number inside Saudi Arabia's bounding box.
import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const replace = args.includes("--replace");
if (!file) {
  console.error("Usage: node --env-file=.env.local scripts/apply-landmark-coordinates.mjs <coordinates.json> [--dry-run] [--replace]");
  process.exit(1);
}

const BBOX = { minLat: 16.3, maxLat: 32.2, minLon: 34.4, maxLon: 55.7 };
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function main() {
  const entries = JSON.parse(fs.readFileSync(file, "utf-8"));
  const db = getFirestore(initializeApp(firebaseConfig));
  const applied = [];
  const skipped = [];
  const failed = [];

  for (const e of entries) {
    const { id, lat, lon } = e;
    const valid =
      Number.isFinite(lat) && Number.isFinite(lon) &&
      lat >= BBOX.minLat && lat <= BBOX.maxLat && lon >= BBOX.minLon && lon <= BBOX.maxLon;
    if (!valid) {
      failed.push(`${id} — coordinates missing or outside Saudi Arabia (${lat}, ${lon})`);
      continue;
    }
    const ref = doc(db, "landmarks", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      failed.push(`${id} — no such landmark in Firestore`);
      continue;
    }
    const d = snap.data();
    if (d.latitude != null && d.longitude != null && !replace) {
      skipped.push(`${id} — already has coordinates (${d.latitude}, ${d.longitude})`);
      continue;
    }
    if (!dryRun) await updateDoc(ref, { latitude: lat, longitude: lon });
    applied.push(`${id} -> ${lat}, ${lon}`);
  }

  console.log(`${dryRun ? "[DRY RUN] would set" : "Set"} coordinates on ${applied.length} landmarks`);
  applied.forEach((l) => console.log("  ✓", l));
  console.log(`Skipped (${skipped.length}):`, skipped.join("; ") || "none");
  console.log(`Failed (${failed.length}):`, failed.join("; ") || "none");
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
