<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import ActivityLog from "./components/ActivityLog.vue";
import AppTitlebar from "./components/AppTitlebar.vue";
import BottomBar from "./components/BottomBar.vue";
import MiniSparkline from "./components/MiniSparkline.vue";
import ProductsPanel from "./components/ProductsPanel.vue";
import VerticalTabs from "./components/VerticalTabs.vue";
import { useGame } from "./composables/useGame";
import PopupView from "./views/Popup.vue";
import { MAIN_EVENT_NAME } from "./windows/popup";
import { WINDOW_PIN_EVENT_NAME } from "./windows/windowEvents";

const route = useRoute();
const isPopupRoute = computed(() => route.path === "/popup");

let unlistenPopup: (() => void) | null = null;
let unlistenPin: (() => void) | null = null;

onMounted(async () => {
  if (isPopupRoute.value) return;
  setTimeout(() => window.HSStaticMethods.autoInit(), 100);
  unlistenPopup = await listen(MAIN_EVENT_NAME, (event) => {
    const payload = event.payload as
      | { action?: string; index?: number }
      | null
      | undefined;
    if (payload?.action === "select-event-option") {
      if (typeof payload.index === "number") {
        handleEventOption(payload.index);
      }
    }
  });
  unlistenPin = await listen(WINDOW_PIN_EVENT_NAME, async (event) => {
    const payload = event.payload as { pinned?: boolean } | null | undefined;
    if (!payload || typeof payload.pinned !== "boolean") return;
    const popup = await WebviewWindow.getByLabel("popup");
    if (!popup) return;
    await popup.setAlwaysOnTop(payload.pinned);
  });
});

onBeforeUnmount(() => {
  unlistenPopup?.();
  unlistenPin?.();
});

const {
  money,
  buyAmount,
  productRows,
  pausedByPlayer,
  pausedByEvent,
  eventTitle,
  eventBody,
  eventOptionsView,
  log,
  minuteRevenue,
  minuteLabels,
  timeLabel,
  buyStock,
  togglePause,
  handleEventOption,
} = useGame();

watch(pausedByEvent, async (isActive) => {
  if (isPopupRoute.value || !isActive) return;
  await nextTick();
  window.HSStaticMethods?.autoInit();
});

</script>

<template>
  <PopupView v-if="isPopupRoute" />
  <div v-else class="flex h-screen flex-col bg-base-200 font-sans text-base-content">
    <header>
      <AppTitlebar :close-to-tray="true" />
    </header>
    <div class="flex-1 min-h-0 overflow-hidden">
      <div class="flex h-full">
        <aside>
          <VerticalTabs />
        </aside>
        <main class="flex-1 min-h-0 overflow-y-auto p-2">
          <div class="mx-auto flex w-full flex-col gap-2">
            <section
              id="tabs-vertical-1"
              role="tabpanel"
              aria-labelledby="tabs-vertical-item-1"
            >
              <div class="flex flex-col gap-2">
                <ProductsPanel
                  v-model:buy-amount="buyAmount"
                  :products="productRows"
                  @buy="buyStock"
                />
                <MiniSparkline :values="minuteRevenue" :labels="minuteLabels" />
              </div>
            </section>
            <section
              id="tabs-vertical-2"
              class="hidden rounded-box bg-base-100 p-6 text-base-content/70"
              role="tabpanel"
              aria-labelledby="tabs-vertical-item-2"
            >
              <div class="flex flex-col gap-2">
                Profile content is coming soon.
              </div>
            </section>
            <section
              id="tabs-vertical-3"
              class="hidden rounded-box bg-base-100 p-6 text-base-content/70"
              role="tabpanel"
              aria-labelledby="tabs-vertical-item-3"
            >
              <div class="flex flex-col gap-2">
                Messages will appear here.
              </div>
            </section>
            <section
              id="tabs-vertical-4"
              class="hidden"
              role="tabpanel"
              aria-labelledby="tabs-vertical-item-4"
            >
              <div class="flex flex-col gap-2">
                <ActivityLog :log="log" />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
    <footer>
      <BottomBar
        :time-label="timeLabel"
        :money="money"
        :event-title="eventTitle"
        :event-body="eventBody"
        :event-options="eventOptionsView"
        :has-event="pausedByEvent"
        :paused-by-player="pausedByPlayer"
        @toggle-pause="togglePause"
      />
    </footer>
  </div>
</template>
