"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthProvider";

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "favorites")).then((snap) => {
      setFavoriteIds(new Set(snap.docs.map((d) => d.id)));
      setLoading(false);
    });
  }, [user]);

  const toggleFavorite = useCallback(
    async (landmarkId: string) => {
      if (!user) return;
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
      } catch {
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
