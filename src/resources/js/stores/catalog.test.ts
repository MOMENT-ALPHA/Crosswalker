import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useCatalogStore } from "@/stores/catalog";
import { CSV_HEADERS } from "@/utils/consts";
import { toCsvLine } from "@/utils/helper";

function csvRow(overrides: Record<string, string> = {}): string {
    const values: Record<string, string> = {
        item_no: "fisi-05",
        category_name: "老眼鏡",
        brand_name: "栞",
        parent_asin: "B09T32PVM5",
        item_status: "",
        sku_code: "fisi-05-1-10",
        child_asin: "B09EXAMPLE1",
        sku_status: "",
        tq_item_no: "FISI05",
        tq_color_no: "1",
        tq_size: "10",
        ...overrides,
    };
    return toCsvLine(CSV_HEADERS.map((header) => values[header] ?? ""));
}

describe("catalog status management", () => {
    beforeEach(() => setActivePinia(createPinia()));

    it("品番状態とSKU状態を個別に保持し、有効データだけを集計する", () => {
        const catalog = useCatalogStore();
        const item = catalog.items[0]!;
        const initialItemCount = catalog.stats.itemCount;
        const initialSkuCount = catalog.stats.skuCount;
        catalog.setSkuActive(item.id, item.skus[0]!.id, false);
        expect(catalog.stats.skuCount).toBe(initialSkuCount - 1);
        catalog.setItemActive(item.id, false);
        expect(catalog.stats.itemCount).toBe(initialItemCount - 1);
        expect(catalog.search({ keyword: "", brand_id: null, category_id: null, status: "active", filter: "", page: 1 }).rows).not.toContainEqual(expect.objectContaining({ id: item.id }));
        expect(catalog.search({ keyword: "", brand_id: null, category_id: null, status: "inactive", filter: "", page: 1 }).rows).toContainEqual(expect.objectContaining({ id: item.id }));
        catalog.setItemActive(item.id, true);
        expect(item.skus[0]!.is_active).toBe(false);
    });

    it("CSVから品番状態とSKU状態を更新する", () => {
        const catalog = useCatalogStore();
        const csv = [toCsvLine([...CSV_HEADERS]), csvRow({ item_status: "inactive", sku_status: "inactive" })].join("\n");
        const summary = catalog.validateCsv("status.csv", csv);
        expect(summary.error_count).toBe(0);
        expect(summary.statuses[2]).toBe("update");
        catalog.commitCsv(summary);
        expect(catalog.items[0]!.is_active).toBe(false);
        expect(catalog.items[0]!.skus[0]!.is_active).toBe(false);
    });

    it("同一品番の品番状態が矛盾するCSVを拒否する", () => {
        const catalog = useCatalogStore();
        const csv = [toCsvLine([...CSV_HEADERS]), csvRow({ item_status: "active" }), csvRow({ item_status: "inactive", sku_code: "fisi-05-1-15", child_asin: "B09EXAMPLE2", tq_size: "15" })].join(
            "\n",
        );
        const summary = catalog.validateCsv("conflict.csv", csv);
        expect(summary.error_count).toBeGreaterThan(0);
        expect(summary.errors).toContainEqual(expect.objectContaining({ column: "item_status" }));
    });
});
