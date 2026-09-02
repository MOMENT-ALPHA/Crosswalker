<script setup lang="ts">
import { RouterLink, useRoute } from "vue-router";
import AppIcon from "@/componets/AppIcon.vue";
import { NAV_ITEMS } from "@/utils/consts";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";

const route = useRoute();
const auth = useAuthStore();
const ui = useUiStore();

/** 品番配下の画面ではサイドバーの「品番一覧」を選択状態にする */
function isActive(name: string): boolean {
    const current = String(route.name ?? "");
    if (name === "items") return current.startsWith("item") && current !== "item-create";
    return current === name;
}
</script>

<template>
    <aside class="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-600">
        <div class="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
            <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white"><AppIcon name="link" :size="18" /></span>
            <span class="min-w-0">
                <span class="block text-sm font-semibold text-slate-900">Crosswalk</span>
                <span class="block truncate text-[10px] text-slate-400">商品識別子管理システム</span>
            </span>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto p-3">
            <RouterLink
                v-for="nav in NAV_ITEMS"
                :key="nav.name"
                :to="{ name: nav.name }"
                class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
                :class="isActive(nav.name) ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'"
                @click="ui.closeSidebar()"
            >
                <AppIcon :name="nav.icon" :size="18" :class="isActive(nav.name) ? 'text-primary-500' : 'text-slate-400 group-hover:text-slate-600'" />
                <span class="flex-1 font-medium">{{ nav.label }}</span>
                <span class="text-[10px] tracking-wider text-slate-300">{{ nav.screenId }}</span>
            </RouterLink>
        </nav>

        <div class="border-t border-slate-200 p-3">
            <div class="flex items-center gap-3 rounded-lg px-3 py-2.5">
                <span class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"><AppIcon name="person" :size="16" /></span>
                <span class="min-w-0 flex-1">
                    <span class="block truncate text-xs font-medium text-slate-900">{{ auth.loginId || "guest" }}</span>
                    <span class="block text-[10px] text-slate-400">ログイン中</span>
                </span>
            </div>
        </div>
    </aside>
</template>
