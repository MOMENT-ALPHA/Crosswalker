import type { SelectOption, SkuFormRow } from "@/types";

/** ISO文字列を "YYYY/MM/DD HH:mm" 形式に整形する */
export function formatDateTime(value: string | null | undefined): string {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** ISO文字列を "YYYY/MM/DD" 形式に整形する */
export function formatDate(value: string | null | undefined): string {
    return formatDateTime(value).split(" ")[0] ?? "-";
}

/** 空文字・null・undefined を "-" に置き換えて表示する */
export function displayValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "-";
    const text = String(value).trim();
    return text === "" ? "-" : text;
}

/** 前後の空白を除去する（null安全） */
export function trimValue(value: string | null | undefined): string {
    return (value ?? "").trim();
}

/** 画面内でのみ使う一意キーを発行する */
let uidCounter = 0;
export function uid(prefix = "row"): string {
    uidCounter += 1;
    return `${prefix}-${Date.now().toString(36)}-${uidCounter}`;
}

/** 空のSKU入力行を生成する */
export function createEmptySkuRow(): SkuFormRow {
    return {
        key: uid("sku"),
        id: null,
        sku_code: "",
        child_asin: "",
        tq_item_no: "",
        tq_color_no: "",
        tq_size: "",
        memo: "",
    };
}

/** SKU入力行が未入力かどうか（複製時の判定などに使用） */
export function isEmptySkuRow(row: SkuFormRow): boolean {
    return [row.sku_code, row.child_asin, row.tq_item_no, row.tq_color_no, row.tq_size, row.memo].every((value) => trimValue(value) === "");
}

/** id/name の配列をセレクト用の選択肢に変換する */
export function toSelectOptions(list: { id: number; name: string }[]): SelectOption[] {
    return list.map((entry) => ({ value: entry.id, label: entry.name }));
}

/** 数値を3桁区切りで表示する */
export function formatNumber(value: number): string {
    return value.toLocaleString("ja-JP");
}

/** CSV1行分を組み立てる（区切り文字・引用符・改行をエスケープ） */
export function toCsvLine(values: (string | number)[]): string {
    return values
        .map((value) => {
            const text = String(value ?? "");
            return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(",");
}

/** CSVテキストを行 → セルの二次元配列に解析する（引用符・エスケープ対応） */
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    const source = text.replace(/^\uFEFF/, "");

    for (let index = 0; index < source.length; index += 1) {
        const char = source[index];

        if (quoted) {
            if (char === '"') {
                if (source[index + 1] === '"') {
                    cell += '"';
                    index += 1;
                } else {
                    quoted = false;
                }
            } else {
                cell += char;
            }
            continue;
        }

        if (char === '"') {
            quoted = true;
        } else if (char === ",") {
            row.push(cell);
            cell = "";
        } else if (char === "\n" || char === "\r") {
            if (char === "\r" && source[index + 1] === "\n") index += 1;
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
        } else {
            cell += char;
        }
    }

    if (cell !== "" || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }

    return rows.filter((entry) => entry.some((value) => value.trim() !== ""));
}

/** テキストをCSVファイルとしてダウンロードさせる（UTF-8 BOM付き） */
export function downloadCsv(fileName: string, content: string): void {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

/** IPv4 / IPv6 / CIDR の簡易判定 */
export function detectSourceKind(value: string): "ip" | "cidr" | null {
    const text = trimValue(value);
    if (text === "") return null;
    const ipv4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    const ipv6 = /^[0-9a-fA-F:]+$/;
    const [address, prefix] = text.split("/");

    const isIpv4 = ipv4.test(address);
    const isIpv6 = address.includes(":") && ipv6.test(address);
    if (!isIpv4 && !isIpv6) return null;

    if (prefix === undefined) return "ip";
    const length = Number(prefix);
    if (!/^\d+$/.test(prefix)) return null;
    if (isIpv4 && (length < 0 || length > 32)) return null;
    if (isIpv6 && (length < 0 || length > 128)) return null;
    return "cidr";
}

/** 現在時刻のISO文字列 */
export function nowIso(): string {
    return new Date().toISOString();
}
