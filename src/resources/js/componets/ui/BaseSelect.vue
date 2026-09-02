<script setup lang="ts">
import { computed, useId } from "vue";
import AppIcon from "@/componets/AppIcon.vue";
import type { SelectOption } from "@/types";

const props = withDefaults(
    defineProps<{
        modelValue: string | number | null;
        options: SelectOption[];
        label?: string;
        placeholder?: string;
        required?: boolean;
        disabled?: boolean;
        error?: string;
        size?: "sm" | "md";
    }>(),
    { label: "", placeholder: "選択してください", required: false, disabled: false, error: "", size: "md" },
);

const emit = defineEmits<{ "update:modelValue": [value: string | number | null] }>();
const selectId = useId();

const selectClass = computed(() => [
    "w-full appearance-none rounded-lg border bg-white pr-8 text-slate-900 transition-colors focus:outline focus:outline-2 disabled:bg-slate-100 disabled:text-slate-500",
    props.size === "sm" ? "h-8 pl-2 text-xs" : "h-10 pl-3 text-sm",
    props.error ? "border-rose-400 focus:outline-rose-500" : "border-slate-300 focus:border-indigo-500 focus:outline-indigo-500/40",
    props.modelValue === null || props.modelValue === "" ? "text-slate-400" : "",
]);

function onChange(event: Event) {
    const raw = (event.target as HTMLSelectElement).value;
    if (raw === "") {
        emit("update:modelValue", null);
        return;
    }
    const matched = props.options.find((option) => String(option.value) === raw);
    emit("update:modelValue", matched ? matched.value : raw);
}
</script>

<template>
    <div class="w-full">
        <label v-if="label" :for="selectId" class="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
            {{ label }}
            <span v-if="required" class="rounded bg-rose-50 px-1 py-px text-[10px] font-semibold text-rose-600">必須</span>
        </label>
        <div class="relative">
            <select :id="selectId" :value="modelValue === null ? '' : String(modelValue)" :disabled="disabled" :class="selectClass" @change="onChange">
                <option value="">{{ placeholder }}</option>
                <option v-for="option in options" :key="String(option.value)" :value="String(option.value)" class="text-slate-900">{{ option.label }}</option>
            </select>
            <AppIcon name="chevron-down" :size="16" class="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-slate-400" />
        </div>
        <p v-if="error" class="mt-1 text-xs text-rose-600">{{ error }}</p>
    </div>
</template>
