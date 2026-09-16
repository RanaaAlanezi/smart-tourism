"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthProvider";

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  // Guards against the initial fetch resolving *after* the user has already
  // toggled a favorite (e.g. a slow network right after navigation) and
  // clobbering the optimistic update with stale pre-write data.
  const hasMutatedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "favorites")).then((snap) => {
      if (!hasMutatedRef.current) {
        setFavoriteIds(new Set(snap.docs.map((d) => d.id)));
      }
      setLoading(false);
    });
  }, [user]);

  const toggleFavorite = useCallback(
    async (landmarkId: string) => {
      if (!user) return;
      hasMutatedRef.current = true;
      const wasFavorited = favoriteIds.has(landmarkId);
      const ref = doc(db, "users", user.uid, "favorites", landmarkId);

      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.delete(landmarkId);
        else next.add(landmarkId);
        return next;
      });

      try {
        if (wasFavorited) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, { landmarkId, savedAt: serverTimestamp() });
        }
      } catch (err) {
        console.error("toggleFavorite failed:", err);
        // Firestore write failed — roll back the optimistic update.
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorited) next.add(landmarkId);
          else next.delete(landmarkId);
          return next;
        });
      }
    },
    [user, favoriteIds]
  );

  return { favoriteIds, toggleFavorite, loading, signedIn: !!user };
}
