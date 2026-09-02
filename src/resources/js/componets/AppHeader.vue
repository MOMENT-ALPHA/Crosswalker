<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppIcon from "@/componets/AppIcon.vue";
import BaseButton from "@/componets/ui/BaseButton.vue";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();

const title = computed(() => String(route.meta.title ?? ""));
const screenId = computed(() => String(route.meta.screenId ?? ""));

function logout() {
    auth.logout();
    ui.notify("ログアウトしました。", "info");
    router.push({ name: "login" });
}
</script>

<template>
    <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
        <button type="button" class="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden" aria-label="メニュー" @click="ui.toggleSidebar()">
            <AppIcon name="menu" :size="20" />
        </button>

        <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
                <h1 class="truncate text-base font-semibold text-slate-900">{{ title }}</h1>
            </div>
        </div>

        <BaseButton variant="ghost" size="sm" icon="logout" @click="logout">ログアウト</BaseButton>
    </header>
</template>
