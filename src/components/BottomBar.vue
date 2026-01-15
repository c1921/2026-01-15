<template>
  <div class="bg-base-300">
    <div class="mx-auto flex w-full flex-wrap items-center gap-3 px-4">
      <button class="btn btn-text cursor-pointer" type="button">
        <span
          class="icon-[tabler--player-pause] size-5 shrink-0 text-base-content"
          aria-hidden="true"
        ></span>
        00:00
      </button>
      <button class="btn btn-text">
        <span class="icon-[tabler--coin] size-5 shrink-0"></span>
        $0
      </button>
      <button class="btn btn-text ml-auto" type="button">
        <span class="icon-[tabler--bell] size-5 shrink-0"></span>
        <span class="truncate">No event</span>
      </button>
    </div>
  </div>
</template>
