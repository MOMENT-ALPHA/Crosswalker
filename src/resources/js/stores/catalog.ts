import { defineStore } from "pinia";
import { createSeedItems, seedApiSettings, seedBrands, seedCategories } from "@/mock/data";
import { CSV_COLUMNS, CSV_HEADERS, ITEMS_PER_PAGE } from "@/utils/consts";
import { detectSourceKind, nowIso, parseCsv, trimValue } from "@/utils/helper";
import type { ApiSettings, Brand, Category, CsvImportResult, CsvRow, CsvRowError, CsvValidationSummary, Item, ItemFormValues, ItemListRow, ItemSearchParams, Sku, ValidationResult } from "@/types";

interface SearchResult {
    rows: ItemListRow[];
    total: number;
    totalPages: number;
    page: number;
}

/**
 * 品番・SKU・マスタ・API設定を保持するモックデータストア。
 * すべてメモリ上で完結しており、バックエンド実装後は各アクションをAPI呼び出しに置き換える。
 */
export const useCatalogStore = defineStore("catalog", {
    state: () => ({
        brands: seedBrands.map((brand) => ({ ...brand })) as Brand[],
        categories: seedCategories.map((category) => ({ ...category })) as Category[],
        items: createSeedItems() as Item[],
        apiSettings: { ...seedApiSettings, allowed_sources: seedApiSettings.allowed_sources.map((source) => ({ ...source })) } as ApiSettings,
        issuedApiKey: null as string | null,
    }),

    getters: {
        brandName:
            (state) =>
            (id: number | null): string =>
                state.brands.find((brand) => brand.id === id)?.name ?? "-",

        categoryName:
            (state) =>
            (id: number | null): string =>
                state.categories.find((category) => category.id === id)?.name ?? "-",

        allSkus: (state): Sku[] => state.items.flatMap((item) => item.skus),

        stats(state): { itemCount: number; skuCount: number; noParentAsinCount: number; noChildAsinCount: number } {
            const activeItems = state.items.filter((item) => item.is_active);
            const skus = activeItems.flatMap((item) => item.skus.filter((sku) => sku.is_active));
            return {
                itemCount: activeItems.length,
                skuCount: skus.length,
                noParentAsinCount: activeItems.filter((item) => trimValue(item.parent_asin) === "").length,
                noChildAsinCount: skus.filter((sku) => trimValue(sku.child_asin) === "").length,
            };
        },

        rows(state): ItemListRow[] {
            return state.items.map((item) => ({
                ...item,
                brand_name: state.brands.find((brand) => brand.id === item.brand_id)?.name ?? "-",
                category_name: state.categories.find((category) => category.id === item.category_id)?.name ?? "-",
                sku_count: item.skus.length,
            }));
        },

        recentItems(): ItemListRow[] {
            return this.rows
                .filter((item) => item.is_active)
                .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                .slice(0, 8);
        },
    },

    actions: {
        /* ------------------------------------------------------------------ 品番 */

        findItem(id: number): Item | undefined {
            return this.items.find((item) => item.id === id);
        },

        search(params: ItemSearchParams): SearchResult {
            const keyword = trimValue(params.keyword).toLowerCase();

            const matched = this.rows
                .filter((row) => {
                    if (params.brand_id && row.brand_id !== params.brand_id) return false;
                    if (params.category_id && row.category_id !== params.category_id) return false;
                    if (params.status === "active" && !row.is_active) return false;
                    if (params.status === "inactive" && row.is_active) return false;
                    if (params.filter === "no_parent_asin" && trimValue(row.parent_asin) !== "") return false;
                    if (params.filter === "no_child_asin" && !row.skus.some((sku) => trimValue(sku.child_asin) === "")) return false;
                    if (keyword === "") return true;

                    const haystack = [row.item_no, row.parent_asin, ...row.skus.flatMap((sku) => [sku.sku_code, sku.child_asin, sku.tq_item_no, sku.tq_color_no, sku.tq_size])];
                    return haystack.some((value) => value.toLowerCase().includes(keyword));
                })
                .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

            const total = matched.length;
            const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
            const page = Math.min(Math.max(1, params.page), totalPages);
            const start = (page - 1) * ITEMS_PER_PAGE;

            return { rows: matched.slice(start, start + ITEMS_PER_PAGE), total, totalPages, page };
        },

        /** 保存前検証（必須・形式・重複）。要件定義書 §4.5 */
        validateItemForm(values: ItemFormValues, editingId: number | null): ValidationResult {
            const result: ValidationResult = { item: {}, skus: {}, global: [] };
            const setSkuError = (key: string, field: string, message: string) => {
                result.skus[key] = { ...(result.skus[key] ?? {}), [field]: message };
            };

            const itemNo = trimValue(values.item_no);
            if (itemNo === "") {
                result.item.item_no = "品番コードは必須です。";
            } else if (this.items.some((item) => item.id !== editingId && item.item_no.toLowerCase() === itemNo.toLowerCase())) {
                result.item.item_no = "この品番コードは既に登録されています。";
            }
            if (!values.brand_id) result.item.brand_id = "ブランドを選択してください。";
            if (!values.category_id) result.item.category_id = "カテゴリを選択してください。";

            if (values.skus.length === 0) {
                result.global.push("SKUを1行以上入力してください。");
            }

            const editingSkuIds = new Set(values.skus.map((row) => row.id).filter((id): id is number => id !== null));
            const otherSkus = this.allSkus.filter((sku) => !editingSkuIds.has(sku.id));

            const seenSkuCode = new Map<string, string>();
            const seenChildAsin = new Map<string, string>();
            const seenTqKey = new Map<string, string>();

            values.skus.forEach((row) => {
                const skuCode = trimValue(row.sku_code);
                const childAsin = trimValue(row.child_asin);
                const tqItemNo = trimValue(row.tq_item_no);
                const tqColorNo = trimValue(row.tq_color_no);
                const tqSize = trimValue(row.tq_size);

                if (skuCode === "") {
                    setSkuError(row.key, "sku_code", "必須です");
                } else {
                    const lower = skuCode.toLowerCase();
                    if (seenSkuCode.has(lower)) {
                        setSkuError(row.key, "sku_code", "入力内に重複があります");
                    } else if (otherSkus.some((sku) => sku.sku_code.toLowerCase() === lower)) {
                        setSkuError(row.key, "sku_code", "既に登録されています");
                    }
                    seenSkuCode.set(lower, row.key);
                }

                if (childAsin !== "") {
                    const lower = childAsin.toLowerCase();
                    if (seenChildAsin.has(lower)) {
                        setSkuError(row.key, "child_asin", "入力内に重複があります");
                    } else if (otherSkus.some((sku) => trimValue(sku.child_asin).toLowerCase() === lower)) {
                        setSkuError(row.key, "child_asin", "既に登録されています");
                    }
                    seenChildAsin.set(lower, row.key);
                }

                if (tqItemNo === "") setSkuError(row.key, "tq_item_no", "必須です");
                if (tqColorNo === "") setSkuError(row.key, "tq_color_no", "必須です");
                if (tqSize === "") setSkuError(row.key, "tq_size", "必須です");

                if (tqItemNo !== "" && tqColorNo !== "" && tqSize !== "") {
                    const tqKey = [tqItemNo, tqColorNo, tqSize].join("").toLowerCase();
                    if (seenTqKey.has(tqKey)) {
                        setSkuError(row.key, "tq_item_no", "TQキーが入力内で重複しています");
                    } else if (otherSkus.some((sku) => [sku.tq_item_no, sku.tq_color_no, sku.tq_size].join("").toLowerCase() === tqKey)) {
                        setSkuError(row.key, "tq_item_no", "TQキーが既に登録されています");
                    }
                    seenTqKey.set(tqKey, row.key);
                }
            });

            if (Object.keys(result.skus).length > 0) {
                result.global.push("SKU行に入力エラーがあります。該当行を修正してください。");
            }

            return result;
        },

        /** 品番と全SKUを1回の保存処理で登録・更新する */
        saveItem(values: ItemFormValues, editingId: number | null): Item {
            const timestamp = nowIso();
            const existing = editingId === null ? undefined : this.findItem(editingId);
            const itemId = existing?.id ?? Math.max(0, ...this.items.map((item) => item.id)) + 1;
            let nextSkuId = Math.max(0, ...this.allSkus.map((sku) => sku.id)) + 1;

            const skus: Sku[] = values.skus.map((row, index) => {
                const current = existing?.skus.find((sku) => sku.id === row.id);
                return {
                    id: current?.id ?? nextSkuId++,
                    item_id: itemId,
                    sku_code: trimValue(row.sku_code),
                    child_asin: trimValue(row.child_asin),
                    tq_item_no: trimValue(row.tq_item_no),
                    tq_color_no: trimValue(row.tq_color_no),
                    tq_size: trimValue(row.tq_size),
                    memo: trimValue(row.memo),
                    is_active: row.is_active,
                    sort_order: index + 1,
                    created_at: current?.created_at ?? timestamp,
                    updated_at: timestamp,
                };
            });

            const saved: Item = {
                id: itemId,
                item_no: trimValue(values.item_no),
                brand_id: values.brand_id,
                category_id: values.category_id,
                parent_asin: trimValue(values.parent_asin),
                memo: trimValue(values.memo),
                is_active: values.is_active,
                created_at: existing?.created_at ?? timestamp,
                updated_at: timestamp,
                skus,
            };

            if (existing) {
                this.items = this.items.map((item) => (item.id === itemId ? saved : item));
            } else {
                this.items.push(saved);
            }

            return saved;
        },

        /** 品番の有効状態を所属SKUごと切り替える */
        setItemActive(id: number, isActive: boolean): Item | undefined {
            const item = this.findItem(id);
            if (!item) return undefined;
            item.is_active = isActive;
            item.updated_at = nowIso();
            return item;
        },

        /** SKUの有効状態を切り替える */
        setSkuActive(itemId: number, skuId: number, isActive: boolean): Sku | undefined {
            const item = this.findItem(itemId);
            const sku = item?.skus.find((entry) => entry.id === skuId);
            if (!item || !sku) return undefined;
            sku.is_active = isActive;
            sku.updated_at = nowIso();
            item.updated_at = sku.updated_at;
            return sku;
        },

        /** 品番削除（所属SKUも同時に削除される） */
        deleteItem(id: number): void {
            this.items = this.items.filter((item) => item.id !== id);
        },

        /* ------------------------------------------------------- ブランド / カテゴリ */

        brandUsageCount(id: number): number {
            return this.items.filter((item) => item.brand_id === id).length;
        },

        categoryUsageCount(id: number): number {
            return this.items.filter((item) => item.category_id === id).length;
        },

        addBrand(name: string): { ok: boolean; message?: string; brand?: Brand } {
            const value = trimValue(name);
            if (value === "") return { ok: false, message: "ブランド名称を入力してください。" };
            if (this.brands.some((brand) => brand.name === value)) return { ok: false, message: "同じ名称のブランドが既に登録されています。" };

            const brand: Brand = { id: Math.max(0, ...this.brands.map((entry) => entry.id)) + 1, name: value };
            this.brands.push(brand);
            return { ok: true, brand };
        },

        updateBrand(id: number, name: string): { ok: boolean; message?: string } {
            const value = trimValue(name);
            if (value === "") return { ok: false, message: "ブランド名称を入力してください。" };
            if (this.brands.some((brand) => brand.id !== id && brand.name === value)) return { ok: false, message: "同じ名称のブランドが既に登録されています。" };

            this.brands = this.brands.map((brand) => (brand.id === id ? { ...brand, name: value } : brand));
            return { ok: true };
        },

        deleteBrand(id: number): { ok: boolean; message?: string } {
            const used = this.brandUsageCount(id);
            if (used > 0) return { ok: false, message: `このブランドは${used}件の品番で使用されているため削除できません。` };

            this.brands = this.brands.filter((brand) => brand.id !== id);
            return { ok: true };
        },

        addCategory(name: string): { ok: boolean; message?: string; category?: Category } {
            const value = trimValue(name);
            if (value === "") return { ok: false, message: "カテゴリ名称を入力してください。" };
            if (this.categories.some((category) => category.name === value)) return { ok: false, message: "同じ名称のカテゴリが既に登録されています。" };

            const category: Category = { id: Math.max(0, ...this.categories.map((entry) => entry.id)) + 1, name: value };
            this.categories.push(category);
            return { ok: true, category };
        },

        updateCategory(id: number, name: string): { ok: boolean; message?: string } {
            const value = trimValue(name);
            if (value === "") return { ok: false, message: "カテゴリ名称を入力してください。" };
            if (this.categories.some((category) => category.id !== id && category.name === value)) return { ok: false, message: "同じ名称のカテゴリが既に登録されています。" };

            this.categories = this.categories.map((category) => (category.id === id ? { ...category, name: value } : category));
            return { ok: true };
        },

        deleteCategory(id: number): { ok: boolean; message?: string } {
            const used = this.categoryUsageCount(id);
            if (used > 0) return { ok: false, message: `このカテゴリは${used}件の品番で使用されているため削除できません。` };

            this.categories = this.categories.filter((category) => category.id !== id);
            return { ok: true };
        },

        /* ------------------------------------------------------------- API接続設定 */

        /** APIキーを発行・再発行する（値は発行直後に1回だけ表示する） */
        issueApiKey(): string {
            const random = Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
            const key = `cwk_live_${random}`;
            this.issuedApiKey = key;
            this.apiSettings.key_issued_at = nowIso();
            this.apiSettings.key_masked = `cwk_live_${"*".repeat(20)}${random.slice(-4)}`;
            return key;
        },

        clearIssuedApiKey(): void {
            this.issuedApiKey = null;
        },

        addAllowedSource(value: string, memo: string): { ok: boolean; message?: string } {
            const text = trimValue(value);
            const kind = detectSourceKind(text);
            if (kind === null) return { ok: false, message: "IPアドレスまたはCIDRの形式が正しくありません。" };
            if (this.apiSettings.allowed_sources.some((source) => source.value === text)) return { ok: false, message: "同じ値が既に登録されています。" };

            this.apiSettings.allowed_sources.push({
                id: Math.max(0, ...this.apiSettings.allowed_sources.map((source) => source.id)) + 1,
                value: text,
                kind,
                memo: trimValue(memo),
            });
            return { ok: true };
        },

        removeAllowedSource(id: number): void {
            this.apiSettings.allowed_sources = this.apiSettings.allowed_sources.filter((source) => source.id !== id);
        },

        /** API設定の保存前検証（有効時は許可元が1件以上必要） */
        validateApiSettings(): string | null {
            if (this.apiSettings.enabled && this.apiSettings.allowed_sources.length === 0) {
                return "APIを有効にする場合は、許可IPアドレスまたは許可CIDRを1件以上登録してください。";
            }
            if (this.apiSettings.enabled && !this.apiSettings.key_issued_at) {
                return "APIを有効にする場合は、APIキーを発行してください。";
            }
            return null;
        },

        /* ---------------------------------------------------------------- CSV取込 */

        /** CSVを検証する（取込前にファイル全体を検査する） */
        validateCsv(fileName: string, text: string): CsvValidationSummary {
            const summary: CsvValidationSummary = {
                file_name: fileName,
                total_rows: 0,
                create_count: 0,
                update_count: 0,
                unchanged_count: 0,
                error_count: 0,
                errors: [],
                statuses: {},
                rows: [],
            };

            const table = parseCsv(text);
            if (table.length === 0) {
                summary.errors.push({ line: 1, column: "-", message: "CSVにデータが含まれていません。" });
                summary.error_count = 1;
                return summary;
            }

            const header = table[0].map((cell) => trimValue(cell));
            const missing = CSV_COLUMNS.filter((column) => column.required && !header.includes(column.key));
            if (missing.length > 0) {
                summary.errors.push({ line: 1, column: missing.map((column) => column.key).join(", "), message: "ヘッダー行に必須列がありません。" });
                summary.error_count = summary.errors.length;
                return summary;
            }

            const rows: CsvRow[] = table.slice(1).map((cells, index) => {
                const row = { __line: index + 2 } as CsvRow;
                header.forEach((key, columnIndex) => {
                    if ((CSV_HEADERS as readonly string[]).includes(key)) row[key] = trimValue(cells[columnIndex] ?? "");
                });
                return row;
            });

            summary.total_rows = rows.length;
            summary.rows = rows;

            const errors: CsvRowError[] = [];
            const seenSkuCode = new Map<string, number>();
            const seenTqKey = new Map<string, number>();
            const seenChildAsin = new Map<string, number>();
            const itemHeaders = new Map<string, { brand: string; category: string; line: number }>();
            const itemStatuses = new Map<string, { value: string; line: number }>();
            const statusErrorsByLine = new Map<number, CsvRowError[]>();

            rows.forEach((row) => {
                const rowErrors: CsvRowError[] = [];
                const itemStatus = row.item_status ?? "";
                const skuStatus = row.sku_status ?? "";
                if (itemStatus !== "" && itemStatus !== "active" && itemStatus !== "inactive") {
                    rowErrors.push({ line: row.__line, column: "item_status", message: "品番状態はactiveまたはinactiveで指定してください。" });
                }
                if (skuStatus !== "" && skuStatus !== "active" && skuStatus !== "inactive") {
                    rowErrors.push({ line: row.__line, column: "sku_status", message: "SKU状態はactiveまたはinactiveで指定してください。" });
                }
                const itemKey = (row.item_no ?? "").toLowerCase();
                if (itemKey !== "" && (itemStatus === "active" || itemStatus === "inactive")) {
                    const known = itemStatuses.get(itemKey);
                    if (known && known.value !== itemStatus) {
                        rowErrors.push({ line: row.__line, column: "item_status", message: "同じ品番に異なる品番状態が指定されています（" + known.line + "行目と不一致）。" });
                    } else if (!known) {
                        itemStatuses.set(itemKey, { value: itemStatus, line: row.__line });
                    }
                }
                if (rowErrors.length > 0) statusErrorsByLine.set(row.__line, rowErrors);
            });
            let createCount = 0;
            let updateCount = 0;
            let unchangedCount = 0;

            rows.forEach((row) => {
                const line = row.__line;
                const rowErrors: CsvRowError[] = [...(statusErrorsByLine.get(line) ?? [])];

                CSV_COLUMNS.filter((column) => column.required).forEach((column) => {
                    if ((row[column.key] ?? "") === "") {
                        rowErrors.push({ line, column: column.key, message: `${column.label}は必須です。` });
                    }
                });

                const brandName = row.brand_name ?? "";
                const categoryName = row.category_name ?? "";
                if (brandName !== "" && !this.brands.some((brand) => brand.name === brandName)) {
                    rowErrors.push({ line, column: "brand_name", message: `ブランド「${brandName}」は登録されていません。` });
                }
                if (categoryName !== "" && !this.categories.some((category) => category.name === categoryName)) {
                    rowErrors.push({ line, column: "category_name", message: `カテゴリ「${categoryName}」は登録されていません。` });
                }

                const itemNo = row.item_no ?? "";
                if (itemNo !== "") {
                    const known = itemHeaders.get(itemNo.toLowerCase());
                    if (known && (known.brand !== brandName || known.category !== categoryName)) {
                        rowErrors.push({ line, column: "item_no", message: `品番「${itemNo}」に異なるブランド・カテゴリが指定されています（${known.line}行目と不一致）。` });
                    } else if (!known) {
                        itemHeaders.set(itemNo.toLowerCase(), { brand: brandName, category: categoryName, line });
                    }
                }

                const skuCode = row.sku_code ?? "";
                if (skuCode !== "") {
                    const lower = skuCode.toLowerCase();
                    const duplicated = seenSkuCode.get(lower);
                    if (duplicated) {
                        rowErrors.push({ line, column: "sku_code", message: `SKUコードがファイル内で重複しています（${duplicated}行目）。` });
                    } else {
                        seenSkuCode.set(lower, line);
                    }
                }

                const childAsin = row.child_asin ?? "";
                if (childAsin !== "") {
                    const lower = childAsin.toLowerCase();
                    const duplicated = seenChildAsin.get(lower);
                    if (duplicated) {
                        rowErrors.push({ line, column: "child_asin", message: `子ASINがファイル内で重複しています（${duplicated}行目）。` });
                    } else {
                        seenChildAsin.set(lower, line);
                        const conflict = this.allSkus.find((sku) => trimValue(sku.child_asin).toLowerCase() === lower && sku.sku_code.toLowerCase() !== skuCode.toLowerCase());
                        if (conflict) {
                            rowErrors.push({ line, column: "child_asin", message: `子ASINが既存SKU「${conflict.sku_code}」と重複しています。` });
                        }
                    }
                }

                const tqItemNo = row.tq_item_no ?? "";
                const tqColorNo = row.tq_color_no ?? "";
                const tqSize = row.tq_size ?? "";
                if (tqItemNo !== "" && tqColorNo !== "" && tqSize !== "") {
                    const tqKey = [tqItemNo, tqColorNo, tqSize].join("").toLowerCase();
                    const duplicated = seenTqKey.get(tqKey);
                    if (duplicated) {
                        rowErrors.push({ line, column: "tq_item_no", message: `TQキーがファイル内で重複しています（${duplicated}行目）。` });
                    } else {
                        seenTqKey.set(tqKey, line);
                        const conflict = this.allSkus.find(
                            (sku) => [sku.tq_item_no, sku.tq_color_no, sku.tq_size].join("").toLowerCase() === tqKey && sku.sku_code.toLowerCase() !== skuCode.toLowerCase(),
                        );
                        if (conflict) {
                            rowErrors.push({ line, column: "tq_item_no", message: `TQキーが既存SKU「${conflict.sku_code}」と重複しています。` });
                        }
                    }
                }

                const existingSku = this.allSkus.find((sku) => sku.sku_code.toLowerCase() === skuCode.toLowerCase());
                const owner = existingSku ? this.items.find((item) => item.id === existingSku.item_id) : undefined;
                const resolvedItemStatus = itemStatuses.get(itemNo.toLowerCase())?.value;
                const resolvedSkuStatus = row.sku_status ?? "";
                if (existingSku && owner && itemNo !== "" && owner.item_no.toLowerCase() !== itemNo.toLowerCase()) {
                    rowErrors.push({ line, column: "sku_code", message: `SKU「${skuCode}」は品番「${owner.item_no}」に登録済みです。所属品番は変更できません。` });
                }

                if (rowErrors.length > 0) {
                    errors.push(...rowErrors);
                    summary.statuses[line] = "error";
                    return;
                }

                if (existingSku) {
                    const skuChanged =
                        existingSku.child_asin !== childAsin ||
                        existingSku.tq_item_no !== tqItemNo ||
                        existingSku.tq_color_no !== tqColorNo ||
                        existingSku.tq_size !== tqSize ||
                        existingSku.memo !== (row.sku_memo ?? "") ||
                        (resolvedSkuStatus !== "" && existingSku.is_active !== (resolvedSkuStatus === "active"));
                    const itemChanged = owner
                        ? owner.parent_asin !== (row.parent_asin ?? "") ||
                          owner.memo !== (row.item_memo ?? "") ||
                          this.brandName(owner.brand_id) !== brandName ||
                          this.categoryName(owner.category_id) !== categoryName ||
                          (resolvedItemStatus !== undefined && owner.is_active !== (resolvedItemStatus === "active"))
                        : false;

                    if (skuChanged || itemChanged) {
                        updateCount += 1;
                        summary.statuses[line] = "update";
                    } else {
                        unchangedCount += 1;
                        summary.statuses[line] = "unchanged";
                    }
                } else {
                    createCount += 1;
                    summary.statuses[line] = "create";
                }
            });

            summary.errors = errors.sort((a, b) => a.line - b.line);
            summary.error_count = errors.length;
            summary.create_count = createCount;
            summary.update_count = updateCount;
            summary.unchanged_count = unchangedCount;
            return summary;
        },

        /** 検証済みCSVを取り込む（ファイル全体を1単位として反映する） */
        commitCsv(summary: CsvValidationSummary): CsvImportResult {
            const result: CsvImportResult = { created_items: 0, updated_items: 0, created_skus: 0, updated_skus: 0, unchanged: summary.unchanged_count, imported_at: nowIso() };
            if (summary.error_count > 0) return result;

            const timestamp = nowIso();
            const snapshot = JSON.parse(JSON.stringify(this.items)) as Item[];
            const touchedItemIds = new Set<number>();
            const itemStatuses = new Map<string, string>();
            summary.rows.forEach((row) => {
                const status = row.item_status ?? "";
                if (status === "active" || status === "inactive") itemStatuses.set((row.item_no ?? "").toLowerCase(), status);
            });

            try {
                summary.rows.forEach((row) => {
                    const itemNo = row.item_no ?? "";
                    const brand = this.brands.find((entry) => entry.name === (row.brand_name ?? ""));
                    const category = this.categories.find((entry) => entry.name === (row.category_name ?? ""));
                    let item = this.items.find((entry) => entry.item_no.toLowerCase() === itemNo.toLowerCase());
                    const itemStatus = itemStatuses.get(itemNo.toLowerCase());

                    if (!item) {
                        item = {
                            id: Math.max(0, ...this.items.map((entry) => entry.id)) + 1,
                            item_no: itemNo,
                            brand_id: brand?.id ?? null,
                            category_id: category?.id ?? null,
                            parent_asin: row.parent_asin ?? "",
                            memo: row.item_memo ?? "",
                            is_active: itemStatus !== "inactive",
                            created_at: timestamp,
                            updated_at: timestamp,
                            skus: [],
                        };
                        this.items.push(item);
                        result.created_items += 1;
                    } else if (!touchedItemIds.has(item.id)) {
                        item.brand_id = brand?.id ?? item.brand_id;
                        item.category_id = category?.id ?? item.category_id;
                        item.parent_asin = row.parent_asin ?? "";
                        item.memo = row.item_memo ?? "";
                        if (itemStatus !== undefined) item.is_active = itemStatus === "active";
                        item.updated_at = timestamp;
                        result.updated_items += 1;
                    }
                    touchedItemIds.add(item.id);

                    const skuCode = row.sku_code ?? "";
                    const existing = item.skus.find((sku) => sku.sku_code.toLowerCase() === skuCode.toLowerCase());
                    if (existing) {
                        existing.child_asin = row.child_asin ?? "";
                        existing.tq_item_no = row.tq_item_no ?? "";
                        existing.tq_color_no = row.tq_color_no ?? "";
                        existing.tq_size = row.tq_size ?? "";
                        existing.memo = row.sku_memo ?? "";
                        if (row.sku_status === "active" || row.sku_status === "inactive") existing.is_active = row.sku_status === "active";
                        existing.updated_at = timestamp;
                        result.updated_skus += 1;
                    } else {
                        item.skus.push({
                            id: Math.max(0, ...this.allSkus.map((sku) => sku.id)) + 1,
                            item_id: item.id,
                            sku_code: skuCode,
                            child_asin: row.child_asin ?? "",
                            tq_item_no: row.tq_item_no ?? "",
                            tq_color_no: row.tq_color_no ?? "",
                            tq_size: row.tq_size ?? "",
                            memo: row.sku_memo ?? "",
                            is_active: row.sku_status !== "inactive",
                            sort_order: item.skus.length + 1,
                            created_at: timestamp,
                            updated_at: timestamp,
                        });
                        result.created_skus += 1;
                    }
                });
            } catch (error) {
                // 取込中にエラーが発生した場合はファイル全体の更新を取り消す（§5.3）
                this.items = snapshot;
                throw error;
            }

            return result;
        },
    },
});
