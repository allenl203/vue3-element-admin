# CLAUDE.md

Vue3 + Element Plus 后台管理模板（vue-element-admin 的 Vue3 版本）。

## Commands

```bash
pnpm install          # 安装依赖（仅支持 pnpm，preinstall 会拦截 npm/yarn）
pnpm dev              # 启动开发服务器 (localhost:3000)
pnpm build            # 类型检查 + 生产构建（输出到 dist/）
pnpm build-only       # 跳过类型检查的构建
pnpm lint             # ESLint + Prettier + Stylelint 全量修复
pnpm commit           # commitizen 交互式提交（conventional commits）
```

## Architecture

```
src/
├── api/          # 按领域划分的 API 模块（auth, system/*）
├── components/   # 全局组件（CURD, ECharts, Upload, WangEditor 等，auto-imported）
├── composables/  # Vue composables（SSE, useTableSelection）
├── store/        # Pinia stores（app, user, permission, dict, settings, tags-view, tenant）
├── router/       # Hash 路由，动态路由从后端 MenuAPI.getRoutes() 获取
├── utils/        # request（axios 封装）、auth、storage
├── views/        # 页面组件（login, system/*, dashboard, codegen 等）
├── layouts/      # 三种布局（Left/Top/Mix）+ 设置面板
├── lang/         # i18n（zh-cn, en）
└── styles/       # SCSS 变量和全局样式
```

## Key Patterns

- **路由**: Hash 模式，静态路由在 `src/router/index.ts`，动态路由由后端返回
- **状态管理**: Pinia setup store（`defineStore("name", () => {...})`），导出 `useXxxStoreHook()`
- **API 请求**: axios 封装在 `src/utils/request.ts`，`Authorization: "no-auth"` 跳过 token 注入
- **Auto-import**: Vue/Pinia/VueUse/vue-router/vue-i18n/Element Plus 全部 auto-import，dts 预生成（`dts: false`）
- **Mock**: `vite-plugin-mock-dev-server`，`VITE_MOCK_DEV_SERVER=true` 时启用，mock 代理目标设为无效地址以暴露未 mock 的接口
- **UnoCSS**: presetUno + presetIcons + 本地 SVG 图标（`i-svg:icon-name`），`primary` 色与 Element Plus 联动

## Gotchas

- **CAS ticket 读取**: Hash 路由下 CAS 回调的 `?ticket=xxx` 在 `#` 前面，不能用 `route.query.ticket`，需手动解析 `window.location.search`
- **Token 刷新**: 单飞模式（single-flight），多个并发 401 共享一次刷新；`WeakSet` 防止无限重试
- **Token 存储**: "记住我" → localStorage，否则 → sessionStorage
- **权限指令**: `v-hasPerm`/`v-hasRole` 会从 DOM 中移除元素（非隐藏）
- **新增 auto-import 依赖**: 需临时启用 `dts: true` 重新生成声明文件
- **ESLint**: flat config，Element Plus 组件在 `.eslintrc-auto-import.json` 中声明为全局变量；`components/CURD/` 目录有宽松规则
- **Node 版本**: 要求 `^20.19.0 || >=22.12.0`
- **无测试基础设施**: 项目未配置 vitest/jest，无测试文件
