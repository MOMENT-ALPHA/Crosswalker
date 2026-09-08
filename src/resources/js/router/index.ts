import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "@/layouts/AppLayout.vue";
import LoginView from "@/views/LoginView.vue";
import axios from "axios";
import { useCatalogStore } from "@/stores/catalog";
import { useUiStore } from "@/stores/ui";
import { csrf, errorMessage } from "@/utils/http";
import type { ItemSearchParams } from "@/types";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
    history: createWebHistory(),
    scrollBehavior: () => ({ top: 0 }),
    routes: [
        {
            path: "/login",
            name: "login",
            component: LoginView,
            meta: { title: "ログイン", screenId: "SCR-001", public: true },
        },
        {
            path: "/",
            component: AppLayout,
            children: [
                {
                    path: "",
                    name: "dashboard",
                    component: () => import("@/views/DashboardView.vue"),
                    meta: { title: "ダッシュボード", screenId: "SCR-002" },
                },
                {
                    path: "items",
                    name: "items",
                    component: () => import("@/views/ItemListView.vue"),
                    meta: { title: "品番一覧", screenId: "SCR-010" },
                },
                {
                    path: "items/new",
                    name: "item-create",
                    component: () => import("@/views/ItemFormView.vue"),
                    meta: { title: "品番登録", screenId: "SCR-012" },
                },
                {
                    path: "items/:id",
                    name: "item-detail",
                    component: () => import("@/views/ItemDetailView.vue"),
                    meta: { title: "品番詳細", screenId: "SCR-011" },
                },
                {
                    path: "items/:id/edit",
                    name: "item-edit",
                    component: () => import("@/views/ItemFormView.vue"),
                    meta: { title: "品番編集", screenId: "SCR-012" },
                },
                {
                    path: "csv-import",
                    name: "csv-import",
                    component: () => import("@/views/CsvImportView.vue"),
                    meta: { title: "CSV取込", screenId: "SCR-020" },
                },
                {
                    path: "settings",
                    name: "settings",
                    component: () => import("@/views/SettingsView.vue"),
                    meta: { title: "サイト設定", screenId: "SCR-030" },
                },
            ],
        },
        { path: "/:pathMatch(.*)*", redirect: { name: "dashboard" } },
    ],
});

let navigationVersion = 0;
router.beforeEach(async (to) => {
    const version = ++navigationVersion;
    const isCurrent = () => version === navigationVersion;
    const auth = useAuthStore();
    const catalog = useCatalogStore();
    catalog.loadError = "";
    catalog.clearIssuedApiKey();
    try {
        await auth.restore();
        if (!isCurrent()) return false;
        if (!to.meta.public && !auth.authenticated) {
            catalog.$reset();
            return { name: "login" };
        }
        if (to.name === "login" && auth.authenticated) return { name: "dashboard" };
        if (to.meta.public) return true;
        await csrf();
        if (!isCurrent()) return false;
        await catalog.fetchMasters(isCurrent);
        if (!isCurrent()) return false;
        if (to.name === "dashboard") await catalog.fetchDashboard(isCurrent);
        if (to.name === "items") {
            await catalog.fetchItems(
                {
                    keyword: String(to.query.keyword ?? ""),
                    brand_id: to.query.brand_id ? Number(to.query.brand_id) : null,
                    category_id: to.query.category_id ? Number(to.query.category_id) : null,
                    status: (["inactive", "all"].includes(String(to.query.status)) ? String(to.query.status) : "active") as ItemSearchParams["status"],
                    filter: String(to.query.filter ?? "") as ItemSearchParams["filter"],
                    page: Number(to.query.page ?? 1) || 1,
                },
                isCurrent,
            );
        }
        if (to.name === "item-detail" || to.name === "item-edit") {
            try {
                await catalog.fetchItem(Number(to.params.id), isCurrent);
            } catch (error) {
                if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error;
            }
        }
        if (to.name === "item-create") catalog.items = [];
        if (to.name === "settings") await catalog.fetchApiSettings(isCurrent);
    } catch (error) {
        if (!isCurrent()) return false;
        catalog.loadError = errorMessage(error);
        useUiStore().notify(catalog.loadError, "error");
    }
    return isCurrent();
});

router.afterEach((to) => {
    document.title = `${String(to.meta.title ?? "")} | Crosswalker`;
});

export default router;
