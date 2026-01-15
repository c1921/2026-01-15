<script setup lang="ts">
import { computed, ref, watch } from "vue";
import GridMap from "./GridMap.vue";
import {
  cloneRegionOverrides,
  createWorldMap,
  getRegionInfo,
  type MapMode,
  type RegionMeta,
  type RegionOverrides,
} from "../map/mapModel";

const mapMode = ref<MapMode>("county");
const selectedRegionId = ref<string | null>(null);
const editMode = ref(false);
const regionOverrides = ref<RegionOverrides>(cloneRegionOverrides());
const mapData = computed(() => createWorldMap(8, 8, regionOverrides.value));

type ParentMode = "default" | "none" | "custom";
const editName = ref("");
const editColor = ref("");
const parentMode = ref<ParentMode>("default");
const editParentId = ref("");
const saveStatus = ref("");

const modeOptions: { label: string; value: MapMode }[] = [
  { label: "County", value: "county" },
  { label: "Duchy", value: "duchy" },
  { label: "Kingdom", value: "kingdom" },
  { label: "Empire", value: "empire" },
];

const regionInfo = computed(() =>
  selectedRegionId.value
    ? getRegionInfo(
        mapData.value,
        mapMode.value,
        selectedRegionId.value,
        regionOverrides.value,
      )
    : null,
);

const hasOverrideFields = (meta?: RegionMeta): boolean => {
  if (!meta) return false;
  if (meta.name?.trim()) return true;
  if (meta.color?.trim()) return true;
  return Object.prototype.hasOwnProperty.call(meta, "parentId");
};

const getParentMode = (mode: MapMode): MapMode | null => {
  switch (mode) {
    case "county":
      return "duchy";
    case "duchy":
      return "kingdom";
    case "kingdom":
      return "empire";
    default:
      return null;
  }
};

const parentModeAvailable = computed(() => getParentMode(mapMode.value) !== null);

const getModeKey = (mode: MapMode): "counties" | "duchies" | "kingdoms" => {
  switch (mode) {
    case "county":
      return "counties";
    case "duchy":
      return "duchies";
    case "kingdom":
      return "kingdoms";
    default:
      return "counties";
  }
};

const getOverride = (
  overrides: RegionOverrides,
  mode: MapMode,
  regionId: string | null,
): RegionMeta | undefined => {
  if (!regionId) return undefined;
  if (mode === "empire") return overrides.empire;
  return overrides[getModeKey(mode)]?.[regionId];
};

const setOverride = (
  overrides: RegionOverrides,
  mode: MapMode,
  regionId: string,
  meta: RegionMeta | null,
) => {
  if (mode === "empire") {
    if (meta && hasOverrideFields(meta)) {
      overrides.empire = meta;
    } else {
      delete overrides.empire;
    }
    return;
  }

  const key = getModeKey(mode);
  const collection = overrides[key] ?? {};

  if (meta && hasOverrideFields(meta)) {
    collection[regionId] = meta;
    overrides[key] = collection;
  } else {
    delete collection[regionId];
    if (Object.keys(collection).length === 0) {
      delete overrides[key];
    } else {
      overrides[key] = collection;
    }
  }
};

const syncEditForm = () => {
  const override = getOverride(regionOverrides.value, mapMode.value, selectedRegionId.value);
  editName.value = override?.name ?? "";
  editColor.value = override?.color ?? "";
  if (override && Object.prototype.hasOwnProperty.call(override, "parentId")) {
    if (override.parentId === null) {
      parentMode.value = "none";
      editParentId.value = "";
    } else {
      parentMode.value = "custom";
      editParentId.value = override.parentId ?? "";
    }
  } else {
    parentMode.value = "default";
    editParentId.value = "";
  }
};

const buildOverrideFromForm = (): RegionMeta | null => {
  const next: RegionMeta = {};
  const name = editName.value.trim();
  const color = editColor.value.trim();

  if (name) next.name = name;
  if (color) next.color = color;

  if (parentMode.value === "none") {
    next.parentId = null;
  } else if (parentMode.value === "custom") {
    const parentId = editParentId.value.trim();
    if (parentId) {
      next.parentId = parentId;
    }
  }

  return hasOverrideFields(next) ? next : null;
};

const applyOverride = () => {
  if (!selectedRegionId.value) return;
  const nextMeta = buildOverrideFromForm();
  setOverride(regionOverrides.value, mapMode.value, selectedRegionId.value, nextMeta);
  syncEditForm();
};

const clearOverride = () => {
  if (!selectedRegionId.value) return;
  setOverride(regionOverrides.value, mapMode.value, selectedRegionId.value, null);
  syncEditForm();
};

const hasOverrideForSelection = computed(() =>
  hasOverrideFields(
    getOverride(regionOverrides.value, mapMode.value, selectedRegionId.value),
  ),
);

const defaultParentId = computed(() => {
  if (!selectedRegionId.value) return null;
  switch (mapMode.value) {
    case "county":
      return mapData.value.counties[selectedRegionId.value]?.duchyId ?? null;
    case "duchy":
      return mapData.value.duchies[selectedRegionId.value]?.kingdomId ?? null;
    case "kingdom":
      return mapData.value.kingdoms[selectedRegionId.value]?.empireId ?? null;
    default:
      return null;
  }
});

const defaultParentLabel = computed(() => {
  const parentMode = getParentMode(mapMode.value);
  if (!parentMode) return "No parent";
  const parentId = defaultParentId.value;
  if (!parentId) return "Use default";
  const info = getRegionInfo(mapData.value, parentMode, parentId, regionOverrides.value);
  const name = info?.name?.trim() || "Unnamed";
  return `Default: ${name} (${parentId})`;
});

const parentOptions = computed(() => {
  const parentMode = getParentMode(mapMode.value);
  if (!parentMode) return [];

  let parentIds: string[] = [];
  if (parentMode === "duchy") {
    parentIds = Object.keys(mapData.value.duchies);
  } else if (parentMode === "kingdom") {
    parentIds = Object.keys(mapData.value.kingdoms);
  } else if (parentMode === "empire") {
    parentIds = [mapData.value.empire.id];
  }

  return parentIds.sort().map((id) => {
    const info = getRegionInfo(mapData.value, parentMode, id, regionOverrides.value);
    const name = info?.name?.trim() || "Unnamed";
    return {
      id,
      label: `${name} (${id})`,
    };
  });
});

const parentSelectValue = computed({
  get() {
    if (parentMode.value === "default") return "__default";
    if (parentMode.value === "none") return "__none";
    return editParentId.value || "__default";
  },
  set(value) {
    if (value === "__default") {
      parentMode.value = "default";
      editParentId.value = "";
      return;
    }
    if (value === "__none") {
      parentMode.value = "none";
      editParentId.value = "";
      return;
    }
    parentMode.value = "custom";
    editParentId.value = value;
  },
});

const cleanMeta = (meta: RegionMeta | undefined): RegionMeta | null => {
  if (!meta) return null;
  const cleaned: RegionMeta = {};
  const name = meta.name?.trim();
  const color = meta.color?.trim();

  if (name) cleaned.name = name;
  if (color) cleaned.color = color;
  if (Object.prototype.hasOwnProperty.call(meta, "parentId")) {
    cleaned.parentId = meta.parentId ?? null;
  }

  return hasOverrideFields(cleaned) ? cleaned : null;
};

const collectOverrides = (
  records: Record<string, RegionMeta> | undefined,
): Record<string, RegionMeta> => {
  const result: Record<string, RegionMeta> = {};
  if (!records) return result;

  for (const [regionId, meta] of Object.entries(records)) {
    const cleaned = cleanMeta(meta);
    if (cleaned) {
      result[regionId] = cleaned;
    }
  }

  return result;
};

const normalizedOverrides = computed<RegionOverrides>(() => ({
  counties: collectOverrides(regionOverrides.value.counties),
  duchies: collectOverrides(regionOverrides.value.duchies),
  kingdoms: collectOverrides(regionOverrides.value.kingdoms),
  empire: cleanMeta(regionOverrides.value.empire) ?? {},
}));

const overridesJson = computed(() => JSON.stringify(normalizedOverrides.value, null, 2));

const showSaveStatus = (message: string) => {
  saveStatus.value = message;
  window.setTimeout(() => {
    saveStatus.value = "";
  }, 2000);
};

const copyOverrides = async () => {
  try {
    await navigator.clipboard.writeText(overridesJson.value);
    showSaveStatus("JSON copied to clipboard.");
  } catch (error) {
    console.error(error);
    showSaveStatus("Copy failed.");
  }
};

const downloadOverrides = () => {
  const blob = new Blob([overridesJson.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "regionOverrides.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
  showSaveStatus("Download started.");
};

const handleSelect = (regionId: string) => {
  selectedRegionId.value = regionId;
};

watch(mapMode, () => {
  selectedRegionId.value = null;
});

watch([selectedRegionId, mapMode, editMode], syncEditForm, { immediate: true });
</script>

<template>
  <div class="relative h-full min-h-0 overflow-hidden">
    <div class="h-full overflow-hidden">
      <GridMap
        :map-data="mapData"
        :map-mode="mapMode"
        :tile-size="20"
        :selected-region-id="selectedRegionId"
        :region-overrides="regionOverrides"
        @select="handleSelect"
      />
    </div>
    <div
      class="pointer-events-auto absolute inset-x-0 bottom-0 mx-auto w-[calc(100%-1rem)] max-w-full rounded-2xl border border-base-300/60 bg-base-200/90 p-4 text-base-content shadow-2xl backdrop-blur"
    >
      <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex flex-wrap gap-2">
          <button v-for="mode in modeOptions" :key="mode.value" class="btn btn-sm"
            :class="mapMode === mode.value ? 'btn-primary' : 'btn-outline'" @click="mapMode = mode.value">
            {{ mode.label }}
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn btn-sm"
            :class="editMode ? 'btn-secondary' : 'btn-outline'" @click="editMode = !editMode">
            {{ editMode ? "Editing" : "Edit" }}
          </button>
        </div>
      </section>

      <section class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div class="flex min-w-0 items-center justify-center">

        </div>
        <aside class="card border border-base-300/60 bg-base-100/80 shadow-xl">
          <div class="card-body gap-4">
            <div class="flex items-center justify-between text-sm font-semibold">
              <span>Selection</span>
              <span class="font-mono text-xs text-base-content/60">{{ mapMode }}</span>
            </div>
            <div v-if="regionInfo" class="space-y-3 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-base-content/70">Region Id</span>
                <span class="font-mono">{{ regionInfo.id }}</span>
              </div>
              <div v-if="regionInfo.name" class="flex items-center justify-between">
                <span class="text-base-content/70">Name</span>
                <span class="font-mono">{{ regionInfo.name }}</span>
              </div>
              <div v-if="regionInfo.color" class="flex items-center justify-between">
                <span class="text-base-content/70">Color</span>
                <span class="flex items-center gap-2 font-mono">
                  <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: regionInfo.color }"></span>
                  {{ regionInfo.color }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-base-content/70">Level</span>
                <span class="font-mono">{{ regionInfo.mode }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-base-content/70">Parent</span>
                <span class="font-mono">{{ regionInfo.parentId ?? "None" }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-base-content/70">Tiles</span>
                <span class="font-mono">{{ regionInfo.tileCount }}</span>
              </div>
            </div>
            <div v-else class="text-sm text-base-content/60">
              Click a tile to inspect the current region.
            </div>
            <div v-if="editMode" class="mt-4 space-y-4 border-t border-base-300/60 pt-4">
              <div class="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                Edit Override
              </div>
              <div v-if="selectedRegionId" class="space-y-3 text-sm">
                <div class="flex items-center justify-between text-xs text-base-content/60">
                  <span>Editing</span>
                  <span class="font-mono">{{ selectedRegionId }}</span>
                </div>
                <label class="form-control w-full">
                  <div class="label">
                    <span class="label-text">Name</span>
                  </div>
                  <input v-model="editName" type="text" class="input input-sm input-bordered"
                    placeholder="Display name" />
                </label>
                <label class="form-control w-full">
                  <div class="label">
                    <span class="label-text">Color</span>
                  </div>
                  <input v-model="editColor" type="text" class="input input-sm input-bordered font-mono"
                    placeholder="#3E7B63 or hsl(...)" />
                </label>
                <label class="form-control w-full">
                  <div class="label">
                    <span class="label-text">Parent</span>
                  </div>
                  <select v-model="parentSelectValue" class="select select-sm select-bordered"
                    :disabled="!parentModeAvailable">
                    <option value="__default">{{ defaultParentLabel }}</option>
                    <option v-if="parentModeAvailable" value="__none">None</option>
                    <option v-for="option in parentOptions" :key="option.id" :value="option.id">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <div class="flex flex-wrap gap-2 pt-2">
                  <button class="btn btn-sm btn-primary" :disabled="!selectedRegionId"
                    @click="applyOverride">
                    Apply
                  </button>
                  <button class="btn btn-sm btn-outline" :disabled="!hasOverrideForSelection"
                    @click="clearOverride">
                    Clear
                  </button>
                </div>
              </div>
              <div v-else class="text-sm text-base-content/60">
                Select a region to edit its override fields.
              </div>
              <div class="space-y-2">
                <div class="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                  Export
                </div>
                <div class="flex flex-wrap gap-2">
                  <button class="btn btn-sm btn-outline" @click="copyOverrides">Copy JSON</button>
                  <button class="btn btn-sm btn-outline" @click="downloadOverrides">
                    Download JSON
                  </button>
                </div>
                <textarea class="textarea textarea-bordered h-32 font-mono text-xs"
                  readonly :value="overridesJson"></textarea>
                <div v-if="saveStatus" class="text-xs text-base-content/60">{{ saveStatus }}</div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  </div>
</template>
