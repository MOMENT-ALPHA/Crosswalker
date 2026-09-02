<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{ name: string; size?: number | string; filled?: boolean }>(), { size: 20, filled: false });

const iconNames: Record<string, string> = {
    dashboard: "dashboard",
    items: "inventory_2",
    csv: "csv",
    settings: "settings",
    search: "search",
    plus: "add",
    minus: "remove",
    edit: "edit",
    copy: "content_copy",
    trash: "delete",
    detail: "visibility",
    "chevron-left": "chevron_left",
    "chevron-right": "chevron_right",
    "chevron-down": "expand_more",
    "arrow-left": "arrow_back",
    "arrow-right": "arrow_forward",
    check: "check",
    close: "close",
    alert: "warning",
    info: "info",
    logout: "logout",
    menu: "menu",
    download: "download",
    upload: "upload",
    key: "key",
    refresh: "refresh",
    box: "inventory_2",
    tag: "sell",
    folder: "folder",
    user: "person",
    link: "link",
    file: "description",
};

const iconName = computed(() => iconNames[props.name] ?? "info");
const iconSize = computed(() => (typeof props.size === "number" ? `${props.size}px` : props.size));
</script>

<template>
    <span
        class="material-symbols-outlined shrink-0"
        :style="{
            fontSize: iconSize,
            fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
        }"
        aria-hidden="true"
        >{{ iconName }}</span
    >
</template>
