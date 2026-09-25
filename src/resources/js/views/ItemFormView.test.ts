import { afterEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import ItemFormView from "@/views/ItemFormView.vue";
import { useCatalogStore } from "@/stores/catalog";
import { createSeedItems, seedBrands, seedCategories } from "@/mock/data";
import { http } from "@/utils/http";

let wrapper: VueWrapper | undefined;
afterEach(() => {
    wrapper?.unmount();
    vi.restoreAllMocks();
});

async function setup() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const catalog = useCatalogStore();
    catalog.items = [createSeedItems()[0]!];
    catalog.brands = seedBrands;
    catalog.categories = seedCategories;
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/items/:id/edit", name: "item-edit", component: ItemFormView },
            { path: "/items/:id", name: "item-detail", component: { template: "<div>詳細</div>" } },
            { path: "/items", name: "items", component: { template: "<div>一覧</div>" } },
        ],
    });
    await router.push("/items/1/edit");
    wrapper = mount({ template: "<router-view />" }, { global: { plugins: [pinia, router] } });
    await flushPromises();
    return { wrapper, router, catalog };
}

describe("品番編集画面のAPI保存", () => {
    it("ドラッグアンドドロップでSKUを並び替える", async () => {
        const { wrapper } = await setup();
        const dataTransfer = { effectAllowed: "", dropEffect: "", setData: vi.fn(), setDragImage: vi.fn() };

        const handles = wrapper.findAll<HTMLButtonElement>('button[draggable="true"]');
        expect(handles).toHaveLength(4);
        await handles[0]!.trigger("dragstart", { dataTransfer, clientX: 0, clientY: 0 });
        expect(dataTransfer.setDragImage).toHaveBeenCalledWith(expect.objectContaining({ tagName: "DIV" }), 0, 0);
        expect(document.body.classList.contains("sku-reordering")).toBe(true);
        const windowDragOver = new globalThis.Event("dragover", { cancelable: true });
        Object.defineProperty(windowDragOver, "dataTransfer", { value: dataTransfer });
        dataTransfer.dropEffect = "";
        window.dispatchEvent(windowDragOver);
        expect(windowDragOver.defaultPrevented).toBe(true);
        expect(dataTransfer.dropEffect).toBe("move");
        await wrapper.findAll(".sku-row")[1]!.trigger("dragover", { clientY: 1, dataTransfer });

        const skuInputs = wrapper.findAll<HTMLInputElement>('input[placeholder="fisi-05-1-10"]');
        expect(skuInputs.map((input) => input.element.value)).toEqual(["fisi-05-1-15", "fisi-05-1-10", "fisi-05-2-10", "fisi-05-2-15"]);
        expect(document.body.classList.contains("sku-reordering")).toBe(true);
        const dropTarget = wrapper.findAll(".sku-row")[1]!;
        await dropTarget.trigger("drop", { dataTransfer });

        expect(document.body.classList.contains("sku-reordering")).toBe(false);
        expect(skuInputs.map((input) => input.element.value)).toEqual(["fisi-05-1-15", "fisi-05-1-10", "fisi-05-2-10", "fisi-05-2-15"]);
        const dragOverAfterDrop = new globalThis.Event("dragover", { cancelable: true });
        window.dispatchEvent(dragOverAfterDrop);
        expect(dragOverAfterDrop.defaultPrevented).toBe(false);
    });

    it("上下ボタンでSKUを並び替え、変更後の順番で保存する", async () => {
        const { wrapper, catalog } = await setup();
        const item = catalog.items[0]!;
        vi.spyOn(http, "put").mockResolvedValue({ data: { data: item } });

        expect(wrapper.get('button[aria-label="1行目のSKUを上へ移動"]').attributes("disabled")).toBeDefined();
        expect(wrapper.get('button[aria-label="4行目のSKUを下へ移動"]').attributes("disabled")).toBeDefined();
        await wrapper.get('button[aria-label="1行目のSKUを下へ移動"]').trigger("click");

        const skuInputs = wrapper.findAll<HTMLInputElement>('input[placeholder="fisi-05-1-10"]');
        expect(skuInputs.map((input) => input.element.value)).toEqual(["fisi-05-1-15", "fisi-05-1-10", "fisi-05-2-10", "fisi-05-2-15"]);

        await wrapper.get("form").trigger("submit");
        await flushPromises();

        const payload = vi.mocked(http.put).mock.calls[0]?.[1] as { skus: { id: number }[] };
        expect(payload.skus.map((sku) => sku.id)).toEqual([item.skus[1]!.id, item.skus[0]!.id, item.skus[2]!.id, item.skus[3]!.id]);
    });

    it("サーバーのSKUエラーを該当行に表示し入力内容を保持する", async () => {
        const { wrapper, router } = await setup();
        vi.spyOn(http, "put").mockRejectedValue({ isAxiosError: true, response: { status: 422, data: { errors: { "skus.0.tq_size": ["TQキーが既に登録されています。"] } } } });
        await wrapper.get('input[placeholder="fisi-05"]').setValue("edited-item");
        await wrapper.get("form").trigger("submit");
        await flushPromises();

        expect(wrapper.text()).toContain("TQキーが既に登録されています。");
        expect((wrapper.get('input[placeholder="fisi-05"]').element as HTMLInputElement).value).toBe("edited-item");
        expect(router.currentRoute.value.name).toBe("item-edit");
        expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeUndefined();
    });

    it("保存完了後にサーバーの品番IDで詳細画面へ移動する", async () => {
        const { wrapper, router, catalog } = await setup();
        vi.spyOn(http, "put").mockResolvedValue({ data: { data: catalog.items[0] } });
        await wrapper.get("form").trigger("submit");
        await flushPromises();

        expect(router.currentRoute.value.name).toBe("item-detail");
        expect(router.currentRoute.value.params.id).toBe("1");
        expect(http.put).toHaveBeenCalledTimes(1);
    });
});
