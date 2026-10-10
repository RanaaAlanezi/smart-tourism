// Adds real, user-supplied photos to landmarks WITHOUT Firebase Storage
// (which needs the paid Blaze plan): each file is copied into
// public/landmarks/<landmark-id>.<ext> — the same place the project's
// first 9 landmark photos already live — and only that landmark's
// `image` field in Firestore is updated to point at it.
//
// Usage (from the project root):
//   node --env-file=.env.local scripts/add-local-landmark-image.mjs [--replace] <id>=<path> [<id>=<path> ...]
//
// Example:
//   node --env-file=.env.local scripts/add-local-landmark-image.mjs \
//     masmak-fortress="C:\Users\me\Downloads\masmak.jpg" \
//     rijal-almaa-heritage-village="C:\Users\me\Downloads\rijal.png"
//
// Safety: refuses ids that don't exist in Firestore (never creates a
// landmark), skips landmarks that already have an image unless --replace
// is passed, only accepts jpg/jpeg/png/webp, and never deletes any file.
import fs from "node:fs";
import path from "node:path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const PUBLIC_DIR = path.resolve("public", "landmarks");

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const pairs = args.filter((a) => a !== "--replace");

if (!pairs.length) {
  console.error("No <id>=<path> pairs given. See the usage comment at the top of this file.");
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function main() {
  const db = getFirestore(initializeApp(firebaseConfig));
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const summary = { added: [], skipped: [], failed: [] };

  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq < 1) {
      summary.failed.push(`${pair} — expected <id>=<path>`);
      continue;
    }
    const id = pair.slice(0, eq).trim();
    const src = pair.slice(eq + 1).trim().replace(/^"|"$/g, "");
    const ext = path.extname(src).slice(1).toLowerCase();

    if (!fs.existsSync(src)) {
      summary.failed.push(`${id} — source file not found: ${src}`);
      continue;
    }
    if (!ALLOWED_EXT.has(ext)) {
      summary.failed.push(`${id} — unsupported file type ".${ext}" (allowed: jpg, jpeg, png, webp)`);
      continue;
    }

    const ref = doc(db, "landmarks", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      summary.failed.push(`${id} — no landmark with this id in Firestore (nothing was created)`);
      continue;
    }
    const existing = snap.data().image;
    if (existing && !replace) {
      summary.skipped.push(`${id} — already has an image (${existing}); pass --replace to overwrite`);
      continue;
    }

    const destName = `${id}.${ext}`;
    fs.copyFileSync(src, path.join(PUBLIC_DIR, destName));
    await updateDoc(ref, { image: `/landmarks/${destName}` });
    summary.added.push(`${id} -> /landmarks/${destName} (${snap.data().name})`);
  }

  console.log(`\nAdded (${summary.added.length}):`);
  summary.added.forEach((l) => console.log("  ✓", l));
  console.log(`Skipped (${summary.skipped.length}):`);
  summary.skipped.forEach((l) => console.log("  ↷", l));
  console.log(`Failed (${summary.failed.length}):`);
  summary.failed.forEach((l) => console.log("  ✕", l));
  process.exit(summary.failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
