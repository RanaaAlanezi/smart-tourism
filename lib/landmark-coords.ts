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

// Real landmarks are often only a few km apart (central Riyadh alone holds
// ~15; some sit a couple of hundred metres from each other), so on this small
// illustrative map their pins would land on top of each other and hide one
// another. This nudges pins apart just enough that none overlap, while keeping
// each one as close to its TRUE position as possible: every pin is repeatedly
// pushed away from any neighbour closer than `minSeparation` (in map units)
// and gently pulled back toward where it really is.
//
// It only changes where a pin is DRAWN — the landmark's latitude/longitude are
// never touched — and it is deterministic. The caller passes a separation
// measured in screen pixels converted to map units, so as you zoom in the
// pins naturally settle back onto their real positions.
export function spreadPoints<T extends { x: number; y: number }>(points: T[], minSeparation: number): T[] {
  const n = points.length;
  const home = points.map((p) => ({ x: p.x, y: p.y }));
  const pos = points.map((p) => ({ x: p.x, y: p.y }));

  const PULL_PASSES = 140;
  const FREE_PASSES = 40;
  for (let pass = 0; pass < PULL_PASSES + FREE_PASSES; pass++) {
    // the last passes drop the pull-back so any leftover overlap is resolved
    const pull = pass < PULL_PASSES ? 0.03 : 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = pos[j].x - pos[i].x;
        let dy = pos[j].y - pos[i].y;
        let dist = Math.hypot(dx, dy);
        if (dist >= minSeparation) continue;
        if (dist < 1e-9) {
          // exactly coincident: separate along a deterministic direction
          const angle = (i + 1) * 2.399963 + j;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          dist = 1;
        }
        const push = ((minSeparation - dist) / 2) * 0.5;
        const ux = dx / dist;
        const uy = dy / dist;
        pos[i].x -= ux * push;
        pos[i].y -= uy * push;
        pos[j].x += ux * push;
        pos[j].y += uy * push;
      }
    }

    for (let i = 0; i < n; i++) {
      pos[i].x += (home[i].x - pos[i].x) * pull;
      pos[i].y += (home[i].y - pos[i].y) * pull;
    }
  }

  return points.map((p, i) => ({ ...p, x: pos[i].x, y: pos[i].y }));
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
