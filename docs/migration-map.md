# 原项目迁移映射

这不是一次把旧目录机械复制到 React 的迁移，而是先稳定边界，再逐个平台替换 driver 的渐进路径。

| 原项目位置 | 新框架位置 | 迁移策略 |
| --- | --- | --- |
| `src/platforms/manifest.ts` | `packages/contracts` + `packages/core/src/platform-catalog.ts` | 平台 id、host、能力进入统一契约；旧 `app_type` 只在数据适配层兼容 |
| `src/renderer/src/platforms/hookRegistry.ts` | `packages/platforms/*/src/index.ts` | 注册表只负责组合，脚本、消息解析和平台差异留在平台包 |
| `src/renderer/src/hooks/{douyin,kuaishou,pinduoduo}` | 对应 `packages/platforms/*/src/hooks.ts` | 先迁移入口和 payload normalizer，再逐步把真实注入脚本拆成 injection hook |
| `src/renderer/src/HookScript/msgHookScripts/*` | 对应平台包的 `injection` / assets | 不再让 renderer 直接 import 大脚本；以版本化 asset 或 driver 注入 |
| `src/renderer/src/composables/useMainWebHook.ts` | `packages/platform-sdk/src/runtime.ts` + platform injection hook | 重试、取消、状态回调变成通用 runtime；页面不管理 interval |
| `src/renderer/src/stores/shops.ts` | `packages/core/src/workspace-store.ts` + Query adapter（后续） | 只保留短生命周期运行态；后端店铺列表和配置放 TanStack Query |
| `src/renderer/src/services/synchronizeAllStores.ts` | `packages/core` use-case + 各平台 goods hook | 同步编排与商品格式归一化分离，按 capability 调度 |
| `src/renderer/src/App.vue` 登录事件 | gateway event coordinator（后续） | 登录事件先归一化，再按 `platformId + externalId` upsert，UI 不做身份匹配 |
| `src/main/services/wechat/*`、`wework/*` | `apps/desktop/src/main` native drivers | 保留现有 bridge 服务，通过 `PlatformDriver` 适配，不把 bridge 代码带进 React |
| `packages/goofish-messaging` | `packages/platforms/goofish` driver | 闲鱼现有账号/session 能力作为 service host driver 接入 |
| `src/preload/index.ts` 的宽 `window.api` | `apps/desktop/src/preload/desktop-bridge.ts` | 只暴露 contracts 中的 command/event，所有输入输出先校验 |

## 推荐迁移顺序

1. 用真实后端店铺 API 替换 `demoShops`，保持 `Shop` normalizer 不变。
2. 先接入抖店 webview driver，迁移现有 `useMainWebHook` 的注入与登录状态。
3. 复用 webview driver 接入拼多多、快手，差异只进入对应平台 hooks。
4. 接入闲鱼 service driver，复用现有 `goofish-messaging` 的账号生命周期。
5. 最后接入千牛、微信、企业微信 native drivers，并把登录事件统一为 `PlatformEvent`。

每一步都应保持 `pnpm typecheck && pnpm test` 通过；真实平台联调只新增 driver/platform package 测试，不在 React 页面增加平台判断。
