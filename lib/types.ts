export type AgeGroup = "child" | "teen" | "adult";

// A single flat category scheme, shared by the data and every filter UI
// (Explore, homepage tiles, map sidebar) — no separate "coarser" grouping
// layer, since this set is already the right granularity for both.
export type LandmarkCategory = "historical" | "archaeological" | "natural" | "beaches" | "urban" | "cultural";

// Internal metadata tags — separate from `category` on purpose. A tag adds
// a matching signal (search, personalized recommendations, a small badge
// on the detail page) without introducing another main Explore filter.
// "religious" marks landmarks that are themselves places of worship or
// explicitly religious sites (e.g. a historic mosque) — it never replaces
// or overrides the landmark's main category.
export type LandmarkTag = "religious";

export interface Landmark {
  id: string;
  name: string;
  // English name, used for search only (e.g. seed-imported records) — the
  // UI always displays the Arabic `name`.
  nameEn?: string;
  category: LandmarkCategory;
  city: string;
  region: string;
  summary: string;
  facts: string;
  // Short "Label: value" lines (English labels, e.g. "Height: 302 meters")
  // used only as AI grounding context — not shown in the UI. The local
  // quantized Qwen model reliably garbles numbers/names pulled from a
  // flowing prose paragraph (e.g. reading "302 meters" as "302 months")
  // but handles them correctly when they're given as short labeled facts.
  keyFacts?: string;
  image: string | null;
  latitude: number | null;
  longitude: number | null;
  // True once a human has checked the facts/coordinates/image below are
  // accurate — bulk-imported seed records start false. Landmarks with no
  // coordinates simply don't get a map marker (see SaudiMap), regardless
  // of this flag.
  verified?: boolean;
  // Curated flag for the homepage's "أشهر الوجهات" section — Explore
  // shows every landmark regardless of this flag.
  featured?: boolean;
  // Optional metadata tags (see LandmarkTag) — additive signals for
  // search/recommendations/detail-page badges, not a second category.
  tags?: LandmarkTag[];
}

export interface Interaction {
  id?: string;
  landmarkId: string;
  landmarkName: string;
  ageGroup: AgeGroup;
  userId: string;
  createdAt: number;
}
