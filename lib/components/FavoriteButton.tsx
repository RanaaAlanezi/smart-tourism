"use client";

import { Heart } from "lucide-react";

export function FavoriteButton({
  active,
  onToggle,
  size = 16,
}: {
  active: boolean;
  onToggle: () => void;
  size?: number;
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-label={active ? "إزالة من المحفوظات" : "حفظ في المحفوظات"}
      aria-pressed={active}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-105"
    >
      <Heart size={size} fill={active ? "#C08A34" : "none"} color={active ? "#C08A34" : "#374151"} />
    </button>
  );
}
