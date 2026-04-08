# CAS SSO 登录集成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Vue 3 登录页中新增小米 CAS 单点登录入口，用户点击后跳转 CAS 认证，认证成功后回调前端换取 JWT token，与密码登录完全互不影响。

**Architecture:** 前后端分离的传统 CAS 接入方案。前端 Login.vue 新增 CAS 按钮，点击跳转 CAS 认证页；CAS 回调到独立的 CasCallback.vue 页面，前端拿到 ticket 后调后端 /api/v1/auth/cas-login 换取 JWT token。后端负责 ticket 验证和用户自动创建。

**Tech Stack:** Vue 3 (SFC `<script setup>`), TypeScript, Element Plus, Vue Router (hash mode), Pinia, Axios, vite-plugin-mock-dev-server

---

### Task 1: 添加 CAS 环境变量

**Files:**
- Modify: `.env.development`
- Modify: `.env.production`
- Modify: `types/env.d.ts`

- [ ] **Step 1: 在 `.env.development` 中添加 CAS 服务器地址**

在文件末尾添加：

```bash
# CAS 单点登录服务器地址（测试环境）
VITE_CAS_SERVER_URL=https://castest.mioffice.cn
```

- [ ] **Step 2: 在 `.env.production` 中添加 CAS 服务器地址**

在文件末尾添加：

```bash
# CAS 单点登录服务器地址（生产环境）
VITE_CAS_SERVER_URL=https://cas.mioffice.cn
```

- [ ] **Step 3: 在 `types/env.d.ts` 中声明新环境变量类型**

在 `ImportMetaEnv` 接口中添加：

```typescript
readonly VITE_CAS_SERVER_URL: string;
```

- [ ] **Step 4: 验证类型检查通过**

Run: `npx vue-tsc --noEmit` (或项目使用的类型检查命令)
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add .env.development .env.production types/env.d.ts
git commit -m "feat(cas): add CAS server URL environment variables"
```

---

### Task 2: 添加 CAS API 类型和方法

**Files:**
- Modify: `src/types/api/auth.ts`
- Modify: `src/api/auth.ts`

- [ ] **Step 1: 在 `src/types/api/auth.ts` 中添加 `CasLoginRequest` 类型**

在文件末尾添加（在 `CaptchaInfo` 接口之后）：

```typescript
/**
 * CAS 登录请求参数
 */
export interface CasLoginRequest {
  /** CAS 颁发的临时票据，30秒有效 */
  ticket: string;
  /** 回调地址，必须与跳转CAS时的service完全一致 */
  service: string;
}
```

- [ ] **Step 2: 在 `src/api/auth.ts` 中导入新类型**

修改 import 行，添加 `CasLoginRequest`：

```typescript
import type { LoginRequest, LoginResponse, CaptchaInfo, CasLoginRequest } from "@/types/api/auth";
```

- [ ] **Step 3: 在 `AuthAPI` 对象中添加 `casLogin` 方法**

在 `getCaptcha()` 方法之后、`export default AuthAPI` 之前添加：

```typescript
  /** CAS 单点登录接口 */
  casLogin(data: CasLoginRequest) {
    return request<any, LoginResponse>({
      url: `${AUTH_BASE_URL}/cas-login`,
      method: "post",
      data,
    });
  },
```

- [ ] **Step 4: 验证类型检查通过**

Run: `npx vue-tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add src/types/api/auth.ts src/api/auth.ts
git commit -m "feat(cas): add CasLoginRequest type and casLogin API method"
```

---

### Task 3: 添加 CAS 登录 Mock 端点

**Files:**
- Modify: `mock/auth.mock.ts`

- [ ] **Step 1: 在 `mock/auth.mock.ts` 中添加 CAS 登录 mock**

在 `auth/logout` mock 对象之后、数组结束之前，添加：

```typescript
  {
    url: "auth/cas-login",
    method: ["POST"],
    body: {
      code: "00000",
      data: {
        accessToken:
          "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImRlcHRJZCI6MSwiZGF0YVNjb3BlIjoxLCJ1c2VySWQiOjIsImlhdCI6MTcyODE5MzA1MiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9BRE1JTiJdLCJqdGkiOiJhZDg3NzlhZDZlYWY0OWY3OTE4M2ZmYmI5OWM4MjExMSJ9.58YHwL3sNNC22jyAmOZeSm-7MITzfHb_epBIz7LvWeA",
        tokenType: "Bearer",
        refreshToken:
          "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImRlcHRJZCI6MSwiZGF0YVNjb3BlIjoxLCJ1c2VySWQiOjIsImlhdCI6MTcyODE5MzA1MiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9BRE1JTiJdLCJqdGkiOiJhZDg3NzlhZDZlYWY0OWY3OTE4M2ZmYmI5OWM4MjExMSJ9.58YHwL3sNNC22jyAmOZeSm-7MITzfHb_epBIz7LvWeA",
        expiresIn: 7200,
      },
      msg: "一切ok",
    },
  },
```

- [ ] **Step 2: 启用 mock 验证**

临时修改 `.env.development` 中 `VITE_MOCK_DEV_SERVER=true`，运行项目验证 mock 端点可用。验证后改回 `false`。

- [ ] **Step 3: Commit**

```bash
git add mock/auth.mock.ts
git commit -m "feat(cas): add cas-login mock endpoint for development"
```

---

### Task 4: 注册 CAS 回调路由

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/router/guards/permission.ts`

- [ ] **Step 1: 在 `src/router/index.ts` 的 `constantRoutes` 中添加 CAS 回调路由**

在 `/login` 路由之后添加：

```typescript
  {
    path: "/cas-callback",
    component: () => import("@/views/login/cas-callback.vue"),
    meta: { hidden: true },
  },
```

- [ ] **Step 2: 在 `src/router/guards/permission.ts` 的白名单中添加 CAS 回调路由**

修改 `whiteList` 数组：

```typescript
const whiteList = ["/login", "/cas-callback"];
```

- [ ] **Step 3: 验证类型检查通过**

Run: `npx vue-tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 4: Commit**

```bash
git add src/router/index.ts src/router/guards/permission.ts
git commit -m "feat(cas): register cas-callback route and add to guard whitelist"
```

---

### Task 5: 创建 CAS 回调页面

**Files:**
- Create: `src/views/login/cas-callback.vue`

- [ ] **Step 1: 创建 `src/views/login/cas-callback.vue`**

```vue
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
  align-items: center;
  gap: 1rem;
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
```

- [ ] **Step 2: 验证类型检查通过**

Run: `npx vue-tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add src/views/login/cas-callback.vue
git commit -m "feat(cas): add CAS callback page with ticket validation"
```

---

### Task 6: 在 Login.vue 中添加 CAS 登录按钮

**Files:**
- Modify: `src/views/login/components/Login.vue`

- [ ] **Step 1: 在模板中添加 CAS 按钮**

在 `<!-- 第三方登录 -->` section 之前（即密码登录按钮 `</el-form-item>` 之后、注册链接 `<div flex-center gap-10px>` 之后），插入 CAS 按钮区域。修改后的模板结构为：

在 `<div class="third-party-login">` 之前添加：

```html
    <!-- CAS 单点登录 -->
    <div class="cas-login">
      <div class="divider-container">
        <div class="divider-line"></div>
        <span class="divider-text">其他登录方式</span>
        <div class="divider-line"></div>
      </div>
      <el-button size="large" class="w-full" @click="handleCasLogin">
        小米CAS登录
      </el-button>
    </div>
```

- [ ] **Step 2: 在 script 中添加 `handleCasLogin` 方法**

在 `toOtherForm` 函数之后添加：

```typescript
/**
 * CAS 单点登录
 *
 * 拼接 CAS 授权 URL 并跳转到 CAS 认证页面
 * service 参数为前端回调地址，CAS 认证成功后会携带 ticket 回调到该地址
 */
function handleCasLogin() {
  const casServerUrl = import.meta.env.VITE_CAS_SERVER_URL;
  const serviceUrl = `${window.location.origin}${window.location.pathname}#/cas-callback`;
  const redirect = route.query.redirect as string | undefined;
  const callbackUrl = redirect
    ? `${serviceUrl}?redirect=${encodeURIComponent(redirect)}`
    : serviceUrl;
  window.location.href = `${casServerUrl}/login?service=${encodeURIComponent(callbackUrl)}`;
}
```

- [ ] **Step 3: 在 style 中添加 CAS 按钮区域样式**

在 `.third-party-login` 样式块之后添加：

```scss
.cas-login {
  .divider-container {
    display: flex;
    align-items: center;
    margin: 16px 0;

    .divider-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(to right, transparent, var(--el-border-color-light), transparent);
    }

    .divider-text {
      padding: 0 16px;
      font-size: 12px;
      color: var(--el-text-color-regular);
      white-space: nowrap;
    }
  }
}
```

- [ ] **Step 4: 验证类型检查通过**

Run: `npx vue-tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 5: Commit**

```bash
git add src/views/login/components/Login.vue
git commit -m "feat(cas): add CAS login button with divider to login page"
```

---

### Task 7: 端到端验证

**Files:**
- None (manual testing)

- [ ] **Step 1: 启用 mock 模式验证 CAS 按钮和回调流程**

修改 `.env.development` 中 `VITE_MOCK_DEV_SERVER=true`，启动项目 `pnpm dev`。

验证项：
1. 登录页显示「其他登录方式」分隔线和「小米CAS登录」按钮
2. 点击 CAS 按钮，浏览器跳转到 `https://castest.mioffice.cn/login?service=...`
3. 在浏览器地址栏手动访问 `http://localhost:3000/#/cas-callback?ticket=test123`，验证回调页面正常显示 loading → 调用 mock cas-login → 跳转首页
4. 无 ticket 时访问 `/cas-callback`，显示错误提示和返回登录页按钮
5. 密码登录仍然正常工作

- [ ] **Step 2: 恢复 mock 配置**

将 `.env.development` 中 `VITE_MOCK_DEV_SERVER` 改回 `false`。

- [ ] **Step 3: 最终验证类型检查和 lint**

Run: `npx vue-tsc --noEmit && pnpm lint`
Expected: 无错误

- [ ] **Step 4: Commit 验证通过（无代码变更则跳过）**

```bash
# 如果没有代码变更，跳过此步
```

---

### Task 8: 完成 — 推送并创建 PR

- [ ] **Step 1: 推送分支**

```bash
git push origin test
```

- [ ] **Step 2: 通知后端 API 契约**

告知后端需要开发 `POST /api/v1/auth/cas-login` 接口，请求参数和响应格式见 spec 文档。
