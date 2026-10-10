// READ-ONLY step: proposes coordinates for landmarks that don't have any,
// using OpenStreetMap's public Nominatim geocoder (a real, sourced dataset —
// nothing here is guessed). Writes a review report to a JSON file and prints
// a summary; it does NOT touch Firestore. Apply approved rows afterwards with
// scripts/apply-landmark-coordinates.mjs.
//
//   node --env-file=.env.local scripts/propose-landmark-coordinates.mjs <report.json>
//
// How a candidate is chosen: each landmark is searched by English name
// (when the dataset has one) and by Arabic name + city, restricted to Saudi
// Arabia; the candidate closest to that landmark's own city centre wins.
// Status: ok = within 35 km of the city centre, review = 35-120 km (could be a
// legitimately remote site or a wrong match — look at it), far/none = don't use.
import fs from "node:fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const OUT = process.argv[2];
if (!OUT) {
  console.error("Usage: node --env-file=.env.local scripts/propose-landmark-coordinates.mjs <report.json>");
  process.exit(1);
}

const UA = "SmartTourismApp/1.0 (student project)";
const BBOX = { minLat: 16.3, maxLat: 32.2, minLon: 34.4, maxLon: 55.7 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function km(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

let lastCall = 0;
async function search(q, extra = "") {
  // Nominatim usage policy: at most 1 request/second, identify the app.
  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=sa&accept-language=en${extra}&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return [];
    return (await res.json())
      .map((r) => ({ lat: Number(r.lat), lon: Number(r.lon), display: r.display_name, type: `${r.category || r.class}/${r.type}` }))
      .filter((r) => Number.isFinite(r.lat) && r.lat >= BBOX.minLat && r.lat <= BBOX.maxLat && r.lon >= BBOX.minLon && r.lon <= BBOX.maxLon);
  } catch {
    return [];
  }
}

async function main() {
  const db = getFirestore(initializeApp(firebaseConfig));
  const snap = await getDocs(collection(db, "landmarks"));
  const missing = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((l) => l.latitude == null || l.longitude == null);
  console.log(`${missing.length} landmarks without coordinates (of ${snap.size})`);

  const cityCentre = new Map();
  for (const city of [...new Set(missing.map((l) => l.city))]) {
    let r = await search(city, "&featuretype=settlement");
    if (!r.length) r = await search(city);
    if (r.length) cityCentre.set(city, r[0]);
  }
  console.log(`resolved ${cityCentre.size} city centres`);

  const rows = [];
  for (const l of missing) {
    const centre = cityCentre.get(l.city) || null;
    let candidates = [];
    if (l.nameEn) candidates.push(...(await search(l.nameEn)));
    candidates.push(...(await search(`${l.name} ${l.city}`)));
    // drop exact-duplicate points, then rank by distance to the city centre
    candidates = candidates.filter((c, i, a) => a.findIndex((x) => x.lat === c.lat && x.lon === c.lon) === i);
    let best = null;
    if (candidates.length) {
      best = centre
        ? candidates.map((c) => ({ ...c, distKm: km(c, centre) })).sort((a, b) => a.distKm - b.distKm)[0]
        : { ...candidates[0], distKm: null };
    }
    let status = "none";
    if (best) status = best.distKm == null ? "review" : best.distKm <= 35 ? "ok" : best.distKm <= 120 ? "review" : "far";
    rows.push({
      id: l.id,
      name: l.name,
      nameEn: l.nameEn || null,
      city: l.city,
      status,
      lat: best ? Number(best.lat.toFixed(5)) : null,
      lon: best ? Number(best.lon.toFixed(5)) : null,
      distKm: best?.distKm != null ? Math.round(best.distKm) : null,
      matched: best?.display || null,
      osmType: best?.type || null,
    });
    process.stdout.write(".");
  }
  console.log("");

  fs.writeFileSync(OUT, JSON.stringify(rows, null, 2), "utf-8");
  const count = (s) => rows.filter((r) => r.status === s).length;
  console.log(`ok: ${count("ok")} | review: ${count("review")} | far: ${count("far")} | none: ${count("none")}`);
  console.log(`report written to ${OUT}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
