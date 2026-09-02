<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import AppIcon from "@/componets/AppIcon.vue";
import BaseBadge from "@/componets/ui/BaseBadge.vue";
import BaseButton from "@/componets/ui/BaseButton.vue";
import BaseCard from "@/componets/ui/BaseCard.vue";
import { useCatalogStore } from "@/stores/catalog";
import { formatDateTime, formatNumber } from "@/utils/helper";

const catalog = useCatalogStore();

/** 件数カード。クリックで該当条件を設定した品番一覧へ遷移する。 */
const cards = computed(() => [
    { key: "items", label: "登録品番数", value: catalog.stats.itemCount, unit: "件", icon: "inventory_2", tone: "primary", to: { name: "items" } },
    { key: "skus", label: "登録SKU数", value: catalog.stats.skuCount, unit: "件", icon: "inventory_2", tone: "sky", to: { name: "items" } },
    { key: "parent", label: "親ASIN未入力の品番", value: catalog.stats.noParentAsinCount, unit: "件", icon: "warning", tone: "amber", to: { name: "items", query: { filter: "no_parent_asin" } } },
    { key: "child", label: "子ASIN未入力のSKU", value: catalog.stats.noChildAsinCount, unit: "件", icon: "warning", tone: "rose", to: { name: "items", query: { filter: "no_child_asin" } } },
]);

const toneClass: Record<string, string> = {
    primary: "bg-primary-50 text-primary-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
};
</script>

<template>
    <div class="space-y-6">
        <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 class="text-lg font-semibold text-slate-900">登録状況</h2>
                <p class="mt-1 text-sm text-slate-500">件数を選択すると、該当条件で絞り込んだ品番一覧を表示します。</p>
            </div>
            <div class="flex gap-2">
                <BaseButton variant="secondary" icon="csv" @click="$router.push({ name: 'csv-import' })">CSV取込</BaseButton>
                <BaseButton variant="primary" icon="add" @click="$router.push({ name: 'item-create' })">品番を新規登録</BaseButton>
            </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <RouterLink
                v-for="card in cards"
                :key="card.key"
                :to="card.to"
                class="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md"
            >
                <div class="flex items-start justify-between">
                    <span class="flex h-9 w-9 items-center justify-center rounded-lg" :class="toneClass[card.tone]"><AppIcon :name="card.icon" :size="18" /></span>
                    <AppIcon name="arrow_forward" :size="16" class="text-slate-300 transition-colors group-hover:text-primary-500" />
                </div>
                <p class="mt-4 text-xs font-medium text-slate-500">{{ card.label }}</p>
                <p class="mt-1 flex items-baseline gap-1">
                    <span class="text-3xl font-semibold tracking-tight text-slate-900">{{ formatNumber(card.value) }}</span>
                    <span class="text-xs text-slate-400">{{ card.unit }}</span>
                </p>
            </RouterLink>
        </div>

        <BaseCard title="最近更新された品番" description="更新日時の新しい順に表示しています。" :padded="false">
            <template #actions>
                <BaseButton size="sm" variant="ghost" icon="arrow_forward" @click="$router.push({ name: 'items' })">品番一覧へ</BaseButton>
            </template>

            <div class="overflow-x-auto">
                <table class="w-full min-w-[840px] text-sm">
                    <thead>
                        <tr class="border-b border-slate-200 bg-slate-50/80 text-left text-xs text-slate-500">
                            <th class="px-5 py-2.5 font-medium">品番コード</th>
                            <th class="px-5 py-2.5 font-medium">ブランド</th>
                            <th class="px-5 py-2.5 font-medium">カテゴリ</th>
                            <th class="px-5 py-2.5 font-medium">親ASIN</th>
                            <th class="px-5 py-2.5 text-right font-medium">SKU件数</th>
                            <th class="px-5 py-2.5 font-medium">更新日時</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="row in catalog.recentItems" :key="row.id" class="transition-colors hover:bg-slate-50">
                            <td class="px-5 py-3">
                                <RouterLink :to="{ name: 'item-detail', params: { id: row.id } }" class="font-mono text-[13px] font-medium text-primary-600 hover:underline">{{
                                    row.item_no
                                }}</RouterLink>
                            </td>
                            <td class="px-5 py-3 text-slate-700">{{ row.brand_name }}</td>
                            <td class="px-5 py-3 text-slate-700">{{ row.category_name }}</td>
                            <td class="px-5 py-3">
                                <span v-if="row.parent_asin" class="font-mono text-[13px] text-slate-600">{{ row.parent_asin }}</span>
                                <BaseBadge v-else tone="warning">未入力</BaseBadge>
                            </td>
                            <td class="px-5 py-3 text-right tabular-nums text-slate-700">{{ row.sku_count }}</td>
                            <td class="px-5 py-3 text-xs text-slate-500">{{ formatDateTime(row.updated_at) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </BaseCard>

        <p class="text-[11px] text-slate-400">表示中のデータはUI確認用のモックです（{{ formatNumber(catalog.items.length) }}件）。</p>
    </div>
</template>
