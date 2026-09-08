import { createApp } from "vue";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import { useAuthStore } from "@/stores/auth";
import { useCatalogStore } from "@/stores/catalog";
import App from "@/App.vue";
import router from "@/router";

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

createApp(App).use(pinia).use(router).mount("#app");

window.addEventListener("auth:expired", () => {
    useAuthStore().$reset();
    useCatalogStore().$reset();
    void router.push({ name: "login" });
});
