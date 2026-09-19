# AI Chat Client Hub 模块设计

## 总体边界

```mermaid
flowchart LR
  UI[React Desktop UI<br/>Tailwind + TanStack Router] --> Store[Zustand Workspace Store]
  Store --> Backend[backend-client<br/>Auth + Shops + Error Mapping]
  Store --> Runtime[Platform Runtime SDK]
  Runtime --> Registry[Desktop composition root<br/>PlatformRegistry + Scheduler]
  Registry --> Douyin[packages/platforms/douyin]
  Douyin --> Hook[@platform-hub/doudian-hook<br/>window runtime typed client]
  Hook --> Webview[Electron WebView / CDP Runtime.evaluate]
  Backend --> API[(f.mchaoai.com:8001/api/v1)]
  UI --> Router[TanStack Router]
```

## 登录与店铺加载流程

```mermaid
sequenceDiagram
  participant App as React App
  participant Auth as backend-client
  participant API as Main Server
  participant Store as Zustand
  App->>Auth: 读取 token
  alt 没有 token
    App->>App: 展示 LoginSidebar / Welcome
    App->>Auth: login(phone, password)
    Auth->>API: POST /auth/login
    API-->>Auth: token + user
  else 已有 token
    App->>Auth: me()
  end
  Auth->>API: GET /shops/list?platform_en=douyin
  API-->>Auth: { items, total, page }
  Auth->>Store: setShops(toContractShop(items))
  Store-->>App: 仅渲染抖店分组
```

## 抖店消息流程

```mermaid
sequenceDiagram
  participant View as PlatformView
  participant Hook as doudian-hook
  participant Runtime as PlatformRuntime
  participant Store as Zustand
  participant UI as Conversation UI
  View->>Runtime: start()
  Runtime->>Hook: install()
  Hook-->>View: window.__platformHub
  View->>Hook: getAuthState()/listSessions()
  Hook-->>View: normalized sessions
  View->>Hook: subscribe(drainEvents)
  Hook-->>Runtime: HookEvent message
  Runtime->>Store: normalize to ChatMessage
  Store->>UI: append message / unread state
  UI->>Hook: sendMessage(sessionId, content)
```

## 目录约束

```text
apps/desktop                 负责 Electron composition + React UI + platform registry
packages/contracts           跨边界数据契约与 zod schema
packages/backend-client      后端 URL、token、HTTP 错误、snake_case 适配
packages/platform-sdk        平台生命周期与统一消息协议
packages/platforms/douyin    抖店 manifest + 最新 doudian-hook adapter
packages/core                Zustand store + platform-neutral use cases
```

UI 不直接调用 `fetch`，平台包不读取 DOM，后端字段不泄漏到 React 组件。
