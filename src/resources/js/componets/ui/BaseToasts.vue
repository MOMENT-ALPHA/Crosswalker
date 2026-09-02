<script setup lang="ts">
import AppIcon from "@/componets/AppIcon.vue";
import { useUiStore } from "@/stores/ui";

const ui = useUiStore();

const toneClass = {
    success: "border-emerald-200 bg-white text-emerald-800",
    error: "border-rose-200 bg-white text-rose-800",
    info: "border-slate-200 bg-white text-slate-800",
} as const;

const iconName = { success: "check", error: "alert", info: "info" } as const;
</script>

<template>
    <div class="pointer-events-none fixed top-4 right-4 z-60 flex w-80 flex-col gap-2">
        <TransitionGroup
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="translate-x-4 opacity-0"
            leave-active-class="transition duration-150 ease-in"
            leave-to-class="translate-x-4 opacity-0"
        >
            <div v-for="toast in ui.toasts" :key="toast.id" class="pointer-events-auto flex items-center gap-2.5 rounded-lg border px-3.5 py-3 shadow-lg" :class="toneClass[toast.type]">
                <AppIcon :name="iconName[toast.type]" :size="16" />
                <p class="flex-1 text-[13px] leading-relaxed">{{ toast.message }}</p>
                <button type="button" class="text-slate-400 transition-colors hover:text-slate-600" aria-label="閉じる" @click="ui.dismiss(toast.id)"><AppIcon name="close" :size="14" /></button>
            </div>
        </TransitionGroup>
    </div>
</template>
