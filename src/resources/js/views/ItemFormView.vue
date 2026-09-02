<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import AppIcon from "@/componets/AppIcon.vue";
import BaseAlert from "@/componets/ui/BaseAlert.vue";
import BaseBadge from "@/componets/ui/BaseBadge.vue";
import BaseButton from "@/componets/ui/BaseButton.vue";
import BaseCard from "@/componets/ui/BaseCard.vue";
import BaseInput from "@/componets/ui/BaseInput.vue";
import BaseModal from "@/componets/ui/BaseModal.vue";
import BaseSelect from "@/componets/ui/BaseSelect.vue";
import BaseTextarea from "@/componets/ui/BaseTextarea.vue";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import { createEmptySkuRow, toSelectOptions, uid } from "@/utils/helper";
import type { ItemFormValues, ValidationResult } from "@/types";

const route = useRoute();
const router = useRouter();
const catalog = useCatalogStore();
const ui = useUiStore();

/** 編集対象の品番ID（新規・複製時は null） */
const editingId = computed(() => (route.name === "item-edit" ? Number(route.params.id) : null));
/** 複製元の品番ID */
const duplicateFromId = computed(() => (route.query.from ? Number(route.query.from) : null));
const mode = computed<"create" | "edit" | "duplicate">(() => (editingId.value !== null ? "edit" : duplicateFromId.value !== null ? "duplicate" : "create"));

const form = reactive<ItemFormValues>({ item_no: "", brand_id: null, category_id: null, parent_asin: "", memo: "", skus: [createEmptySkuRow()] });
const errors = ref<ValidationResult>({ item: {}, skus: {}, global: [] });
const saving = ref(false);
const initialSnapshot = ref("");
const skipGuard = ref(false);

const deleteOpen = ref(false);
const leaveOpen = ref(false);
const masterModal = reactive({ open: false, kind: "brand" as "brand" | "category", name: "", error: "" });

const brandOptions = computed(() => toSelectOptions(catalog.brands));
const categoryOptions = computed(() => toSelectOptions(catalog.categories));
const dirty = computed(() => JSON.stringify(form) !== initialSnapshot.value);
const notFound = computed(() => editingId.value !== null && !catalog.findItem(editingId.value));

const pageTitle = computed(() => (mode.value === "edit" ? "品番を編集" : mode.value === "duplicate" ? "品番を複製して登録" : "品番を新規登録"));

let pendingResolve: ((value: boolean) => void) | null = null;

onMounted(() => {
    if (editingId.value !== null) {
        const item = catalog.findItem(editingId.value);
        if (item) {
            form.item_no = item.item_no;
            form.brand_id = item.brand_id;
            form.category_id = item.category_id;
            form.parent_asin = item.parent_asin;
            form.memo = item.memo;
            form.skus = item.skus.map((sku) => ({
                key: uid("sku"),
                id: sku.id,
                sku_code: sku.sku_code,
                child_asin: sku.child_asin,
                tq_item_no: sku.tq_item_no,
                tq_color_no: sku.tq_color_no,
                tq_size: sku.tq_size,
                memo: sku.memo,
            }));
        }
    } else if (duplicateFromId.value !== null) {
        // 複製時はブランド・カテゴリとSKU行数のみ引き継ぐ（§4.5 複製時の初期値）
        const source = catalog.findItem(duplicateFromId.value);
        if (source) {
            form.brand_id = source.brand_id;
            form.category_id = source.category_id;
            form.memo = source.memo;
            form.skus = source.skus.map(() => createEmptySkuRow());
        }
    }

    initialSnapshot.value = JSON.stringify(form);
    window.addEventListener("beforeunload", onBeforeUnload);
});

onBeforeUnmount(() => window.removeEventListener("beforeunload", onBeforeUnload));

function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value || skipGuard.value) return;
    event.preventDefault();
    event.returnValue = "";
}

/** 未保存の内容がある状態で画面を離れる場合は確認する（§4.5） */
onBeforeRouteLeave(() => {
    if (!dirty.value || skipGuard.value) return true;
    leaveOpen.value = true;
    return new Promise<boolean>((resolve) => {
        pendingResolve = resolve;
    });
});

function resolveLeave(allow: boolean) {
    leaveOpen.value = false;
    pendingResolve?.(allow);
    pendingResolve = null;
}

function addSkuRow() {
    form.skus.push(createEmptySkuRow());
}

function removeSkuRow(key: string) {
    form.skus = form.skus.filter((row) => row.key !== key);
    delete errors.value.skus[key];
}

function skuError(key: string, field: string): string {
    return errors.value.skus[key]?.[field as keyof (typeof errors.value.skus)[string]] ?? "";
}

function openMasterModal(kind: "brand" | "category") {
    masterModal.kind = kind;
    masterModal.name = "";
    masterModal.error = "";
    masterModal.open = true;
}

/** 追加したブランド・カテゴリはそのまま選択状態にする（§4.5） */
function submitMasterModal() {
    if (masterModal.kind === "brand") {
        const result = catalog.addBrand(masterModal.name);
        if (!result.ok || !result.brand) {
            masterModal.error = result.message ?? "";
            return;
        }
        form.brand_id = result.brand.id;
        ui.notify(`ブランド「${result.brand.name}」を追加しました。`);
    } else {
        const result = catalog.addCategory(masterModal.name);
        if (!result.ok || !result.category) {
            masterModal.error = result.message ?? "";
            return;
        }
        form.category_id = result.category.id;
        ui.notify(`カテゴリ「${result.category.name}」を追加しました。`);
    }
    masterModal.open = false;
}

function save() {
    errors.value = catalog.validateItemForm(form, editingId.value);
    const hasError = Object.keys(errors.value.item).length > 0 || Object.keys(errors.value.skus).length > 0 || errors.value.global.length > 0;
    if (hasError) {
        ui.notify("入力内容にエラーがあります。内容を確認してください。", "error");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }

    saving.value = true;
    const saved = catalog.saveItem(form, editingId.value);
    skipGuard.value = true;
    saving.value = false;
    ui.notify(`品番「${saved.item_no}」を${mode.value === "edit" ? "更新" : "登録"}しました。`);
    router.push({ name: "item-detail", params: { id: saved.id } });
}

function cancel() {
    if (editingId.value !== null) router.push({ name: "item-detail", params: { id: editingId.value } });
    else router.push({ name: "items" });
}

function confirmDelete() {
    if (editingId.value === null) return;
    const item = catalog.findItem(editingId.value);
    if (!item) return;

    catalog.deleteItem(item.id);
    skipGuard.value = true;
    deleteOpen.value = false;
    ui.notify(`品番「${item.item_no}」と所属SKU${item.skus.length}件を削除しました。`);
    router.push({ name: "items" });
}
</script>

<template>
    <div v-if="notFound" class="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p class="text-sm font-medium text-slate-700">対象の品番が見つかりません。</p>
        <BaseButton class="mt-4" variant="secondary" icon="arrow_back" @click="$router.push({ name: 'items' })">品番一覧へ戻る</BaseButton>
    </div>

    <form v-else class="space-y-5" @submit.prevent="save">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
                <BaseButton size="sm" variant="ghost" icon="arrow_back" @click="cancel">戻る</BaseButton>
                <div class="mt-2 flex items-center gap-2.5">
                    <h2 class="text-xl font-semibold text-slate-900">{{ pageTitle }}</h2>
                    <BaseBadge v-if="mode === 'duplicate'" tone="brand">複製</BaseBadge>
                    <BaseBadge v-if="dirty" tone="warning">未保存</BaseBadge>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <BaseButton v-if="mode === 'edit'" variant="danger-ghost" icon="delete" @click="deleteOpen = true">この品番を削除</BaseButton>
                <BaseButton variant="secondary" @click="cancel">キャンセル</BaseButton>
                <BaseButton type="submit" variant="primary" icon="check" :loading="saving">保存</BaseButton>
            </div>
        </div>

        <BaseAlert v-if="errors.global.length > 0" tone="danger" title="入力内容を確認してください">
            <ul class="mt-1 list-disc space-y-0.5 pl-4">
                <li v-for="message in errors.global" :key="message">{{ message }}</li>
            </ul>
        </BaseAlert>

        <BaseAlert v-if="mode === 'duplicate'" tone="info">
            ブランド・カテゴリ・SKUの行数を複製元から引き継いでいます。品番コード・親ASIN・SKUコード・子ASIN・TQ各項目は新しい値を入力してください。
        </BaseAlert>

        <BaseCard title="品番情報">
            <div class="grid gap-4 md:grid-cols-12">
                <div class="md:col-span-4">
                    <BaseInput v-model="form.item_no" label="品番コード" placeholder="fisi-05" required :error="errors.item.item_no" hint="カラーとサイズを除いた商品コード" />
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-end gap-2">
                        <BaseSelect v-model="form.brand_id" label="ブランド" required :options="brandOptions" :error="errors.item.brand_id" />
                        <BaseButton class="mb-px shrink-0" variant="secondary" icon="add" @click="openMasterModal('brand')">追加</BaseButton>
                    </div>
                </div>
                <div class="md:col-span-4">
                    <div class="flex items-end gap-2">
                        <BaseSelect v-model="form.category_id" label="カテゴリ" required :options="categoryOptions" :error="errors.item.category_id" />
                        <BaseButton class="mb-px shrink-0" variant="secondary" icon="add" @click="openMasterModal('category')">追加</BaseButton>
                    </div>
                </div>
                <div class="md:col-span-4">
                    <BaseInput v-model="form.parent_asin" label="親ASIN" placeholder="B09T32PVM5" :error="errors.item.parent_asin" />
                </div>
                <div class="md:col-span-8">
                    <BaseTextarea v-model="form.memo" label="メモ" :rows="3" placeholder="社内向けの補足情報" />
                </div>
            </div>
        </BaseCard>

        <BaseCard :title="`SKU（${form.skus.length}行）`" description="1つの品番に複数のSKUを登録できます。SKUとTQキーは1対1です。" :padded="false">
            <template #actions>
                <BaseButton size="sm" variant="secondary" icon="add" @click="addSkuRow">SKU行を追加</BaseButton>
            </template>

            <div class="overflow-x-auto">
                <table class="w-full min-w-[1100px] text-sm">
                    <thead>
                        <tr class="border-b border-slate-200 bg-slate-50/80 text-left text-xs text-slate-500">
                            <th class="w-10 px-3 py-2.5 font-medium">#</th>
                            <th class="px-3 py-2.5 font-medium">SKUコード<span class="ml-1 text-rose-500">*</span></th>
                            <th class="px-3 py-2.5 font-medium">子ASIN</th>
                            <th class="px-3 py-2.5 font-medium">TQ品番<span class="ml-1 text-rose-500">*</span></th>
                            <th class="px-3 py-2.5 font-medium">TQカラーNo<span class="ml-1 text-rose-500">*</span></th>
                            <th class="px-3 py-2.5 font-medium">TQサイズ<span class="ml-1 text-rose-500">*</span></th>
                            <th class="px-3 py-2.5 font-medium">メモ</th>
                            <th class="w-12 px-3 py-2.5"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="(row, index) in form.skus" :key="row.key" class="align-top" :class="errors.skus[row.key] ? 'bg-rose-50/40' : ''">
                            <td class="px-3 py-2.5 text-xs text-slate-400">{{ index + 1 }}</td>
                            <td class="px-3 py-2.5"><BaseInput v-model="row.sku_code" size="sm" placeholder="fisi-05-1-10" :error="skuError(row.key, 'sku_code')" /></td>
                            <td class="px-3 py-2.5"><BaseInput v-model="row.child_asin" size="sm" placeholder="B09EXAMPLE1" :error="skuError(row.key, 'child_asin')" /></td>
                            <td class="px-3 py-2.5"><BaseInput v-model="row.tq_item_no" size="sm" placeholder="FISI05" :error="skuError(row.key, 'tq_item_no')" /></td>
                            <td class="px-3 py-2.5"><BaseInput v-model="row.tq_color_no" size="sm" placeholder="1" :error="skuError(row.key, 'tq_color_no')" /></td>
                            <td class="px-3 py-2.5"><BaseInput v-model="row.tq_size" size="sm" placeholder="10" :error="skuError(row.key, 'tq_size')" /></td>
                            <td class="px-3 py-2.5"><BaseInput v-model="row.memo" size="sm" placeholder="ブラック +1.0" /></td>
                            <td class="px-3 py-2.5">
                                <button
                                    type="button"
                                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                                    :disabled="form.skus.length <= 1"
                                    aria-label="SKU行を削除"
                                    @click="removeSkuRow(row.key)"
                                >
                                    <AppIcon name="delete" :size="15" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                <p class="text-xs text-slate-500">品番と全SKUを1回の保存処理で登録します。</p>
                <BaseButton size="sm" variant="secondary" icon="add" @click="addSkuRow">SKU行を追加</BaseButton>
            </div>
        </BaseCard>

        <div class="flex flex-wrap items-center justify-end gap-2">
            <BaseButton variant="secondary" @click="cancel">キャンセル</BaseButton>
            <BaseButton type="submit" variant="primary" icon="check" :loading="saving">保存</BaseButton>
        </div>

        <BaseModal
            :open="masterModal.open"
            :title="masterModal.kind === 'brand' ? 'ブランドを追加' : 'カテゴリを追加'"
            description="追加した名称はそのまま選択状態になります。"
            width="sm"
            @close="masterModal.open = false"
        >
            <BaseInput v-model="masterModal.name" :label="masterModal.kind === 'brand' ? 'ブランド名称' : 'カテゴリ名称'" required :error="masterModal.error" @keyup.enter="submitMasterModal" />
            <template #footer>
                <BaseButton variant="secondary" @click="masterModal.open = false">キャンセル</BaseButton>
                <BaseButton variant="primary" icon="add" @click="submitMasterModal">追加</BaseButton>
            </template>
        </BaseModal>

        <BaseModal :open="deleteOpen" title="品番を削除しますか？" description="この操作は取り消せません。" width="sm" @close="deleteOpen = false">
            <p class="text-sm text-slate-700">
                品番 <span class="font-mono font-semibold">{{ form.item_no }}</span> と、所属するすべてのSKUをまとめて削除します。
            </p>
            <template #footer>
                <BaseButton variant="secondary" @click="deleteOpen = false">キャンセル</BaseButton>
                <BaseButton variant="danger" icon="delete" @click="confirmDelete">削除する</BaseButton>
            </template>
        </BaseModal>

        <BaseModal :open="leaveOpen" title="未保存の内容があります" description="保存していない入力内容は破棄されます。" width="sm" @close="resolveLeave(false)">
            <p class="text-sm text-slate-700">このまま画面を移動すると、入力した内容は失われます。移動してよろしいですか？</p>
            <template #footer>
                <BaseButton variant="secondary" @click="resolveLeave(false)">編集を続ける</BaseButton>
                <BaseButton variant="danger" @click="resolveLeave(true)">破棄して移動</BaseButton>
            </template>
        </BaseModal>
    </form>
</template>
