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

然后在 Desktop 应用的 composition root（`apps/desktop/src/bootstrap/platform-registry.ts`）注册一次。平台通信、Hook 和 runtime driver 都留在平台 package 内；平台 package 不直接调用 `ipcRenderer`。
