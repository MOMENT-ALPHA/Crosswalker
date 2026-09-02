<script setup lang="ts">
withDefaults(defineProps<{ title?: string; description?: string; padded?: boolean }>(), { title: "", description: "", padded: true });
</script>

<template>
    <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
        <header v-if="title || $slots.actions" class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
            <div>
                <h2 class="text-sm font-semibold text-slate-900">{{ title }}</h2>
                <p v-if="description" class="mt-0.5 text-xs text-slate-500">{{ description }}</p>
            </div>
            <div class="flex items-center gap-2"><slot name="actions" /></div>
        </header>
        <div :class="padded ? 'p-5' : ''"><slot /></div>
    </section>
</template>
