import type { Item, Sku } from "@/types";

export interface CatalogSearchMatch {
    item: Item;
    matchedSkuIds: Set<number>;
    itemMatched: boolean;
}

function includesKeyword(value: string, keyword: string): boolean {
    return value.toLocaleLowerCase().includes(keyword);
}

function skuMatches(sku: Sku, keyword: string): boolean {
    return [sku.sku_code, sku.child_asin, sku.tq_item_no, sku.tq_color_no, sku.tq_size].some((value) => includesKeyword(value, keyword));
}

/** 品番・ASIN・SKU・TQキーを横断し、品番単位に一致したSKUを返す。 */
export function searchCatalog(items: Item[], query: string): CatalogSearchMatch[] {
    const keyword = query.trim().toLocaleLowerCase();
    if (keyword === "") return [];

    return items.flatMap((item) => {
        const itemMatched = [item.item_no, item.parent_asin].some((value) => includesKeyword(value, keyword));
        const matchedSkuIds = new Set(item.skus.filter((sku) => skuMatches(sku, keyword)).map((sku) => sku.id));

        return itemMatched || matchedSkuIds.size > 0 ? [{ item, itemMatched, matchedSkuIds }] : [];
    });
}
