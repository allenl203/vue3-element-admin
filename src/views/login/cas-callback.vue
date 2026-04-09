<template>
  <div class="cas-callback">
    <div class="cas-callback__card">
      <template v-if="state === 'loading'">
        <el-icon class="cas-callback__spinner" :size="48"><Loading /></el-icon>
        <p class="cas-callback__text">正在验证CAS身份...</p>
      </template>

      <template v-else-if="state === 'error'">
        <el-icon class="cas-callback__error-icon" :size="48"><CircleCloseFilled /></el-icon>
        <p class="cas-callback__text">{{ errorMessage }}</p>
        <el-button type="primary" @click="goToLogin">返回登录页</el-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import AuthAPI from "@/api/auth";
import { AuthStorage } from "@/utils/auth";
import { useUserStore } from "@/store";

defineOptions({ name: "CasCallback", inheritAttrs: false });

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

type CallbackState = "loading" | "error";
const state = ref<CallbackState>("loading");
const errorMessage = ref("");

onMounted(() => {
  handleCasCallback();
});

/**
 * 处理 CAS 认证回调
 *
 * 从 URL 读取 ticket 参数，构造 service 地址，
 * 调用后端 cas-login 接口换取 JWT token
 */
async function handleCasCallback() {
  const ticket = route.query.ticket as string | undefined;

  if (!ticket) {
    state.value = "error";
    errorMessage.value = "未收到CAS认证票据，请重新登录";
    return;
  }

  // 构造 service 地址：当前页面 URL，去掉 ticket 和 redirect 参数
  const serviceUrl = buildServiceUrl();

  try {
    const { accessToken, refreshToken } = await AuthAPI.casLogin({
      ticket,
      service: serviceUrl,
    });

    // CAS 登录默认不使用 rememberMe，token 存入 sessionStorage
    AuthStorage.setTokens(accessToken, refreshToken, false);

    // 跳转到目标页面
    const redirect = (route.query.redirect as string) || "/";
    await router.replace(decodeURIComponent(redirect));
  } catch (error: any) {
    state.value = "error";
    errorMessage.value = error?.message || "CAS认证失败，请重试或使用密码登录";
  }
}

/**
 * 构造 service 回调地址
 *
 * 取当前页面完整 URL，去掉 ticket 和 redirect 查询参数
 * service 必须与跳转 CAS 时使用的完全一致
 */
function buildServiceUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("ticket");
  url.searchParams.delete("redirect");
  return url.origin + url.pathname + url.search;
}

function goToLogin() {
  userStore.resetAllState();
  router.replace("/login");
}
</script>

<style lang="scss" scoped>
.cas-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f7ff;
}

.cas-callback__card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  padding: 3rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(22, 93, 255, 0.1);
}

.cas-callback__spinner {
  color: var(--el-color-primary);
  animation: spin 1s linear infinite;
}

.cas-callback__error-icon {
  color: var(--el-color-danger);
}

.cas-callback__text {
  margin: 0;
  font-size: 1rem;
  color: var(--el-text-color-regular);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
