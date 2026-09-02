import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "@/layouts/AppLayout.vue";
import LoginView from "@/views/LoginView.vue";
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

router.beforeEach((to) => {
    const auth = useAuthStore();
    if (!to.meta.public && !auth.authenticated) return { name: "login" };
    if (to.name === "login" && auth.authenticated) return { name: "dashboard" };
    return true;
});

router.afterEach((to) => {
    document.title = `${String(to.meta.title ?? "")} | CROSSWALK`;
});

export default router;
