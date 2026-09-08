import { defineStore } from "pinia";
import axios from "axios";
import { csrf, http } from "@/utils/http";

export const useAuthStore = defineStore("auth", {
    state: () => ({ loginId: "", authenticated: false }),
    actions: {
        async restore(): Promise<void> {
            try {
                const { data } = await http.get<{ user: { login_id: string } }>("/me");
                this.loginId = data.user.login_id;
                this.authenticated = true;
            } catch (error) {
                if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;
                this.$reset();
            }
        },
        async login(loginId: string, password: string): Promise<boolean> {
            await csrf();
            try {
                const { data } = await http.post<{ user: { login_id: string } }>("/login", { login_id: loginId.trim(), password });
                this.loginId = data.user.login_id;
                this.authenticated = true;
                await csrf();
                return true;
            } catch (error) {
                if (axios.isAxiosError(error) && error.response?.status === 401) return false;
                throw error;
            }
        },
        async logout(): Promise<void> {
            await http.post("/logout");
            this.$reset();
        },
    },
});
