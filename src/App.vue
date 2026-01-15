<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import AppTitlebar from "./components/AppTitlebar.vue";
import VerticalTabs from "./components/VerticalTabs.vue";
import BottomBar from "./components/BottomBar.vue";
import GridMap from "./components/GridMap.vue";
import { createWorldMap, getRegionInfo, type MapMode } from "./map/mapModel";

const isTauriEnv = isTauri();
const mapData = createWorldMap(24, 24);

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

onMounted(() => {
  setTimeout(() => window.HSStaticMethods.autoInit(), 100);
});
</script>

<template>
  <div class="flex h-screen flex-col bg-base-200 font-sans text-base-content">
    <header v-if="isTauriEnv" class="border-b border-base-300/50">
      <AppTitlebar :close-to-tray="true" />
    </header>
    <div class="flex-1 min-h-0 overflow-hidden">
      <div class="flex h-full">
        <aside>
          <VerticalTabs />
        </aside>
        <main class="flex-1 min-w-0 min-h-0 overflow-x-hidden p-2">
          <div class="mx-auto flex w-full flex-col gap-2">
            <section
              id="tabs-vertical-1"
              class="rounded-box bg-base-100 p-6"
              role="tabpanel"
              aria-labelledby="tabs-vertical-item-1"
            >
              <div
                class="w-full max-w-full rounded-2xl border border-base-300/60 bg-base-200/80 p-4 text-base-content shadow-xl"
              >
                <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="mode in modeOptions"
                      :key="mode.value"
                      class="btn btn-sm"
                      :class="mapMode === mode.value ? 'btn-primary' : 'btn-outline'"
                      @click="mapMode = mode.value"
                    >
                      {{ mode.label }}
                    </button>
                  </div>
                </section>

                <section class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
                  <div class="flex min-w-0 items-center justify-center">
                    <div class="min-w-0 w-full overflow-auto">
                      <GridMap
                        :map-data="mapData"
                        :map-mode="mapMode"
                        :tile-size="20"
                        :selected-region-id="selectedRegionId"
                        @select="handleSelect"
                      />
                    </div>
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
            </section>
            <section
              id="tabs-vertical-2"
              class="hidden rounded-box bg-base-100 p-6"
              role="tabpanel"
              aria-labelledby="tabs-vertical-item-2"
            >
              <div>Profile content is coming soon.</div>
            </section>
            <section
              id="tabs-vertical-3"
              class="hidden rounded-box bg-base-100 p-6"
              role="tabpanel"
              aria-labelledby="tabs-vertical-item-3"
            >
              <div>Messages will appear here.</div>
            </section>
            <section
              id="tabs-vertical-4"
              class="hidden rounded-box bg-base-100 p-6"
              role="tabpanel"
              aria-labelledby="tabs-vertical-item-4"
            >
              <div>Logs</div>
            </section>
          </div>
        </main>
      </div>
    </div>
    <footer>
      <BottomBar />
    </footer>
  </div>
</template>
