// Applies the reviewed descriptions in scripts/data/landmark-enrichment.json
// to Firestore: for each listed landmark it sets `facts` and `keyFacts`,
// and nothing else.
//
//   node --env-file=.env.local scripts/import-landmark-enrichment.mjs           (preview only)
//   node --env-file=.env.local scripts/import-landmark-enrichment.mjs --apply   (write)
//
// Before writing, the current `facts`/`keyFacts` of every landmark it will
// touch are saved to scripts/data/landmark-enrichment-backup.json, so the
// change can be undone with --restore.
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const DATA = new URL("./data/landmark-enrichment.json", import.meta.url);
const BACKUP = new URL("./data/landmark-enrichment-backup.json", import.meta.url);
const mode = process.argv.includes("--apply") ? "apply" : process.argv.includes("--restore") ? "restore" : "preview";

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

// Writes go through the same anonymous guest sign-in the site itself uses
// (see lib/AuthProvider.tsx) — Firestore's rules reject unauthenticated
// writes. The temporary guest account is removed again at the end.
const guest = mode === "preview" ? null : (await signInAnonymously(getAuth(app))).user;
const finish = async () => {
  await guest?.delete().catch(() => {});
  process.exit(0);
};

if (mode === "restore") {
  const backup = JSON.parse(readFileSync(BACKUP, "utf8"));
  for (const entry of backup) {
    await updateDoc(doc(db, "landmarks", entry.id), {
      facts: entry.facts,
      keyFacts: entry.keyFacts ?? deleteField(),
    });
    console.log("restored", entry.id);
  }
  console.log(`Restored ${backup.length} landmarks.`);
  await finish();
}

const { landmarks } = JSON.parse(readFileSync(DATA, "utf8"));
const backup = [];
const missing = [];
for (const entry of landmarks) {
  const snap = await getDoc(doc(db, "landmarks", entry.id));
  if (!snap.exists()) {
    missing.push(entry.id);
    continue;
  }
  const current = snap.data();
  backup.push({ id: entry.id, facts: current.facts, keyFacts: current.keyFacts ?? null });
  console.log(`\n${entry.id}  (${current.name})`);
  console.log(`  now: ${current.facts}`);
  console.log(`  new: ${entry.facts}`);
}
if (missing.length) console.log(`\nNot in Firestore, skipped: ${missing.join(", ")}`);

if (mode === "preview") {
  console.log(`\nPreview only: ${backup.length} landmarks would be updated. Re-run with --apply to write.`);
  process.exit(0);
}

// Keep the very first backup: a second --apply must not overwrite the
// original values with the already-enriched ones.
if (!existsSync(BACKUP)) writeFileSync(BACKUP, JSON.stringify(backup, null, 2));
let written = 0;
for (const entry of landmarks) {
  if (missing.includes(entry.id)) continue;
  try {
    await updateDoc(doc(db, "landmarks", entry.id), { facts: entry.facts, keyFacts: entry.keyFacts });
    written++;
  } catch (err) {
    console.log(`FAILED ${entry.id}: ${err.code || err}`);
  }
}
console.log(`\nUpdated ${written} of ${backup.length} landmarks. Backup: scripts/data/landmark-enrichment-backup.json`);
await finish();
