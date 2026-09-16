"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

export function FavoriteButton({
  active,
  onToggle,
  signedIn = true,
  size = 16,
}: {
  active: boolean;
  onToggle: () => void;
  signedIn?: boolean;
  size?: number;
}) {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!signedIn) {
            setShowNotice(true);
            setTimeout(() => setShowNotice(false), 2500);
            return;
          }
          onToggle();
        }}
        aria-label={active ? "إزالة من المحفوظات" : "حفظ في المحفوظات"}
        aria-pressed={active}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-105"
      >
        <Heart size={size} fill={active ? "#C08A34" : "none"} color={active ? "#C08A34" : "#374151"} />
      </button>

      {showNotice && (
        <div
          className="absolute left-1/2 top-full z-10 mt-2 w-max -translate-x-1/2 rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-lg"
          style={{ background: "var(--brand-green-dark)" }}
        >
          سجّلي الدخول لحفظ هذا المعلم
        </div>
      )}
    </div>
  );
}
