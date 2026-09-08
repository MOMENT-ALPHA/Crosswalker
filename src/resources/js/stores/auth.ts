import { defineStore } from "pinia";
import axios from "axios";
import { csrf, http, resetCsrf } from "@/utils/http";

const restorations = new WeakMap<object, Promise<void>>();

export const useAuthStore = defineStore("auth", {
    state: () => ({ loginId: "", authenticated: false, initialized: false }),
    actions: {
        async restore(): Promise<void> {
            if (this.initialized) return;
            let pending = restorations.get(this);
            if (!pending) {
                pending = (async () => {
                    try {
                        const { data } = await http.get<{ user: { login_id: string } }>("/me");
                        this.loginId = data.user.login_id;
                        this.authenticated = true;
                    } catch (error) {
                        if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;
                        this.$reset();
                    }
                    this.initialized = true;
                })().finally(() => restorations.delete(this));
                restorations.set(this, pending);
            }
            await pending;
        },
        async login(loginId: string, password: string): Promise<boolean> {
            await csrf(true);
            try {
                const { data } = await http.post<{ user: { login_id: string } }>("/login", { login_id: loginId.trim(), password });
                this.loginId = data.user.login_id;
                this.authenticated = true;
                this.initialized = true;
                await csrf(true);
                return true;
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 401) return false;
                throw error;
            }
        },
        async logout(): Promise<void> {
            await http.post("/logout");
            this.$reset();
            resetCsrf();
        },
    },
});
