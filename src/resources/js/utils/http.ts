import axios from "axios";

export const http = axios.create({ baseURL: "/api/admin", headers: { Accept: "application/json" }, timeout: 120000 });

let csrfRequest: Promise<void> | undefined;
let csrfVersion = 0;

export function resetCsrf(): void {
    csrfVersion++;
    csrfRequest = undefined;
    delete http.defaults.headers.common["X-CSRF-TOKEN"];
}

export async function csrf(force = false): Promise<void> {
    if (force) resetCsrf();
    if (http.defaults.headers.common["X-CSRF-TOKEN"]) return;
    if (!csrfRequest) {
        const version = csrfVersion;
        csrfRequest = http
            .get<{ token: string }>("/csrf")
            .then(({ data }) => {
                if (version === csrfVersion) http.defaults.headers.common["X-CSRF-TOKEN"] = data.token;
            })
            .finally(() => {
                if (version === csrfVersion) csrfRequest = undefined;
            });
    }
    await csrfRequest;
}

export function apiErrors(error: unknown): Record<string, string[]> {
    return axios.isAxiosError(error) ? (error.response?.data?.errors ?? {}) : {};
}

export function errorMessage(error: unknown): string {
    const first = Object.values(apiErrors(error))[0]?.[0];
    if (first) return first;
    if (axios.isAxiosError(error)) {
        if (error.response?.status === 419) return "セッションの有効期限が切れました。画面を再読み込みしてください。";
        return error.response?.data?.message ?? "サーバーに接続できません。時間をおいて再度お試しください。";
    }
    return "処理に失敗しました。再度お試しください。";
}

http.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (axios.isAxiosError(error) && [401, 419].includes(error.response?.status ?? 0)) resetCsrf();
        if (axios.isAxiosError(error) && error.response?.status === 401 && !["/login", "/me"].includes(error.config?.url ?? "")) {
            window.dispatchEvent(new Event("auth:expired"));
        }
        return Promise.reject(error);
    },
);

export async function downloadFromApi(path: string, filename: string): Promise<void> {
    const { data } = await http.get<Blob>(path, { responseType: "blob" });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
