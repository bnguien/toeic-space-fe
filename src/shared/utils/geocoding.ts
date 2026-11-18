import type { OsmAddressDetails } from "./vietnam-address";

export interface MapGeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
  /** Street part already composed from house number + road. */
  street: string;
  /** Address pieces normalised to the shape `addressFromOsm` understands. */
  details: OsmAddressDetails;
}

interface PhotonFeature {
  geometry?: { coordinates?: number[] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    locality?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
}

const PHOTON_BASE = import.meta.env?.VITE_PHOTON_URL ?? "https://photon.komoot.io";
const NOMINATIM_BASE = import.meta.env?.VITE_NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";

function fromPhoton(feature: PhotonFeature): MapGeocodeResult | null {
  const coordinates = feature.geometry?.coordinates;
  const properties = feature.properties;
  if (!coordinates || coordinates.length < 2 || !properties) return null;
  const [lon, lat] = coordinates;
  const street = [properties.housenumber, properties.street]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();

  return {
    lat,
    lon,
    displayName: properties.name ?? street,
    street: street || properties.name || "",
    details: {
      house_number: properties.housenumber,
      road: properties.street,
      suburb: properties.district,
      quarter: properties.locality,
      city: properties.city,
      county: properties.county,
      state: properties.state,
    },
  };
}

function isVietnam(feature: PhotonFeature): boolean {
  const properties = feature.properties;
  if (!properties) return false;
  return (
    properties.countrycode === "VN" ||
    properties.country === "Việt Nam" ||
    properties.country === "Vietnam"
  );
}

async function searchNominatim(query: string): Promise<MapGeocodeResult[]> {
  const response = await fetch(
    `${NOMINATIM_BASE}/search?format=jsonv2&addressdetails=1&accept-language=vi&countrycodes=vn&limit=6&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
    address?: OsmAddressDetails;
  }>;
  return results.map((result) => {
    const address = result.address ?? {};
    return {
      lat: Number(result.lat),
      lon: Number(result.lon),
      displayName: result.display_name ?? "",
      street: [address.house_number, address.road ?? address.pedestrian]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join(" "),
      details: address,
    };
  });
}

async function reverseNominatim(lat: number, lon: number): Promise<MapGeocodeResult | null> {
  const response = await fetch(
    `${NOMINATIM_BASE}/reverse?format=jsonv2&addressdetails=1&accept-language=vi&zoom=18&lat=${lat}&lon=${lon}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
  const result = (await response.json()) as {
    display_name?: string;
    address?: OsmAddressDetails;
  };
  const address = result.address ?? {};
  const street = [address.house_number, address.road ?? address.pedestrian]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ");
  return {
    lat,
    lon,
    displayName: result.display_name ?? "",
    street,
    details: address,
  };
}

/**
 * Address lookup for the map picker. Photon (Komoot) is used first because it
 * needs no API key and works from the browser; Nominatim is a fallback for
 * networks where Photon is unavailable.
 */
export async function searchMapPlaces(query: string): Promise<MapGeocodeResult[]> {
  try {
    const response = await fetch(
      `${PHOTON_BASE}/api/?q=${encodeURIComponent(query)}&limit=6&lang=default`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`Photon HTTP ${response.status}`);
    const data = (await response.json()) as { features?: PhotonFeature[] };
    const features = data.features ?? [];
    const vietnamese = features.filter(isVietnam);
    return (vietnamese.length ? vietnamese : features)
      .map(fromPhoton)
      .filter((result): result is MapGeocodeResult => result !== null);
  } catch {
    return searchNominatim(query);
  }
}

export async function reverseMapPlace(lat: number, lon: number): Promise<MapGeocodeResult | null> {
  try {
    const response = await fetch(`${PHOTON_BASE}/reverse?lat=${lat}&lon=${lon}&limit=1`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Photon HTTP ${response.status}`);
    const data = (await response.json()) as { features?: PhotonFeature[] };
    const first = (data.features ?? []).find(isVietnam) ?? data.features?.[0];
    return first ? fromPhoton(first) : null;
  } catch {
    return reverseNominatim(lat, lon);
  }
}
