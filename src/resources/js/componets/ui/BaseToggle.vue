<script setup lang="ts">
defineProps<{ modelValue: boolean; label?: string; description?: string }>();
const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>

<template>
    <label class="flex cursor-pointer items-start gap-3">
        <button
            type="button"
            role="switch"
            :aria-checked="modelValue"
            class="relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            :class="modelValue ? 'bg-indigo-600' : 'bg-slate-300'"
            @click="emit('update:modelValue', !modelValue)"
        >
            <span class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" :class="modelValue ? 'translate-x-5' : 'translate-x-0'"></span>
        </button>
        <span v-if="label || description">
            <span class="block text-sm font-medium text-slate-900">{{ label }}</span>
            <span v-if="description" class="mt-0.5 block text-xs text-slate-500">{{ description }}</span>
        </span>
    </label>
</template>
