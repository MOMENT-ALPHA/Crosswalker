/**
 * UI確認用のモックデータ。
 * バックエンドAPI実装後は、この層をHTTPクライアント（axios）に差し替える。
 */
import type { ApiSettings, Brand, Category, Item, Sku } from "@/types";

export const seedBrands: Brand[] = [
    { id: 1, name: "栞" },
    { id: 2, name: "ルーペ堂" },
    { id: 3, name: "CLEARVIEW" },
    { id: 4, name: "AZURE" },
];

export const seedCategories: Category[] = [
    { id: 1, name: "老眼鏡" },
    { id: 2, name: "サングラス" },
    { id: 3, name: "ブルーライトカット" },
    { id: 4, name: "拡大鏡" },
    { id: 5, name: "メガネケース" },
];

interface SeedSku {
    sku_code: string;
    child_asin: string;
    tq_item_no: string;
    tq_color_no: string;
    tq_size: string;
    memo?: string;
}

interface SeedItem {
    item_no: string;
    brand_id: number;
    category_id: number;
    parent_asin: string;
    memo?: string;
    created_at: string;
    updated_at: string;
    skus: SeedSku[];
}

const seed: SeedItem[] = [
    {
        item_no: "fisi-05",
        brand_id: 1,
        category_id: 1,
        parent_asin: "B09T32PVM5",
        memo: "定番モデル。度数展開は+1.0〜+3.5。",
        created_at: "2026-04-02T10:12:00Z",
        updated_at: "2026-08-30T02:41:00Z",
        skus: [
            { sku_code: "fisi-05-1-10", child_asin: "B09EXAMPLE1", tq_item_no: "FISI05", tq_color_no: "1", tq_size: "10", memo: "ブラック +1.0" },
            { sku_code: "fisi-05-1-15", child_asin: "B09EXAMPLE2", tq_item_no: "FISI05", tq_color_no: "1", tq_size: "15", memo: "ブラック +1.5" },
            { sku_code: "fisi-05-2-10", child_asin: "B09EXAMPLE3", tq_item_no: "FISI05", tq_color_no: "2", tq_size: "10", memo: "ブラウン +1.0" },
            { sku_code: "fisi-05-2-15", child_asin: "", tq_item_no: "FISI05", tq_color_no: "2", tq_size: "15", memo: "ブラウン +1.5 / ASIN未取得" },
        ],
    },
    {
        item_no: "fisi-06",
        brand_id: 1,
        category_id: 1,
        parent_asin: "B09T32QM41",
        memo: "",
        created_at: "2026-04-11T04:20:00Z",
        updated_at: "2026-08-28T23:05:00Z",
        skus: [
            { sku_code: "fisi-06-1-20", child_asin: "B09EXAMPLE4", tq_item_no: "FISI06", tq_color_no: "1", tq_size: "20" },
            { sku_code: "fisi-06-1-25", child_asin: "B09EXAMPLE5", tq_item_no: "FISI06", tq_color_no: "1", tq_size: "25" },
        ],
    },
    {
        item_no: "fisi-07",
        brand_id: 1,
        category_id: 3,
        parent_asin: "",
        memo: "親ASIN申請中。",
        created_at: "2026-05-06T01:33:00Z",
        updated_at: "2026-08-27T08:12:00Z",
        skus: [
            { sku_code: "fisi-07-1-00", child_asin: "B0AEXAMPLE1", tq_item_no: "FISI07", tq_color_no: "1", tq_size: "00" },
            { sku_code: "fisi-07-2-00", child_asin: "", tq_item_no: "FISI07", tq_color_no: "2", tq_size: "00" },
            { sku_code: "fisi-07-3-00", child_asin: "", tq_item_no: "FISI07", tq_color_no: "3", tq_size: "00" },
        ],
    },
    {
        item_no: "lpd-101",
        brand_id: 2,
        category_id: 4,
        parent_asin: "B08LOUPE01",
        memo: "手持ちルーペ。倍率違いを色番で管理。",
        created_at: "2026-03-18T06:45:00Z",
        updated_at: "2026-08-26T11:58:00Z",
        skus: [
            { sku_code: "lpd-101-1-03", child_asin: "B08LOUPE11", tq_item_no: "LPD101", tq_color_no: "1", tq_size: "03", memo: "3倍" },
            { sku_code: "lpd-101-1-05", child_asin: "B08LOUPE12", tq_item_no: "LPD101", tq_color_no: "1", tq_size: "05", memo: "5倍" },
            { sku_code: "lpd-101-2-03", child_asin: "B08LOUPE13", tq_item_no: "LPD101", tq_color_no: "2", tq_size: "03" },
        ],
    },
    {
        item_no: "lpd-102",
        brand_id: 2,
        category_id: 4,
        parent_asin: "B08LOUPE02",
        memo: "",
        created_at: "2026-03-22T02:15:00Z",
        updated_at: "2026-08-21T05:30:00Z",
        skus: [{ sku_code: "lpd-102-1-08", child_asin: "B08LOUPE21", tq_item_no: "LPD102", tq_color_no: "1", tq_size: "08" }],
    },
    {
        item_no: "lpd-110",
        brand_id: 2,
        category_id: 5,
        parent_asin: "",
        memo: "ケース単品。",
        created_at: "2026-05-30T09:02:00Z",
        updated_at: "2026-08-20T14:44:00Z",
        skus: [
            { sku_code: "lpd-110-1-FF", child_asin: "", tq_item_no: "LPD110", tq_color_no: "1", tq_size: "FF" },
            { sku_code: "lpd-110-2-FF", child_asin: "", tq_item_no: "LPD110", tq_color_no: "2", tq_size: "FF" },
        ],
    },
    {
        item_no: "cv-2201",
        brand_id: 3,
        category_id: 3,
        parent_asin: "B07CVIEW01",
        memo: "PC用。UVカット率99%。",
        created_at: "2026-02-08T03:11:00Z",
        updated_at: "2026-08-19T01:20:00Z",
        skus: [
            { sku_code: "cv-2201-01-M", child_asin: "B07CVIEW11", tq_item_no: "CV2201", tq_color_no: "01", tq_size: "M" },
            { sku_code: "cv-2201-01-L", child_asin: "B07CVIEW12", tq_item_no: "CV2201", tq_color_no: "01", tq_size: "L" },
            { sku_code: "cv-2201-02-M", child_asin: "B07CVIEW13", tq_item_no: "CV2201", tq_color_no: "02", tq_size: "M" },
            { sku_code: "cv-2201-02-L", child_asin: "B07CVIEW14", tq_item_no: "CV2201", tq_color_no: "02", tq_size: "L" },
            { sku_code: "cv-2201-03-M", child_asin: "", tq_item_no: "CV2201", tq_color_no: "03", tq_size: "M", memo: "新色。ASIN登録待ち" },
        ],
    },
    {
        item_no: "cv-2202",
        brand_id: 3,
        category_id: 2,
        parent_asin: "B07CVIEW02",
        memo: "",
        created_at: "2026-02-19T07:40:00Z",
        updated_at: "2026-08-18T22:06:00Z",
        skus: [
            { sku_code: "cv-2202-01-F", child_asin: "B07CVIEW21", tq_item_no: "CV2202", tq_color_no: "01", tq_size: "F" },
            { sku_code: "cv-2202-02-F", child_asin: "B07CVIEW22", tq_item_no: "CV2202", tq_color_no: "02", tq_size: "F" },
        ],
    },
    {
        item_no: "cv-2210",
        brand_id: 3,
        category_id: 2,
        parent_asin: "",
        memo: "OEM案件。",
        created_at: "2026-06-12T05:55:00Z",
        updated_at: "2026-08-15T03:18:00Z",
        skus: [{ sku_code: "cv-2210-01-F", child_asin: "", tq_item_no: "CV2210", tq_color_no: "01", tq_size: "F" }],
    },
    {
        item_no: "az-0031",
        brand_id: 4,
        category_id: 2,
        parent_asin: "B0AZURE001",
        memo: "偏光レンズ。",
        created_at: "2026-01-15T08:25:00Z",
        updated_at: "2026-08-12T06:47:00Z",
        skus: [
            { sku_code: "az-0031-010-F", child_asin: "B0AZURE011", tq_item_no: "AZ0031", tq_color_no: "010", tq_size: "F" },
            { sku_code: "az-0031-020-F", child_asin: "B0AZURE012", tq_item_no: "AZ0031", tq_color_no: "020", tq_size: "F" },
            { sku_code: "az-0031-030-F", child_asin: "B0AZURE013", tq_item_no: "AZ0031", tq_color_no: "030", tq_size: "F" },
        ],
    },
    {
        item_no: "az-0032",
        brand_id: 4,
        category_id: 1,
        parent_asin: "B0AZURE002",
        memo: "",
        created_at: "2026-01-28T02:05:00Z",
        updated_at: "2026-08-08T09:34:00Z",
        skus: [
            { sku_code: "az-0032-010-10", child_asin: "B0AZURE021", tq_item_no: "AZ0032", tq_color_no: "010", tq_size: "10" },
            { sku_code: "az-0032-010-20", child_asin: "B0AZURE022", tq_item_no: "AZ0032", tq_color_no: "010", tq_size: "20" },
            { sku_code: "az-0032-010-30", child_asin: "B0AZURE023", tq_item_no: "AZ0032", tq_color_no: "010", tq_size: "30" },
            { sku_code: "az-0032-020-10", child_asin: "", tq_item_no: "AZ0032", tq_color_no: "020", tq_size: "10" },
        ],
    },
    {
        item_no: "az-0040",
        brand_id: 4,
        category_id: 5,
        parent_asin: "",
        memo: "ノベルティ用。",
        created_at: "2026-07-03T04:09:00Z",
        updated_at: "2026-08-05T12:22:00Z",
        skus: [{ sku_code: "az-0040-001-FF", child_asin: "", tq_item_no: "AZ0040", tq_color_no: "001", tq_size: "FF" }],
    },
    {
        item_no: "shiori-901",
        brand_id: 1,
        category_id: 4,
        parent_asin: "B09SHIORI01",
        memo: "スタンド型。",
        created_at: "2026-07-21T01:47:00Z",
        updated_at: "2026-08-02T07:15:00Z",
        skus: [
            { sku_code: "shiori-901-1-S", child_asin: "B09SHIORI11", tq_item_no: "SHIORI901", tq_color_no: "1", tq_size: "S" },
            { sku_code: "shiori-901-1-M", child_asin: "B09SHIORI12", tq_item_no: "SHIORI901", tq_color_no: "1", tq_size: "M" },
        ],
    },
    {
        item_no: "shiori-902",
        brand_id: 1,
        category_id: 3,
        parent_asin: "B09SHIORI02",
        memo: "",
        created_at: "2026-08-01T00:30:00Z",
        updated_at: "2026-08-01T00:30:00Z",
        skus: [
            { sku_code: "shiori-902-01-F", child_asin: "B09SHIORI21", tq_item_no: "SHIORI902", tq_color_no: "01", tq_size: "F" },
            { sku_code: "shiori-902-02-F", child_asin: "B09SHIORI22", tq_item_no: "SHIORI902", tq_color_no: "02", tq_size: "F" },
            { sku_code: "shiori-902-03-F", child_asin: "B09SHIORI23", tq_item_no: "SHIORI902", tq_color_no: "03", tq_size: "F" },
        ],
    },
];

/** シードデータからItem配列を生成する */
export function createSeedItems(): Item[] {
    let skuId = 0;

    return seed.map((entry, index) => {
        const itemId = index + 1;
        const skus: Sku[] = entry.skus.map((sku, skuIndex) => {
            skuId += 1;
            return {
                id: skuId,
                item_id: itemId,
                sku_code: sku.sku_code,
                child_asin: sku.child_asin,
                tq_item_no: sku.tq_item_no,
                tq_color_no: sku.tq_color_no,
                tq_size: sku.tq_size,
                memo: sku.memo ?? "",
                is_active: true,
                sort_order: skuIndex + 1,
                created_at: entry.created_at,
                updated_at: entry.updated_at,
            };
        });

        return {
            id: itemId,
            item_no: entry.item_no,
            brand_id: entry.brand_id,
            category_id: entry.category_id,
            parent_asin: entry.parent_asin,
            memo: entry.memo ?? "",
            is_active: true,
            created_at: entry.created_at,
            updated_at: entry.updated_at,
            skus,
        };
    });
}

export const seedApiSettings: ApiSettings = {
    enabled: true,
    key_issued_at: "2026-06-14T05:00:00Z",
    key_masked: "cwk_live_••••••••••••••••••••3f2a",
    allowed_sources: [
        { id: 1, value: "162.43.105.4", kind: "ip", memo: "XServer IP" },
        { id: 2, value: "203.0.113.24", kind: "ip", memo: "本社固定IP" },
        { id: 3, value: "198.51.100.0/24", kind: "cidr", memo: "倉庫システム" },
    ],
};
