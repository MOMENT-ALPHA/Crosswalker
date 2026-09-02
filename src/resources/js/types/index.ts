/**
 * Crosswalker フロントエンド型定義
 * 要件定義書 §2「データ要件」に対応する。
 * コード類（品番コード / SKUコード / ASIN / TQ各値）は先頭ゼロを保持するため、すべて文字列で扱う。
 */

export interface Brand {
    id: number;
    name: string;
}

export interface Category {
    id: number;
    name: string;
}

export interface Sku {
    id: number;
    item_id: number;
    sku_code: string;
    child_asin: string;
    tq_item_no: string;
    tq_color_no: string;
    tq_size: string;
    memo: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface Item {
    id: number;
    item_no: string;
    brand_id: number | null;
    category_id: number | null;
    parent_asin: string;
    memo: string;
    created_at: string;
    updated_at: string;
    skus: Sku[];
}

/** 一覧表示用に、ブランド名・カテゴリ名・SKU件数を解決した品番 */
export interface ItemListRow extends Item {
    brand_name: string;
    category_name: string;
    sku_count: number;
}

/** 登録・編集画面のSKU入力行 */
export interface SkuFormRow {
    /** 画面内でのみ有効な行キー（既存SKUの場合は id を保持） */
    key: string;
    id: number | null;
    sku_code: string;
    child_asin: string;
    tq_item_no: string;
    tq_color_no: string;
    tq_size: string;
    memo: string;
}

/** 登録・編集画面の品番入力値 */
export interface ItemFormValues {
    item_no: string;
    brand_id: number | null;
    category_id: number | null;
    parent_asin: string;
    memo: string;
    skus: SkuFormRow[];
}

/** 品番項目のエラー（項目名 → メッセージ） */
export type ItemFieldErrors = Partial<Record<keyof Omit<ItemFormValues, "skus">, string>>;

/** SKU行のエラー（行キー → 項目名 → メッセージ） */
export type SkuFieldErrors = Record<string, Partial<Record<keyof Omit<SkuFormRow, "key" | "id">, string>>>;

export interface ValidationResult {
    item: ItemFieldErrors;
    skus: SkuFieldErrors;
    /** 画面上部にまとめて出す全体エラー */
    global: string[];
}

export interface ItemSearchParams {
    keyword: string;
    brand_id: number | null;
    category_id: number | null;
    /** ダッシュボードからの遷移で使う絞り込み */
    filter: ItemQuickFilter;
    page: number;
}

export type ItemQuickFilter = "" | "no_parent_asin" | "no_child_asin";

/** CSV取込 */
export interface CsvRowError {
    line: number;
    column: string;
    message: string;
}

export interface CsvValidationSummary {
    file_name: string;
    total_rows: number;
    create_count: number;
    update_count: number;
    unchanged_count: number;
    error_count: number;
    errors: CsvRowError[];
    /** 行番号ごとの判定結果 */
    statuses: Record<number, CsvRowStatus>;
    /** 検証済みの行データ（取込実行で使用） */
    rows: CsvRow[];
}

export type CsvRow = Record<string, string> & { __line: number };

export type CsvRowStatus = "create" | "update" | "unchanged" | "error";

export interface CsvImportResult {
    created_items: number;
    updated_items: number;
    created_skus: number;
    updated_skus: number;
    unchanged: number;
    imported_at: string;
}

/** API接続設定 */
export interface ApiAllowedSource {
    id: number;
    value: string;
    kind: "ip" | "cidr";
    memo: string;
}

export interface ApiSettings {
    enabled: boolean;
    key_issued_at: string | null;
    key_masked: string | null;
    allowed_sources: ApiAllowedSource[];
}

export interface Toast {
    id: number;
    type: "success" | "error" | "info";
    message: string;
}

export interface SelectOption {
    value: string | number | null;
    label: string;
}
