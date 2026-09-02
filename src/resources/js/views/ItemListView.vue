<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import AppIcon from "@/componets/AppIcon.vue";
import BaseBadge from "@/componets/ui/BaseBadge.vue";
import BaseButton from "@/componets/ui/BaseButton.vue";
import BaseCard from "@/componets/ui/BaseCard.vue";
import BaseEmpty from "@/componets/ui/BaseEmpty.vue";
import BaseInput from "@/componets/ui/BaseInput.vue";
import BasePagination from "@/componets/ui/BasePagination.vue";
import BaseSelect from "@/componets/ui/BaseSelect.vue";
import { useCatalogStore } from "@/stores/catalog";
import { searchCatalog } from "@/utils/catalogSearch";
import { ITEMS_PER_PAGE } from "@/utils/consts";
import { formatDateTime, toSelectOptions } from "@/utils/helper";
import type { ItemQuickFilter } from "@/types";

const route = useRoute();
const router = useRouter();
const catalog = useCatalogStore();

/** 検索フォームの入力値（変更時にURLクエリへ自動反映する） */
const form = reactive({
    keyword: "",
    brand_id: null as number | null,
    category_id: null as number | null,
});

const quickFilterLabels: Record<string, string> = {
    no_parent_asin: "親ASIN未入力の品番",
    no_child_asin: "子ASIN未入力のSKUを含む品番",
};

/** URLクエリ = 実行中の検索条件 */
const applied = computed(() => ({
    keyword: String(route.query.keyword ?? ""),
    brand_id: route.query.brand_id ? Number(route.query.brand_id) : null,
    category_id: route.query.category_id ? Number(route.query.category_id) : null,
    filter: String(route.query.filter ?? "") as ItemQuickFilter,
    page: Number(route.query.page ?? 1) || 1,
}));

const result = computed(() => catalog.search(applied.value));
const skuMatchesByItem = computed(() => new Map(searchCatalog(result.value.rows, applied.value.keyword).map((match) => [match.item.id, match.matchedSkuIds])));
const brandOptions = computed(() => toSelectOptions(catalog.brands));
const categoryOptions = computed(() => toSelectOptions(catalog.categories));
const quickFilterText = computed(() => quickFilterLabels[applied.value.filter] ?? "");
const hasCondition = computed(() => applied.value.keyword !== "" || applied.value.brand_id !== null || applied.value.category_id !== null || applied.value.filter !== "");

watch(
    applied,
    (value) => {
        form.keyword = value.keyword;
        form.brand_id = value.brand_id;
        form.category_id = value.category_id;
    },
    { immediate: true },
);

watch(form, () => applySearch(), { deep: true });

function applySearch(page = 1) {
    router.replace({
        name: "items",
        query: {
            ...(form.keyword.trim() ? { keyword: form.keyword.trim() } : {}),
            ...(form.brand_id ? { brand_id: String(form.brand_id) } : {}),
            ...(form.category_id ? { category_id: String(form.category_id) } : {}),
            ...(applied.value.filter ? { filter: applied.value.filter } : {}),
            ...(page > 1 ? { page: String(page) } : {}),
        },
    });
}

function clearSearch() {
    form.keyword = "";
    form.brand_id = null;
    form.category_id = null;
    router.push({ name: "items" });
}

function removeQuickFilter() {
    const query = { ...route.query };
    delete query.filter;
    delete query.page;
    router.push({ name: "items", query });
}
</script>

<template>
    <div class="space-y-5">
        <BaseCard title="検索条件" description="品番コード・ASIN・SKU・TQ品番・カラーNo・サイズを横断して自動検索します。">
            <template #actions>
                <BaseButton variant="primary" icon="add" size="sm" @click="$router.push({ name: 'item-create' })">品番新規登録</BaseButton>
            </template>

            <div class="grid gap-4 md:grid-cols-12">
                <div class="md:col-span-6">
                    <BaseInput v-model="form.keyword" label="キーワード" placeholder="ASIN、TQ品番、SKUなどを入力" hint="入力すると自動的に検索されます。" />
                </div>
                <div class="md:col-span-3">
                    <BaseSelect v-model="form.brand_id" label="ブランド" placeholder="すべて" :options="brandOptions" />
                </div>
                <div class="md:col-span-3">
                    <BaseSelect v-model="form.category_id" label="カテゴリ" placeholder="すべて" :options="categoryOptions" />
                </div>
                <div class="flex items-center gap-2 md:col-span-12">
                    <BaseButton v-if="hasCondition" variant="secondary" icon="close" @click="clearSearch">検索条件をクリア</BaseButton>
                </div>
            </div>
        </BaseCard>

        <div v-if="applied.filter" class="flex flex-wrap items-center gap-2">
            <span class="text-xs text-slate-500">絞り込み中:</span>
            <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200 ring-inset transition-colors hover:bg-primary-100"
                @click="removeQuickFilter"
            >
                {{ quickFilterText }}
                <AppIcon name="close" :size="12" />
            </button>
        </div>

        <BaseCard :padded="false">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
                <h2 class="text-sm font-semibold text-slate-900">品番一覧</h2>
                <span class="text-xs text-slate-500">{{ result.total }}件</span>
            </div>

            <div v-if="result.rows.length > 0" class="overflow-x-auto">
                <table class="w-full min-w-225 text-sm">
                    <thead>
                        <tr class="border-b border-slate-200 bg-slate-50/80 text-left text-xs text-slate-500">
                            <th class="px-5 py-2.5 font-medium">品番コード</th>
                            <th class="px-5 py-2.5 font-medium">ブランド</th>
                            <th class="px-5 py-2.5 font-medium">カテゴリ</th>
                            <th class="px-5 py-2.5 font-medium">親ASIN</th>
                            <th class="px-5 py-2.5 text-right font-medium">SKU件数</th>
                            <th class="px-5 py-2.5 font-medium">更新日時</th>
                            <th class="px-5 py-2.5 text-right font-medium">操作</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <template v-for="row in result.rows" :key="row.id">
                            <tr class="transition-colors hover:bg-slate-50">
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
                                <td class="px-5 py-3 text-xs whitespace-nowrap text-slate-500">{{ formatDateTime(row.updated_at) }}</td>
                                <td class="px-5 py-3">
                                    <div class="flex items-center justify-end gap-1">
                                        <BaseButton size="sm" variant="ghost" icon="visibility" @click="$router.push({ name: 'item-detail', params: { id: row.id } })">詳細</BaseButton>
                                        <BaseButton size="sm" variant="ghost" icon="edit" @click="$router.push({ name: 'item-edit', params: { id: row.id } })">編集</BaseButton>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="applied.keyword">
                                <td colspan="7" class="bg-slate-50/60 px-5 pt-0 pb-4">
                                    <div class="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                        <table class="w-full min-w-180 text-xs">
                                            <thead>
                                                <tr class="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                                                    <th class="px-3 py-2 font-medium">SKUコード</th>
                                                    <th class="px-3 py-2 font-medium">子ASIN</th>
                                                    <th class="px-3 py-2 font-medium">TQ品番</th>
                                                    <th class="px-3 py-2 font-medium">カラーNo</th>
                                                    <th class="px-3 py-2 font-medium">サイズ</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100">
                                                <tr v-for="sku in row.skus" :key="sku.id" :class="skuMatchesByItem.get(row.id)?.has(sku.id) ? 'bg-amber-50' : ''">
                                                    <td class="px-3 py-2 font-mono font-medium text-slate-800">
                                                        <span class="inline-flex items-center gap-2">
                                                            {{ sku.sku_code }}
                                                            <span v-if="skuMatchesByItem.get(row.id)?.has(sku.id)" class="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900"
                                                                >一致</span
                                                            >
                                                        </span>
                                                    </td>
                                                    <td class="px-3 py-2 font-mono text-slate-600">{{ sku.child_asin || "-" }}</td>
                                                    <td class="px-3 py-2 font-mono text-slate-600">{{ sku.tq_item_no }}</td>
                                                    <td class="px-3 py-2 font-mono text-slate-600">{{ sku.tq_color_no }}</td>
                                                    <td class="px-3 py-2 font-mono text-slate-600">{{ sku.tq_size }}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <BaseEmpty
                v-else
                icon="search"
                title="該当する品番がありません"
                :description="hasCondition ? '検索条件を変更するか、条件をクリアしてください。' : '品番を新規登録するか、CSVから一括登録してください。'"
            >
                <BaseButton v-if="hasCondition" variant="secondary" icon="close" @click="clearSearch">検索条件をクリア</BaseButton>
                <BaseButton v-else variant="primary" icon="add" @click="$router.push({ name: 'item-create' })">品番新規登録</BaseButton>
            </BaseEmpty>

            <BasePagination v-if="result.rows.length > 0" :page="result.page" :total-pages="result.totalPages" :total="result.total" :per-page="ITEMS_PER_PAGE" @change="applySearch" />
        </BaseCard>
    </div>
</template>
