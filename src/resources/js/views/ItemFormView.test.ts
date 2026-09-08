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
