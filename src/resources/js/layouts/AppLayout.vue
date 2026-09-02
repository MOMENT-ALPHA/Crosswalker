<script setup lang="ts">
import { RouterView } from "vue-router";
import AppHeader from "@/componets/AppHeader.vue";
import AppSidebar from "@/componets/AppSidebar.vue";
import { useUiStore } from "@/stores/ui";

const ui = useUiStore();
</script>

<template>
    <div class="flex min-h-screen bg-slate-50">
        <div class="hidden lg:block"><AppSidebar /></div>

        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" leave-active-class="transition duration-150" leave-to-class="opacity-0">
            <div v-if="ui.sidebarOpen" class="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" @click="ui.closeSidebar()"></div>
        </Transition>
        <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="-translate-x-full" leave-active-class="transition duration-150 ease-in" leave-to-class="-translate-x-full">
            <div v-if="ui.sidebarOpen" class="fixed inset-y-0 left-0 z-50 lg:hidden"><AppSidebar /></div>
        </Transition>

        <div class="flex min-w-0 flex-1 flex-col">
            <AppHeader />
            <main class="flex-1 px-4 py-6 lg:px-8 lg:py-8">
                <div class="mx-auto w-full max-w-[1400px]"><RouterView /></div>
            </main>
        </div>
    </div>
</template>
