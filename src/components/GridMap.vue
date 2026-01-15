<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";
import {
  getRegionId,
  getRegionColor,
  type MapMode,
  type RegionOverrides,
  type WorldMapData,
} from "../map/mapModel";

interface Props {
  mapData: WorldMapData;
  mapMode: MapMode;
  tileSize?: number;
  selectedRegionId?: string | null;
  regionOverrides?: RegionOverrides;
}

const props = withDefaults(defineProps<Props>(), {
  tileSize: 20,
  selectedRegionId: null,
});

const emit = defineEmits<{
  (event: "select", regionId: string): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerSize = ref({ width: 0, height: 0 });
let resizeObserver: ResizeObserver | null = null;
const scale = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const dragOrigin = ref({ x: 0, y: 0 });

const clampScale = (value: number) => Math.min(3, Math.max(0.6, value));

const draw = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height, tiles } = props.mapData;
  const tileSize = props.tileSize;
  const dpr = window.devicePixelRatio || 1;

  if (!containerSize.value.width || !containerSize.value.height) {
    return;
  }

  const canvasWidth = containerSize.value.width;
  const canvasHeight = containerSize.value.height;

  canvas.width = canvasWidth * dpr;
  canvas.height = canvasHeight * dpr;
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.translate(offsetX.value, offsetY.value);
  ctx.scale(scale.value, scale.value);

  const regionIds = new Array<string>(tiles.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const tile = tiles[index];
      const regionId = getRegionId(tile, props.mapMode);
      regionIds[index] = regionId;

      ctx.fillStyle = getRegionColor(
        props.mapMode,
        regionId,
        props.regionOverrides,
        props.mapData,
      );
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  if (props.selectedRegionId) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (regionIds[index] === props.selectedRegionId) {
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
      }
    }
  }

  ctx.beginPath();
  // Boundary lines: only compare right and bottom neighbors to avoid duplicates.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const regionId = regionIds[index];

      if (x + 1 < width) {
        const rightId = regionIds[index + 1];
        if (regionId !== rightId) {
          const xLine = (x + 1) * tileSize;
          ctx.moveTo(xLine, y * tileSize);
          ctx.lineTo(xLine, (y + 1) * tileSize);
        }
      }

      if (y + 1 < height) {
        const bottomId = regionIds[index + width];
        if (regionId !== bottomId) {
          const yLine = (y + 1) * tileSize;
          ctx.moveTo(x * tileSize, yLine);
          ctx.lineTo((x + 1) * tileSize, yLine);
        }
      }
    }
  }

  ctx.strokeStyle = "rgba(15, 23, 42, 0.7)";
  ctx.lineWidth = Math.max(1, tileSize * 0.08);
  ctx.stroke();
};

const toWorld = (screenX: number, screenY: number) => {
  return {
    x: (screenX - offsetX.value) / scale.value,
    y: (screenY - offsetY.value) / scale.value,
  };
};

const handleClick = (event: MouseEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const world = toWorld(event.clientX - rect.left, event.clientY - rect.top);
  const x = Math.floor(world.x / props.tileSize);
  const y = Math.floor(world.y / props.tileSize);

  if (
    x < 0 ||
    y < 0 ||
    x >= props.mapData.width ||
    y >= props.mapData.height
  ) {
    return;
  }

  const tile = props.mapData.tiles[y * props.mapData.width + x];
  const regionId = getRegionId(tile, props.mapMode);
  emit("select", regionId);
};

const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const cursorX = event.clientX - rect.left;
  const cursorY = event.clientY - rect.top;

  const zoomDirection = event.deltaY > 0 ? 0.9 : 1.1;
  const before = toWorld(cursorX, cursorY);
  const nextScale = clampScale(scale.value * zoomDirection);
  scale.value = nextScale;

  offsetX.value = cursorX - before.x * scale.value;
  offsetY.value = cursorY - before.y * scale.value;
};

const handlePointerDown = (event: PointerEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  isDragging.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  dragOrigin.value = { x: offsetX.value, y: offsetY.value };
  canvas.setPointerCapture(event.pointerId);
};

const handlePointerMove = (event: PointerEvent) => {
  if (!isDragging.value) return;
  offsetX.value = dragOrigin.value.x + (event.clientX - dragStart.value.x);
  offsetY.value = dragOrigin.value.y + (event.clientY - dragStart.value.y);
};

const handlePointerUp = (event: PointerEvent) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  isDragging.value = false;
  canvas.releasePointerCapture(event.pointerId);
};

onMounted(() => {
  const container = containerRef.value;
  if (!container) return;

  const updateSize = () => {
    const rect = container.getBoundingClientRect();
    containerSize.value = {
      width: Math.floor(rect.width),
      height: Math.floor(rect.height),
    };
  };

  updateSize();
  resizeObserver = new ResizeObserver(updateSize);
  resizeObserver.observe(container);
});

onMounted(draw);
watchEffect(draw);

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>

<template>
  <div ref="containerRef" class="grid h-full w-full place-items-center overflow-hidden bg-base-100">
    <canvas
      ref="canvasRef"
      class="h-full w-full active:cursor-grabbing touch-none"
      @click="handleClick"
      @wheel="handleWheel"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerUp"
    ></canvas>
  </div>
</template>
