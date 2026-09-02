<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "@/componets/AppIcon.vue";
import { formatNumber } from "@/utils/helper";

const props = defineProps<{ page: number; totalPages: number; total: number; perPage: number }>();
const emit = defineEmits<{ change: [page: number] }>();

const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.perPage + 1));
const rangeEnd = computed(() => Math.min(props.page * props.perPage, props.total));

/** 表示するページ番号（前後2ページ + 先頭・末尾） */
const pages = computed(() => {
    const list: (number | "gap")[] = [];
    for (let page = 1; page <= props.totalPages; page += 1) {
        const near = Math.abs(page - props.page) <= 1;
        if (page === 1 || page === props.totalPages || near) {
            list.push(page);
        } else if (list[list.length - 1] !== "gap") {
            list.push("gap");
        }
    }
    return list;
});

function go(page: number) {
    if (page < 1 || page > props.totalPages || page === props.page) return;
    emit("change", page);
}
</script>

<template>
    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
        <p class="text-xs text-slate-500">
            全 <span class="font-semibold text-slate-700">{{ formatNumber(total) }}</span> 件中 {{ formatNumber(rangeStart) }} - {{ formatNumber(rangeEnd) }} 件を表示
        </p>
        <nav class="flex items-center gap-1" aria-label="ページ切替">
            <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                :disabled="page <= 1"
                aria-label="前のページ"
                @click="go(page - 1)"
            >
                <AppIcon name="chevron-left" :size="16" />
            </button>
            <template v-for="(entry, index) in pages" :key="`${entry}-${index}`">
                <span v-if="entry === 'gap'" class="px-1 text-xs text-slate-400">...</span>
                <button
                    v-else
                    type="button"
                    class="h-8 min-w-8 rounded-lg border px-2 text-xs font-medium transition-colors"
                    :class="entry === page ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'"
                    @click="go(entry)"
                >
                    {{ entry }}
                </button>
            </template>
            <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                :disabled="page >= totalPages"
                aria-label="次のページ"
                @click="go(page + 1)"
            >
                <AppIcon name="chevron-right" :size="16" />
            </button>
        </nav>
    </div>
</template>
