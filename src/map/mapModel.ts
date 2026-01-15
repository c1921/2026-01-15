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

export interface RegionInfo {
  id: string;
  mode: MapMode;
  tileCount: number;
  parentId: string | null;
}

const KINGDOM_SIZE = 12;
const DUCHY_SIZE = 3;
const EMPIRE_ID = "e-0";

export function createWorldMap(width = 24, height = 24): WorldMapData {
  const tiles: Tile[] = [];
  const counties: Record<string, County> = {};
  const duchies: Record<string, Duchy> = {};
  const kingdoms: Record<string, Kingdom> = {};
  const empire: Empire = { id: EMPIRE_ID, kingdomIds: [] };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // Strict grid partitioning by coordinate.
      const kingdomX = Math.floor(x / KINGDOM_SIZE);
      const kingdomY = Math.floor(y / KINGDOM_SIZE);
      const kingdomId = `k-${kingdomY}-${kingdomX}`;

      const localX = x % KINGDOM_SIZE;
      const localY = y % KINGDOM_SIZE;
      const duchyX = Math.floor(localX / DUCHY_SIZE);
      const duchyY = Math.floor(localY / DUCHY_SIZE);
      const duchyId = `d-${kingdomId}-${duchyY}-${duchyX}`;

      const countyId = `c-${y}-${x}`;
      const tileId = `t-${y}-${x}`;

      let kingdom = kingdoms[kingdomId];
      if (!kingdom) {
        kingdom = { id: kingdomId, duchyIds: [], empireId: EMPIRE_ID };
        kingdoms[kingdomId] = kingdom;
        empire.kingdomIds.push(kingdomId);
      }

      let duchy = duchies[duchyId];
      if (!duchy) {
        duchy = { id: duchyId, countyIds: [], kingdomId };
        duchies[duchyId] = duchy;
        kingdom.duchyIds.push(duchyId);
      }

      let county = counties[countyId];
      if (!county) {
        county = { id: countyId, tileIds: [], duchyId };
        counties[countyId] = county;
      }

      county.tileIds.push(tileId);
      duchy.countyIds.push(countyId);

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
): RegionInfo | null {
  if (mode === "county") {
    const county = mapData.counties[regionId];
    if (!county) return null;
    return {
      id: county.id,
      mode,
      tileCount: county.tileIds.length,
      parentId: county.duchyId,
    };
  }

  if (mode === "duchy") {
    const duchy = mapData.duchies[regionId];
    if (!duchy) return null;
    return {
      id: duchy.id,
      mode,
      tileCount: duchy.countyIds.length,
      parentId: duchy.kingdomId,
    };
  }

  if (mode === "kingdom") {
    const kingdom = mapData.kingdoms[regionId];
    if (!kingdom) return null;
    const tileCount = kingdom.duchyIds.reduce((total, duchyId) => {
      const duchy = mapData.duchies[duchyId];
      return total + (duchy ? duchy.countyIds.length : 0);
    }, 0);
    return {
      id: kingdom.id,
      mode,
      tileCount,
      parentId: kingdom.empireId,
    };
  }

  if (mode === "empire") {
    return {
      id: mapData.empire.id,
      mode,
      tileCount: mapData.width * mapData.height,
      parentId: null,
    };
  }

  return null;
}

export function hashColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}
