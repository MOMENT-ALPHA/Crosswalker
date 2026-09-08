import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { csrf, http, resetCsrf } from "@/utils/http";

beforeEach(() => resetCsrf());
afterEach(() => vi.restoreAllMocks());

it("CSRFの同時取得を共有し、通常は再利用、ログイン時は更新する", async () => {
    const get = vi
        .spyOn(http, "get")
        .mockResolvedValueOnce({ data: { token: "before-login" } })
        .mockResolvedValueOnce({ data: { token: "after-login" } });
    await Promise.all([csrf(), csrf()]);
    await csrf();
    expect(get).toHaveBeenCalledTimes(1);
    expect(http.defaults.headers.common["X-CSRF-TOKEN"]).toBe("before-login");
    await csrf(true);
    expect(get).toHaveBeenCalledTimes(2);
    expect(http.defaults.headers.common["X-CSRF-TOKEN"]).toBe("after-login");
});

it("失敗したCSRF取得は再試行できる", async () => {
    vi.spyOn(http, "get")
        .mockRejectedValueOnce(new Error("network"))
        .mockResolvedValueOnce({ data: { token: "retry" } });
    await expect(csrf()).rejects.toThrow("network");
    await csrf();
    expect(http.defaults.headers.common["X-CSRF-TOKEN"]).toBe("retry");
});

it("リセット前の遅い応答でトークンを上書きしない", async () => {
    let resolve!: (value: { data: { token: string } }) => void;
    vi.spyOn(http, "get")
        .mockImplementationOnce(
            () =>
                new Promise((done) => {
                    resolve = done;
                }),
        )
        .mockResolvedValueOnce({ data: { token: "new" } });
    const old = csrf();
    await csrf(true);
    resolve({ data: { token: "old" } });
    await old;
    expect(http.defaults.headers.common["X-CSRF-TOKEN"]).toBe("new");
});
