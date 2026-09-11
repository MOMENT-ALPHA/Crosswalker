import { afterEach, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import ItemListView from "@/views/ItemListView.vue";
import { useUiStore } from "@/stores/ui";
import * as http from "@/utils/http";

let wrapper: VueWrapper | undefined;
afterEach(() => {
    wrapper?.unmount();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

async function setup() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/items", name: "items", component: ItemListView },
            { path: "/items/create", name: "item-create", component: { template: "<div />" } },
        ],
    });
    await router.push("/items?keyword=001%26A&brand_id=2&category_id=3&status=all&filter=no_child_asin&page=2");
    wrapper = mount(ItemListView, { attachTo: document.body, global: { plugins: [pinia, router] } });
    return { wrapper, router, exportButton: wrapper.get('button[title="検索結果の全SKUをCSV取込形式で出力"]') };
}

it("検索条件を引き継ぎページ指定なしでCSVを出力し、処理中は連打を防ぐ", async () => {
    let finish!: () => void;
    const download = vi.spyOn(http, "downloadFromApi").mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    const { exportButton: button } = await setup();
    await button.trigger("click");
    expect(download).toHaveBeenCalledWith("/items/export?keyword=001%26A&brand_id=2&category_id=3&status=all&filter=no_child_asin", "crosswalker_items.csv");
    expect(button.attributes("disabled")).toBeDefined();
    await button.trigger("click");
    expect(download).toHaveBeenCalledTimes(1);
    finish();
    await flushPromises();
    expect(button.attributes("disabled")).toBeUndefined();
});

it("CSV出力が失敗した場合は通知して再試行できる", async () => {
    vi.spyOn(http, "downloadFromApi").mockRejectedValue(new Error("network"));
    const { exportButton: button } = await setup();
    const notify = vi.spyOn(useUiStore(), "notify");
    await button.trigger("click");
    await flushPromises();
    expect(notify).toHaveBeenCalledWith("処理に失敗しました。再度お試しください。", "error");
    expect(button.attributes("disabled")).toBeUndefined();
});

it("入力しただけでは検索せず、検索ボタンで条件を反映する", async () => {
    const { wrapper, router } = await setup();
    vi.useFakeTimers();
    const input = wrapper.get('input[placeholder="ASIN、TQ品番、SKUなどを入力"]');

    await input.setValue("draft-keyword");
    await vi.advanceTimersByTimeAsync(500);
    expect(router.currentRoute.value.query.keyword).toBe("001&A");

    vi.useRealTimers();
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(router.currentRoute.value.query.keyword).toBe("draft-keyword");
});

it("検索中に入力を続けても完了時に入力内容とフォーカスを巻き戻さない", async () => {
    const { wrapper, router } = await setup();
    let release!: () => void;
    const removeGuard = router.beforeEach((to, from) => {
        if (from.name === "items" && to.query.keyword === "submitted") {
            return new Promise<boolean>((resolve) => {
                release = () => resolve(true);
            });
        }
        return true;
    });
    const input = wrapper.get('input[placeholder="ASIN、TQ品番、SKUなどを入力"]');

    await input.setValue("submitted");
    await wrapper.get("form").trigger("submit");
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    await input.setValue("continued-input");
    (input.element as HTMLInputElement).focus();
    release();
    await flushPromises();

    expect((input.element as HTMLInputElement).value).toBe("continued-input");
    expect(document.activeElement).toBe(input.element);
    removeGuard();
});
