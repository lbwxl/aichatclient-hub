# 平台包接入模板

每个平台包只负责平台差异，统一 runtime、状态和 UI 不放在这里。

```text
packages/platforms/<id>/
  package.json
  tsconfig.json
  src/
    index.ts       # definePlatform(manifest + hooks)
    hooks.ts       # lifecycle / messaging / goods / injection
    assets/        # 可选：版本化注入脚本或平台资源
```

最小实现：

```ts
import { definePlatform, createPlatformHooks } from '@aichat/platform-sdk'

export const platform = definePlatform({
  manifest: {
    id: 'new-platform',
    displayName: '新平台',
    host: 'webview',
    capabilities: ['messaging', 'script-injection'],
    color: '#4966d8'
  },
  hooks: createPlatformHooks({
    platformId: 'new-platform',
    transport: 'webview'
  })
})
```

然后在 `packages/contracts/src/index.ts` 增加平台 id，并在 `packages/core/src/platform-catalog.ts` 注册一次。真实平台通信放在 `apps/desktop/src/main` 的 `PlatformDriver`，不能从平台包直接调用 `ipcRenderer`。
