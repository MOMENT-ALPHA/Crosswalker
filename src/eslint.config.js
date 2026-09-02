import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
    { ignores: ["node_modules", "public", "vendor", "storage"] },
    js.configs.recommended,
    tseslint.configs.recommended,
    pluginVue.configs["flat/recommended"],
    {
        // ブラウザ実行前提のフロントエンドコード
        languageOptions: {
            globals: {
                window: "readonly",
                document: "readonly",
                navigator: "readonly",
                localStorage: "readonly",
                URL: "readonly",
                Blob: "readonly",
                File: "readonly",
                FileReader: "readonly",
                Event: "readonly",
                DragEvent: "readonly",
                KeyboardEvent: "readonly",
                BeforeUnloadEvent: "readonly",
                HTMLElement: "readonly",
                HTMLInputElement: "readonly",
                HTMLSelectElement: "readonly",
                HTMLTextAreaElement: "readonly",
            },
        },
    },
    {
        files: ["**/*.vue"],
        languageOptions: {
            parserOptions: { parser: tseslint.parser },
        },
    },
    {
        rules: {
            "vue/multi-word-component-names": "off",
        },
    },
    prettier,
);
