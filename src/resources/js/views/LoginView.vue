<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "@/componets/AppIcon.vue";
import BaseAlert from "@/componets/ui/BaseAlert.vue";
import BaseButton from "@/componets/ui/BaseButton.vue";
import BaseInput from "@/componets/ui/BaseInput.vue";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";
import { DEMO_LOGIN_ID, DEMO_PASSWORD } from "@/utils/consts";

const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();

const loginId = ref("");
const password = ref("");
const errorMessage = ref("");
const fieldErrors = ref<{ loginId: string; password: string }>({ loginId: "", password: "" });
const loading = ref(false);

async function submit() {
    fieldErrors.value = {
        loginId: loginId.value.trim() === "" ? "ログインIDを入力してください。" : "",
        password: password.value === "" ? "パスワードを入力してください。" : "",
    };
    errorMessage.value = "";
    if (fieldErrors.value.loginId || fieldErrors.value.password) return;

    loading.value = true;
    const ok = await auth.login(loginId.value, password.value);
    loading.value = false;

    if (!ok) {
        errorMessage.value = "ログインIDまたはパスワードが正しくありません。";
        password.value = "";
        return;
    }

    ui.notify("ログインしました。");
    router.push({ name: "dashboard" });
}
</script>

<template>
    <div class="grid min-h-screen bg-slate-50 lg:grid-cols-2">
        <div class="relative hidden overflow-hidden bg-slate-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
            <div class="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl"></div>
            <div class="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl"></div>

            <div class="relative flex items-center gap-3">
                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white"><AppIcon name="link" :size="22" /></span>
                <span>
                    <span class="block text-lg font-semibold tracking-[0.2em] text-white">CROSSWALK</span>
                    <span class="block text-xs text-slate-400">商品識別子管理システム</span>
                </span>
            </div>

            <div class="relative max-w-md">
                <h2 class="text-2xl leading-relaxed font-semibold text-white">品番を起点に、<br />SKU・ASIN・TQを1画面で。</h2>
                <p class="mt-4 text-sm leading-relaxed text-slate-400">品番・SKU・Amazon ASIN・TQ商品キーをまとめて登録し、Web画面と外部APIの双方から参照できます。</p>
                <dl class="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                    <div>
                        <dt class="text-[11px] text-slate-500">管理単位</dt>
                        <dd class="mt-1 text-sm font-medium text-slate-200">品番 / SKU</dd>
                    </div>
                    <div>
                        <dt class="text-[11px] text-slate-500">連携キー</dt>
                        <dd class="mt-1 text-sm font-medium text-slate-200">ASIN / TQ</dd>
                    </div>
                    <div>
                        <dt class="text-[11px] text-slate-500">外部参照</dt>
                        <dd class="mt-1 text-sm font-medium text-slate-200">JSON API</dd>
                    </div>
                </dl>
            </div>

            <p class="relative text-[11px] text-slate-600">SCR-001 ログイン画面</p>
        </div>

        <div class="flex items-center justify-center px-6 py-12">
            <div class="w-full max-w-sm">
                <div class="mb-8 flex items-center gap-3 lg:hidden">
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><AppIcon name="link" :size="22" /></span>
                    <span class="text-base font-semibold tracking-[0.2em] text-slate-900">CROSSWALK</span>
                </div>

                <h1 class="text-xl font-semibold text-slate-900">ログイン</h1>
                <p class="mt-1.5 text-sm text-slate-500">ログインIDとパスワードを入力してください。</p>

                <BaseAlert v-if="errorMessage" tone="danger" class="mt-6">{{ errorMessage }}</BaseAlert>

                <form class="mt-6 space-y-4" @submit.prevent="submit">
                    <BaseInput v-model="loginId" label="ログインID" placeholder="admin" required autocomplete="username" :error="fieldErrors.loginId" />
                    <BaseInput v-model="password" label="パスワード" type="password" placeholder="********" required autocomplete="current-password" :error="fieldErrors.password" />
                    <BaseButton type="submit" variant="primary" block :loading="loading">ログイン</BaseButton>
                </form>

                <div class="mt-6 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3">
                    <p class="text-[11px] font-semibold text-slate-500">UI確認用アカウント</p>
                    <p class="mt-1 font-mono text-xs text-slate-700">{{ DEMO_LOGIN_ID }} / {{ DEMO_PASSWORD }}</p>
                </div>
            </div>
        </div>
    </div>
</template>
