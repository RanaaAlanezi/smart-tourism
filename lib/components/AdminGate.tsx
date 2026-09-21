"use client";

import { useState, useSyncExternalStore } from "react";
import { Lock } from "lucide-react";

const SESSION_KEY = "admin_ok";

function subscribe() {
  return () => {};
}
function getSnapshot() {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}
function getServerSnapshot() {
  return false;
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  // Reads sessionStorage via the store-subscription API rather than an
  // effect, since this is exactly the "read external mutable state" case
  // it's designed for (and avoids a setState-in-effect render cascade).
  const unlockedFromStorage = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const unlocked = unlockedFromStorage || justUnlocked;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(SESSION_KEY, "1");
        setJustUnlocked(true);
      } else {
        setError(data.error || "كلمة المرور غير صحيحة");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  if (!unlocked) {
    return (
      <main className="flex flex-1 items-center justify-center px-6" style={{ background: "var(--background)" }}>
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-2xl border p-6 text-center"
          style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}
        >
          <span
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--surface-2)" }}
          >
            <Lock size={20} style={{ color: "var(--brand-gold-light)" }} />
          </span>
          <h1 className="mb-1 text-lg font-bold">لوحة تحكم المعالم</h1>
          <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
            هذي الصفحة خاصة — أدخلي كلمة المرور للمتابعة.
          </p>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="كلمة المرور"
            className="mb-3 w-full rounded-lg border px-3 py-2 text-center text-sm outline-none"
            style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
            autoFocus
          />
          {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !passphrase}
            className="w-full rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
          >
            {loading ? "جارٍ التحقق..." : "دخول"}
          </button>
        </form>
      </main>
    );
  }

  return <>{children}</>;
}
