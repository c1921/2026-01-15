<script setup lang="ts">
import { computed, ref, watch } from "vue";
import GridMap from "./GridMap.vue";
import { createWorldMap, getRegionInfo, type MapMode } from "../map/mapModel";

const mapData = createWorldMap(8, 8);

const mapMode = ref<MapMode>("county");
const selectedRegionId = ref<string | null>(null);

const modeOptions: { label: string; value: MapMode }[] = [
  { label: "County", value: "county" },
  { label: "Duchy", value: "duchy" },
  { label: "Kingdom", value: "kingdom" },
  { label: "Empire", value: "empire" },
];

const regionInfo = computed(() =>
  selectedRegionId.value
    ? getRegionInfo(mapData, mapMode.value, selectedRegionId.value)
    : null,
);

const handleSelect = (regionId: string) => {
  selectedRegionId.value = regionId;
};

watch(mapMode, () => {
  selectedRegionId.value = null;
});
</script>

<template>
  <div class="relative h-full min-h-0 overflow-hidden">
    <div class="h-full overflow-hidden">
      <GridMap
        :map-data="mapData"
        :map-mode="mapMode"
        :tile-size="20"
        :selected-region-id="selectedRegionId"
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
          </div>
        </aside>
      </section>
    </div>
  </div>
</template>
