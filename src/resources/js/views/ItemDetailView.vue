<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseBadge from "@/componets/ui/BaseBadge.vue";
import BaseButton from "@/componets/ui/BaseButton.vue";
import BaseCard from "@/componets/ui/BaseCard.vue";
import BaseEmpty from "@/componets/ui/BaseEmpty.vue";
import BaseModal from "@/componets/ui/BaseModal.vue";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import { displayValue, formatDateTime } from "@/utils/helper";

const route = useRoute();
const router = useRouter();
const catalog = useCatalogStore();
const ui = useUiStore();

const itemId = computed(() => Number(route.params.id));
const item = computed(() => catalog.findItem(itemId.value));
const deleteOpen = ref(false);

const details = computed(() => {
    const current = item.value;
    if (!current) return [];
    return [
        { label: "品番コード", value: current.item_no, mono: true },
        { label: "ブランド", value: catalog.brandName(current.brand_id), mono: false },
        { label: "カテゴリ", value: catalog.categoryName(current.category_id), mono: false },
        { label: "親ASIN", value: displayValue(current.parent_asin), mono: true },
        { label: "作成日時", value: formatDateTime(current.created_at), mono: false },
        { label: "更新日時", value: formatDateTime(current.updated_at), mono: false },
    ];
});

function confirmDelete() {
    if (!item.value) return;
    const label = item.value.item_no;
    const skuCount = item.value.skus.length;
    catalog.deleteItem(item.value.id);
    deleteOpen.value = false;
    ui.notify(`品番「${label}」と所属SKU${skuCount}件を削除しました。`);
    router.push({ name: "items" });
}
</script>

<template>
    <div v-if="item" class="space-y-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
                <BaseButton size="sm" variant="ghost" icon="arrow_back" @click="$router.push({ name: 'items' })">品番一覧へ戻る</BaseButton>
                <div class="mt-2 flex flex-wrap items-center gap-2.5">
                    <h2 class="font-mono text-xl font-semibold text-slate-900">{{ item.item_no }}</h2>
                    <BaseBadge tone="brand">{{ catalog.brandName(item.brand_id) }}</BaseBadge>
                    <BaseBadge>{{ catalog.categoryName(item.category_id) }}</BaseBadge>
                    <BaseBadge tone="success">SKU {{ item.skus.length }}件</BaseBadge>
                    <BaseBadge :tone="item.is_active ? 'success' : 'neutral'">{{ item.is_active ? "有効" : "無効" }}</BaseBadge>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <BaseButton variant="primary" icon="edit" @click="$router.push({ name: 'item-edit', params: { id: item.id } })">編集</BaseButton>
                <BaseButton variant="danger-ghost" icon="delete" @click="deleteOpen = true">削除</BaseButton>
            </div>
        </div>

        <BaseCard title="品番情報">
            <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-3">
                <div v-for="detail in details" :key="detail.label">
                    <dt class="text-xs text-slate-500">{{ detail.label }}</dt>
                    <dd class="mt-1 text-sm text-slate-900" :class="detail.mono ? 'font-mono' : ''">{{ detail.value }}</dd>
                </div>
            </dl>
        </BaseCard>

        <BaseCard title="SKU一覧" :description="`この品番に属するSKU ${item.skus.length}件`" :padded="false">
            <div v-if="item.skus.length > 0" class="overflow-x-auto">
                <table class="w-full min-w-225 text-sm">
                    <thead>
                        <tr class="border-b border-slate-200 bg-slate-50/80 text-left text-xs text-slate-500">
                            <th class="w-12 px-5 py-2.5 font-medium">#</th>
                            <th class="px-5 py-2.5 font-medium">SKUコード</th>
                            <th class="px-5 py-2.5 font-medium">状態</th>
                            <th class="px-5 py-2.5 font-medium">子ASIN</th>
                            <th class="px-5 py-2.5 font-medium">TQ品番</th>
                            <th class="px-5 py-2.5 font-medium">TQカラーNo</th>
                            <th class="px-5 py-2.5 font-medium">TQサイズ</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="(sku, index) in item.skus" :key="sku.id" class="transition-colors hover:bg-slate-50">
                            <td class="px-5 py-3 text-xs text-slate-400">{{ index + 1 }}</td>
                            <td class="px-5 py-3 font-mono text-[13px] font-medium text-slate-900">{{ sku.sku_code }}</td>
                            <td class="px-5 py-3"
                                ><BaseBadge :tone="item.is_active && sku.is_active ? 'success' : 'neutral'">{{ item.is_active && sku.is_active ? "有効" : "無効" }}</BaseBadge></td
                            >
                            <td class="px-5 py-3">
                                <span v-if="sku.child_asin" class="font-mono text-[13px] text-slate-600">{{ sku.child_asin }}</span>
                                <BaseBadge v-else tone="warning">未入力</BaseBadge>
                            </td>
                            <td class="px-5 py-3 font-mono text-[13px] text-slate-700">{{ sku.tq_item_no }}</td>
                            <td class="px-5 py-3 font-mono text-[13px] text-slate-700">{{ sku.tq_color_no }}</td>
                            <td class="px-5 py-3 font-mono text-[13px] text-slate-700">{{ sku.tq_size }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <BaseEmpty v-else title="SKUが登録されていません" description="編集画面からSKU行を追加してください。" />
        </BaseCard>

        <BaseModal :open="deleteOpen" title="品番を削除しますか？" description="この操作は取り消せません。" width="sm" @close="deleteOpen = false">
            <p class="text-sm text-slate-700">
                品番 <span class="font-mono font-semibold">{{ item.item_no }}</span> と、所属するSKU {{ item.skus.length }}件をまとめて削除します。
            </p>
            <template #footer>
                <BaseButton variant="secondary" @click="deleteOpen = false">キャンセル</BaseButton>
                <BaseButton variant="danger" icon="delete" @click="confirmDelete">削除する</BaseButton>
            </template>
        </BaseModal>
    </div>

    <BaseCard v-else :padded="false">
        <BaseEmpty icon="warning" title="品番が見つかりません" description="削除されたか、URLが正しくない可能性があります。">
            <BaseButton variant="secondary" icon="arrow_back" @click="$router.push({ name: 'items' })">品番一覧へ戻る</BaseButton>
        </BaseEmpty>
    </BaseCard>
</template>
