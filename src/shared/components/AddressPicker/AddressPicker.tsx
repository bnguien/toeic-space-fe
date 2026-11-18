import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ChevronDown, Loader2, LocateFixed, MapPin, Minus, Plus, Search, X } from "lucide-react";

import {
  addressFromOsm,
  composeAddress,
  findProvince,
  findWard,
  loadVietnamAdministrativeUnits,
  searchWards,
  type AddressParts,
  type ProvinceEntry,
} from "@/shared/utils/vietnam-address";
import { reverseMapPlace, searchMapPlaces, type MapGeocodeResult } from "@/shared/utils/geocoding";
import styles from "./AddressPicker.module.css";

export interface AddressPickerProps {
  value: AddressParts;
  onChange: (value: AddressParts) => void;
  /** Name for the hidden input that carries the composed address into a <form>. */
  name?: string;
  required?: boolean;
  disabled?: boolean;
}

interface MapView {
  lat: number;
  lon: number;
  zoom: number;
}

interface MapSize {
  width: number;
  height: number;
}

type StatusKind = "idle" | "loading" | "success" | "error";

interface Status {
  kind: StatusKind;
  message: string;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 19;
// Street-level fallback when the browser cannot provide the current location.
const DEFAULT_VIEW: MapView = { lat: 10.7769, lon: 106.7009, zoom: 13 };

interface TileProvider {
  id: string;
  url: string;
  attribution: string;
  creditUrl: string;
}

const TILE_PROVIDERS: TileProvider[] = [
  {
    id: "google",
    // Google raster tiles: same look as Google Maps, no API key. For production
    // traffic use the official Maps Platform with a key and override the URL.
    url: "https://mt{s}.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}",
    attribution: "Bản đồ © Google",
    creditUrl: "https://maps.google.com/",
  },
  {
    id: "osm",
    url: import.meta.env?.VITE_MAP_TILE_URL ?? "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap",
    creditUrl: "https://www.openstreetmap.org/copyright",
  },
  {
    id: "carto",
    url: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap · © CARTO",
    creditUrl: "https://carto.com/attributions",
  },
];

function tileUrl(template: string, z: number, x: number, y: number) {
  return template
    .replace("{s}", String((x + y) % 4))
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

function project(lat: number, lon: number, zoom: number) {
  const scale = 2 ** zoom * TILE_SIZE;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lon + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, zoom: number) {
  const scale = 2 ** zoom * TILE_SIZE;
  const lon = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lon };
}

interface ComboFieldProps {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  emptyHint: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
}

function ComboField({
  label,
  value,
  options,
  placeholder,
  emptyHint,
  disabled = false,
  required = false,
  onChange,
}: ComboFieldProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const key = query.trim().toLocaleLowerCase("vi");
    if (!key) return options;
    return options.filter((option) => option.toLocaleLowerCase("vi").includes(key));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const choose = (option: string) => {
    onChange(option);
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className={styles.field} ref={containerRef}>
      <span className={styles.fieldLabel}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <div className={styles.combo}>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-label={label}
          className={styles.comboInput}
          value={open ? query : value}
          placeholder={value || placeholder}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => {
            setQuery("");
            setActiveIndex(0);
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {value && !disabled && !open ? (
          <button
            type="button"
            className={styles.comboClear}
            aria-label={`Xóa ${label.toLowerCase()}`}
            onClick={() => onChange("")}
          >
            <X size={13} />
          </button>
        ) : (
          <ChevronDown size={15} className={styles.comboChevron} aria-hidden="true" />
        )}
      </div>
      {open && (
        <div className={styles.comboList} id={listId} role="listbox" aria-label={label}>
          {filtered.length ? (
            filtered.slice(0, 300).map((option, index) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                className={`${styles.comboOption} ${index === activeIndex ? styles.comboOptionActive : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                {option}
              </button>
            ))
          ) : (
            <p className={styles.comboEmpty}>{emptyHint}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AddressPicker({
  value,
  onChange,
  name = "address",
  required = false,
  disabled = false,
}: AddressPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  const dragRef = useRef<{
    pointerX: number;
    pointerY: number;
    worldX: number;
    worldY: number;
    moved: boolean;
  } | null>(null);
  const skipClickRef = useRef(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const [units, setUnits] = useState<ProvinceEntry[]>([]);
  const [unitsError, setUnitsError] = useState(false);
  const [view, setView] = useState<MapView>(DEFAULT_VIEW);
  const [size, setSize] = useState<MapSize>({ width: 0, height: 0 });
  const [marker, setMarker] = useState<{ lat: number; lon: number } | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [tileProvider, setTileProvider] = useState(0);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const initialAddressRef = useRef(Boolean(value.street || value.ward || value.city));

  const locateUser = useCallback((silent: boolean) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (!silent) {
        setStatus({
          kind: "error",
          message: "Trình duyệt không hỗ trợ định vị. Vui lòng chọn trên bản đồ hoặc nhập tay.",
        });
      }
      return;
    }
    if (!silent) setStatus({ kind: "loading", message: "Đang xác định vị trí hiện tại..." });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lon: position.coords.longitude };
        setUserLocation(point);
        setView({ ...point, zoom: 16 });
        setStatus({
          kind: silent ? "idle" : "success",
          message: silent
            ? "Bản đồ đang ở vị trí hiện tại của bạn. Bấm lên bản đồ để chọn địa chỉ."
            : "Đã đưa bản đồ về vị trí hiện tại của bạn. Bấm lên bản đồ để chọn địa chỉ.",
        });
      },
      () => {
        setStatus({
          kind: silent ? "idle" : "error",
          message: silent
            ? "Chưa lấy được vị trí hiện tại (cần cấp quyền truy cập vị trí). Bấm nút định vị để thử lại hoặc chọn trên bản đồ."
            : "Không lấy được vị trí hiện tại. Hãy cho phép truy cập vị trí hoặc nhập địa chỉ bên dưới.",
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  // Opening the picker for a new facility starts at the user's location.
  useEffect(() => {
    if (initialAddressRef.current) return;
    locateUser(true);
  }, [locateUser]);

  useEffect(() => {
    let active = true;
    loadVietnamAdministrativeUnits()
      .then((result) => {
        if (active) setUnits(result);
      })
      .catch(() => {
        if (active) setUnitsError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const node = mapRef.current;
    if (!node) return;
    const update = () =>
      setSize((current) =>
        current.width === node.clientWidth && current.height === node.clientHeight
          ? current
          : { width: node.clientWidth, height: node.clientHeight },
      );
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const province = useMemo(() => findProvince(units, value.city), [units, value.city]);
  const selectedWard = useMemo(() => findWard(province, value.ward), [province, value.ward]);
  const wardOptions = useMemo(() => {
    if (!province) return [];
    return searchWards(province, "").map((ward) => ward.name);
  }, [province]);
  const cityOptions = useMemo(() => units.map((unit) => unit.name), [units]);

  const tiles = useMemo(() => {
    if (!size.width || !size.height) return [];
    const center = project(view.lat, view.lon, view.zoom);
    const left = center.x - size.width / 2;
    const top = center.y - size.height / 2;
    const tileCount = 2 ** view.zoom;
    const minX = Math.floor(left / TILE_SIZE);
    const maxX = Math.floor((left + size.width) / TILE_SIZE);
    const minY = Math.max(0, Math.floor(top / TILE_SIZE));
    const maxY = Math.min(tileCount - 1, Math.floor((top + size.height) / TILE_SIZE));

    const result: Array<{ key: string; src: string; left: number; top: number }> = [];
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const wrappedX = ((x % tileCount) + tileCount) % tileCount;
        result.push({
          key: `${view.zoom}/${wrappedX}/${y}`,
          src: tileUrl(TILE_PROVIDERS[tileProvider].url, view.zoom, wrappedX, y),
          left: x * TILE_SIZE - left,
          top: y * TILE_SIZE - top,
        });
      }
    }
    return result;
  }, [size, tileProvider, view]);

  const markerPosition = useMemo(() => {
    if (!marker || !size.width) return null;
    const center = project(view.lat, view.lon, view.zoom);
    const point = project(marker.lat, marker.lon, view.zoom);
    return {
      left: size.width / 2 + (point.x - center.x),
      top: size.height / 2 + (point.y - center.y),
    };
  }, [marker, size, view]);

  const userPosition = useMemo(() => {
    if (!userLocation || !size.width) return null;
    const center = project(view.lat, view.lon, view.zoom);
    const point = project(userLocation.lat, userLocation.lon, view.zoom);
    return {
      left: size.width / 2 + (point.x - center.x),
      top: size.height / 2 + (point.y - center.y),
    };
  }, [size, userLocation, view]);

  const fillFromPlace = (place: MapGeocodeResult, availableUnits: ProvinceEntry[]) => {
    const fromMap = addressFromOsm(availableUnits, place.details);
    const current = valueRef.current;
    const next: AddressParts = {
      street: place.street || fromMap.street || current.street,
      ward: fromMap.ward,
      city: fromMap.city || current.city,
    };
    onChange(next);
    return next;
  };

  const resolvePoint = async (point: { lat: number; lon: number }) => {
    setStatus({ kind: "loading", message: "Đang xác định địa chỉ tại điểm đã chọn..." });
    try {
      const [place, availableUnits] = await Promise.all([
        reverseMapPlace(point.lat, point.lon),
        units.length ? Promise.resolve(units) : loadVietnamAdministrativeUnits(),
      ]);
      if (!place) {
        setStatus({
          kind: "error",
          message: "Không tìm thấy địa chỉ tại điểm này, vui lòng nhập tay.",
        });
        return;
      }
      const next = fillFromPlace(place, availableUnits);
      const filled = Boolean(next.street || next.ward || next.city);
      setStatus({
        kind: filled ? "success" : "error",
        message: filled
          ? "Đã điền địa chỉ từ bản đồ. Kiểm tra lại rồi chỉnh nếu cần."
          : "Không tìm thấy địa chỉ tại điểm này, vui lòng nhập tay.",
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Không kết nối được dịch vụ bản đồ. Bạn vẫn có thể nhập địa chỉ bên dưới.",
      });
    }
  };

  const handleMapClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }
    if (disabled || !size.width) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const center = project(view.lat, view.lon, view.zoom);
    const left = center.x - rect.width / 2;
    const top = center.y - rect.height / 2;
    const point = unproject(
      left + (event.clientX - rect.left),
      top + (event.clientY - rect.top),
      view.zoom,
    );
    setMarker(point);
    void resolvePoint(point);
  };

  const handleMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const center = project(view.lat, view.lon, view.zoom);
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      worldX: center.x,
      worldY: center.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.pointerX;
    const dy = event.clientY - drag.pointerY;
    if (!drag.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    drag.moved = true;
    const next = unproject(drag.worldX - dx, drag.worldY - dy, view.zoom);
    const lat = Math.max(-85, Math.min(85, next.lat));
    setView((current) => ({ ...current, lat, lon: next.lon }));
  };

  const handleMapPointerUp = () => {
    skipClickRef.current = dragRef.current?.moved ?? false;
    dragRef.current = null;
  };

  const handleSearch = async () => {
    const keyword = query.trim();
    if (!keyword || disabled) return;
    setStatus({ kind: "loading", message: "Đang tìm địa chỉ trên bản đồ..." });
    try {
      const results = await searchMapPlaces(keyword);
      const first = results[0];
      if (!first) {
        setStatus({ kind: "error", message: "Không tìm thấy địa chỉ phù hợp. Thử từ khóa khác." });
        return;
      }
      setView({ lat: first.lat, lon: first.lon, zoom: 16 });
      setMarker({ lat: first.lat, lon: first.lon });
      const availableUnits = units.length ? units : await loadVietnamAdministrativeUnits();
      const next = fillFromPlace(first, availableUnits);
      setStatus({
        kind: "success",
        message: `Đã chọn “${first.displayName || next.street || keyword}”. Kiểm tra lại phường/xã và thành phố.`,
      });
    } catch {
      setStatus({
        kind: "error",
        message: "Không kết nối được dịch vụ bản đồ. Bạn vẫn có thể nhập địa chỉ bên dưới.",
      });
    }
  };

  const changeZoom = (delta: number) =>
    setView((current) => ({
      ...current,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom + delta)),
    }));

  const handleCityChange = (city: string) => {
    const nextProvince = findProvince(units, city);
    const wardStillValid = findWard(nextProvince, value.ward);
    onChange({ ...value, city, ward: wardStillValid?.name ?? "" });
  };

  const composed = composeAddress(value);

  return (
    <section className={styles.picker} aria-label="Chọn địa chỉ">
      <input type="hidden" name={name} value={composed} disabled={disabled} />

      <div className={styles.mapToolbar}>
        <div className={styles.mapSearch} role="search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSearch();
              }
            }}
            aria-label="Tìm địa chỉ trên bản đồ"
            placeholder="Tìm đường, phường, thành phố trên bản đồ..."
            disabled={disabled}
            maxLength={120}
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={disabled || !query.trim()}
          >
            Tìm
          </button>
        </div>
        <div className={styles.zoomControls}>
          <button
            type="button"
            onClick={() => locateUser(false)}
            aria-label="Về vị trí hiện tại"
            title="Vị trí hiện tại"
            disabled={disabled}
          >
            <LocateFixed size={15} />
          </button>
          <button
            type="button"
            onClick={() => changeZoom(1)}
            aria-label="Phóng to bản đồ"
            disabled={disabled || view.zoom >= MAX_ZOOM}
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            onClick={() => changeZoom(-1)}
            aria-label="Thu nhỏ bản đồ"
            disabled={disabled || view.zoom <= MIN_ZOOM}
          >
            <Minus size={15} />
          </button>
        </div>
      </div>

      <div
        ref={mapRef}
        className={styles.map}
        onClick={handleMapClick}
        onPointerDown={handleMapPointerDown}
        onPointerMove={handleMapPointerMove}
        onPointerUp={handleMapPointerUp}
        onPointerCancel={handleMapPointerUp}
        role="application"
        aria-label="Bản đồ chọn địa chỉ, bấm để chọn vị trí"
        data-disabled={disabled || undefined}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            className={styles.tile}
            src={tile.src}
            alt=""
            loading="lazy"
            draggable={false}
            onError={() => {
              setTileProvider((current) =>
                current < TILE_PROVIDERS.length - 1 ? current + 1 : current,
              );
              setTilesLoaded(false);
            }}
            onLoad={() => setTilesLoaded(true)}
            style={{ left: tile.left, top: tile.top }}
          />
        ))}
        {!tilesLoaded && (
          <span className={styles.mapLoading}>
            <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
            Đang tải bản đồ...
          </span>
        )}
        {userPosition && (
          <span
            className={styles.userDot}
            style={{ left: userPosition.left, top: userPosition.top }}
            title="Vị trí hiện tại của bạn"
            aria-hidden="true"
          />
        )}
        {markerPosition && (
          <span
            className={styles.marker}
            style={{ left: markerPosition.left, top: markerPosition.top }}
            aria-hidden="true"
          >
            <MapPin size={26} />
          </span>
        )}
        <a
          className={styles.attribution}
          href={TILE_PROVIDERS[tileProvider].creditUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {TILE_PROVIDERS[tileProvider].attribution}
        </a>
        <span className={styles.mapHint}>
          <MapPin size={13} aria-hidden="true" /> Bấm lên bản đồ để lấy địa chỉ
        </span>
      </div>

      {status.message ? (
        <p className={styles.status} data-kind={status.kind} role="status">
          {status.kind === "loading" && <Loader2 size={13} className={styles.spinner} />}
          {status.message}
        </p>
      ) : (
        <p className={styles.status} data-kind="idle">
          Chọn trực tiếp trên bản đồ, hoặc nhập tay bên dưới.
        </p>
      )}

      <div className={styles.fields}>
        <label className={`${styles.field} ${styles.streetField}`}>
          <span className={styles.fieldLabel}>
            Tên đường, số nhà
            {required && <span aria-hidden="true"> *</span>}
          </span>
          <input
            type="text"
            className={styles.textInput}
            value={value.street}
            onChange={(event) => onChange({ ...value, street: event.target.value })}
            placeholder="Ví dụ: 123 Nguyễn Huệ"
            maxLength={160}
            required={required}
            disabled={disabled}
          />
        </label>

        <ComboField
          label="Phường / Xã"
          value={selectedWard?.name ?? value.ward}
          options={wardOptions}
          placeholder={province ? "Chọn phường, xã" : "Chọn thành phố trước"}
          emptyHint={
            province
              ? "Không tìm thấy phường/xã phù hợp."
              : "Chọn thành phố/tỉnh để tải danh sách phường, xã."
          }
          disabled={disabled || !province}
          onChange={(ward) => onChange({ ...value, ward })}
        />

        <ComboField
          label="Thành phố / Tỉnh"
          value={province?.name ?? value.city}
          options={cityOptions}
          placeholder={unitsError ? "Không tải được dữ liệu" : "Chọn thành phố, tỉnh"}
          emptyHint="Không tìm thấy thành phố/tỉnh phù hợp."
          disabled={disabled || units.length === 0}
          onChange={handleCityChange}
        />
      </div>

      <p className={styles.preview}>
        <span>Địa chỉ lưu:</span> {composed || <em>Chưa có thông tin địa chỉ.</em>}
      </p>
    </section>
  );
}
