import { defineStore } from "pinia";
import type { Toast } from "@/types";

/** トーストとサイドバー開閉など、画面共通のUI状態 */
export const useUiStore = defineStore("ui", {
    state: () => ({
        toasts: [] as Toast[],
        sidebarOpen: false,
        nextToastId: 1,
    }),
    actions: {
        notify(message: string, type: Toast["type"] = "success") {
            const id = this.nextToastId++;
            this.toasts.push({ id, type, message });
            window.setTimeout(() => this.dismiss(id), 4000);
        },
        dismiss(id: number) {
            this.toasts = this.toasts.filter((toast) => toast.id !== id);
        },
        toggleSidebar() {
            this.sidebarOpen = !this.sidebarOpen;
        },
        closeSidebar() {
            this.sidebarOpen = false;
        },
    },
});
