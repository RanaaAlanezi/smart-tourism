// Links photos you've already dropped into the project to their landmarks.
//
// How to use: put each photo in public/landmarks/ named exactly like the
// landmark's identifier (e.g. public/landmarks/rajajil-columns.webp), then run:
//   node --env-file=.env.local scripts/link-landmark-images.mjs            (do it)
//   node --env-file=.env.local scripts/link-landmark-images.mjs --dry-run  (preview only)
//   add --replace to also overwrite landmarks that already have an image
//   add alias=<file-id>:<landmark-id> for a file whose name doesn't match its id
//       e.g. alias=king-fahd-fountain:king-fahd-s-fountain
//
// It only ever sets the `image` field of landmarks that ALREADY exist in
// Firestore (never creates a landmark), skips landmarks that already have an
// image unless --replace is given, only accepts jpg/jpeg/png/webp/avif, and
// never moves, renames or deletes any file. A file is looked up in
// public/landmarks/ first, then directly in public/ (exact id match only).
import fs from "node:fs";
import path from "node:path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "avif"]);
const RESERVED = new Set(["hero", "logo"]);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const replace = args.includes("--replace");
const aliases = new Map(
  args
    .filter((a) => a.startsWith("alias="))
    .map((a) => a.slice(6).split(":"))
    .filter((p) => p.length === 2)
);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function scan(dir, urlPrefix) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => fs.statSync(path.join(dir, f)).isFile())
    .map((f) => ({ f, ext: path.extname(f).slice(1).toLowerCase(), url: `${urlPrefix}/${f}`, dir }))
    .filter((x) => ALLOWED_EXT.has(x.ext));
}

async function main() {
  const db = getFirestore(initializeApp(firebaseConfig));
  const snap = await getDocs(collection(db, "landmarks"));
  const landmarks = new Map(snap.docs.map((d) => [d.id, d.data()]));

  // public/landmarks/ wins over public/ if the same id appears in both.
  const candidates = new Map();
  for (const x of [...scan("public", ""), ...scan("public/landmarks", "/landmarks")]) {
    const fileId = path.basename(x.f, "." + x.ext);
    if (RESERVED.has(fileId)) continue;
    candidates.set(fileId, x);
  }

  const linked = [];
  const skipped = [];
  const noLandmark = [];

  for (const [fileId, x] of candidates) {
    const id = aliases.get(fileId) || fileId;
    const data = landmarks.get(id);
    if (!data) {
      // Only report files that look like landmark photos (inside landmarks/).
      if (x.dir.endsWith("landmarks")) noLandmark.push(x.url);
      continue;
    }
    if (data.image && !replace) {
      skipped.push(`${id} (already ${data.image})`);
      continue;
    }
    if (data.image === x.url) continue;
    if (!dryRun) await updateDoc(doc(db, "landmarks", id), { image: x.url });
    linked.push(`${id} -> ${x.url}  [${(fs.statSync(path.join(x.dir, x.f)).size / 1024).toFixed(0)} KB]`);
  }

  const withoutImage = [...landmarks.entries()]
    .filter(([id, d]) => !d.image && !linked.some((l) => l.startsWith(id + " ")))
    .map(([id, d]) => `${id} (${d.name})`);

  console.log(`${dryRun ? "[DRY RUN] would link" : "Linked"} (${linked.length}):`);
  linked.forEach((l) => console.log("  ✓", l));
  console.log(`Skipped, already had an image (${skipped.length}):`, skipped.length ? "\n  " + skipped.join("\n  ") : "");
  console.log(`Files with no matching landmark id (${noLandmark.length}):`, noLandmark.join(", ") || "(none)");
  console.log(`\nLandmarks STILL without any image after this (${withoutImage.length}):`);
  withoutImage.forEach((l) => console.log("  -", l));
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
