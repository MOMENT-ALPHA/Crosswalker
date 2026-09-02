import { describe, expect, it } from "vitest";
import { createSeedItems } from "@/mock/data";
import { searchCatalog } from "@/utils/catalogSearch";

describe("searchCatalog", () => {
    const items = createSeedItems();

    it("SKUコードに一致したSKUを品番単位で返す", () => {
        const results = searchCatalog(items, "fisi-05-1-10");

        expect(results).toHaveLength(1);
        expect(results[0]?.item.item_no).toBe("fisi-05");
        expect(results[0]?.matchedSkuIds).toEqual(new Set([1]));
        expect(results[0]?.itemMatched).toBe(false);
    });

    it("子ASINとTQ品番を大文字小文字を区別せず検索する", () => {
        expect(searchCatalog(items, "b09example4")[0]?.matchedSkuIds).toEqual(new Set([5]));
        expect(searchCatalog(items, " fisi06 ")[0]?.matchedSkuIds).toEqual(new Set([5, 6]));
    });

    it("親ASINに一致した品番はSKU一致なしでも返す", () => {
        const results = searchCatalog(items, "B08LOUPE02");

        expect(results).toHaveLength(1);
        expect(results[0]?.item.item_no).toBe("lpd-102");
        expect(results[0]?.itemMatched).toBe(true);
        expect(results[0]?.matchedSkuIds.size).toBe(0);
    });

    it("空文字では結果を返さない", () => {
        expect(searchCatalog(items, "   ")).toEqual([]);
    });
});
