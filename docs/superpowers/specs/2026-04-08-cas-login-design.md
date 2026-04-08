# CAS SSO 登录集成设计

## 背景

当前系统仅支持用户名/密码登录。需要新增小米 CAS 单点登录作为可选的认证方式，允许用户使用小米企业账号登录。CAS 登录与密码登录完全互不影响，两种方式最终都产出 JWT token。

CAS 参考文档：[小米 CAS 单点登录接入手册](https://mi.feishu.cn/wiki/HxsDwQ7gMioa0vkoUxWcsTS5nWe)，采用「3. 传统方式接入」中前后端分离方案。

测试环境：`https://castest.mioffice.cn`

## 认证流程

```
1. 用户点击「小米CAS登录」按钮
   -> 前端跳转 CAS 认证页:
      https://castest.mioffice.cn/login?service={前端回调地址}

2. 用户在 CAS 完成认证
   -> CAS 302 回调到 service 地址，携带 ticket:
      https://前端地址/#/cas-callback?ticket=ST-V2-xxx

3. 前端 CasCallback.vue 收到 ticket
   -> 调用后端接口 POST /api/v1/auth/cas-login { ticket, service }

4. 后端验证:
   -> 调用 CAS 验证接口:
      https://castest.mioffice.cn/serviceValidate?service={service}&ticket={ticket}
   -> CAS 返回 XML 用户信息 (username, email, name, displayName 等)
   -> 后端自动创建/查找用户，返回标准 LoginResponse (accessToken/refreshToken)

5. 前端存储 token，跳转首页
   -> 后续流程与密码登录完全一致 (getUserInfo -> generateRoutes -> SSE)
```

### 关键约束（来自小米 CAS 官方文档）

- **service 参数完全一致**：前端跳转 CAS 时的 service 和后端验证时的 service 必须完全匹配
- **ticket 仅 30 秒有效，且只能验证一次**：前端收到 ticket 后需立即调后端接口
- **测试环境** `castest.mioffice.cn`：service 可以是任意 http/https 路径，不需要申请白名单
- **登出**：只注销业务自身登录态，不主动登出 CAS（类比微信登录登出逻辑）
- **前后端分离不适用 CAS Client SDK**：需参照文档 5.2.2 自行实现

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/api/auth.ts` | 修改 | 新增 `casLogin()` 方法 |
| `src/types/api/auth.ts` | 修改 | 新增 `CasLoginRequest` 类型 |
| `src/views/login/components/Login.vue` | 修改 | 底部新增 CAS 按钮 + 分隔线 |
| `src/views/login/cas-callback.vue` | 新建 | CAS 回调页面，处理 ticket 验证 |
| `src/router/routes/static.ts` | 修改 | 注册 `/cas-callback` 静态路由（白名单） |
| `.env.development` | 修改 | 新增 `VITE_CAS_SERVER_URL` |
| `.env.production` | 修改 | 新增 `VITE_CAS_SERVER_URL` |
| `mock/auth.mock.ts` | 修改 | 新增 cas-login mock 端点 |

## API 契约

### POST /api/v1/auth/cas-login

```typescript
// 请求
interface CasLoginRequest {
  ticket: string;   // CAS 颁发的临时票据，30秒有效
  service: string;   // 回调地址，必须与跳转CAS时的service完全一致
}

// 响应（复用现有 LoginResponse）
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;   // "Bearer"
  expiresIn: number;   // 7200
}
```

### 后端验证流程（供后端参考）

```
GET https://castest.mioffice.cn/serviceValidate
  ?service={service}&ticket={ticket}

// 成功返回 XML:
<cas:serviceResponse>
  <cas:authenticationSuccess>
    <cas:user>username</cas:user>
    <cas:attributes>
      <cas:username>zhangsan10</cas:username>
      <cas:uid>12345</cas:uid>
      <cas:email>zhangsan10@xiaomi.com</cas:email>
      <cas:name>张三</cas:name>
      <cas:displayName>张三</cas:displayName>
      <cas:departmentName>xxx部门</cas:departmentName>
    </cas:attributes>
  </cas:authenticationSuccess>
</cas:serviceResponse>
```

后端拿到用户信息后：自动创建/查找用户，返回标准 JWT token。

## UI 设计

### Login.vue 变更

在密码登录按钮下方新增：

```
[ 登  录 ]                    <- 现有密码登录按钮
─────────── 其他登录方式 ───────────    <- 分隔线 + 文字
[        小米CAS登录          ]         <- 新增按钮 (全宽)
```

- 按钮使用 Element Plus `el-button`，`size="large"`，全宽
- 分隔线两侧带文字，使用 CSS 实现
- 点击后调用 `handleCasLogin()` 方法

### handleCasLogin 逻辑

```typescript
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

## 回调页面 CasCallback.vue

路由 `/cas-callback`，处理 CAS 认证回调。

### 状态机

```
onMounted -> 读取 URL 参数
  ├─ 无 ticket -> 显示错误（"未收到CAS认证票据"）+ 返回登录页按钮
  └─ 有 ticket -> 显示 loading
       ├─ 调用 casLogin(ticket, service) 成功 -> 存储 token -> 跳转 redirect 或 /
       └─ 调用失败 -> 显示错误信息 + 返回登录页按钮
```

### service 参数构造

```typescript
// 取当前页面 URL，去掉 ticket 和 redirect 参数，保留其余参数
const serviceUrl = (() => {
  const url = new URL(window.location.href);
  url.searchParams.delete("ticket");
  url.searchParams.delete("redirect");
  return url.origin + url.pathname + url.search;
})();
```

### token 处理

复用现有 `userStore.login()` 的 token 存储逻辑。由于 casLogin 返回的响应格式与 login 一致，直接调用 `AuthStorage.setTokens()` 即可。

## 路由配置

在 `src/router/routes/static.ts` 中注册：

```typescript
{
  path: "/cas-callback",
  name: "CasCallback",
  component: () => import("@/views/login/cas-callback.vue"),
  meta: { title: "CAS回调", hidden: true },
}
```

同时需将 `/cas-callback` 加入权限守卫的白名单（`src/router/guards/permission.ts` 的 `ROUTE_WHITELIST`），确保未登录时可访问此路由。

## 环境变量

```bash
# .env.development
VITE_CAS_SERVER_URL=https://castest.mioffice.cn

# .env.production
VITE_CAS_SERVER_URL=https://cas.mioffice.cn
```

## Mock

在 `mock/auth.mock.ts` 中新增 `POST auth/cas-login` 端点，返回与现有 `auth/login` 一致的 `LoginResponse`。开发时即使没有 CAS 也能跑通前端流程。

## 登出

CAS 登出只注销业务自身登录态（调用现有 `AuthAPI.logout()`），**不主动登出 CAS**。参考小米 CAS 文档说明："业务系统需要登出时，注销掉自身维护的登录态即可。最好不要登出 CAS，否则其他业务再去 CAS 认证时，用户需要重新校验。"

## 风险与注意事项

1. **service 参数一致性**：前端构造的 service 必须与后端验证时传给 CAS 的 service 完全一致（包括 trailing slash、协议等）
2. **ticket 时效**：30 秒过期 + 仅可使用一次，前端回调页需立即处理，不能延迟
3. **Hash 路由兼容**：service URL 中包含 `#/cas-callback`，需确认 CAS 服务端是否正常处理 hash 片段（测试环境 service 无限制）
4. **错误处理**：ticket 过期/重复使用等场景需友好的错误提示
5. **密码登录不受影响**：CAS 是独立入口，现有登录流程零改动
