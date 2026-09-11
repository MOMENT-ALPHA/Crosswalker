<script setup lang="ts">
import BaseBadge from "@/componets/ui/BaseBadge.vue";
import BaseCard from "@/componets/ui/BaseCard.vue";

const baseUrl = `${window.location.origin}/api/v1`;
const skuExample = {
    sku_code: "fisi-05-1-10",
    child_asin: null,
    status: "active",
    tq_item_no: "FISI05",
    tq_color_no: "01",
    tq_size: "10",
};
const itemExample = {
    item_no: "fisi-05",
    name: null,
    brand: "栞",
    category: "老眼鏡",
    parent_asin: "B09T32PVM5",
    status: "active",
    skus: [skuExample],
    updated_at: "2026-09-02T00:00:00.000000Z",
};
function collectionExample(path: string) {
    const url = `${baseUrl}${path}`;
    return {
        data: [itemExample],
        links: { first: `${url}?page=1`, last: `${url}?page=1`, prev: null, next: null },
        meta: {
            current_page: 1,
            from: 1,
            last_page: 1,
            links: [
                { url: null, label: "&laquo; Previous", page: null, active: false },
                { url: `${url}?page=1`, label: "1", page: 1, active: true },
                { url: null, label: "Next &raquo;", page: null, active: false },
            ],
            path: url,
            per_page: 10,
            to: 1,
            total: 1,
        },
    };
}
const responseExamples = [collectionExample("/items"), { item: itemExample }, { item: itemExample, sku: skuExample }, collectionExample("/asins/B09T32PVM5"), { item: itemExample, sku: skuExample }];
</script>

<template>
    <div class="min-w-0 space-y-5">
        <BaseCard title="外部参照API" description="商品識別子を外部システムから参照するJSON APIです。">
            <p class="text-sm leading-6 text-slate-600">すべてのエンドポイントでAPIキーと許可済みの接続元IPが必要です。本番環境ではHTTPSで接続してください。</p>
            <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p class="text-xs font-medium text-slate-500">ベースURL</p>
                <code class="mt-1 block break-all text-sm font-semibold text-primary-700">{{ baseUrl }}</code>
            </div>
        </BaseCard>

        <BaseCard title="共通仕様">
            <p class="text-sm leading-6 text-slate-600"
                >レスポンスのContent-Typeはapplication/jsonです。以下のJSON例は架空のデータです。品番コード、SKUコード、ASIN、TQの値は文字列で返し、先頭のゼロを保持します。未設定の商品名称・ASINはnull、サイズなしのtq_sizeは空文字です。</p
            >
            <pre class="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700"><code>Authorization: Bearer &#36;{API_KEY}
Accept: application/json</code></pre>
            <p class="mt-3 text-sm leading-6 text-slate-600"
                >API_KEYにはサイト設定で発行したキーを指定します。複数品番取得はPOSTメソッドでJSONボディを指定し、それ以外はGETメソッドでリクエストボディはありません。パス・クエリの値はURLエンコードしてください。一覧のstatus以外では有効状態による除外は行わず、所属SKUは無効なものも含めて返します。</p
            >
        </BaseCard>

        <section aria-labelledby="endpoint-heading" class="space-y-4">
            <div>
                <h2 id="endpoint-heading" class="text-lg font-semibold text-slate-900">エンドポイント</h2>
            </div>

            <BaseCard>
                <div class="flex flex-wrap items-center gap-2">
                    <BaseBadge tone="success" mono>GET</BaseBadge>
                    <code class="break-all text-sm font-semibold text-slate-900">/api/v1/items</code>
                </div>
                <h3 class="mt-3 font-semibold text-slate-900">品番一覧を検索</h3>
                <p class="mt-1 text-sm leading-6 text-slate-600"
                    >品番と所属SKUを検索し、更新日時の新しい順にページ単位で返します。同じ更新日時では内部IDの降順です。条件を省略した場合は、有効な品番を10件ずつ取得します。該当なし・ページ範囲外は200でdataが空配列になります。</p
                >

                <div class="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                    <table class="w-full min-w-160 text-left text-sm">
                        <thead class="bg-slate-50 text-xs text-slate-500"
                            ><tr><th class="px-3 py-2 font-medium">パラメータ</th><th class="px-3 py-2 font-medium">必須</th><th class="px-3 py-2 font-medium">説明</th></tr></thead
                        >
                        <tbody class="divide-y divide-slate-100">
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">keyword</td><td class="px-3 py-2"><BaseBadge>任意</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">品番、親ASIN、SKU、子ASIN、TQの商品キーを大文字小文字を区別せず部分一致で検索。string、最大255文字</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">brand_id</td><td class="px-3 py-2"><BaseBadge>任意</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">ブランドID（1以上の整数）</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">category_id</td><td class="px-3 py-2"><BaseBadge>任意</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">カテゴリID（1以上の整数）</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">status</td><td class="px-3 py-2"><BaseBadge>任意</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">active、inactive、all。初期値はactive</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">filter</td><td class="px-3 py-2"><BaseBadge>任意</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">no_parent_asin（親ASIN未設定）または no_child_asin（子ASIN未設定の有効なSKUを持つ品番）</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">page</td><td class="px-3 py-2"><BaseBadge>任意</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">ページ番号（1以上の整数）。初期値は1</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">per_page</td><td class="px-3 py-2"><BaseBadge>任意</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">1ページの件数（1〜100）。初期値は10</td></tr
                            >
                        </tbody>
                    </table>
                </div>

                <h4 class="mt-5 text-sm font-semibold text-slate-900">レスポンス例（200 OK）</h4>
                <pre
                    class="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700"
                ><code>{{ JSON.stringify(responseExamples[0], null, 2) }}</code></pre>
                <p class="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600"
                    ><strong class="text-slate-700">レスポンス:</strong> dataに品番の配列、linksにページリンク、metaに現在ページや総件数などのページ情報を返します。</p
                >
            </BaseCard>

            <BaseCard>
                <div class="flex flex-wrap items-center gap-2"
                    ><BaseBadge tone="success" mono>GET</BaseBadge><code class="break-all text-sm font-semibold text-slate-900">/api/v1/items/{item_no}</code></div
                >
                <h3 class="mt-3 font-semibold text-slate-900">品番コードから取得</h3>
                <p class="mt-1 text-sm leading-6 text-slate-600">品番コードが一致する1件の品番と、その品番に所属するすべてのSKUを取得します。先頭のゼロを含め、文字列のまま指定してください。</p>
                <div class="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                    <table class="w-full min-w-130 text-left text-sm">
                        <thead class="bg-slate-50 text-xs text-slate-500"
                            ><tr
                                ><th class="px-3 py-2 font-medium">パラメータ</th><th class="px-3 py-2 font-medium">場所</th><th class="px-3 py-2 font-medium">必須</th
                                ><th class="px-3 py-2 font-medium">説明</th></tr
                            ></thead
                        >
                        <tbody
                            ><tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">item_no</td><td class="px-3 py-2 text-slate-600">パス</td
                                ><td class="px-3 py-2"><BaseBadge tone="warning">必須</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">string。取得する品番コード。例: fisi-05</td></tr
                            ></tbody
                        >
                    </table>
                </div>
                <h4 class="mt-5 text-sm font-semibold text-slate-900">レスポンス例（200 OK）</h4>
                <pre
                    class="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700"
                ><code>{{ JSON.stringify(responseExamples[1], null, 2) }}</code></pre>
                <p class="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600"
                    ><strong class="text-slate-700">レスポンス:</strong> item（object）に品番オブジェクトを返します。各キーは下の「品番」を参照。該当する品番がない場合は404です。</p
                >
            </BaseCard>

            <BaseCard>
                <div class="flex flex-wrap items-center gap-2"
                    ><BaseBadge tone="success" mono>GET</BaseBadge><code class="break-all text-sm font-semibold text-slate-900">/api/v1/skus/{sku_code}</code></div
                >
                <h3 class="mt-3 font-semibold text-slate-900">SKUコードから取得</h3>
                <p class="mt-1 text-sm leading-6 text-slate-600">SKUコードが一致するSKUと、そのSKUが所属する品番の情報を取得します。</p>
                <div class="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                    <table class="w-full min-w-130 text-left text-sm">
                        <thead class="bg-slate-50 text-xs text-slate-500"
                            ><tr
                                ><th class="px-3 py-2 font-medium">パラメータ</th><th class="px-3 py-2 font-medium">場所</th><th class="px-3 py-2 font-medium">必須</th
                                ><th class="px-3 py-2 font-medium">説明</th></tr
                            ></thead
                        >
                        <tbody
                            ><tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">sku_code</td><td class="px-3 py-2 text-slate-600">パス</td
                                ><td class="px-3 py-2"><BaseBadge tone="warning">必須</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">string。取得するSKUコード。例: fisi-05-1-10</td></tr
                            ></tbody
                        >
                    </table>
                </div>
                <h4 class="mt-5 text-sm font-semibold text-slate-900">レスポンス例（200 OK）</h4>
                <pre
                    class="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700"
                ><code>{{ JSON.stringify(responseExamples[2], null, 2) }}</code></pre>
                <p class="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600"
                    ><strong class="text-slate-700">レスポンス:</strong>
                    item（object）に全所属SKUを含む品番、sku（object）に一致した1件のSKUを返します。skuはitem.skus内の同じSKUと同じ内容です。各キーは下の「品番」「SKU」を参照。該当するSKUがない場合は404です。</p
                >
            </BaseCard>

            <BaseCard>
                <div class="flex flex-wrap items-center gap-2"
                    ><BaseBadge tone="success" mono>GET</BaseBadge><code class="break-all text-sm font-semibold text-slate-900">/api/v1/asins/{asin}</code></div
                >
                <h3 class="mt-3 font-semibold text-slate-900">ASINから取得</h3>
                <p class="mt-1 text-sm leading-6 text-slate-600"
                    >指定した値が親ASINまたは子ASINに一致する商品を検索し、内部IDの昇順で10件ずつページ単位で返します。子ASINで一致した場合も所属SKUをすべて返します。per_pageは指定できません。対象が存在していてページ範囲外の場合は200でdataが空配列になります。</p
                >
                <div class="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                    <table class="w-full min-w-130 text-left text-sm">
                        <thead class="bg-slate-50 text-xs text-slate-500"
                            ><tr
                                ><th class="px-3 py-2 font-medium">パラメータ</th><th class="px-3 py-2 font-medium">場所</th><th class="px-3 py-2 font-medium">必須</th
                                ><th class="px-3 py-2 font-medium">説明</th></tr
                            ></thead
                        >
                        <tbody class="divide-y divide-slate-100">
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">asin</td><td class="px-3 py-2 text-slate-600">パス</td
                                ><td class="px-3 py-2"><BaseBadge tone="warning">必須</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">string。親ASINまたは子ASIN。例: B09T32PVM5</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">page</td><td class="px-3 py-2 text-slate-600">クエリ</td><td class="px-3 py-2"><BaseBadge>任意</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">ページ番号（1以上の整数）。初期値は1</td></tr
                            >
                        </tbody>
                    </table>
                </div>
                <h4 class="mt-5 text-sm font-semibold text-slate-900">レスポンス例（200 OK）</h4>
                <pre
                    class="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700"
                ><code>{{ JSON.stringify(responseExamples[3], null, 2) }}</code></pre>
                <p class="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600"
                    ><strong class="text-slate-700">レスポンス:</strong> dataに一致した品番の配列、linksとmetaにページ情報を返します。一致する商品がない場合は404です。</p
                >
            </BaseCard>

            <BaseCard>
                <div class="flex flex-wrap items-center gap-2"><BaseBadge tone="success" mono>GET</BaseBadge><code class="break-all text-sm font-semibold text-slate-900">/api/v1/tq-skus</code></div>
                <h3 class="mt-3 font-semibold text-slate-900">TQの商品キーから取得</h3>
                <p class="mt-1 text-sm leading-6 text-slate-600"
                    >TQ品番、TQカラーNo、TQサイズの組み合わせに一致するSKUと、そのSKUが所属する品番を取得します。サイズなしの商品ではtq_sizeを省略できます。</p
                >
                <div class="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                    <table class="w-full min-w-130 text-left text-sm">
                        <thead class="bg-slate-50 text-xs text-slate-500"
                            ><tr><th class="px-3 py-2 font-medium">パラメータ</th><th class="px-3 py-2 font-medium">必須</th><th class="px-3 py-2 font-medium">説明</th></tr></thead
                        >
                        <tbody class="divide-y divide-slate-100">
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">tq_item_no</td><td class="px-3 py-2"><BaseBadge tone="warning">必須</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">TQ品番（string、最大255文字）</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">tq_color_no</td><td class="px-3 py-2"><BaseBadge tone="warning">必須</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">TQカラーNo（string、最大255文字）。先頭のゼロを保持して指定</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">tq_size</td><td class="px-3 py-2"><BaseBadge>任意</BaseBadge></td
                                ><td class="px-3 py-2 text-slate-600">TQサイズ（string、最大255文字）。省略・空文字はサイズなしの商品に一致</td></tr
                            >
                        </tbody>
                    </table>
                </div>
                <h4 class="mt-5 text-sm font-semibold text-slate-900">レスポンス例（200 OK）</h4>
                <pre
                    class="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700"
                ><code>{{ JSON.stringify(responseExamples[4], null, 2) }}</code></pre>
                <p class="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600"
                    ><strong class="text-slate-700">レスポンス:</strong>
                    item（object）に全所属SKUを含む品番、sku（object）に一致した1件のSKUを返します。skuはitem.skus内の同じSKUと同じ内容です。各キーは下の「品番」「SKU」を参照。必須条件がない場合は400、一致するSKUがない場合は404です。</p
                >
            </BaseCard>
            <BaseCard>
                <div class="flex flex-wrap items-center gap-2">
                    <BaseBadge tone="success" mono>POST</BaseBadge>
                    <code class="break-all text-sm font-semibold text-slate-900">/api/v1/items/lookup</code>
                </div>
                <h3 class="mt-3 font-semibold text-slate-900">複数品番と所属SKUを一括取得</h3>
                <p class="mt-1 text-sm leading-6 text-slate-600"
                    >指定した品番に完全一致する品番と全所属SKUを、有効・無効を問わず取得します。重複指定は1件にまとめ、内部IDの昇順で返します。ページ分割はありません。</p
                >
                <div class="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                    <table class="w-full min-w-130 text-left text-sm">
                        <thead class="bg-slate-50 text-xs text-slate-500">
                            <tr
                                ><th scope="col" class="px-3 py-2 font-medium">パラメータ</th><th scope="col" class="px-3 py-2 font-medium">場所</th
                                ><th scope="col" class="px-3 py-2 font-medium">必須</th><th scope="col" class="px-3 py-2 font-medium">説明</th></tr
                            >
                        </thead>
                        <tbody
                            ><tr>
                                <td class="px-3 py-2 font-mono text-xs text-primary-700">item_nos</td>
                                <td class="px-3 py-2 text-slate-600">JSONボディ</td>
                                <td class="px-3 py-2"><BaseBadge tone="warning">必須</BaseBadge></td>
                                <td class="px-3 py-2 text-slate-600">string[]、1〜100件。各要素は空でない最大255文字の品番コード。先頭のゼロを保持して指定</td>
                            </tr></tbody
                        >
                    </table>
                </div>
                <h4 class="mt-5 text-sm font-semibold text-slate-900">リクエストボディ</h4>
                <p class="mt-1 text-sm leading-6 text-slate-600">Content-Type: application/json を指定してください。</p>
                <pre
                    data-request-example
                    class="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700"
                ><code>{{ JSON.stringify({ item_nos: ["00001", "00002"] }, null, 2) }}</code></pre>
                <h4 class="mt-5 text-sm font-semibold text-slate-900">レスポンス例（200 OK）</h4>
                <pre
                    class="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700"
                ><code>{{ JSON.stringify({ data: [itemExample] }, null, 2) }}</code></pre>
                <p class="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600"
                    ><strong class="text-slate-700">レスポンス:</strong>
                    data（array）に品番を格納します。各要素は単一品番取得のitemと同じ形式です。未登録品番は除外し、全件未登録でも200と空のdataを返します。入力不正は400です。</p
                >
            </BaseCard>
        </section>

        <BaseCard title="一覧レスポンスの構造" description="GET /items と GET /asins/{asin} に共通のキーです。">
            <p class="mb-3 text-sm leading-6 text-slate-600">ページ移動時はpageを変更し、検索条件とper_pageを再指定してください。返却URLにはそれらのクエリ条件が含まれません。</p>
            <div class="overflow-x-auto"
                ><table class="w-full min-w-160 text-left text-sm">
                    <thead class="bg-slate-50 text-xs text-slate-500"
                        ><tr><th scope="col" class="px-3 py-2">キー</th><th scope="col" class="px-3 py-2">型</th><th scope="col" class="px-3 py-2">説明</th></tr></thead
                    >
                    <tbody class="divide-y divide-slate-100">
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">data</td>
                            <td class="px-3 py-2 font-mono text-xs">object[]</td>
                            <td class="px-3 py-2 text-slate-600">このページの品番オブジェクトの配列。各要素の定義は下の「品番」を参照。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">links</td>
                            <td class="px-3 py-2 font-mono text-xs">object</td>
                            <td class="px-3 py-2 text-slate-600">ページ移動用URLを持つオブジェクト。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">links.first</td>
                            <td class="px-3 py-2 font-mono text-xs">string</td>
                            <td class="px-3 py-2 text-slate-600">最初のページのURL。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">links.last</td>
                            <td class="px-3 py-2 font-mono text-xs">string</td>
                            <td class="px-3 py-2 text-slate-600">最後のページのURL。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">links.prev</td>
                            <td class="px-3 py-2 font-mono text-xs">string | null</td>
                            <td class="px-3 py-2 text-slate-600">前のページのURL。前ページがない場合はnull。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">links.next</td>
                            <td class="px-3 py-2 font-mono text-xs">string | null</td>
                            <td class="px-3 py-2 text-slate-600">次のページのURL。次ページがない場合はnull。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta</td>
                            <td class="px-3 py-2 font-mono text-xs">object</td>
                            <td class="px-3 py-2 text-slate-600">件数と現在のページに関する情報。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta.current_page</td>
                            <td class="px-3 py-2 font-mono text-xs">integer</td>
                            <td class="px-3 py-2 text-slate-600">現在のページ番号（1始まり）。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta.from</td>
                            <td class="px-3 py-2 font-mono text-xs">integer | null</td>
                            <td class="px-3 py-2 text-slate-600">このページの先頭データの通し番号（1始まり）。空の場合はnull。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta.to</td>
                            <td class="px-3 py-2 font-mono text-xs">integer | null</td>
                            <td class="px-3 py-2 text-slate-600">このページの末尾データの通し番号。空の場合はnull。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta.last_page</td>
                            <td class="px-3 py-2 font-mono text-xs">integer</td>
                            <td class="px-3 py-2 text-slate-600">最終ページ番号。検索結果が0件でも1。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta.per_page</td>
                            <td class="px-3 py-2 font-mono text-xs">integer</td>
                            <td class="px-3 py-2 text-slate-600">1ページあたりの取得件数。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta.total</td>
                            <td class="px-3 py-2 font-mono text-xs">integer</td>
                            <td class="px-3 py-2 text-slate-600">検索条件に一致する品番の総件数。SKU件数ではありません。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta.path</td>
                            <td class="px-3 py-2 font-mono text-xs">string</td>
                            <td class="px-3 py-2 text-slate-600">クエリ文字列を含まないエンドポイントのURL。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta.links</td>
                            <td class="px-3 py-2 font-mono text-xs">object[]</td>
                            <td class="px-3 py-2 text-slate-600">前後・各ページへの表示用リンクの配列。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta.links[].url</td>
                            <td class="px-3 py-2 font-mono text-xs">string | null</td>
                            <td class="px-3 py-2 text-slate-600">リンク先URL。移動先がない場合はnull。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta.links[].label</td>
                            <td class="px-3 py-2 font-mono text-xs">string</td>
                            <td class="px-3 py-2 text-slate-600">ページ番号や前後への移動を表す表示ラベル。HTMLエンティティを含む場合があります。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta.links[].page</td>
                            <td class="px-3 py-2 font-mono text-xs">integer | null</td>
                            <td class="px-3 py-2 text-slate-600">移動先のページ番号。移動先がない場合はnull。省略記号の要素にはこのキーを含みません。</td>
                        </tr>
                        <tr>
                            <td class="px-3 py-2 font-mono text-xs text-primary-700">meta.links[].active</td>
                            <td class="px-3 py-2 font-mono text-xs">boolean</td>
                            <td class="px-3 py-2 text-slate-600">現在のページを示すリンクの場合はtrue。</td>
                        </tr>
                    </tbody>
                </table></div
            >
        </BaseCard>

        <BaseCard title="レスポンス項目" description="品番と、その中に含まれるSKUの共通項目です。" :padded="false">
            <section class="p-5">
                <h3 class="mb-3 text-sm font-semibold text-slate-900">品番</h3>
                <div class="overflow-x-auto">
                    <table class="w-full min-w-150 text-left text-sm">
                        <thead class="bg-slate-50 text-xs text-slate-500"
                            ><tr><th class="px-3 py-2 font-medium">項目</th><th class="px-3 py-2 font-medium">型</th><th class="px-3 py-2 font-medium">説明</th></tr></thead
                        >
                        <tbody class="divide-y divide-slate-100">
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">item_no</td><td class="px-3 py-2 font-mono text-xs text-slate-500">string</td
                                ><td class="px-3 py-2 text-slate-600">品番コード</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">name</td><td class="px-3 py-2 font-mono text-xs text-slate-500">string | null</td
                                ><td class="px-3 py-2 text-slate-600">商品名称。未設定の場合はnull。</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">brand</td><td class="px-3 py-2 font-mono text-xs text-slate-500">string</td
                                ><td class="px-3 py-2 text-slate-600">ブランド名称</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">category</td><td class="px-3 py-2 font-mono text-xs text-slate-500">string</td
                                ><td class="px-3 py-2 text-slate-600">カテゴリ名称</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">parent_asin</td><td class="px-3 py-2 font-mono text-xs text-slate-500">string | null</td
                                ><td class="px-3 py-2 text-slate-600">Amazonの親ASIN。未設定の場合はnull。</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">status</td><td class="px-3 py-2 font-mono text-xs text-slate-500">active | inactive</td
                                ><td class="px-3 py-2 text-slate-600">品番の有効状態。active（有効）またはinactive（無効）。</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">skus</td><td class="px-3 py-2 font-mono text-xs text-slate-500">array</td
                                ><td class="px-3 py-2 text-slate-600">下記SKUオブジェクトの配列。表示順、内部IDの昇順。</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">updated_at</td><td class="px-3 py-2 font-mono text-xs text-slate-500">string | null</td
                                ><td class="px-3 py-2 text-slate-600">UTCのISO 8601形式の品番更新日時（末尾Z）。未設定の場合はnull</td></tr
                            >
                        </tbody>
                    </table>
                </div>
            </section>
            <section class="border-t border-slate-200 p-5">
                <h3 class="mb-3 text-sm font-semibold text-slate-900">SKU</h3>
                <div class="overflow-x-auto">
                    <table class="w-full min-w-150 text-left text-sm">
                        <thead class="bg-slate-50 text-xs text-slate-500"
                            ><tr><th class="px-3 py-2 font-medium">項目</th><th class="px-3 py-2 font-medium">型</th><th class="px-3 py-2 font-medium">説明</th></tr></thead
                        >
                        <tbody class="divide-y divide-slate-100">
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">sku_code</td><td class="px-3 py-2 font-mono text-xs text-slate-500">string</td
                                ><td class="px-3 py-2 text-slate-600">SKUコード</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">child_asin</td><td class="px-3 py-2 font-mono text-xs text-slate-500">string | null</td
                                ><td class="px-3 py-2 text-slate-600">Amazonの子ASIN。未設定の場合はnull。</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">status</td><td class="px-3 py-2 font-mono text-xs text-slate-500">active | inactive</td
                                ><td class="px-3 py-2 text-slate-600">active（有効）またはinactive（無効）。品番が無効の場合はSKU個別の状態にかかわらずinactive</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">tq_item_no</td><td class="px-3 py-2 font-mono text-xs text-slate-500">string</td
                                ><td class="px-3 py-2 text-slate-600">TQ品番</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">tq_color_no</td><td class="px-3 py-2 font-mono text-xs text-slate-500">string</td
                                ><td class="px-3 py-2 text-slate-600">TQカラーNo</td></tr
                            >
                            <tr
                                ><td class="px-3 py-2 font-mono text-xs text-primary-700">tq_size</td><td class="px-3 py-2 font-mono text-xs text-slate-500">string</td
                                ><td class="px-3 py-2 text-slate-600">サイズなしは空文字</td></tr
                            >
                        </tbody>
                    </table>
                </div>
            </section>
        </BaseCard>

        <BaseCard title="エラーレスポンス" description="成功時のitem・sku・dataは含みません。">
            <p class="text-sm leading-6 text-slate-600"
                ><code>message</code
                >（string）はエラーの説明です。入力検証エラー（400）のみ、<code>errors</code>（object）にパラメータ名をキー、エラーメッセージの配列（string[]）を値として含めます。</p
            >
            <h3 class="mt-4 text-sm font-semibold">400：入力検証エラーの例</h3>
            <pre
                class="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700"
            ><code>{{ JSON.stringify({ message: "入力内容を確認してください。", errors: { per_page: ["The per page field must be between 1 and 100."] } }, null, 2) }}</code></pre>
            <p class="mt-2 text-sm text-slate-600">errors内のメッセージは言語設定により異なります。</p>
            <h3 class="mt-4 text-sm font-semibold">404：対象データなしの例</h3>
            <pre
                class="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-700"
            ><code>{{ JSON.stringify({ message: "対象データが見つかりません。" }, null, 2) }}</code></pre>
        </BaseCard>

        <BaseCard title="HTTPステータス" description="エラー時はmessageを持つJSONを返します。">
            <div class="overflow-x-auto">
                <table class="w-full min-w-140 text-left text-sm">
                    <tbody class="divide-y divide-slate-100">
                        <tr
                            ><td class="w-20 py-2.5 pr-4"><BaseBadge tone="success" mono>200</BaseBadge></td
                            ><td class="py-2.5 text-slate-600">取得成功</td></tr
                        >
                        <tr
                            ><td class="w-20 py-2.5 pr-4"><BaseBadge tone="warning" mono>400</BaseBadge></td
                            ><td class="py-2.5 text-slate-600">パラメータの不足または入力値のエラー</td></tr
                        >
                        <tr
                            ><td class="w-20 py-2.5 pr-4"><BaseBadge tone="warning" mono>401</BaseBadge></td
                            ><td class="py-2.5 text-slate-600">APIキーが未指定、または正しくない</td></tr
                        >
                        <tr
                            ><td class="w-20 py-2.5 pr-4"><BaseBadge tone="warning" mono>403</BaseBadge></td
                            ><td class="py-2.5 text-slate-600">外部APIが無効、接続元IPが未許可、または本番環境でHTTPSを使用していない</td></tr
                        >
                        <tr
                            ><td class="w-20 py-2.5 pr-4"><BaseBadge tone="warning" mono>404</BaseBadge></td
                            ><td class="py-2.5 text-slate-600">対象データが見つからない</td></tr
                        >
                        <tr
                            ><td class="w-20 py-2.5 pr-4"><BaseBadge tone="warning" mono>429</BaseBadge></td
                            ><td class="py-2.5 text-slate-600">同一接続元から毎分120回の利用上限を超過</td></tr
                        >
                        <tr
                            ><td class="w-20 py-2.5 pr-4"><BaseBadge tone="danger" mono>500</BaseBadge></td
                            ><td class="py-2.5 text-slate-600">サーバーエラー</td></tr
                        >
                    </tbody>
                </table>
            </div>
        </BaseCard>
    </div>
</template>
