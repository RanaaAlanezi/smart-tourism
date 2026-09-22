// Per-landmark coordinates now live directly on each Firestore landmark
// document (latitude/longitude fields) — this file only holds the map
// projection math and the illustrative country outline.
const BOUNDS = { minLon: 34, maxLon: 55, minLat: 16, maxLat: 32 };
export const MAP_VIEW = { width: 600, height: 500 };

export function project(lat: number, lon: number) {
  const x = ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * MAP_VIEW.width;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * MAP_VIEW.height;
  return { x, y };
}

// Markers are drawn with a ~15-17 unit radius. Two real landmarks that are
// only a couple of km apart in reality (e.g. Kingdom Tower and Al Faisaliah
// Tower, both in central Riyadh) can project to nearly the same pixel on
// this small illustrative map, so one fully covers the other and becomes
// unclickable — found by computing actual pairwise pixel distances between
// every valid landmark: faisaliah-tower/kingdom-tower were 0.68px apart,
// diriyah 3px from both. This never touches the underlying lat/lon data —
// it only nudges apart markers that would otherwise visually collide,
// arranging each such cluster in a small circle around its true average
// position so every landmark stays visible and clickable.
const MIN_MARKER_SEPARATION = 22;

export function declutterPoints<T extends { x: number; y: number }>(
  points: T[],
  minSeparation = MIN_MARKER_SEPARATION
): T[] {
  const n = points.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  function union(i: number, j: number) {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      if (Math.hypot(dx, dy) < minSeparation) union(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  const result = points.map((p) => ({ ...p }));
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const cx = group.reduce((sum, i) => sum + points[i].x, 0) / group.length;
    const cy = group.reduce((sum, i) => sum + points[i].y, 0) / group.length;
    const spreadRadius = Math.max(minSeparation * 0.55, minSeparation * 0.32 * group.length);
    group.forEach((i, idx) => {
      const angle = (2 * Math.PI * idx) / group.length - Math.PI / 2;
      result[i].x = cx + spreadRadius * Math.cos(angle);
      result[i].y = cy + spreadRadius * Math.sin(angle);
    });
  }

  return result;
}

// A hand-approximated outline of Saudi Arabia's borders (illustrative, not
// survey-accurate) — [longitude, latitude] pairs walked clockwise from the
// Gulf of Aqaba, smoothed into a soft blob rather than sharp polygon edges.
export const SAUDI_BORDER: [number, number][] = [
  [34.9, 29.5],
  [36.0, 31.4],
  [39.0, 32.0],
  [42.0, 31.0],
  [44.5, 29.8],
  [46.5, 29.4],
  [47.5, 29.1],
  [48.6, 28.5],
  [50.2, 26.5],
  [51.3, 24.5],
  [51.6, 22.5],
  [55.2, 19.0],
  [52.0, 17.4],
  [48.0, 17.0],
  [45.0, 17.2],
  [43.5, 17.3],
  [42.8, 16.9],
  [41.0, 18.0],
  [39.9, 19.8],
  [39.2, 21.5],
  [38.0, 23.0],
  [37.3, 25.1],
  [36.5, 27.0],
];

export function smoothClosedPath(points: { x: number; y: number }[]): string {
  if (points.length < 3) return "";
  const first = points[0];
  const last = points[points.length - 1];
  let d = `M ${(first.x + last.x) / 2} ${(first.y + last.y) / 2}`;
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    d += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
  }
  return d + " Z";
}
