import { arabicCity } from "./landmark-i18n";

// One entry per city that has landmarks, so every card can show the
// current temperature.
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  الرياض: { lat: 24.7136, lon: 46.6753 },
  الدرعية: { lat: 24.7343, lon: 46.5756 },
  العلا: { lat: 26.6089, lon: 37.9219 },
  "المدينة المنورة": { lat: 24.4686, lon: 39.6142 },
  ينبع: { lat: 24.0895, lon: 38.0618 },
  جدة: { lat: 21.4858, lon: 39.1925 },
  "مكة المكرمة": { lat: 21.4225, lon: 39.8262 },
  الطائف: { lat: 21.2703, lon: 40.4158 },
  أبها: { lat: 18.2164, lon: 42.5053 },
  "رجال ألمع": { lat: 18.2117, lon: 42.2744 },
  الباحة: { lat: 20.0129, lon: 41.4677 },
  جازان: { lat: 16.8892, lon: 42.5511 },
  فرسان: { lat: 16.7022, lon: 42.1183 },
  نجران: { lat: 17.4933, lon: 44.1277 },
  الدمام: { lat: 26.4207, lon: 50.0888 },
  الخبر: { lat: 26.2172, lon: 50.1971 },
  الظهران: { lat: 26.2886, lon: 50.114 },
  الأحساء: { lat: 25.3833, lon: 49.5861 },
  بريدة: { lat: 26.326, lon: 43.975 },
  عنيزة: { lat: 26.084, lon: 43.9935 },
  حائل: { lat: 27.5114, lon: 41.7208 },
  جبة: { lat: 28.0167, lon: 40.9333 },
  تبوك: { lat: 28.3838, lon: 36.555 },
  أملج: { lat: 25.0213, lon: 37.2685 },
  سكاكا: { lat: 29.9697, lon: 40.2064 },
  "دومة الجندل": { lat: 29.8114, lon: 39.8667 },
};

// A city is asked about once per page, by several components and effects;
// they all share the one request.
const pending = new Map<string, Promise<number | null>>();

export function getCityTemperature(city: string): Promise<number | null> {
  // Keyed by the Arabic name; the city may arrive in English.
  const key = arabicCity(city);
  let request = pending.get(key);
  if (!request) {
    request = fetchTemperature(key);
    pending.set(key, request);
  }
  return request;
}

async function fetchTemperature(city: string): Promise<number | null> {
  const coords = CITY_COORDS[city];
  if (!coords) return null;

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.current?.temperature_2m ?? null;
  } catch {
    return null;
  }
}
