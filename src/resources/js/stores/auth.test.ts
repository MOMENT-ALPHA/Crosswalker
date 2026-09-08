import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { http, csrf } from "@/utils/http";
vi.mock("@/utils/http", () => ({ http: { get: vi.fn(), post: vi.fn() }, csrf: vi.fn(), resetCsrf: vi.fn() }));

describe("session authentication", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.resetAllMocks();
        localStorage.clear();
    });
    it("ローカル保存のログイン情報を信用せずサーバーで復元する", async () => {
        localStorage.setItem("auth", JSON.stringify({ authenticated: true, loginId: "admin" }));
        const auth = useAuthStore();
        expect(auth.authenticated).toBe(false);
        vi.mocked(http.get).mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
        await auth.restore();
        expect(auth.authenticated).toBe(false);
    });
    it("CSRFを取得してログインしサーバーでログアウトする", async () => {
        const auth = useAuthStore();
        vi.mocked(http.post)
            .mockResolvedValueOnce({ data: { user: { login_id: "operator" } } })
            .mockResolvedValueOnce({});
        expect(await auth.login(" operator ", "secret")).toBe(true);
        expect(csrf).toHaveBeenCalledTimes(2);
        expect(http.post).toHaveBeenCalledWith("/login", { login_id: "operator", password: "secret" });
        expect(auth.loginId).toBe("operator");
        await auth.logout();
        expect(http.post).toHaveBeenLastCalledWith("/logout");
        expect(auth.authenticated).toBe(false);
    });
    it("認証復元は同時リクエストを共有し、成功後は再取得しない", async () => {
        vi.mocked(http.get).mockResolvedValue({ data: { user: { login_id: "admin" } } });
        const auth = useAuthStore();
        await Promise.all([auth.restore(), auth.restore()]);
        await auth.restore();
        expect(http.get).toHaveBeenCalledTimes(1);
        expect(auth.authenticated).toBe(true);
    });
    it("認証復元の通信失敗はキャッシュせず再試行する", async () => {
        vi.mocked(http.get)
            .mockRejectedValueOnce(new Error("network"))
            .mockResolvedValueOnce({ data: { user: { login_id: "admin" } } });
        const auth = useAuthStore();
        await expect(auth.restore()).rejects.toThrow("network");
        await auth.restore();
        expect(auth.authenticated).toBe(true);
    });
    it("通信障害は認証失敗と区別して呼び出し元に返す", async () => {
        vi.mocked(http.post).mockRejectedValue(new Error("network"));
        await expect(useAuthStore().login("operator", "secret")).rejects.toThrow("network");
    });
});
