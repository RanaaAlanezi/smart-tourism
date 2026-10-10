"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useLang } from "@/lib/i18n";

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
  const { t } = useLang();
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
        aria-label={active ? t("إزالة من المحفوظات", "Remove from saved") : t("حفظ في المحفوظات", "Save")}
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
          {t("سجّلي الدخول لحفظ هذا المعلم", "Sign in to save this landmark")}
        </div>
      )}
    </div>
  );
}
