<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "@/componets/AppIcon.vue";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
type Size = "sm" | "md";

const props = withDefaults(
    defineProps<{
        variant?: Variant;
        size?: Size;
        type?: "button" | "submit";
        icon?: string;
        disabled?: boolean;
        loading?: boolean;
        block?: boolean;
    }>(),
    { variant: "secondary", size: "md", type: "button", icon: "", disabled: false, loading: false, block: false },
);

const variantClass: Record<Variant, string> = {
    primary: "bg-primary-600 text-white border-primary-600 hover:bg-primary-700 hover:border-primary-700 focus-visible:outline-primary-600",
    secondary: "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-slate-400",
    ghost: "bg-transparent text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-slate-400",
    danger: "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 hover:border-rose-700 focus-visible:outline-rose-600",
    "danger-ghost": "bg-white text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 focus-visible:outline-rose-500",
};

const sizeClass: Record<Size, string> = {
    sm: "h-8 px-2.5 text-xs gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
};

const classes = computed(() => [
    "inline-flex items-center justify-center rounded-lg border font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    variantClass[props.variant],
    sizeClass[props.size],
    props.block ? "w-full" : "",
]);
</script>

<template>
    <button :type="type" :class="classes" :disabled="disabled || loading">
        <AppIcon v-if="loading" name="refresh" :size="size === 'sm' ? 14 : 16" class="animate-spin" />
        <AppIcon v-else-if="icon" :name="icon" :size="size === 'sm' ? 14 : 16" />
        <span v-if="$slots.default"><slot /></span>
    </button>
</template>
