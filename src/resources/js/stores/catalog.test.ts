import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCatalogStore } from "@/stores/catalog";
import { http } from "@/utils/http";
import { createSeedItems } from "@/mock/data";
import type { CsvValidationSummary, ItemFormValues } from "@/types";

vi.mock("@/utils/http", () => ({ http: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), request: vi.fn() }, errorMessage: () => "保存できませんでした。" }));

describe("catalog API integration", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.resetAllMocks();
    });

    it("マスタの同時取得を共有し、変更結果をキャッシュに反映する", async () => {
        const catalog = useCatalogStore();
        vi.mocked(http.get).mockResolvedValue({ data: { data: [] } });
        await Promise.all([catalog.fetchMasters(() => false), catalog.fetchMasters()]);
        expect(http.get).toHaveBeenCalledTimes(2);
        vi.mocked(http.request).mockResolvedValue({ data: { data: { id: 1, name: "新ブランド", items_count: 0 } } });
        expect((await catalog.addBrand("新ブランド")).ok).toBe(true);
        await catalog.fetchMasters();
        expect(http.get).toHaveBeenCalledTimes(2);
        expect(catalog.brandName(1)).toBe("新ブランド");
    });

    it("マスタ取得失敗後は再試行し、明示的な更新で使用件数も更新する", async () => {
        const catalog = useCatalogStore();
        vi.mocked(http.get).mockRejectedValue(new Error("network"));
        await expect(catalog.fetchMasters()).rejects.toThrow("network");
        expect(catalog.mastersLoaded).toBe(false);
        vi.mocked(http.get).mockResolvedValue({ data: { data: [{ id: 1, name: "マスタ", items_count: 0 }] } });
        await catalog.fetchMasters();
        vi.mocked(http.get).mockResolvedValue({ data: { data: [{ id: 1, name: "マスタ", items_count: 2 }] } });
        await catalog.fetchMasters(() => true, true);
        expect(catalog.brandUsageCount(1)).toBe(2);
        expect(catalog.categoryUsageCount(1)).toBe(2);
    });

    it("品番状態とSKU状態をサーバーの保存結果で更新する", async () => {
        const catalog = useCatalogStore();
        const item = createSeedItems()[0]!;
        catalog.items = [item];
        const updated = { ...item, is_active: false, skus: item.skus.map((sku, index) => ({ ...sku, is_active: index !== 0 })) };
        vi.mocked(http.patch).mockResolvedValue({ data: { data: updated } });
        await catalog.setItemActive(item.id, false);
        expect(http.patch).toHaveBeenCalledWith(`/items/${item.id}/status`, { is_active: false });
        expect(catalog.items[0]?.is_active).toBe(false);
        expect(catalog.items[0]?.skus[0]?.is_active).toBe(false);
    });

    it("保存に失敗した場合は表示中の状態を変更しない", async () => {
        const catalog = useCatalogStore();
        catalog.items = [createSeedItems()[0]!];
        vi.mocked(http.patch).mockRejectedValue(new Error("network"));
        await expect(catalog.setItemActive(1, false)).rejects.toThrow("network");
        expect(catalog.items[0]?.is_active).toBe(true);
    });

    it("商品保存時に画面内のキーや削除済みメモを送信しない", async () => {
        const catalog = useCatalogStore();
        const item = createSeedItems()[0]!;
        const values: ItemFormValues = { ...item, skus: item.skus.map((sku) => ({ ...sku, key: `row-${sku.id}` })) };
        vi.mocked(http.post).mockResolvedValue({ data: { data: item } });
        await catalog.saveItem(values, null);
        const payload = vi.mocked(http.post).mock.calls[0]?.[1] as { skus: Record<string, unknown>[] };
        expect(payload.skus[0]).not.toHaveProperty("key");
        expect(payload.skus[0]).not.toHaveProperty("memo");
        expect(payload.skus[0]).not.toHaveProperty("item_id");
    });

    it("CSVはファイルとして検証し、取込時は検証IDだけを送信する", async () => {
        const catalog = useCatalogStore();
        const file = new File(["item_no,sku_code"], "status.csv", { type: "text/csv" });
        const summary = { validation_id: "server-token", error_count: 0, rows: [] } as unknown as CsvValidationSummary;
        vi.mocked(http.post)
            .mockResolvedValueOnce({ data: summary })
            .mockResolvedValueOnce({ data: { created_items: 1 } });
        expect(await catalog.validateCsv(file)).toEqual(summary);
        const upload = vi.mocked(http.post).mock.calls[0]?.[1] as FormData;
        expect(upload.get("file")).toBe(file);
        await catalog.commitCsv(summary);
        expect(http.post).toHaveBeenLastCalledWith("/csv/import", { validation_id: "server-token" });
    });

    it("CSVの矛盾はサーバーの行番号と項目を保持して画面に返す", async () => {
        const catalog = useCatalogStore();
        const summary = { error_count: 1, errors: [{ line: 3, column: "item_status", message: "同一品番の状態が矛盾しています。" }] };
        vi.mocked(http.post).mockResolvedValue({ data: summary });
        const result = await catalog.validateCsv(new File(["conflict"], "conflict.csv"));
        expect(result.errors).toEqual(summary.errors);
        expect(result.error_count).toBe(1);
    });

    it("マスタ削除が拒否された場合は一覧を保持して理由を返す", async () => {
        const catalog = useCatalogStore();
        catalog.brands = [{ id: 1, name: "栞" }];
        vi.mocked(http.request).mockRejectedValue(new Error("used"));
        expect(await catalog.deleteBrand(1)).toEqual({ ok: false, message: "保存できませんでした。" });
        expect(catalog.brands).toHaveLength(1);
    });

    it("画面遷移で不要になった検索結果は表示を上書きしない", async () => {
        const catalog = useCatalogStore();
        const current = createSeedItems()[0]!;
        catalog.items = [current];
        vi.mocked(http.get).mockResolvedValue({ data: { data: [], meta: { total: 0, last_page: 1, current_page: 1 } } });
        await catalog.fetchItems({ keyword: "old", brand_id: null, category_id: null, status: "active", filter: "", page: 1 }, () => false);
        expect(catalog.items).toEqual([current]);
        expect(catalog.lastSearch.keyword).toBe("");
    });
});
