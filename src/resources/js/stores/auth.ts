import { defineStore } from "pinia";
import { DEMO_LOGIN_ID, DEMO_PASSWORD } from "@/utils/consts";

/**
 * モック認証ストア。
 * バックエンド接続時は login() をセッション認証APIの呼び出しに差し替える。
 */
export const useAuthStore = defineStore("auth", {
    state: () => ({
        loginId: "" as string,
        authenticated: false,
    }),
    actions: {
        async login(loginId: string, password: string): Promise<boolean> {
            await new Promise((resolve) => window.setTimeout(resolve, 400));
            if (loginId.trim() === DEMO_LOGIN_ID && password === DEMO_PASSWORD) {
                this.loginId = loginId.trim();
                this.authenticated = true;
                return true;
            }
            return false;
        },
        logout() {
            this.loginId = "";
            this.authenticated = false;
        },
    },
    persist: true,
});
