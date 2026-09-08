<script setup lang="ts">
import { RouterView } from "vue-router";
import { useUiStore } from "@/stores/ui";
import AppIcon from "@/componets/AppIcon.vue";
import BaseToasts from "@/componets/ui/BaseToasts.vue";

const ui = useUiStore();
</script>

<template>
    <div :inert="ui.navigating ? true : undefined" :aria-busy="ui.navigating">
        <RouterView />
    </div>
    <div v-if="ui.navigating" class="fixed inset-0 z-60 flex items-center justify-center bg-white/70" role="status" aria-live="polite" aria-atomic="true">
        <div class="flex items-center gap-3 rounded-xl bg-white px-6 py-4 text-sm font-medium text-slate-700 shadow-xs">
            <AppIcon name="progress_activity" :size="24" class="animate-spin text-primary-500 motion-reduce:animate-none" aria-hidden="true" />
            <span>読み込み中...</span>
        </div>
    </div>
    <BaseToasts />
</template>
