# AI Chat Client Hub

React + TypeScript + Electron monorepo for the desktop client. Platform
packages are composed by the Desktop application and run through the shared
PlatformRegistry and PlatformScheduler.

## Start

```bash
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` runs the electron-vite main, preload and renderer pipelines, then
opens the Electron desktop window. It is the default application entry point.

For renderer-only debugging, run `pnpm dev:renderer`. That command intentionally
opens only the Vite web surface and does not provide Electron WebView or IPC.

## Boundaries

- `packages/backend-client`: `http://f.mchaoai.com:8001/api/v1`, token handling,
  response/error mapping and `shop_id` normalization.
- `packages/platforms/*`: platform manifests, runtime drivers and adapters.
- `packages/core`: Zustand workspace state and platform-neutral use cases.
- `apps/desktop/src/bootstrap/platform-registry.ts`: platform composition root.
- `apps/desktop`: Tailwind UI, TanStack Router routes, authentication flow,
  Electron composition and PlatformScheduler wiring.

The module and sequence diagrams are in [docs/architecture.md](docs/architecture.md).

面向多店铺、多平台客服场景的 React + Electron 基础框架。项目从原 Vue 单体应用中提炼出稳定的平台边界，平台实现以独立 workspace package 接入，应用层不再依赖平台名称分支。

## 技术栈

- React + TypeScript
- Zustand（客户端运行态）
- TanStack Router（类型安全路由）
- TanStack Query（服务端状态）
- Electron + electron-vite + contextBridge（桌面宿主边界）
- Zod（IPC 与平台输入校验）
- pnpm workspace（monorepo）
- Vitest（核心协议与运行时测试）

## 开始

```bash
pnpm install
pnpm dev
```

`pnpm dev` 与下面的兼容命令都会直接启动 Electron 桌面应用：

```bash
pnpm dev:desktop
```

仅调试 React renderer 时使用 `pnpm dev:renderer`。该模式不会提供 Electron
WebView、preload 或 IPC 能力。

质量检查：

```bash
pnpm typecheck
pnpm test
pnpm build
```

模块边界、运行流程与新平台接入步骤见 [架构设计](docs/architecture.md)。
