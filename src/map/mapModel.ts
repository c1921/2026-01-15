import regionOverrides from "./regionOverrides.json";

export type MapMode = "county" | "duchy" | "kingdom" | "empire";

export interface Tile {
  id: string;
  x: number;
  y: number;
  countyId: string;
  duchyId: string;
  kingdomId: string;
  empireId: string;
}

export interface County {
  id: string;
  tileIds: string[];
  duchyId: string;
}

export interface Duchy {
  id: string;
  countyIds: string[];
  kingdomId: string;
}

export interface Kingdom {
  id: string;
  duchyIds: string[];
  empireId: string;
}

export interface Empire {
  id: string;
  kingdomIds: string[];
}

export interface WorldMapData {
  width: number;
  height: number;
  tiles: Tile[];
  counties: Record<string, County>;
  duchies: Record<string, Duchy>;
  kingdoms: Record<string, Kingdom>;
  empire: Empire;
}

export interface RegionMeta {
  name?: string;
  color?: string;
  parentId?: string | null;
}

export interface RegionInfo {
  id: string;
  mode: MapMode;
  tileCount: number;
  parentId: string | null;
  name?: string;
  color?: string;
}

export interface RegionOverrides {
  counties?: Record<string, RegionMeta>;
  duchies?: Record<string, RegionMeta>;
  kingdoms?: Record<string, RegionMeta>;
  empire?: RegionMeta;
}

interface OklchColor {
  l: number;
  c: number;
  h: number;
  alpha?: string;
}

const KINGDOM_SIZE = 4;
const DUCHY_SIZE = 2;
const EMPIRE_ID = "e-0";

const defaultRegionOverrides = regionOverrides as RegionOverrides;

export const cloneRegionOverrides = (): RegionOverrides =>
  JSON.parse(JSON.stringify(defaultRegionOverrides)) as RegionOverrides;

const OKLCH_REGEX =
  /^oklch\(\s*([0-9]+(?:\.[0-9]+)?)%\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)(?:\s*\/\s*([0-9]+(?:\.[0-9]+)?%?))?\s*\)$/i;

const parseOklch = (value: string): OklchColor | null => {
  const match = value.match(OKLCH_REGEX);
  if (!match) return null;
  return {
    l: Number(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
    alpha: match[4],
  };
};

const formatOklch = (color: OklchColor): string => {
  const alpha = color.alpha ? ` / ${color.alpha}` : "";
  return `oklch(${color.l.toFixed(2)}% ${color.c.toFixed(3)} ${color.h.toFixed(
    2,
  )}${alpha})`;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

const randomFromHash = (hash: number, salt: number): number => {
  let x = (hash ^ (salt * 0x9e3779b9)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967295;
};

const deriveOklch = (base: OklchColor, seed: string): OklchColor => {
  const hash = hashString(seed);
  const deltaL = (randomFromHash(hash, 1) * 2 - 1) * 12;
  const deltaC = (randomFromHash(hash, 2) * 2 - 1) * 0.045;
  const deltaH = (randomFromHash(hash, 3) * 2 - 1) * 24;

  return {
    l: clamp(base.l + deltaL, 0, 100),
    c: Math.max(0, base.c + deltaC),
    h: ((base.h + deltaH) % 360 + 360) % 360,
    alpha: base.alpha,
  };
};

const getRegionOverride = (
  mode: MapMode,
  regionId: string,
  overrides?: RegionOverrides,
): RegionMeta | undefined => {
  const source = overrides ?? defaultRegionOverrides;
  switch (mode) {
    case "county":
      return source.counties?.[regionId];
    case "duchy":
      return source.duchies?.[regionId];
    case "kingdom":
      return source.kingdoms?.[regionId];
    case "empire":
      return source.empire;
    default:
      return undefined;
  }
};

const resolveParentId = (
  override: RegionMeta | undefined,
  fallback: string | null,
): string | null => {
  if (!override) return fallback;
  if (Object.prototype.hasOwnProperty.call(override, "parentId")) {
    return override.parentId ?? null;
  }
  return fallback;
};

const resolveGroupParentId = (
  override: RegionMeta | undefined,
  fallback: string,
  orphanId: string,
): string => {
  if (!override) return fallback;
  if (Object.prototype.hasOwnProperty.call(override, "parentId")) {
    if (override.parentId === null) return orphanId;
    return override.parentId ?? fallback;
  }
  return fallback;
};

const buildRegionInfo = (
  mode: MapMode,
  id: string,
  tileCount: number,
  defaultParentId: string | null,
  overrides?: RegionOverrides,
): RegionInfo => {
  const override = getRegionOverride(mode, id, overrides);
  return {
    id,
    mode,
    tileCount,
    parentId: resolveParentId(override, defaultParentId),
    name: override?.name,
    color: override?.color,
  };
};

export function createWorldMap(
  width = 8,
  height = 8,
  overrides: RegionOverrides = defaultRegionOverrides,
): WorldMapData {
  const tiles: Tile[] = [];
  const counties: Record<string, County> = {};
  const countyDefaults = new Map<string, { duchyId: string; kingdomId: string }>();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const duchyX = Math.floor(x / DUCHY_SIZE);
      const duchyY = Math.floor(y / DUCHY_SIZE);
      const kingdomX = Math.floor(x / KINGDOM_SIZE);
      const kingdomY = Math.floor(y / KINGDOM_SIZE);

      const defaultDuchyId = `d-${duchyY}-${duchyX}`;
      const defaultKingdomId = `k-${kingdomY}-${kingdomX}`;

      const countyId = `c-${y}-${x}`;
      const tileId = `t-${y}-${x}`;

      let county = counties[countyId];
      if (!county) {
        county = { id: countyId, tileIds: [], duchyId: defaultDuchyId };
        counties[countyId] = county;
        countyDefaults.set(countyId, {
          duchyId: defaultDuchyId,
          kingdomId: defaultKingdomId,
        });
      }

      county.tileIds.push(tileId);
    }
  }

  const duchyDefaults = new Map<string, string>();
  for (const county of Object.values(counties)) {
    const defaults = countyDefaults.get(county.id);
    const fallbackDuchyId = defaults?.duchyId ?? `d-orphan-${county.id}`;
    const override = overrides.counties?.[county.id];
    const duchyId = resolveGroupParentId(
      override,
      fallbackDuchyId,
      `d-orphan-${county.id}`,
    );
    county.duchyId = duchyId;
    if (!duchyDefaults.has(duchyId)) {
      duchyDefaults.set(duchyId, defaults?.kingdomId ?? `k-orphan-${duchyId}`);
    }
  }

  const duchies: Record<string, Duchy> = {};
  for (const county of Object.values(counties)) {
    const duchyId = county.duchyId;
    let duchy = duchies[duchyId];
    if (!duchy) {
      duchy = { id: duchyId, countyIds: [], kingdomId: "" };
      duchies[duchyId] = duchy;
    }
    duchy.countyIds.push(county.id);
  }

  for (const duchy of Object.values(duchies)) {
    const fallbackKingdomId = duchyDefaults.get(duchy.id) ?? `k-orphan-${duchy.id}`;
    const override = overrides.duchies?.[duchy.id];
    const kingdomId = resolveGroupParentId(
      override,
      fallbackKingdomId,
      `k-orphan-${duchy.id}`,
    );
    duchy.kingdomId = kingdomId;
  }

  const kingdoms: Record<string, Kingdom> = {};
  for (const duchy of Object.values(duchies)) {
    const kingdomId = duchy.kingdomId;
    let kingdom = kingdoms[kingdomId];
    if (!kingdom) {
      kingdom = { id: kingdomId, duchyIds: [], empireId: EMPIRE_ID };
      kingdoms[kingdomId] = kingdom;
    }
    kingdom.duchyIds.push(duchy.id);
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const countyId = `c-${y}-${x}`;
      const tileId = `t-${y}-${x}`;
      const county = counties[countyId];
      const duchyId = county.duchyId;
      const kingdomId = duchies[duchyId]?.kingdomId ?? `k-orphan-${duchyId}`;

      tiles.push({
        id: tileId,
        x,
        y,
        countyId,
        duchyId,
        kingdomId,
        empireId: EMPIRE_ID,
      });
    }
  }

  const empire: Empire = { id: EMPIRE_ID, kingdomIds: Object.keys(kingdoms) };

  return { width, height, tiles, counties, duchies, kingdoms, empire };
}

export function getRegionId(tile: Tile, mode: MapMode): string {
  switch (mode) {
    case "county":
      return tile.countyId;
    case "duchy":
      return tile.duchyId;
    case "kingdom":
      return tile.kingdomId;
    case "empire":
      return tile.empireId;
    default:
      return tile.countyId;
  }
}

export function getRegionInfo(
  mapData: WorldMapData,
  mode: MapMode,
  regionId: string,
  overrides?: RegionOverrides,
): RegionInfo | null {
  if (mode === "county") {
    const county = mapData.counties[regionId];
    if (!county) return null;
    return buildRegionInfo(
      mode,
      county.id,
      county.tileIds.length,
      county.duchyId,
      overrides,
    );
  }

  if (mode === "duchy") {
    const duchy = mapData.duchies[regionId];
    if (!duchy) return null;
    return buildRegionInfo(
      mode,
      duchy.id,
      duchy.countyIds.length,
      duchy.kingdomId,
      overrides,
    );
  }

  if (mode === "kingdom") {
    const kingdom = mapData.kingdoms[regionId];
    if (!kingdom) return null;
    const tileCount = kingdom.duchyIds.reduce((total, duchyId) => {
      const duchy = mapData.duchies[duchyId];
      return total + (duchy ? duchy.countyIds.length : 0);
    }, 0);
    return buildRegionInfo(mode, kingdom.id, tileCount, kingdom.empireId, overrides);
  }

  if (mode === "empire") {
    return buildRegionInfo(
      mode,
      mapData.empire.id,
      mapData.width * mapData.height,
      null,
      overrides,
    );
  }

  return null;
}

export function getRegionColor(
  mode: MapMode,
  regionId: string,
  overrides?: RegionOverrides,
  mapData?: WorldMapData,
): string {
  const override = getRegionOverride(mode, regionId, overrides);
  if (override?.color) return override.color;

  if (mapData) {
    let parentMode: MapMode | null = null;
    let parentId: string | null = null;

    if (mode === "county") {
      parentMode = "duchy";
      parentId = mapData.counties[regionId]?.duchyId ?? null;
    } else if (mode === "duchy") {
      parentMode = "kingdom";
      parentId = mapData.duchies[regionId]?.kingdomId ?? null;
    } else if (mode === "kingdom") {
      parentMode = "empire";
      parentId = mapData.kingdoms[regionId]?.empireId ?? null;
    }

    if (parentMode && parentId) {
      const parentColor = getRegionColor(
        parentMode,
        parentId,
        overrides,
        mapData,
      );
      const parsed = parseOklch(parentColor);
      if (parsed) {
        return formatOklch(deriveOklch(parsed, regionId));
      }
    }
  }

  return hashColor(regionId);
}

export function hashColor(id: string): string {
  const hue = Math.abs(hashString(id)) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}
