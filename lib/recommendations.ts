import { Landmark, LandmarkCategory } from "./types";

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
