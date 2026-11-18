export interface WardEntry {
  code: number;
  name: string;
}

export interface ProvinceEntry {
  code: number;
  name: string;
  wards: WardEntry[];
}

export interface AddressParts {
  street: string;
  ward: string;
  city: string;
}

export const emptyAddress: AddressParts = { street: "", ward: "", city: "" };

/** Reverse-geocoding payload we care about (Nominatim / OpenStreetMap shape). */
export interface OsmAddressDetails {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  suburb?: string;
  quarter?: string;
  neighbourhood?: string;
  village?: string;
  hamlet?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  province?: string;
  region?: string;
}

const ADMINISTRATIVE_PREFIXES = [
  "Thành phố ",
  "Tỉnh ",
  "Phường ",
  "Xã ",
  "Thị trấn ",
  "Thị xã ",
  "Quận ",
  "Huyện ",
  "TP. ",
  "TP ",
  "P. ",
  "Q. ",
];

/** Common abbreviations people already typed into old address fields. */
const PROVINCE_ALIASES: Record<string, string> = {
  "tp hcm": "ho chi minh",
  tphcm: "ho chi minh",
  hcm: "ho chi minh",
  "ho chi minh city": "ho chi minh",
  "sai gon": "ho chi minh",
  saigon: "ho chi minh",
  hn: "ha noi",
  "tp ha noi": "ha noi",
  "ha noi city": "ha noi",
  dn: "da nang",
  "tp da nang": "da nang",
  hp: "hai phong",
  ct: "can tho",
  hue: "hue",
};

let cachedUnits: ProvinceEntry[] | null = null;

/**
 * Loads the bundled administrative units (34 provinces/cities and their
 * wards/communes after the 2025 two-tier reform). The JSON file is imported
 * lazily so it lands in its own chunk instead of the main bundle.
 */
export async function loadVietnamAdministrativeUnits(): Promise<ProvinceEntry[]> {
  if (cachedUnits) return cachedUnits;
  const module = await import("@/shared/data/vietnam-administrative-units.json");
  cachedUnits = module.default as ProvinceEntry[];
  return cachedUnits;
}

export function stripAdministrativePrefix(name: string): string {
  const trimmed = name.trim();
  for (const prefix of ADMINISTRATIVE_PREFIXES) {
    if (trimmed.toLocaleLowerCase("vi").startsWith(prefix.toLocaleLowerCase("vi"))) {
      return trimmed.slice(prefix.length).trim();
    }
  }
  return trimmed;
}

/** Diacritic-insensitive key used to compare names coming from different sources. */
export function normalizeAdministrativeName(name: string): string {
  const key = stripAdministrativePrefix(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return PROVINCE_ALIASES[key] ?? key;
}

export function composeAddress(parts: AddressParts): string {
  return [parts.street, parts.ward, parts.city]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function stripTrailingComma(value: string): string {
  return value.replace(/[,\s]+$/, "").trim();
}

/**
 * Best-effort split of an address string saved before the structured form
 * existed, so editing an existing facility still shows the right fields.
 * Old addresses may still contain a district level, which the post-2025
 * two-tier model dropped — the ward part wins and the district is ignored.
 */
export function parseAddress(address: string | null | undefined): AddressParts {
  const cleaned = stripTrailingComma(address ?? "");
  if (!cleaned) return { ...emptyAddress };

  const parts = cleaned
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 1) return { street: parts[0], ward: "", city: "" };

  const wardIndex = parts.findIndex((part) => /^(phường|xã|thị trấn)\s/i.test(part));
  if (wardIndex > 0) {
    return {
      street: parts.slice(0, wardIndex).join(", "),
      ward: parts[wardIndex],
      city: parts.length - 1 > wardIndex ? parts[parts.length - 1] : "",
    };
  }

  return {
    street: parts.slice(0, -1).join(", "),
    ward: "",
    city: parts[parts.length - 1],
  };
}

export function findProvince(
  units: ProvinceEntry[],
  name: string | null | undefined,
): ProvinceEntry | undefined {
  if (!name) return undefined;
  const key = normalizeAdministrativeName(name);
  if (!key) return undefined;
  return units.find((unit) => normalizeAdministrativeName(unit.name) === key);
}

export function findWard(
  province: ProvinceEntry | undefined,
  name: string | null | undefined,
): WardEntry | undefined {
  if (!province || !name) return undefined;
  const key = normalizeAdministrativeName(name);
  if (!key) return undefined;
  return province.wards.find((ward) => normalizeAdministrativeName(ward.name) === key);
}

export function searchWards(province: ProvinceEntry | undefined, query: string): WardEntry[] {
  if (!province) return [];
  const key = normalizeAdministrativeName(query);
  if (!key) return province.wards;
  return province.wards.filter((ward) => normalizeAdministrativeName(ward.name).includes(key));
}

function firstMatch<T extends { name: string }>(
  items: T[],
  candidates: Array<string | undefined>,
): T | undefined {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const key = normalizeAdministrativeName(candidate);
    if (!key) continue;
    const hit = items.find((item) => normalizeAdministrativeName(item.name) === key);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Maps a free-form OpenStreetMap address to the structured fields. Ward and
 * city are only filled when they exist in our dataset; the street part is
 * always taken from the map result.
 */
export function addressFromOsm(units: ProvinceEntry[], details: OsmAddressDetails): AddressParts {
  const street = [details.house_number, details.road ?? details.pedestrian]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();

  const province = firstMatch(units, [
    details.state,
    details.province,
    details.city,
    details.region,
    details.town,
    details.municipality,
    details.county,
  ]);
  const ward = firstMatch(province?.wards ?? [], [
    details.suburb,
    details.quarter,
    details.neighbourhood,
    details.village,
    details.hamlet,
    details.town,
  ]);

  return {
    street,
    ward: ward?.name ?? "",
    city: province?.name ?? "",
  };
}
