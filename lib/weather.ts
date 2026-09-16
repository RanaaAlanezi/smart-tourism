const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  الرياض: { lat: 24.7136, lon: 46.6753 },
  العلا: { lat: 26.6089, lon: 37.9219 },
  جدة: { lat: 21.4858, lon: 39.1925 },
  أبها: { lat: 18.2164, lon: 42.5053 },
  أملج: { lat: 25.0213, lon: 37.2685 },
  الطائف: { lat: 21.2703, lon: 40.4158 },
};

export async function getCityTemperature(city: string): Promise<number | null> {
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
