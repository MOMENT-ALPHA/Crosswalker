<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import AppIcon from "@/componets/AppIcon.vue";
import BaseAlert from "@/componets/ui/BaseAlert.vue";
import BaseBadge from "@/componets/ui/BaseBadge.vue";
import BaseButton from "@/componets/ui/BaseButton.vue";
import BaseCard from "@/componets/ui/BaseCard.vue";
import BaseInput from "@/componets/ui/BaseInput.vue";
import BaseModal from "@/componets/ui/BaseModal.vue";
import BaseToggle from "@/componets/ui/BaseToggle.vue";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import { displayValue, formatDateTime } from "@/utils/helper";

const catalog = useCatalogStore();
const ui = useUiStore();

type TabKey = "brand" | "category" | "api";

const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "brand", label: "ブランド設定", icon: "sell" },
    { key: "category", label: "カテゴリ設定", icon: "folder" },
    { key: "api", label: "API接続設定", icon: "key" },
];
const activeTab = ref<TabKey>("brand");

/* ------------------------------------------------------------- ブランド / カテゴリ */

const brandForm = reactive({ name: "", error: "" });
const categoryForm = reactive({ name: "", error: "" });
const editModal = reactive({ open: false, kind: "brand" as "brand" | "category", id: 0, name: "", error: "" });
const deleteModal = reactive({ open: false, kind: "brand" as "brand" | "category", id: 0, name: "", blockedMessage: "" });

function addBrand() {
    const result = catalog.addBrand(brandForm.name);
    brandForm.error = result.ok ? "" : (result.message ?? "");
    if (result.ok) {
        ui.notify(`ブランド「${result.brand?.name}」を登録しました。`);
        brandForm.name = "";
    }
}

function addCategory() {
    const result = catalog.addCategory(categoryForm.name);
    categoryForm.error = result.ok ? "" : (result.message ?? "");
    if (result.ok) {
        ui.notify(`カテゴリ「${result.category?.name}」を登録しました。`);
        categoryForm.name = "";
    }
}

function openEdit(kind: "brand" | "category", id: number, name: string) {
    Object.assign(editModal, { open: true, kind, id, name, error: "" });
}

function submitEdit() {
    const result = editModal.kind === "brand" ? catalog.updateBrand(editModal.id, editModal.name) : catalog.updateCategory(editModal.id, editModal.name);
    if (!result.ok) {
        editModal.error = result.message ?? "";
        return;
    }
    editModal.open = false;
    ui.notify(`${editModal.kind === "brand" ? "ブランド" : "カテゴリ"}名称を更新しました。`);
}

/** 使用中のブランド・カテゴリは削除を中止し、対象品番が存在することを表示する（§4.7） */
function openDelete(kind: "brand" | "category", id: number, name: string) {
    const used = kind === "brand" ? catalog.brandUsageCount(id) : catalog.categoryUsageCount(id);
    Object.assign(deleteModal, {
        open: true,
        kind,
        id,
        name,
        blockedMessage: used > 0 ? `この${kind === "brand" ? "ブランド" : "カテゴリ"}は${used}件の品番で使用されているため削除できません。` : "",
    });
}

function submitDelete() {
    const result = deleteModal.kind === "brand" ? catalog.deleteBrand(deleteModal.id) : catalog.deleteCategory(deleteModal.id);
    if (!result.ok) {
        deleteModal.blockedMessage = result.message ?? "";
        return;
    }
    deleteModal.open = false;
    ui.notify(`「${deleteModal.name}」を削除しました。`);
}

/* --------------------------------------------------------------------- API接続設定 */

const sourceForm = reactive({ value: "", memo: "", error: "" });
const apiError = ref("");
const reissueOpen = ref(false);

const hasKey = computed(() => catalog.apiSettings.key_issued_at !== null);

function addSource() {
    const result = catalog.addAllowedSource(sourceForm.value, sourceForm.memo);
    sourceForm.error = result.ok ? "" : (result.message ?? "");
    if (result.ok) {
        ui.notify("許可IP / CIDRを追加しました。");
        sourceForm.value = "";
        sourceForm.memo = "";
    }
}

function issueKey() {
    catalog.issueApiKey();
    reissueOpen.value = false;
    ui.notify("APIキーを発行しました。表示は今回のみです。");
}

function saveApiSettings() {
    const message = catalog.validateApiSettings();
    apiError.value = message ?? "";
    if (message) {
        ui.notify(message, "error");
        return;
    }
    ui.notify("API接続設定を保存しました。");
}

async function copyKey() {
    if (!catalog.issuedApiKey) return;
    try {
        await navigator.clipboard.writeText(catalog.issuedApiKey);
        ui.notify("APIキーをコピーしました。");
    } catch {
        ui.notify("コピーできませんでした。手動で選択してください。", "error");
    }
}
</script>

<template>
    <div class="space-y-5">
        <nav class="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
                v-for="tab in tabs"
                :key="tab.key"
                type="button"
                class="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
                :class="activeTab === tab.key ? 'bg-primary-100 text-primary-700' : 'text-slate-600 hover:bg-primary-50 hover:text-primary-700'"
                @click="activeTab = tab.key"
            >
                <AppIcon :name="tab.icon" :size="16" />
                {{ tab.label }}
            </button>
        </nav>

        <!-- ブランド設定 -->
        <div v-if="activeTab === 'brand'" class="grid gap-5 lg:grid-cols-3">
            <BaseCard title="ブランドを登録" description="品番の選択欄に表示されます。">
                <form class="space-y-3" @submit.prevent="addBrand">
                    <BaseInput v-model="brandForm.name" label="ブランド名称" placeholder="栞" required :error="brandForm.error" />
                    <BaseButton type="submit" variant="primary" icon="add" block>登録</BaseButton>
                </form>
            </BaseCard>

            <BaseCard :title="`登録済みブランド（${catalog.brands.length}件）`" :padded="false" class="lg:col-span-2">
                <ul class="divide-y divide-slate-100">
                    <li v-for="brand in catalog.brands" :key="brand.id" class="flex items-center justify-between gap-3 px-5 py-3">
                        <div class="flex min-w-0 items-center gap-3">
                            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><AppIcon name="sell" :size="15" /></span>
                            <span class="min-w-0">
                                <span class="block truncate text-sm font-medium text-slate-900">{{ brand.name }}</span>
                                <span class="block text-[11px] text-slate-500">使用中の品番 {{ catalog.brandUsageCount(brand.id) }}件</span>
                            </span>
                        </div>
                        <div class="flex items-center gap-1">
                            <BaseButton size="sm" variant="ghost" icon="edit" @click="openEdit('brand', brand.id, brand.name)">編集</BaseButton>
                            <BaseButton size="sm" variant="ghost" icon="delete" @click="openDelete('brand', brand.id, brand.name)">削除</BaseButton>
                        </div>
                    </li>
                </ul>
            </BaseCard>
        </div>

        <!-- カテゴリ設定 -->
        <div v-else-if="activeTab === 'category'" class="grid gap-5 lg:grid-cols-3">
            <BaseCard title="カテゴリを登録" description="品番の選択欄に表示されます。">
                <form class="space-y-3" @submit.prevent="addCategory">
                    <BaseInput v-model="categoryForm.name" label="カテゴリ名称" placeholder="老眼鏡" required :error="categoryForm.error" />
                    <BaseButton type="submit" variant="primary" icon="add" block>登録</BaseButton>
                </form>
            </BaseCard>

            <BaseCard :title="`登録済みカテゴリ（${catalog.categories.length}件）`" :padded="false" class="lg:col-span-2">
                <ul class="divide-y divide-slate-100">
                    <li v-for="category in catalog.categories" :key="category.id" class="flex items-center justify-between gap-3 px-5 py-3">
                        <div class="flex min-w-0 items-center gap-3">
                            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><AppIcon name="folder" :size="15" /></span>
                            <span class="min-w-0">
                                <span class="block truncate text-sm font-medium text-slate-900">{{ category.name }}</span>
                                <span class="block text-[11px] text-slate-500">使用中の品番 {{ catalog.categoryUsageCount(category.id) }}件</span>
                            </span>
                        </div>
                        <div class="flex items-center gap-1">
                            <BaseButton size="sm" variant="ghost" icon="edit" @click="openEdit('category', category.id, category.name)">編集</BaseButton>
                            <BaseButton size="sm" variant="ghost" icon="delete" @click="openDelete('category', category.id, category.name)">削除</BaseButton>
                        </div>
                    </li>
                </ul>
            </BaseCard>
        </div>

        <!-- API接続設定 -->
        <div v-else class="space-y-5">
            <BaseAlert v-if="apiError" tone="danger">{{ apiError }}</BaseAlert>

            <div class="grid gap-5 lg:grid-cols-2">
                <BaseCard title="API有効状態" description="外部システムからの参照APIの利用可否を切り替えます。">
                    <BaseToggle v-model="catalog.apiSettings.enabled" label="外部APIを有効にする" description="有効にする場合は、許可IPアドレスまたはCIDRを1件以上登録してください。" />
                    <div class="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                        <BaseBadge :tone="catalog.apiSettings.enabled ? 'success' : 'neutral'">{{ catalog.apiSettings.enabled ? "有効" : "無効" }}</BaseBadge>
                        <span class="text-xs text-slate-500">ベースURL: <span class="font-mono">/api/v1</span></span>
                    </div>
                </BaseCard>

                <BaseCard title="APIキー" description="キーの値は発行直後に1回だけ表示されます。">
                    <div class="flex items-center justify-between gap-3">
                        <div class="min-w-0">
                            <p class="font-mono text-sm text-slate-700">{{ displayValue(catalog.apiSettings.key_masked) }}</p>
                            <p class="mt-1 text-[11px] text-slate-500">発行日時: {{ formatDateTime(catalog.apiSettings.key_issued_at) }}</p>
                        </div>
                        <BaseButton v-if="hasKey" variant="secondary" icon="refresh" @click="reissueOpen = true">再発行</BaseButton>
                        <BaseButton v-else variant="primary" icon="key" @click="issueKey">発行</BaseButton>
                    </div>

                    <div v-if="catalog.issuedApiKey" class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p class="text-xs font-semibold text-emerald-800">発行されたAPIキー（この画面を離れると再表示できません）</p>
                        <p class="mt-2 rounded border border-emerald-200 bg-white px-3 py-2 font-mono text-[13px] break-all text-slate-800">{{ catalog.issuedApiKey }}</p>
                        <div class="mt-2 flex gap-2">
                            <BaseButton size="sm" variant="secondary" icon="content_copy" @click="copyKey">コピー</BaseButton>
                            <BaseButton size="sm" variant="ghost" icon="close" @click="catalog.clearIssuedApiKey()">閉じる</BaseButton>
                        </div>
                    </div>
                </BaseCard>
            </div>

            <BaseCard title="許可IPアドレス / CIDR" description="接続元IPが許可設定に一致し、APIキーが正しい場合にAPIへの接続を許可します。" :padded="false">
                <div class="border-b border-slate-200 px-5 py-4">
                    <form class="grid gap-3 md:grid-cols-12" @submit.prevent="addSource">
                        <div class="md:col-span-5"><BaseInput v-model="sourceForm.value" label="IPアドレス / CIDR" placeholder="203.0.113.24 または 198.51.100.0/24" :error="sourceForm.error" /></div>
                        <div class="md:col-span-5"><BaseInput v-model="sourceForm.memo" label="メモ" placeholder="本社固定IP" /></div>
                        <div class="flex items-end md:col-span-2"><BaseButton type="submit" variant="secondary" icon="add" block>追加</BaseButton></div>
                    </form>
                </div>

                <ul v-if="catalog.apiSettings.allowed_sources.length > 0" class="divide-y divide-slate-100">
                    <li v-for="source in catalog.apiSettings.allowed_sources" :key="source.id" class="flex items-center justify-between gap-3 px-5 py-3">
                        <div class="flex min-w-0 items-center gap-3">
                            <BaseBadge :tone="source.kind === 'cidr' ? 'brand' : 'neutral'">{{ source.kind === "cidr" ? "CIDR" : "IP" }}</BaseBadge>
                            <span class="min-w-0">
                                <span class="block truncate font-mono text-sm text-slate-900">{{ source.value }}</span>
                                <span v-if="source.memo" class="block truncate text-[11px] text-slate-500">{{ source.memo }}</span>
                            </span>
                        </div>
                        <BaseButton size="sm" variant="ghost" icon="delete" @click="catalog.removeAllowedSource(source.id)">削除</BaseButton>
                    </li>
                </ul>
                <p v-else class="px-5 py-6 text-center text-sm text-slate-500">許可IPアドレス / CIDRが登録されていません。</p>

                <div class="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
                    <BaseButton variant="primary" icon="check" @click="saveApiSettings">保存</BaseButton>
                </div>
            </BaseCard>
        </div>

        <BaseModal :open="editModal.open" :title="editModal.kind === 'brand' ? 'ブランド名称を編集' : 'カテゴリ名称を編集'" width="sm" @close="editModal.open = false">
            <BaseInput v-model="editModal.name" :label="editModal.kind === 'brand' ? 'ブランド名称' : 'カテゴリ名称'" required :error="editModal.error" @keyup.enter="submitEdit" />
            <template #footer>
                <BaseButton variant="secondary" @click="editModal.open = false">キャンセル</BaseButton>
                <BaseButton variant="primary" icon="check" @click="submitEdit">保存</BaseButton>
            </template>
        </BaseModal>

        <BaseModal :open="deleteModal.open" title="削除の確認" width="sm" @close="deleteModal.open = false">
            <BaseAlert v-if="deleteModal.blockedMessage" tone="warning" title="削除できません">
                {{ deleteModal.blockedMessage }}<br />
                対象の品番のブランド・カテゴリを変更してから、再度削除してください。
            </BaseAlert>
            <p v-else class="text-sm text-slate-700">
                「<span class="font-semibold">{{ deleteModal.name }}</span
                >」を削除します。よろしいですか？
            </p>
            <template #footer>
                <BaseButton variant="secondary" @click="deleteModal.open = false">{{ deleteModal.blockedMessage ? "閉じる" : "キャンセル" }}</BaseButton>
                <BaseButton v-if="!deleteModal.blockedMessage" variant="danger" icon="delete" @click="submitDelete">削除する</BaseButton>
            </template>
        </BaseModal>

        <BaseModal :open="reissueOpen" title="APIキーを再発行しますか？" description="再発行すると旧キーは失効します。" width="sm" @close="reissueOpen = false">
            <p class="text-sm text-slate-700">現在のAPIキーを使用している外部システムは接続できなくなります。新しいキーを配布してください。</p>
            <template #footer>
                <BaseButton variant="secondary" @click="reissueOpen = false">キャンセル</BaseButton>
                <BaseButton variant="danger" icon="refresh" @click="issueKey">再発行する</BaseButton>
            </template>
        </BaseModal>
    </div>
</template>
