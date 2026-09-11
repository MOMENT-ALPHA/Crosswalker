import { mount } from "@vue/test-utils";
import { expect, it } from "vitest";
import ApiReferenceView from "@/views/ApiReferenceView.vue";

it("外部APIの全エンドポイントと共通仕様を表示する", () => {
    const wrapper = mount(ApiReferenceView, {
        global: {
            stubs: { AppIcon: true },
        },
    });

    const text = wrapper.text();
    for (const path of ["/api/v1/items/lookup", "/api/v1/items", "/api/v1/items/{item_no}", "/api/v1/skus/{sku_code}", "/api/v1/asins/{asin}", "/api/v1/tq-skus"]) {
        expect(text).toContain(path);
    }
    expect(text).toContain("Authorization: Bearer " + "$" + "{API_KEY}");
    expect(text).toContain("毎分120回");
    expect(text).toContain("tq_size");
});

it("全エンドポイントのレスポンス例がJSONとして読め、共通定義を参照できる", () => {
    const wrapper = mount(ApiReferenceView, { global: { stubs: { AppIcon: true } } });
    const examples = wrapper
        .findAll("pre:not([data-request-example]) code")
        .slice(1)
        .map((block) => JSON.parse(block.text()));
    expect(examples).toHaveLength(8);
    const [list, item, sku, asin, tq, batch, invalid, missing] = examples;
    expect(list.data).toEqual([item.item]);
    expect(asin.data).toEqual([item.item]);
    expect(sku.sku).toEqual(item.item.skus[0]);
    expect(tq).toEqual(sku);
    expect(batch.data).toEqual([item.item]);
    expect(sku.sku.tq_color_no).toBe("01");
    expect(item.item.name).toBeNull();
    expect(sku.sku.child_asin).toBeNull();
    expect(list.links.next).toBeNull();
    expect(list.meta.total).toBe(1);
    expect(list.meta.path).toBe(`${window.location.origin}/api/v1/items`);
    expect(invalid.errors.per_page).toHaveLength(1);
    expect(missing).toEqual({ message: "対象データが見つかりません。" });
    const text = wrapper.text();
    for (const key of Object.keys(item.item)) expect(text).toContain(key);
    for (const key of Object.keys(sku.sku)) expect(text).toContain(key);
    for (const key of Object.keys(list.meta)) expect(text).toContain(`meta.${key}`);
    expect(text).toContain("meta.links[].active");
    expect(text).toContain("errors");
    expect(text).not.toContain("curl");
});

it("複数品番取得をエンドポイント一覧に含め、入力仕様とリクエスト例を表示する", () => {
    const wrapper = mount(ApiReferenceView);
    const endpoints = wrapper.get('section[aria-labelledby="endpoint-heading"]');
    expect(endpoints.text()).toContain("/api/v1/items/lookup");
    expect(endpoints.text()).toContain("JSONボディ");
    expect(endpoints.text()).toContain("1〜100件");
    expect(JSON.parse(endpoints.get("pre[data-request-example] code").text())).toEqual({ item_nos: ["00001", "00002"] });
});
