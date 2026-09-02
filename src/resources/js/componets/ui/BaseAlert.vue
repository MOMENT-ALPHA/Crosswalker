<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "@/componets/AppIcon.vue";

type Tone = "info" | "success" | "warning" | "danger";

const props = withDefaults(defineProps<{ tone?: Tone; title?: string }>(), { tone: "info", title: "" });

const toneClass: Record<Tone, { box: string; icon: string; name: string }> = {
    info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: "text-sky-600", name: "info" },
    success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: "text-emerald-600", name: "check" },
    warning: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: "text-amber-600", name: "warning" },
    danger: { box: "border-rose-200 bg-rose-50 text-rose-900", icon: "text-rose-600", name: "warning" },
};

const tone = computed(() => toneClass[props.tone]);
</script>

<template>
    <div class="flex gap-3 rounded-lg border px-4 py-3 text-sm" :class="tone.box">
        <AppIcon :name="tone.name" :size="18" :class="['mt-0.5', tone.icon]" />
        <div class="min-w-0">
            <p v-if="title" class="font-semibold">{{ title }}</p>
            <div class="text-[13px] leading-relaxed"><slot /></div>
        </div>
    </div>
</template>
