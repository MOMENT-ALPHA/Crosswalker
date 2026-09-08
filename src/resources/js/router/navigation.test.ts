import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { http, resetCsrf } from "@/utils/http";
import { useAuthStore } from "@/stores/auth";
import { useCatalogStore } from "@/stores/catalog";
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
