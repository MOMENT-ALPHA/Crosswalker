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
        errorMessage.value = "ログイン情報が間違っています。";
        password.value = "";
        return;
    }

    ui.notify("ログインしました。");
    router.push({ name: "dashboard" });
}
</script>

<template>
    <div class="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <div class="w-full max-w-sm">
            <div class="flex flex-col items-center text-center">
                <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
                    <AppIcon name="link" :size="24" />
                </span>
                <span class="mt-3 text-base font-semibold text-slate-900">Crosswalk</span>
                <span class="mt-1 text-xs text-slate-500">商品識別子管理システム</span>
            </div>

            <div class="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <BaseAlert v-if="errorMessage" tone="danger" class="mt-5">{{ errorMessage }}</BaseAlert>

                <form class="space-y-4" @submit.prevent="submit">
                    <BaseInput v-model="loginId" label="ログインID" placeholder="admin" required autocomplete="username" :error="fieldErrors.loginId" />
                    <BaseInput v-model="password" label="パスワード" type="password" placeholder="••••••••" required autocomplete="current-password" :error="fieldErrors.password" />
                    <BaseButton type="submit" variant="primary" block :loading="loading"> ログイン </BaseButton>
                </form>
            </div>

            <p class="mt-5 text-center text-[11.5px] text-slate-400">SUNREEVE CO., LTD.</p>
        </div>
    </div>
</template>
