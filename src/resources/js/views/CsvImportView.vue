<script setup lang="ts">
import { computed, ref } from "vue";
import AppIcon from "@/componets/AppIcon.vue";
import BaseAlert from "@/componets/ui/BaseAlert.vue";
import BaseBadge from "@/componets/ui/BaseBadge.vue";
import BaseButton from "@/componets/ui/BaseButton.vue";
import BaseCard from "@/componets/ui/BaseCard.vue";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import { CSV_COLUMNS, CSV_HEADERS, CSV_MAX_SIZE_MB, CSV_TEMPLATE_SAMPLE } from "@/utils/consts";
import { downloadCsv, formatDateTime, formatNumber, toCsvLine } from "@/utils/helper";
import type { CsvImportResult, CsvValidationSummary } from "@/types";

const catalog = useCatalogStore();
const ui = useUiStore();

const fileInput = ref<HTMLInputElement | null>(null);
const file = ref<File | null>(null);
const fileText = ref("");
const dragging = ref(false);
const validating = ref(false);
const importing = ref(false);
const summary = ref<CsvValidationSummary | null>(null);
const result = ref<CsvImportResult | null>(null);
const fileError = ref("");

const canValidate = computed(() => file.value !== null && !validating.value);
const canImport = computed(() => summary.value !== null && summary.value.error_count === 0 && summary.value.total_rows > 0 && result.value === null);

const summaryCards = computed(() => [
    { key: "create", label: "新規登録", value: summary.value?.create_count ?? 0, tone: "emerald" },
    { key: "update", label: "更新", value: summary.value?.update_count ?? 0, tone: "sky" },
    { key: "unchanged", label: "変更なし", value: summary.value?.unchanged_count ?? 0, tone: "slate" },
    { key: "error", label: "エラー", value: summary.value?.error_count ?? 0, tone: "rose" },
]);

const toneClass: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
};

const statusLabel: Record<string, string> = { create: "新規登録", update: "更新", unchanged: "変更なし", error: "エラー" };

function downloadTemplate() {
    const content = [toCsvLine([...CSV_HEADERS]), toCsvLine(CSV_TEMPLATE_SAMPLE)].join("\r\n");
    downloadCsv("crosswalk_template.csv", content);
    ui.notify("CSVテンプレートをダウンロードしました。");
}

async function acceptFile(selected: File | null | undefined) {
    summary.value = null;
    result.value = null;
    fileError.value = "";

    if (!selected) return;
    if (!/\.csv$/i.test(selected.name)) {
        fileError.value = "CSVファイル（.csv）を指定してください。";
        return;
    }
    if (selected.size > CSV_MAX_SIZE_MB * 1024 * 1024) {
        fileError.value = `ファイルサイズが上限（${CSV_MAX_SIZE_MB}MB）を超えています。`;
        return;
    }

    file.value = selected;
    fileText.value = await selected.text();
}

function onFileChange(event: Event) {
    void acceptFile((event.target as HTMLInputElement).files?.[0]);
}

function onDrop(event: DragEvent) {
    dragging.value = false;
    void acceptFile(event.dataTransfer?.files?.[0]);
}

function clearFile() {
    file.value = null;
    fileText.value = "";
    summary.value = null;
    result.value = null;
    fileError.value = "";
    if (fileInput.value) fileInput.value.value = "";
}

function validate() {
    if (!file.value) return;
    validating.value = true;
    summary.value = catalog.validateCsv(file.value.name, fileText.value);
    result.value = null;
    validating.value = false;

    if (summary.value.error_count > 0) ui.notify(`検証で${summary.value.error_count}件のエラーが見つかりました。`, "error");
    else ui.notify("検証が完了しました。取込を実行できます。");
}

function runImport() {
    if (!summary.value || summary.value.error_count > 0) return;
    importing.value = true;
    try {
        result.value = catalog.commitCsv(summary.value);
        ui.notify("CSVの取込が完了しました。");
    } catch {
        ui.notify("取込中にエラーが発生したため、ファイル全体の更新を取り消しました。", "error");
    } finally {
        importing.value = false;
    }
}

/** 検証・取込の処理結果をCSVで出力する */
function downloadResult() {
    if (!summary.value) return;
    const current = summary.value;
    const errorsByLine = new Map<number, string[]>();
    current.errors.forEach((error) => {
        errorsByLine.set(error.line, [...(errorsByLine.get(error.line) ?? []), `${error.column}: ${error.message}`]);
    });

    const lines = [toCsvLine(["line", "item_no", "sku_code", "result", "message"])];
    current.rows.forEach((row) => {
        lines.push(toCsvLine([row.__line, row.item_no ?? "", row.sku_code ?? "", statusLabel[current.statuses[row.__line] ?? "error"], (errorsByLine.get(row.__line) ?? []).join(" / ")]));
    });

    downloadCsv(`crosswalk_result_${current.file_name.replace(/\.csv$/i, "")}.csv`, lines.join("\r\n"));
    ui.notify("処理結果をダウンロードしました。");
}
</script>

<template>
    <div class="space-y-5">
        <div class="grid gap-5 xl:grid-cols-3">
            <BaseCard title="CSVファイルの指定" description="ファイル選択またはドラッグアンドドロップでCSVを指定します。" class="xl:col-span-2">
                <template #actions>
                    <BaseButton size="sm" variant="secondary" icon="download" @click="downloadTemplate">CSVテンプレート</BaseButton>
                </template>

                <div
                    class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors"
                    :class="dragging ? 'border-primary-400 bg-primary-50/60' : 'border-slate-300 bg-slate-50/60'"
                    @dragover.prevent="dragging = true"
                    @dragleave.prevent="dragging = false"
                    @drop.prevent="onDrop"
                >
                    <span class="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200"><AppIcon name="upload" :size="20" /></span>
                    <p class="mt-3 text-sm font-medium text-slate-700">CSVファイルをここにドロップ</p>
                    <p class="mt-1 text-xs text-slate-500">または</p>
                    <BaseButton class="mt-3" variant="secondary" icon="description" @click="fileInput?.click()">ファイルを選択</BaseButton>
                    <p class="mt-3 text-[11px] text-slate-400">UTF-8 / ヘッダー行必須 / 最大 {{ CSV_MAX_SIZE_MB }}MB</p>
                    <input ref="fileInput" type="file" accept=".csv,text/csv" class="hidden" @change="onFileChange" />
                </div>

                <BaseAlert v-if="fileError" tone="danger" class="mt-4">{{ fileError }}</BaseAlert>

                <div v-if="file" class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div class="flex min-w-0 items-center gap-2.5">
                        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><AppIcon name="csv" :size="18" /></span>
                        <span class="min-w-0">
                            <span class="block truncate text-sm font-medium text-slate-900">{{ file.name }}</span>
                            <span class="block text-[11px] text-slate-500">{{ formatNumber(Math.ceil(file.size / 1024)) }} KB</span>
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <BaseButton size="sm" variant="ghost" icon="close" @click="clearFile">取り消し</BaseButton>
                        <BaseButton size="sm" variant="primary" icon="check" :disabled="!canValidate" :loading="validating" @click="validate">検証</BaseButton>
                    </div>
                </div>
            </BaseCard>

            <BaseCard title="CSV列" description="要件定義書 §5.1 の列構成">
                <ul class="space-y-1.5">
                    <li v-for="column in CSV_COLUMNS" :key="column.key" class="flex items-center justify-between gap-2 text-xs">
                        <span class="font-mono text-slate-700">{{ column.key }}</span>
                        <span class="flex items-center gap-1.5 text-slate-500">
                            {{ column.label }}
                            <BaseBadge v-if="column.required" tone="danger">必須</BaseBadge>
                        </span>
                    </li>
                </ul>
                <p class="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">同じ品番に複数SKUを登録する場合は、品番情報を繰り返してSKUごとに1行記載します。</p>
            </BaseCard>
        </div>

        <BaseCard v-if="summary" title="検証結果" :description="summary.file_name">
            <template #actions>
                <BaseButton size="sm" variant="secondary" icon="download" @click="downloadResult">処理結果ダウンロード</BaseButton>
                <BaseButton size="sm" variant="primary" icon="upload" :disabled="!canImport" :loading="importing" @click="runImport">取込実行</BaseButton>
            </template>

            <div class="grid gap-3 sm:grid-cols-4">
                <div v-for="card in summaryCards" :key="card.key" class="rounded-lg border px-4 py-3" :class="toneClass[card.tone]">
                    <p class="text-xs font-medium">{{ card.label }}</p>
                    <p class="mt-1 text-2xl font-semibold tabular-nums">{{ formatNumber(card.value) }}</p>
                </div>
            </div>

            <p class="mt-3 text-xs text-slate-500">対象データ行数: {{ formatNumber(summary.total_rows) }}行</p>

            <BaseAlert v-if="summary.error_count === 0" tone="success" class="mt-4" title="エラーはありません">取込を実行できます。取込はファイル全体を1つの単位として処理します。</BaseAlert>
            <BaseAlert v-else tone="danger" class="mt-4" title="エラーがあるため取込できません">エラーをすべて解消したCSVで再度検証してください。</BaseAlert>

            <div v-if="summary.errors.length > 0" class="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500">
                            <th class="w-20 px-4 py-2.5 font-medium">行番号</th>
                            <th class="w-48 px-4 py-2.5 font-medium">項目</th>
                            <th class="px-4 py-2.5 font-medium">理由</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-for="(error, index) in summary.errors" :key="`${error.line}-${error.column}-${index}`" class="bg-white">
                            <td class="px-4 py-2.5 tabular-nums text-slate-700">{{ error.line }}</td>
                            <td class="px-4 py-2.5 font-mono text-[13px] text-slate-600">{{ error.column }}</td>
                            <td class="px-4 py-2.5 text-slate-700">{{ error.message }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </BaseCard>

        <BaseCard v-if="result" title="取込結果">
            <template #actions>
                <BaseButton size="sm" variant="secondary" icon="download" @click="downloadResult">処理結果ダウンロード</BaseButton>
                <BaseButton size="sm" variant="ghost" icon="arrow_forward" @click="$router.push({ name: 'items' })">品番一覧で確認</BaseButton>
            </template>

            <dl class="grid gap-4 sm:grid-cols-5">
                <div>
                    <dt class="text-xs text-slate-500">品番 新規</dt>
                    <dd class="mt-1 text-xl font-semibold text-slate-900">{{ formatNumber(result.created_items) }}</dd>
                </div>
                <div>
                    <dt class="text-xs text-slate-500">品番 更新</dt>
                    <dd class="mt-1 text-xl font-semibold text-slate-900">{{ formatNumber(result.updated_items) }}</dd>
                </div>
                <div>
                    <dt class="text-xs text-slate-500">SKU 新規</dt>
                    <dd class="mt-1 text-xl font-semibold text-slate-900">{{ formatNumber(result.created_skus) }}</dd>
                </div>
                <div>
                    <dt class="text-xs text-slate-500">SKU 更新</dt>
                    <dd class="mt-1 text-xl font-semibold text-slate-900">{{ formatNumber(result.updated_skus) }}</dd>
                </div>
                <div>
                    <dt class="text-xs text-slate-500">取込日時</dt>
                    <dd class="mt-1 text-sm text-slate-700">{{ formatDateTime(result.imported_at) }}</dd>
                </div>
            </dl>
        </BaseCard>
    </div>
</template>
