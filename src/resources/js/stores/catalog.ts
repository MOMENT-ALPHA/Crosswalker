import { defineStore } from "pinia";
import { http, errorMessage } from "@/utils/http";
import { detectSourceKind, trimValue } from "@/utils/helper";
import type { ApiSettings, Brand, Category, CsvImportResult, CsvValidationSummary, Item, ItemFormValues, ItemListRow, ItemSearchParams, ValidationResult } from "@/types";

interface PageResult {
    rows: ItemListRow[];
    total: number;
    totalPages: number;
    page: number;
}
interface MasterResult {
    ok: boolean;
    message?: string;
    brand?: Brand;
    category?: Category;
}

function requestMasters() {
    return Promise.all([http.get<{ data: Brand[] }>("/masters/brands"), http.get<{ data: Category[] }>("/masters/categories")]);
}
const masterRequests = new WeakMap<object, ReturnType<typeof requestMasters>>();

export const useCatalogStore = defineStore("catalog", {
    state: () => ({
        mastersLoaded: false,
        brands: [] as Brand[],
        categories: [] as Category[],
        items: [] as Item[],
        stats: { itemCount: 0, skuCount: 0, noParentAsinCount: 0, noChildAsinCount: 0 },
        recentItems: [] as ItemListRow[],
        searchResult: { rows: [], total: 0, totalPages: 1, page: 1 } as PageResult,
        lastSearch: { keyword: "", brand_id: null, category_id: null, status: "active", filter: "", page: 1 } as ItemSearchParams,
        apiSettings: { enabled: false, key_issued_at: null, key_masked: null, allowed_sources: [] } as ApiSettings,
        issuedApiKey: null as string | null,
        loadError: "",
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
        allSkus: (state) => state.items.flatMap((item) => item.skus),
    },
    actions: {
        findItem(id: number): Item | undefined {
            return this.items.find((item) => item.id === id);
        },
        async fetchMasters(isCurrent: () => boolean = () => true, force = false): Promise<void> {
            if (this.mastersLoaded && !force) return;
            let pending = masterRequests.get(this);
            if (!pending) {
                pending = requestMasters().finally(() => masterRequests.delete(this));
                masterRequests.set(this, pending);
            }
            const [brands, categories] = await pending;
            if (!isCurrent()) return;
            this.brands = brands.data.data;
            this.categories = categories.data.data;
            this.mastersLoaded = true;
        },
        async fetchItems(params: ItemSearchParams, isCurrent: () => boolean = () => true): Promise<void> {
            const { data } = await http.get<{ data: ItemListRow[]; meta: { total: number; last_page: number; current_page: number } }>("/items", { params });
            if (!isCurrent()) return;
            this.lastSearch = { ...params };
            this.items = data.data;
            this.searchResult = { rows: data.data, total: data.meta.total, totalPages: data.meta.last_page, page: data.meta.current_page };
        },
        async fetchItem(id: number, isCurrent: () => boolean = () => true): Promise<void> {
            this.items = [];
            const { data } = await http.get<{ data: Item }>(`/items/${id}`);
            if (!isCurrent()) return;
            this.items = [data.data];
        },
        async fetchDashboard(isCurrent: () => boolean = () => true): Promise<void> {
            const { data } = await http.get<{ stats: { itemCount: number; skuCount: number; noParentAsinCount: number; noChildAsinCount: number }; recent_items: ItemListRow[] }>("/dashboard");
            if (!isCurrent()) return;
            this.stats = data.stats;
            this.recentItems = data.recent_items;
        },
        async fetchApiSettings(isCurrent: () => boolean = () => true): Promise<void> {
            const { data } = await http.get<{ data: ApiSettings }>("/api-settings");
            if (!isCurrent()) return;
            this.apiSettings = data.data;
        },
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
            const otherSkus = this.allSkus.filter((sku) => !editingSkuIds.has(sku.id) && sku.item_id !== editingId);

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

        async saveItem(values: ItemFormValues, editingId: number | null): Promise<Item> {
            const payload = {
                item_no: values.item_no,
                brand_id: values.brand_id,
                category_id: values.category_id,
                parent_asin: values.parent_asin || null,
                is_active: values.is_active,
                skus: values.skus.map((row) => ({
                    id: row.id,
                    sku_code: row.sku_code,
                    child_asin: row.child_asin || null,
                    tq_item_no: row.tq_item_no,
                    tq_color_no: row.tq_color_no,
                    tq_size: row.tq_size,
                    is_active: row.is_active,
                })),
            };
            const { data } = editingId === null ? await http.post<{ data: Item }>("/items", payload) : await http.put<{ data: Item }>(`/items/${editingId}`, payload);
            this.items = [data.data];
            return data.data;
        },
        async setItemActive(id: number, isActive: boolean): Promise<Item> {
            const { data } = await http.patch<{ data: Item }>(`/items/${id}/status`, { is_active: isActive });
            this.items = this.items.map((item) => (item.id === id ? data.data : item));
            return data.data;
        },
        async setSkuActive(itemId: number, skuId: number, isActive: boolean): Promise<Item> {
            const { data } = await http.patch<{ data: Item }>(`/items/${itemId}/skus/${skuId}/status`, { is_active: isActive });
            this.items = this.items.map((item) => (item.id === itemId ? data.data : item));
            return data.data;
        },
        async deleteItem(id: number): Promise<void> {
            await http.delete(`/items/${id}`);
            this.items = this.items.filter((item) => item.id !== id);
        },
        brandUsageCount(id: number): number {
            return this.brands.find((brand) => brand.id === id)?.items_count ?? 0;
        },
        categoryUsageCount(id: number): number {
            return this.categories.find((category) => category.id === id)?.items_count ?? 0;
        },
        async changeMaster(kind: "brands" | "categories", method: "post" | "put" | "delete", name: string, id?: number): Promise<MasterResult> {
            try {
                const response = await http.request<{ data: Brand | Category }>({ url: `/masters/${kind}${id === undefined ? "" : `/${id}`}`, method, data: { name } });
                const list = this[kind].filter((entry) => entry.id !== id);
                if (method !== "delete") list.push(response.data.data);
                this[kind] = list.sort((a, b) => a.name.localeCompare(b.name));
                return { ok: true, ...(kind === "brands" ? { brand: response.data?.data } : { category: response.data?.data }) };
            } catch (error) {
                return { ok: false, message: errorMessage(error) };
            }
        },
        async addBrand(name: string): Promise<MasterResult> {
            return this.changeMaster("brands", "post", name);
        },
        async updateBrand(id: number, name: string): Promise<MasterResult> {
            return this.changeMaster("brands", "put", name, id);
        },
        async deleteBrand(id: number): Promise<MasterResult> {
            return this.changeMaster("brands", "delete", "", id);
        },
        async addCategory(name: string): Promise<MasterResult> {
            return this.changeMaster("categories", "post", name);
        },
        async updateCategory(id: number, name: string): Promise<MasterResult> {
            return this.changeMaster("categories", "put", name, id);
        },
        async deleteCategory(id: number): Promise<MasterResult> {
            return this.changeMaster("categories", "delete", "", id);
        },
        async issueApiKey(): Promise<void> {
            this.issuedApiKey = null;
            const { data } = await http.post<{ key: string }>("/api-settings/key");
            this.issuedApiKey = data.key;
            this.apiSettings.key_masked = `cwk_live_••••••••••••${data.key.slice(-4)}`;
            this.apiSettings.key_issued_at = new Date().toISOString();
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

        async saveApiSettings(): Promise<void> {
            const { data } = await http.put<{ data: ApiSettings }>("/api-settings", {
                enabled: this.apiSettings.enabled,
                allowed_sources: this.apiSettings.allowed_sources.map(({ value, memo }) => ({ value, memo })),
            });
            this.apiSettings = data.data;
        },
        async validateCsv(file: File): Promise<CsvValidationSummary> {
            const form = new FormData();
            form.append("file", file);
            const { data } = await http.post<CsvValidationSummary>("/csv/validate", form);
            return data;
        },
        async commitCsv(summary: CsvValidationSummary): Promise<CsvImportResult> {
            const { data } = await http.post<CsvImportResult>("/csv/import", { validation_id: summary.validation_id });
            return data;
        },
    },
});
