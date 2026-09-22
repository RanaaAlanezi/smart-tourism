import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

const UPLOAD_TIMEOUT_MS = 20000;

// The Firebase JS SDK's upload call can, in some failure modes (e.g. the
// Storage bucket rejecting the request in a way the SDK treats as
// retriable), keep retrying far longer than a human waiting on a "جارٍ
// الحفظ..." button will tolerate. This bounds it to a fixed, honest wait —
// it does not change or hide the underlying error, it just guarantees the
// caller's promise always settles so the UI can show it.
function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function uploadLandmarkImage(file: File, landmarkId: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `landmarks/${landmarkId}.${ext}`;
  const storageRef = ref(storage, path);
  await withTimeout(
    uploadBytes(storageRef, file),
    UPLOAD_TIMEOUT_MS,
    "استغرق رفع الصورة وقتًا طويلاً جدًا (أكثر من 20 ثانية). تحققي من اتصال الإنترنت، أو من أن Firebase Storage مُفعّل لهذا المشروع."
  );
  return withTimeout(
    getDownloadURL(storageRef),
    15000,
    "تم رفع الصورة لكن تعذر جلب رابطها — حاولي مرة أخرى."
  );
}

// A short, specific Arabic message for the most common real failure modes,
// falling back to the raw error text for anything unexpected — never a
// silent or generic "حدث خطأ" with no way to act on it.
export function describeUploadError(err: unknown): string {
  let raw: string;
  if (err instanceof Error) raw = err.message;
  else if (typeof err === "string") raw = err;
  else raw = JSON.stringify(err);
  if (/استغرق رفع الصورة|تعذر جلب رابطها/.test(raw)) return raw;
  if (/storage\/unauthorized/.test(raw)) {
    return "تعذر رفع الصورة: لا توجد صلاحية للرفع — تحققي من قواعد Firebase Storage.";
  }
  if (/storage\/unknown|404/.test(raw)) {
    return "تعذر رفع الصورة: يبدو أن خدمة Firebase Storage غير مُفعّلة لهذا المشروع بعد. فعّليها من Firebase Console (Storage → Get started) ثم أعيدي المحاولة.";
  }
  if (/storage\/quota-exceeded/.test(raw)) {
    return "تعذر رفع الصورة: تم تجاوز الحد المسموح للتخزين.";
  }
  return `تعذر رفع الصورة: ${raw}`;
}
