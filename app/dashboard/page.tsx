"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AgeGroup } from "@/lib/types";

interface Row {
  id: string;
  landmarkName: string;
  ageGroup: AgeGroup;
  userId: string;
  createdAt: Timestamp | null;
}

const AGE_LABEL: Record<AgeGroup, string> = {
  child: "طفل",
  teen: "مراهق",
  adult: "بالغ",
};

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const q = query(collection(db, "interactions"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setRows(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            landmarkName: data.landmarkName,
            ageGroup: data.ageGroup,
            userId: data.userId,
            createdAt: data.createdAt ?? null,
          };
        })
      );
      setLoading(false);
    }
    load();
  }, []);

  const byAge = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.ageGroup] = (acc[r.ageGroup] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="flex-1 max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">لوحة النتائج (Interactions من Firestore)</h1>

      {loading ? (
        <p>جارٍ التحميل...</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="border border-black/10 dark:border-white/10 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{rows.length}</div>
              <div className="text-sm text-zinc-500">إجمالي الطلبات</div>
            </div>
            {(["child", "teen", "adult"] as AgeGroup[]).map((g) => (
              <div key={g} className="border border-black/10 dark:border-white/10 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">{byAge[g] || 0}</div>
                <div className="text-sm text-zinc-500">{AGE_LABEL[g]}</div>
              </div>
            ))}
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-right border-b border-black/10 dark:border-white/10">
                <th className="py-2">المعلم</th>
                <th className="py-2">الفئة العمرية</th>
                <th className="py-2">المستخدم (uid)</th>
                <th className="py-2">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2">{r.landmarkName}</td>
                  <td className="py-2">{AGE_LABEL[r.ageGroup]}</td>
                  <td className="py-2 font-mono text-xs">{r.userId.slice(0, 10)}...</td>
                  <td className="py-2">
                    {r.createdAt ? r.createdAt.toDate().toLocaleString("ar-SA") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="text-zinc-500 mt-4">
              ما فيه تفاعلات مسجلة بعد. جربي توليد شرح من صفحة أي معلم أول.
            </p>
          )}
        </>
      )}
    </main>
  );
}
