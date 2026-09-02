/** 画面全体で共有する定数 */

/** 品番一覧の1ページあたり表示件数 */
export const ITEMS_PER_PAGE = 10;

/** サイドバーのナビゲーション定義 */
export const NAV_ITEMS = [
    { name: "dashboard", label: "ダッシュボード", icon: "dashboard", screenId: "SCR-002" },
    { name: "items", label: "品番一覧", icon: "items", screenId: "SCR-010" },
    { name: "item-create", label: "品番登録", icon: "plus", screenId: "SCR-012" },
    { name: "csv-import", label: "CSV取込", icon: "csv", screenId: "SCR-020" },
    { name: "settings", label: "サイト設定", icon: "settings", screenId: "SCR-030" },
] as const;

/** CSVの列定義（要件定義書 §5.1） */
export const CSV_COLUMNS = [
    { key: "item_no", label: "品番コード", required: true },
    { key: "category_name", label: "カテゴリ名称", required: true },
    { key: "brand_name", label: "ブランド名称", required: true },
    { key: "parent_asin", label: "親ASIN", required: false },
    { key: "item_memo", label: "品番メモ", required: false },
    { key: "sku_code", label: "SKUコード", required: true },
    { key: "child_asin", label: "子ASIN", required: false },
    { key: "tq_item_no", label: "TQ品番", required: true },
    { key: "tq_color_no", label: "TQカラーNo", required: true },
    { key: "tq_size", label: "TQサイズ", required: true },
    { key: "sku_memo", label: "SKUメモ", required: false },
] as const;

export const CSV_HEADERS = CSV_COLUMNS.map((column) => column.key);

/** CSVテンプレートのサンプル行 */
export const CSV_TEMPLATE_SAMPLE = ["fisi-05", "老眼鏡", "栞", "B09T32PVM5", "定番モデル", "fisi-05-1-10", "B09EXAMPLE1", "FISI05", "1", "10", ""];

/** アップロード可能なCSVの最大サイズ（表示用） */
export const CSV_MAX_SIZE_MB = 5;

/** モック認証で受け付けるログインID / パスワード */
export const DEMO_LOGIN_ID = "admin";
export const DEMO_PASSWORD = "password";
