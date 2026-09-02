<script setup lang="ts">
import { computed, useId } from "vue";

const props = withDefaults(defineProps<{ modelValue: string; label?: string; placeholder?: string; rows?: number; error?: string; hint?: string }>(), {
    label: "",
    placeholder: "",
    rows: 4,
    error: "",
    hint: "",
});

const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const areaId = useId();

const areaClass = computed(() => [
    "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline focus:outline-2",
    props.error ? "border-rose-400 focus:outline-rose-500" : "border-slate-300 focus:border-indigo-500 focus:outline-indigo-500/40",
]);
</script>

<template>
    <div class="w-full">
        <label v-if="label" :for="areaId" class="mb-1 block text-xs font-medium text-slate-600">{{ label }}</label>
        <textarea
            :id="areaId"
            :value="modelValue"
            :rows="rows"
            :placeholder="placeholder"
            :class="areaClass"
            @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <p v-if="error" class="mt-1 text-xs text-rose-600">{{ error }}</p>
        <p v-else-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</p>
    </div>
</template>
