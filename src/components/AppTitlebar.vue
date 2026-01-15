<script setup lang="ts">
import { onMounted, ref } from "vue";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WINDOW_PIN_EVENT_NAME } from "../windows/windowEvents";

const props = withDefaults(
  defineProps<{
    showMinimize?: boolean;
    showMaximize?: boolean;
    showClose?: boolean;
    showPin?: boolean;
    closeToTray?: boolean;
  }>(),
  {
    showMinimize: true,
    showMaximize: true,
    showClose: true,
    showPin: true,
    closeToTray: false,
  }
);

const isTauri =
  typeof window !== "undefined" &&
  typeof (window as { __TAURI__?: unknown }).__TAURI__ !== "undefined";
const appWindow = isTauri ? getCurrentWindow() : null;
const isPinned = ref(false);

onMounted(async () => {
  if (!appWindow) return;
  isPinned.value = await appWindow.isAlwaysOnTop();
});

function minimize() {
  if (!appWindow) return;
  appWindow.minimize();
}

function toggleMaximize() {
  if (!appWindow) return;
  appWindow.toggleMaximize();
}

async function startDrag(event: MouseEvent) {
  if (event.button !== 0 || !appWindow) return;
  await appWindow.startDragging();
}

async function togglePin() {
  if (!appWindow) return;
  const next = !isPinned.value;
  await appWindow.setAlwaysOnTop(next);
  isPinned.value = next;
  await emit(WINDOW_PIN_EVENT_NAME, { pinned: next });
}

async function closeWindow() {
  if (!appWindow) return;
  if (props.closeToTray) {
    await appWindow.minimize();
    await appWindow.hide();
    return;
  }
  await appWindow.close();
}
</script>

<template>
  <div class="flex items-center bg-base-300">
    <div
      class="flex-1 h-10"
      @mousedown="startDrag"
      @dblclick.prevent
    ></div>
    <div class="flex gap-1">
      <button
        v-if="props.showMinimize"
        type="button"
        class="btn btn-square btn-text hover:bg-base-100"
        aria-label="Minimize"
        @click="minimize"
      >
        <span class="icon-[tabler--minus] size-4.5 shrink-0"></span>
      </button>
      <button
        v-if="props.showMaximize"
        type="button"
        class="btn btn-square btn-text hover:bg-base-100"
        aria-label="Maximize"
        @click="toggleMaximize"
      >
        <span class="icon-[tabler--square] size-4.5 shrink-0"></span>
      </button>
      <button
        v-if="props.showPin"
        type="button"
        class="btn btn-square btn-text hover:bg-base-100"
        :aria-label="isPinned ? 'Unpin' : 'Pin'"
        @click="togglePin"
      >
        <span
          :class="isPinned ? 'icon-[tabler--pin-filled]' : 'icon-[tabler--pin]'"
          class="size-4.5 shrink-0"
        ></span>
      </button>
      <button
        v-if="props.showClose"
        type="button"
        class="btn btn-square btn-text hover:bg-error hover:text-error-content"
        aria-label="Close"
        @click="closeWindow"
      >
        <span class="icon-[tabler--x] size-4.5 shrink-0"></span>
      </button>
    </div>
  </div>
</template>
