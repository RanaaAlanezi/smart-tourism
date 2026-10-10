"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthProvider";

// Favorites live in the browser first and are mirrored to Firestore when it
// accepts them. Saving therefore works for every visitor straight away —
// including when Firestore's rules reject the write, which used to make the
// heart flip back off — and a visitor whose favorites are in the cloud still
// gets them on a new device.

const STORAGE_KEY = "smart-tourism-favorites";
const CHANGE_EVENT = "smart-tourism-favorites-change";
const EMPTY: ReadonlySet<string> = new Set();

// Used when the browser refuses localStorage (e.g. private mode), so
// favorites still work for the current visit.
let fallback = "[]";
// useSyncExternalStore needs the same Set back until the data changes.
let cachedRaw = "";
let cachedIds: ReadonlySet<string> = EMPTY;

function readIds(): ReadonlySet<string> {
  let raw = fallback;
  try {
    raw = localStorage.getItem(STORAGE_KEY) ?? fallback;
  } catch {
    // Kept in `fallback` for this visit.
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedIds = new Set(JSON.parse(raw) as string[]);
    } catch {
      cachedIds = EMPTY;
    }
  }
  return cachedIds;
}

function writeIds(ids: Iterable<string>) {
  fallback = JSON.stringify([...ids]);
  try {
    localStorage.setItem(STORAGE_KEY, fallback);
  } catch {
    // Kept in `fallback` for this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useFavorites() {
  const { user } = useAuth();
  const favoriteIds = useSyncExternalStore(subscribe, readIds, () => EMPTY);
  // Guards against the cloud fetch resolving *after* the user has already
  // toggled a favorite (e.g. a slow network right after navigation) and
  // bringing back something they just removed.
  const hasMutatedRef = useRef(false);

  // Pull in favorites saved to the cloud from another browser or device.
  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "favorites"))
      .then((snap) => {
        if (hasMutatedRef.current || snap.empty) return;
        writeIds(new Set([...readIds(), ...snap.docs.map((d) => d.id)]));
      })
      .catch((err) => console.warn("could not load cloud favorites", err));
  }, [user]);

  const toggleFavorite = useCallback(
    async (landmarkId: string) => {
      hasMutatedRef.current = true;
      const next = new Set(readIds());
      const wasFavorited = next.has(landmarkId);
      if (wasFavorited) next.delete(landmarkId);
      else next.add(landmarkId);
      writeIds(next);

      if (!user) return;
      const ref = doc(db, "users", user.uid, "favorites", landmarkId);
      try {
        if (wasFavorited) await deleteDoc(ref);
        else await setDoc(ref, { landmarkId, savedAt: serverTimestamp() });
      } catch (err) {
        // The favorite is already saved in this browser; only the cloud
        // copy is missing.
        console.warn("could not sync favorite to the cloud", err);
      }
    },
    [user]
  );

  // `loading` and `signedIn` are kept for callers written when favorites
  // needed a cloud round-trip and a signed-in user; neither is needed now.
  return { favoriteIds, toggleFavorite, loading: false, signedIn: true };
}
