// Approximate real coordinates per landmark (not just city centers) so
// landmarks sharing a city — e.g. four are all in/around Riyadh — don't
// collapse onto the same map pixel.
export const LANDMARK_COORDS: Record<string, { lat: number; lon: number }> = {
  diriyah: { lat: 24.7332, lon: 46.5719 },
  "edge-of-world": { lat: 24.9686, lon: 46.2989 },
  "kingdom-tower": { lat: 24.7113, lon: 46.6748 },
  "faisaliah-tower": { lat: 24.6919, lon: 46.6853 },
  "madain-saleh": { lat: 26.7944, lon: 37.9531 },
  "red-sea": { lat: 25.0213, lon: 37.2685 },
  "asir-mountains": { lat: 18.2409, lon: 42.36 },
  "jeddah-historic": { lat: 21.4858, lon: 39.1925 },
  "jabal-al-hada": { lat: 21.3891, lon: 40.3033 },
};

const BOUNDS = { minLon: 34, maxLon: 55, minLat: 16, maxLat: 32 };
export const MAP_VIEW = { width: 600, height: 500 };

export function project(lat: number, lon: number) {
  const x = ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * MAP_VIEW.width;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * MAP_VIEW.height;
  return { x, y };
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
