import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { http, resetCsrf } from "@/utils/http";
import { useAuthStore } from "@/stores/auth";
import { useCatalogStore } from "@/stores/catalog";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import App from "@/App.vue";
import { useUiStore } from "@/stores/ui";
import router from "@/router";

beforeEach(() => {
    setActivePinia(createPinia());
    resetCsrf();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

it("画面遷移で共通APIを再取得せず、設定画面ではマスタを更新する", async () => {
    const get = vi.spyOn(http, "get").mockImplementation(async (url) => {
        if (url === "/me") return { data: { user: { login_id: "admin" } } };
        if (url === "/csrf") return { data: { token: "session-token" } };
        if (url === "/items") return { data: { data: [], meta: { total: 0, last_page: 1, current_page: 1 } } };
        if (url === "/api-settings") return { data: { data: { enabled: false, allowed_sources: [] } } };
        if (url === "/masters/brands" || url === "/masters/categories") return { data: { data: [] } };
        throw new Error(`Unexpected request: ${url}`);
    });
    await router.push("/items");
    await router.push("/items/new");
    await router.push("/csv-import");
    await router.push("/items");
    const count = (url: string) => get.mock.calls.filter(([path]) => path === url).length;
    for (const url of ["/me", "/csrf", "/masters/brands", "/masters/categories"]) expect(count(url)).toBe(1);
    expect(count("/items")).toBe(2);
    await router.push("/settings");
    expect(count("/masters/brands")).toBe(2);
    expect(count("/masters/categories")).toBe(2);
    expect(count("/me")).toBe(1);
    expect(count("/csrf")).toBe(1);
    // ログアウト・セッション失効時と同様にリセットすると、次回は取得し直す。
    useAuthStore().$reset();
    useCatalogStore().$reset();
    resetCsrf();
    await router.push("/items");
    expect(count("/me")).toBe(2);
    expect(count("/csrf")).toBe(2);
    expect(count("/masters/brands")).toBe(3);
});

function prepareNavigation() {
    useAuthStore().$patch({ initialized: true, authenticated: true });
    useCatalogStore().mastersLoaded = true;
    http.defaults.headers.common["X-CSRF-TOKEN"] = "token";
}

function deferred() {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { promise, resolve, reject };
}

it("データ取得中はローディングを表示して操作を止め、完了後に解除する", async () => {
    prepareNavigation();
    await router.push("/csv-import");
    const pending = deferred();
    const fetch = vi.spyOn(useCatalogStore(), "fetchItems").mockReturnValue(pending.promise);
    const wrapper = mount(App, { global: { stubs: { RouterView: true, BaseToasts: true, AppIcon: true } } });
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    const navigation = router.push("/items?keyword=loading");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    await nextTick();
    expect(wrapper.get('[role="status"]').text()).toBe("読み込み中...");
    expect(wrapper.find("[inert]").exists()).toBe(true);
    pending.resolve();
    await navigation;
    await nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.find("[inert]").exists()).toBe(false);
    wrapper.unmount();
});

it("APIエラーでもローディングが残らない", async () => {
    prepareNavigation();
    await router.push("/csv-import");
    vi.spyOn(useCatalogStore(), "fetchItems").mockRejectedValue(new Error("network"));
    await router.push("/items?keyword=failed");
    expect(useUiStore().navigating).toBe(false);
    expect(useCatalogStore().loadError).not.toBe("");
});

it("品番一覧の検索条件更新中はローディングを表示して操作を止める", async () => {
    prepareNavigation();
    await router.push("/csv-import");
    const fetch = vi.spyOn(useCatalogStore(), "fetchItems").mockResolvedValue();
    await router.push("/items?keyword=before");
    fetch.mockClear();

    const pending = deferred();
    fetch.mockReturnValue(pending.promise);
    const wrapper = mount(App, { global: { stubs: { RouterView: true, BaseToasts: true, AppIcon: true } } });
    const navigation = router.push("/items?keyword=after");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await nextTick();
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    expect(wrapper.find("[inert]").exists()).toBe(true);
    expect(useUiStore().navigating).toBe(true);

    pending.resolve();
    await navigation;
    expect(useUiStore().navigating).toBe(false);
    wrapper.unmount();
});

it("ルートの読み込み自体に失敗した場合も表示を解除する", async () => {
    prepareNavigation();
    const removeRoute = router.addRoute({ path: "/loading-error", component: () => Promise.reject(new Error("chunk failed")) });
    try {
        await expect(router.push("/loading-error")).rejects.toThrow("chunk failed");
        expect(useUiStore().navigating).toBe(false);
    } finally {
        removeRoute();
    }
});
