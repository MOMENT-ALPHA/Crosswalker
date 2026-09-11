/** 画面全体で共有する定数 */

/** 品番一覧の1ページあたり表示件数 */
export const ITEMS_PER_PAGE = 10;

/** サイドバーのナビゲーション定義 */
export const NAV_ITEMS = [
    { name: "dashboard", label: "ダッシュボード", icon: "dashboard" },
    { name: "items", label: "品番一覧", icon: "inventory_2" },
    { name: "csv-import", label: "CSV取込", icon: "csv" },
    { name: "api-reference", label: "APIリファレンス", icon: "api" },
    { name: "settings", label: "サイト設定", icon: "settings" },
] as const;

/** CSVの列定義（要件定義書 §5.1） */
export const CSV_COLUMNS = [
    { key: "item_no", label: "品番コード", required: true },
    { key: "category_name", label: "カテゴリ名称", required: true },
    { key: "brand_name", label: "ブランド名称", required: true },
    { key: "parent_asin", label: "親ASIN", required: false },
    { key: "item_status", label: "品番状態（1: 有効 / 0: 無効）", required: false },
    { key: "sku_code", label: "SKUコード", required: true },
    { key: "child_asin", label: "子ASIN", required: false },
    { key: "sku_status", label: "SKU状態（1: 有効 / 0: 無効）", required: false },
    { key: "tq_item_no", label: "TQ品番", required: true },
    { key: "tq_color_no", label: "TQカラーNo", required: true },
    { key: "tq_size", label: "TQサイズ", required: false },
] as const;

export const CSV_HEADERS = CSV_COLUMNS.map((column) => column.key);

/** CSVテンプレートのサンプル行 */
export const CSV_TEMPLATE_SAMPLE = ["fisi-05", "老眼鏡", "栞", "B09T32PVM5", "1", "fisi-05-1-10", "B09EXAMPLE1", "1", "FISI05", "1", "10"];

/** アップロード可能なCSVの最大サイズ（表示用） */
export const CSV_MAX_SIZE_MB = 5;
