"use client";

import { useState } from "react";
import Image from "next/image";
import { doc, setDoc } from "firebase/firestore";
import { CheckCircle2, AlertTriangle, XCircle, UploadCloud } from "lucide-react";
import { db } from "@/lib/firebase";
import { uploadLandmarkImage, describeUploadError } from "@/lib/storage";
import { Landmark } from "@/lib/types";

const SUPPORTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const SUPPORTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

// Matching key is the landmark's own identifier/slug — never the Arabic
// name — exactly like the single-landmark form's "المعرّف" field already
// works. "rajajil-columns.webp" -> "rajajil-columns" -> looked up directly
// in the identifier map built once from the already-loaded landmark list.
function normalizeFilenameToId(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, "");
  return withoutExt.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

type MatchStatus = "matched" | "matched-has-image" | "unmatched" | "unsupported-type";

interface FileEntry {
  file: File;
  previewUrl: string;
  normalizedId: string;
  landmark: Landmark | null;
  status: MatchStatus;
}

type UploadOutcome = "success" | "skipped" | "unmatched" | "unsupported" | "failed";

interface ResultEntry {
  filename: string;
  outcome: UploadOutcome;
  detail?: string;
}

export function BulkImageUpload({
  landmarks,
  landmarksLoading = false,
  onUploaded,
}: {
  landmarks: Landmark[];
  // While the identifier list is still loading, the file input is disabled
  // — matching against an empty/partial list would wrongly report every
  // file as unmatched.
  landmarksLoading?: boolean;
  onUploaded: () => void;
}) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [existingImagePolicy, setExistingImagePolicy] = useState<"skip" | "replace">("skip");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ResultEntry[] | null>(null);

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    // Built once per selection from the already-loaded landmark list — no
    // extra Firestore query per file.
    const byId = new Map(landmarks.map((l) => [l.id, l]));

    const next: FileEntry[] = Array.from(fileList).map((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!SUPPORTED_TYPES.includes(file.type) && !SUPPORTED_EXTENSIONS.includes(ext)) {
        return {
          file,
          previewUrl: "",
          normalizedId: "",
          landmark: null,
          status: "unsupported-type",
        };
      }
      const normalizedId = normalizeFilenameToId(file.name);
      const landmark = byId.get(normalizedId) || null;
      return {
        file,
        previewUrl: URL.createObjectURL(file),
        normalizedId,
        landmark,
        status: landmark ? (landmark.image ? "matched-has-image" : "matched") : "unmatched",
      };
    });

    setEntries(next);
    setResults(null);
  }

  async function handleUpload() {
    const toProcess = entries.filter((e) => e.status !== "unsupported-type");
    if (!toProcess.length) return;

    setUploading(true);
    setProgress(0);
    const outcomes: ResultEntry[] = [];

    // Sequential on purpose: keeps the UI's progress counter meaningful and
    // avoids hammering Storage with dozens of simultaneous uploads.
    for (const entry of toProcess) {
      if (!entry.landmark) {
        outcomes.push({ filename: entry.file.name, outcome: "unmatched" });
        setProgress((p) => p + 1);
        continue;
      }
      if (entry.landmark.image && existingImagePolicy === "skip") {
        outcomes.push({ filename: entry.file.name, outcome: "skipped" });
        setProgress((p) => p + 1);
        continue;
      }
      try {
        const url = await uploadLandmarkImage(entry.file, entry.landmark.id);
        // Only the image field is touched — every other landmark field is
        // left completely alone.
        await setDoc(doc(db, "landmarks", entry.landmark.id), { image: url }, { merge: true });
        outcomes.push({ filename: entry.file.name, outcome: "success" });
      } catch (err) {
        outcomes.push({ filename: entry.file.name, outcome: "failed", detail: describeUploadError(err) });
      }
      setProgress((p) => p + 1);
    }

    for (const entry of entries) {
      if (entry.status === "unsupported-type") {
        outcomes.push({ filename: entry.file.name, outcome: "unsupported" });
      }
    }

    setResults(outcomes);
    setUploading(false);
    onUploaded();
  }

  const matchedCount = entries.filter((e) => e.status === "matched" || e.status === "matched-has-image").length;
  const unmatchedCount = entries.filter((e) => e.status === "unmatched").length;
  const unsupportedCount = entries.filter((e) => e.status === "unsupported-type").length;

  const successCount = results?.filter((r) => r.outcome === "success").length ?? 0;
  const skippedCount = results?.filter((r) => r.outcome === "skipped").length ?? 0;
  const failedResults = results?.filter((r) => r.outcome === "failed") ?? [];
  const unmatchedResults = results?.filter((r) => r.outcome === "unmatched") ?? [];
  const unsupportedResults = results?.filter((r) => r.outcome === "unsupported") ?? [];

  return (
    <div
      className="mb-10 rounded-2xl border p-6"
      style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}
    >
      <div className="mb-1 flex items-center gap-2">
        <UploadCloud size={18} style={{ color: "var(--brand-gold-light)" }} />
        <h2 className="font-bold">📤 رفع صور المعالم</h2>
      </div>
      <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
        اختاري عدة صور دفعة واحدة — يتم ربط كل صورة بالمعلم الذي يطابق اسم الملف (بدون الامتداد) مع معرّف المعلم
        بالإنجليزية. مثال: rajajil-columns.webp ← أعمدة الرجاجيل.
      </p>

      <input
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={(e) => handleFilesSelected(e.target.files)}
        disabled={landmarksLoading}
        className="w-full text-sm disabled:opacity-50"
      />
      {landmarksLoading && (
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          جارٍ تحميل قائمة المعالم...
        </p>
      )}

      {entries.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                checked={existingImagePolicy === "skip"}
                onChange={() => setExistingImagePolicy("skip")}
              />
              تخطي الصور الموجودة
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                checked={existingImagePolicy === "replace"}
                onChange={() => setExistingImagePolicy("replace")}
              />
              استبدال الصور الموجودة
            </label>
          </div>

          <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
            {matchedCount} مطابقة · {unmatchedCount} بدون معلم مطابق
            {unsupportedCount > 0 && ` · ${unsupportedCount} نوع ملف غير مدعوم`}
          </p>

          {/* preview list */}
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {entries.map((entry, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border p-2"
                style={{ borderColor: "var(--brand-line)" }}
              >
                <div
                  className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg"
                  style={{ background: "var(--surface-2)" }}
                >
                  {entry.previewUrl && <Image src={entry.previewUrl} alt="" fill className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold" dir="ltr">
                    {entry.file.name}
                  </div>
                  {entry.status === "matched" && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: "var(--brand-gold-light)" }}>
                      <CheckCircle2 size={12} /> مطابق لـ: {entry.landmark?.name}
                    </div>
                  )}
                  {entry.status === "matched-has-image" && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: "var(--brand-gold-light)" }}>
                      <CheckCircle2 size={12} /> مطابق لـ: {entry.landmark?.name} (لديه صورة بالفعل)
                    </div>
                  )}
                  {entry.status === "unmatched" && (
                    <div className="flex items-center gap-1 text-xs text-red-400">
                      <AlertTriangle size={12} /> لا يوجد معلم مطابق
                    </div>
                  )}
                  {entry.status === "unsupported-type" && (
                    <div className="flex items-center gap-1 text-xs text-red-400">
                      <XCircle size={12} /> نوع ملف غير مدعوم
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || matchedCount === 0}
            className="mt-4 rounded-lg px-6 py-2.5 text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
          >
            {uploading ? `جارٍ رفع الصور... ${progress} / ${entries.filter((e) => e.status !== "unsupported-type").length}` : "رفع الصور"}
          </button>

          {uploading && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--brand-line)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(progress / Math.max(entries.filter((e) => e.status !== "unsupported-type").length, 1)) * 100}%`,
                  background: "var(--brand-gold)",
                }}
              />
            </div>
          )}
        </>
      )}

      {results && (
        <div className="mt-5 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--brand-line)" }}>
          <p style={{ color: "var(--brand-gold-light)" }}>✓ {successCount} صورة تم ربطها بالمعالم</p>
          {skippedCount > 0 && (
            <p style={{ color: "var(--text-muted)" }}>↷ {skippedCount} صورة تم تخطيها (لديها صورة بالفعل)</p>
          )}
          {unmatchedResults.length > 0 && (
            <>
              <p className="mt-2 text-red-400">⚠ {unmatchedResults.length} صور لم يتم العثور على معلم مطابق لها:</p>
              <ul className="list-inside list-disc text-xs" style={{ color: "var(--text-muted)" }} dir="ltr">
                {unmatchedResults.map((r) => (
                  <li key={r.filename}>{r.filename}</li>
                ))}
              </ul>
            </>
          )}
          {unsupportedResults.length > 0 && (
            <>
              <p className="mt-2 text-red-400">✕ {unsupportedResults.length} ملف بصيغة غير مدعومة:</p>
              <ul className="list-inside list-disc text-xs" style={{ color: "var(--text-muted)" }} dir="ltr">
                {unsupportedResults.map((r) => (
                  <li key={r.filename}>{r.filename}</li>
                ))}
              </ul>
            </>
          )}
          {failedResults.length > 0 && (
            <>
              <p className="mt-2 text-red-400">✕ {failedResults.length} صورة فشل رفعها:</p>
              <ul className="list-inside list-disc text-xs" style={{ color: "var(--text-muted)" }}>
                {failedResults.map((r) => (
                  <li key={r.filename}>
                    <span dir="ltr">{r.filename}</span> — {r.detail}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
