import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            "@": new URL("./resources/js", import.meta.url).pathname,
            "@css": new URL("./resources/css", import.meta.url).pathname,
        },
    },
    test: {
        environment: "jsdom",
        include: ["resources/js/**/*.{test,spec}.{ts,js}"],
    },
});
