// A-4 meet in the middle: which destination is fairest to reach from everyone's home city.
// Pure. Costs are APPROXIMATE budget train/bus fares, one way, per person, in paise.

type Place = { name: string; lat: number; lng: number; lastMile?: number };

export const HOME_CITIES: Place[] = [
  { name: "Delhi", lat: 28.61, lng: 77.21 },
  { name: "Mumbai", lat: 19.08, lng: 72.88 },
  { name: "Bengaluru", lat: 12.97, lng: 77.59 },
  { name: "Chennai", lat: 13.08, lng: 80.27 },
  { name: "Kolkata", lat: 22.57, lng: 88.36 },
  { name: "Hyderabad", lat: 17.39, lng: 78.49 },
  { name: "Pune", lat: 18.52, lng: 73.86 },
  { name: "Ahmedabad", lat: 23.02, lng: 72.57 },
  { name: "Jaipur", lat: 26.91, lng: 75.79 },
  { name: "Lucknow", lat: 26.85, lng: 80.95 },
  { name: "Chandigarh", lat: 30.73, lng: 76.78 },
  { name: "Kochi", lat: 9.93, lng: 76.27 },
  { name: "Bhubaneswar", lat: 20.3, lng: 85.82 },
  { name: "Guwahati", lat: 26.14, lng: 91.74 },
  { name: "Indore", lat: 22.72, lng: 75.86 },
];

// lastMile: ₹ for the local bus/taxi from the nearest railhead (hill stations cost more to reach).
export const DESTINATIONS: Place[] = [
  { name: "Goa", lat: 15.3, lng: 74.12 },
  { name: "Manali", lat: 32.24, lng: 77.19, lastMile: 600 },
  { name: "Rishikesh", lat: 30.09, lng: 78.27, lastMile: 150 },
  { name: "Jaipur", lat: 26.91, lng: 75.79 },
  { name: "Udaipur", lat: 24.59, lng: 73.71 },
  { name: "Pondicherry", lat: 11.94, lng: 79.81, lastMile: 150 },
  { name: "Munnar", lat: 10.09, lng: 77.06, lastMile: 400 },
  { name: "Coorg", lat: 12.42, lng: 75.74, lastMile: 400 },
  { name: "Kasol", lat: 32.01, lng: 77.31, lastMile: 700 },
  { name: "Gokarna", lat: 14.55, lng: 74.32, lastMile: 250 },
  { name: "Varkala", lat: 8.73, lng: 76.72, lastMile: 100 },
  { name: "Hampi", lat: 15.34, lng: 76.46, lastMile: 300 },
  { name: "Darjeeling", lat: 27.04, lng: 88.26, lastMile: 500 },
  { name: "Shimla", lat: 31.1, lng: 77.17, lastMile: 300 },
  { name: "Mcleodganj", lat: 32.24, lng: 76.32, lastMile: 500 },
];

function km(a: Place, b: Place): number {
  const rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// ₹200 base + ₹0.9/km over ~1.3× the straight-line distance (rails and roads bend) + last mile, rounded to ₹50.
// shortcut: distance-based estimate, not live fares; swap in a fares API when one is available.
const estimate = (from: Place, to: Place) =>
  from.name === to.name ? 0 : Math.round((200 + 0.9 * 1.3 * km(from, to) + (to.lastMile ?? 0)) / 50) * 50 * 100;

/** TRAVEL_PAISE[home city][destination]: approximate one-way fare per person, in paise. */
export const TRAVEL_PAISE: Record<string, Record<string, number>> = Object.fromEntries(
  HOME_CITIES.map((c) => [c.name, Object.fromEntries(DESTINATIONS.map((d) => [d.name, estimate(c, d)]))]),
);

const ALIASES: Record<string, string> = {
  bangalore: "Bengaluru", bombay: "Mumbai", calcutta: "Kolkata", madras: "Chennai", cochin: "Kochi",
  "new delhi": "Delhi", gurgaon: "Delhi", gurugram: "Delhi", noida: "Delhi",
};

/** A free-text home city → one of HOME_CITIES, or null when we have no fares for it. */
export function canonicalCity(name: string | null | undefined): string | null {
  const key = (name ?? "").trim().toLowerCase();
  return ALIASES[key] ?? HOME_CITIES.find((c) => c.name.toLowerCase() === key)?.name ?? null;
}

export type FairDestination = { destination: string; spreadPaise: number; meanPaise: number; minPaise: number; maxPaise: number };

/**
 * Destinations ranked by fairness: smallest travel gap (max − min fare across members) first, then the lowest
 * average fare. One entry in `homeCities` per member; unknown cities are ignored. Never returns who pays what.
 */
export function fairestDestinations(homeCities: (string | null)[], count = 3): FairDestination[] {
  const cities = homeCities.map(canonicalCity).filter((c): c is string => !!c);
  if (!cities.length) return [];
  return DESTINATIONS.map((d) => {
    const fares = cities.map((c) => TRAVEL_PAISE[c][d.name]);
    const minPaise = Math.min(...fares);
    const maxPaise = Math.max(...fares);
    return { destination: d.name, spreadPaise: maxPaise - minPaise, meanPaise: Math.round(fares.reduce((s, f) => s + f, 0) / fares.length), minPaise, maxPaise };
  })
    .sort((a, b) => a.spreadPaise - b.spreadPaise || a.meanPaise - b.meanPaise)
    .slice(0, count);
}
