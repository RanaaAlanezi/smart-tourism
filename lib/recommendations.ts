import { Landmark, LandmarkCategory } from "./types";

// Experience/interest categories the "religious" tag reinforces — chosen
// per the brief's own examples (a Historical+Cultural or Cultural-only
// experience). A landmark's tag is only ever an extra signal on top of an
// already-matching category, never a way to get recommended on its own.
const RELIGIOUS_TAG_AFFINITY: LandmarkCategory[] = ["historical", "cultural"];

// +2 for a matching category. A landmark currently carries exactly one
// category, so in practice this is a binary match/no-match — written as a
// count rather than a boolean so it keeps working without change if a
// landmark is ever tagged with more than one category.
export function scoreLandmark(landmark: Landmark, interests: LandmarkCategory[]): number {
  return interests.includes(landmark.category) ? 2 : 0;
}

// Filters the existing landmark dataset down to the ones matching at least
// one selected interest, ranked by relevance. Ties (equal category score)
// are broken by preferring curated/verified landmarks, since those have
// confirmed facts and real photos. Never invents or duplicates landmark
// data — this only filters and orders what's already in `landmarks`.
export function rankLandmarksByInterest(
  landmarks: Landmark[],
  interests: LandmarkCategory[],
  limit = 6
): Landmark[] {
  if (!interests.length) return [];

  return landmarks
    .map((landmark) => ({ landmark, score: scoreLandmark(landmark, interests) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const rank = (l: Landmark) => (l.featured ? 2 : 0) + (l.verified ? 1 : 0);
      return rank(b.landmark) - rank(a.landmark);
    })
    .slice(0, limit)
    .map((entry) => entry.landmark);
}

export interface DiscoveryFilters {
  // null/omitted = no location restriction ("كل السعودية").
  city?: string | null;
  interests: LandmarkCategory[];
}

// Same category scoring as scoreLandmark, plus:
// +1 when the landmark is in the user's chosen city (matches the brief's
// "+1 if the landmark matches the selected city" — since a specific city
// also hard-filters the pool below, this is always satisfied within that
// pool, but is kept explicit so the formula stays transparent).
// +1 for "other available metadata" matching the trip — the dataset has no
// trip-duration or photogenic field to match against, so this stands in
// with the landmark's own featured/verified curation flags instead of
// fabricating a match against data that doesn't exist.
// +1 when the landmark is tagged "religious" AND the user's interests
// already include historical/cultural — an additional signal on top of a
// real category match, never a substitute for one.
// A landmark that doesn't match any selected interest is never recommended
// regardless of city, curation, or tag bonuses.
export function scoreForDiscovery(landmark: Landmark, filters: DiscoveryFilters): number {
  const categoryScore = scoreLandmark(landmark, filters.interests);
  if (categoryScore === 0) return 0;
  let score = categoryScore;
  if (filters.city && landmark.city === filters.city) score += 1;
  if (landmark.featured || landmark.verified) score += 1;
  if (landmark.tags?.includes("religious") && filters.interests.some((c) => RELIGIOUS_TAG_AFFINITY.includes(c))) {
    score += 1;
  }
  return score;
}

// The "Discover Your Destination" flow's ranking step: hard-filters to the
// chosen city (if any), scores everything else by interest/curation match,
// and returns the top candidates only — this is the full candidate list
// Qwen will ever see, never the raw dataset.
export function rankLandmarksForDiscovery(
  landmarks: Landmark[],
  filters: DiscoveryFilters,
  limit = 5
): Landmark[] {
  if (!filters.interests.length) return [];

  const pool = filters.city ? landmarks.filter((l) => l.city === filters.city) : landmarks;

  return pool
    .map((landmark) => ({ landmark, score: scoreForDiscovery(landmark, filters) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.landmark);
}
