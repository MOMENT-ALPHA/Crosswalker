<script setup lang="ts">
import { computed } from "vue";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const props = withDefaults(defineProps<{ tone?: Tone; mono?: boolean }>(), { tone: "neutral", mono: false });

const toneClass: Record<Tone, string> = {
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    brand: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
};

const classes = computed(() => ["inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", toneClass[props.tone], props.mono ? "font-mono tracking-tight" : ""]);
</script>

<template>
    <span :class="classes"><slot /></span>
</template>
