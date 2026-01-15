<script setup lang="ts">
import { onMounted } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import AppTitlebar from "./components/AppTitlebar.vue";
import VerticalTabs from "./components/VerticalTabs.vue";
import BottomBar from "./components/BottomBar.vue";
import MapPage from "./components/MapPage.vue";

const isTauriEnv = isTauri();

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
        <main class="flex-1 min-w-0 min-h-0 overflow-hidden p-2">
          <div class="mx-auto flex h-full w-full min-h-0 flex-col gap-2">
            <section id="tabs-vertical-1" class="flex min-h-0 flex-1 flex-col rounded-box bg-base-100 p-6"
              role="tabpanel"
              aria-labelledby="tabs-vertical-item-1">
              <MapPage />
            </section>
            <section id="tabs-vertical-2" class="hidden rounded-box bg-base-100 p-6" role="tabpanel"
              aria-labelledby="tabs-vertical-item-2">
              <div>Profile content is coming soon.</div>
            </section>
            <section id="tabs-vertical-3" class="hidden rounded-box bg-base-100 p-6" role="tabpanel"
              aria-labelledby="tabs-vertical-item-3">
              <div>Messages will appear here.</div>
            </section>
            <section id="tabs-vertical-4" class="hidden rounded-box bg-base-100 p-6" role="tabpanel"
              aria-labelledby="tabs-vertical-item-4">
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
