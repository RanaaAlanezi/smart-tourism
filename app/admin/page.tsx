"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
import { Navbar } from "@/lib/components/Navbar";
import { AdminGate } from "@/lib/components/AdminGate";
import { db } from "@/lib/firebase";
import { uploadLandmarkImage } from "@/lib/storage";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/categories";

const CATEGORY_OPTIONS: Landmark["category"][] = ["heritage", "nature", "historic-district", "urban"];

const EMPTY_FORM = {
  id: "",
  name: "",
  city: "",
  region: "",
  category: "heritage" as Landmark["category"],
  summary: "",
  facts: "",
  keyFacts: "",
  latitude: "",
  longitude: "",
};

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function AdminLandmarks() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const data = await getLandmarks();
    setLandmarks(data.sort((a, b) => a.name.localeCompare(b.name, "ar")));
    setLoading(false);
  }

  useEffect(() => {
    getLandmarks().then((data) => {
      setLandmarks(data.sort((a, b) => a.name.localeCompare(b.name, "ar")));
      setLoading(false);
    });
  }, []);

  function resetFormFields() {
    setForm(EMPTY_FORM);
    setIsEditing(false);
    setImageFile(null);
    setExistingImage(null);
  }

  function startNew() {
    resetFormFields();
    setError(null);
    setNotice(null);
  }

  function startEdit(l: Landmark) {
    setForm({
      id: l.id,
      name: l.name,
      city: l.city,
      region: l.region || "",
      category: l.category,
      summary: l.summary,
      facts: l.facts,
      keyFacts: l.keyFacts || "",
      latitude: String(l.latitude ?? ""),
      longitude: String(l.longitude ?? ""),
    });
    setIsEditing(true);
    setImageFile(null);
    setExistingImage(l.image);
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!confirm(`تأكيد حذف "${id}"؟ لا يمكن التراجع.`)) return;
    await deleteDoc(doc(db, "landmarks", id));
    if (form.id === id) resetFormFields();
    await refresh();
    setError(null);
    setNotice(`تم حذف "${id}".`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const id = isEditing ? form.id : slugify(form.id || form.name);
    if (!id || !form.name || !form.city || !form.summary || !form.facts) {
      setError("عبّي على الأقل: المعرف، الاسم، المدينة، الوصف المختصر، والحقائق.");
      return;
    }
    const lat = parseFloat(form.latitude);
    const lon = parseFloat(form.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      setError("خط العرض وخط الطول لازم يكونوا أرقام صحيحة.");
      return;
    }

    setSaving(true);
    try {
      let image = existingImage;
      if (imageFile) {
        image = await uploadLandmarkImage(imageFile, id);
      }

      await setDoc(
        doc(db, "landmarks", id),
        {
          name: form.name,
          city: form.city,
          region: form.region || null,
          category: form.category,
          summary: form.summary,
          facts: form.facts,
          keyFacts: form.keyFacts || null,
          latitude: lat,
          longitude: lon,
          image,
        },
        { merge: true }
      );

      await refresh();
      if (!isEditing) resetFormFields();
      setNotice(isEditing ? "تم تحديث المعلم." : "تم إضافة المعلم.");
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full" style={{ background: "var(--background)" }}>
        <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
          <h1 className="text-2xl font-extrabold md:text-3xl">لوحة تحكم المعالم</h1>
          <p className="mt-1 mb-8 text-sm" style={{ color: "var(--text-muted)" }}>
            أضيفي، عدّلي، أو احذفي المعالم مباشرة — تنعكس فورًا على الموقع.
          </p>

          {/* form */}
          <form
            onSubmit={handleSubmit}
            className="mb-10 rounded-2xl border p-6"
            style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">{isEditing ? `تعديل: ${form.name}` : "إضافة معلم جديد"}</h2>
              {isEditing && (
                <button type="button" onClick={startNew} className="text-xs font-semibold" style={{ color: "var(--brand-gold-light)" }}>
                  + معلم جديد بدل هذا
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  المعرف (بالإنجليزية، بدون مسافات) *
                </label>
                <input
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                  disabled={isEditing}
                  placeholder="مثال: qasr-al-hukm"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-60"
                  style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  الاسم *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  المدينة *
                </label>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  المنطقة
                </label>
                <input
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder="مثال: منطقة الرياض"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  التصنيف
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Landmark["category"] })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                    خط العرض (Latitude) *
                  </label>
                  <input
                    value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    placeholder="24.7136"
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
                    dir="ltr"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                    خط الطول (Longitude) *
                  </label>
                  <input
                    value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    placeholder="46.6753"
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs"
              style={{ color: "var(--brand-gold-light)" }}
            >
              افتحي Google Maps، اضغطي بالزر الأيمن على الموقع، وانسخي الإحداثيات
              <ExternalLink size={12} />
            </a>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                وصف مختصر (يظهر بالكروت) *
              </label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                rows={2}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                الحقائق الكاملة (تظهر بصفحة التفاصيل) *
              </label>
              <textarea
                value={form.facts}
                onChange={(e) => setForm({ ...form, facts: e.target.value })}
                rows={4}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                حقائق مختصرة للذكاء الاصطناعي (اختياري لكن يُنصح به بشدة)
              </label>
              <textarea
                value={form.keyFacts}
                onChange={(e) => setForm({ ...form, keyFacts: e.target.value })}
                rows={2}
                placeholder="Height: 302 meters | Floors: 99 | Opened: 2002 | Location: Al Olaya, Riyadh"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-zinc-500"
                style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
                dir="ltr"
              />
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                اكتبيها بالإنجليزية بصيغة «Label: value» مفصولة بـ | — هذا يمنع الذكاء الاصطناعي من قراءة الأرقام غلط
                (مثل قراءة «302 متر» كأنها «302 شهر»). بدونها بيعتمد على الحقائق الكاملة وقد يخطئ بالأرقام.
              </p>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                الصورة {existingImage && "(موجودة — اختاري صورة جديدة لاستبدالها)"}
              </label>
              <div className="flex items-center gap-3">
                {existingImage && (
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                    <Image src={existingImage} alt="" fill className="object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            {notice && <p className="mt-4 text-sm" style={{ color: "var(--brand-gold-light)" }}>{notice}</p>}

            <button
              type="submit"
              disabled={saving}
              className="mt-5 rounded-lg px-6 py-2.5 text-sm font-bold disabled:opacity-50"
              style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
            >
              {saving ? "جارٍ الحفظ..." : isEditing ? "حفظ التعديلات" : "إضافة المعلم"}
            </button>
          </form>

          {/* list */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">المعالم الحالية ({landmarks.length})</h2>
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold"
              style={{ borderColor: "var(--brand-line)" }}
            >
              <Plus size={14} />
              معلم جديد
            </button>
          </div>

          {loading ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>جارٍ التحميل...</p>
          ) : (
            <div className="space-y-2">
              {landmarks.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                  style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}
                >
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg" style={{ background: "var(--surface-2)" }}>
                    {l.image && <Image src={l.image} alt="" fill className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{l.name}</div>
                    <div className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                      {l.city} · {CATEGORY_LABEL[l.category]} · {l.id}
                    </div>
                  </div>
                  <button onClick={() => startEdit(l)} aria-label="تعديل" className="rounded-lg p-2" style={{ background: "var(--surface-2)" }}>
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(l.id)}
                    aria-label="حذف"
                    className="rounded-lg p-2 text-red-400"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminLandmarks />
    </AdminGate>
  );
}
