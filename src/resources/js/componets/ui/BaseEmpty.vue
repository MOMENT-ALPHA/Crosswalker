<script setup lang="ts">
import AppIcon from "@/componets/AppIcon.vue";

withDefaults(defineProps<{ icon?: string; title: string; description?: string }>(), { icon: "box", description: "" });
</script>

<template>
    <div class="flex flex-col items-center justify-center px-6 py-14 text-center">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><AppIcon :name="icon" :size="24" /></div>
        <p class="mt-3 text-sm font-medium text-slate-700">{{ title }}</p>
        <p v-if="description" class="mt-1 max-w-md text-xs text-slate-500">{{ description }}</p>
        <div class="mt-4"><slot /></div>
    </div>
</template>
