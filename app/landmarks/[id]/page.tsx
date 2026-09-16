"use client";

import { useEffect, useState, use as useUnwrap } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthProvider";
import { getLandmark } from "@/lib/landmarks";
import { AgeGroup, Landmark } from "@/lib/types";

const AGE_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: "child", label: "طفل" },
  { value: "teen", label: "مراهق" },
  { value: "adult", label: "بالغ" },
];

export default function LandmarkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = useUnwrap(params);
  const { user } = useAuth();

  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adult");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLandmark(id).then(setLandmark);
  }, [id]);

  async function handleExplain() {
    if (!landmark) return;
    setLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landmarkName: landmark.name,
          facts: landmark.facts,
          ageGroup,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "unknown error");

      setExplanation(data.explanation);
      setModel(data.model);

      if (user) {
        await addDoc(collection(db, "interactions"), {
          landmarkId: landmark.id,
          landmarkName: landmark.name,
          ageGroup,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  if (!landmark) {
    return <main className="flex-1 max-w-3xl mx-auto px-6 py-10">جارٍ التحميل...</main>;
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-1">{landmark.name}</h1>
      <p className="text-zinc-500 mb-6">{landmark.city}</p>

      <p className="mb-6 text-zinc-700 dark:text-zinc-300">{landmark.facts}</p>

      <div className="border border-black/10 dark:border-white/10 rounded-lg p-5">
        <h2 className="font-medium mb-3">شرح مخصص حسب العمر (Qwen)</h2>

        <div className="flex gap-2 mb-4">
          {AGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAgeGroup(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                ageGroup === opt.value
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "border-black/20 dark:border-white/20"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleExplain}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white disabled:opacity-50"
        >
          {loading ? "جارٍ توليد الشرح..." : "ولّد الشرح"}
        </button>

        {error && <p className="text-red-600 mt-4 text-sm">خطأ: {error}</p>}

        {explanation && (
          <div className="mt-5 bg-black/[.03] dark:bg-white/[.05] rounded-lg p-4">
            <p className="whitespace-pre-wrap">{explanation}</p>
            <p className="text-xs text-zinc-500 mt-3">النموذج: {model}</p>
          </div>
        )}
      </div>
    </main>
  );
}
