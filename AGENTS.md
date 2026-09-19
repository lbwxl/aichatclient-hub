# AGENTS.md

## Project Goal

本项目是“小二智客”的 React + Electron 重构版本。

旧版本是一个 Electron + Vue 3 + TypeScript 项目。

本次重构不是简单的 Vue → React 语法转换。

核心目标是：

> 建立一个真正的平台插件化架构，使新增电商平台时，原则上只需要新增 `packages/<platform>`，而不需要修改其他平台代码。

重点解决以下问题：

* 修改 A 平台消息回复逻辑时，不影响 B 平台。
* 新增一个平台时，不需要修改大量主应用代码。
* 每个平台独立管理自己的 WebView、登录、Hook、消息、商品同步、转人工能力。
* 主应用只提供基础能力和统一调度。
* Electron Main Process 只负责生命周期、窗口、IPC 和平台 Runtime 调度。

---

# 1. Legacy App Identification

旧版项目的本地目录名称不固定。

不要根据文件夹名称判断旧项目。

在当前工作区中，通过以下特征识别旧版“小二智客”项目：

```text
package.json 中：
"name": "xiaoerzhike"

并且存在：

electron.vite.config.ts

src/main
src/preload
src/renderer

packages/goofish-messaging
```

技术栈应为：

```text
Electron
Vue 3
TypeScript
Pinia
electron-vite
```

识别成功后，将旧项目统一称为：

```text
legacy-app
```

后续所有：

```text
参考旧实现
参考旧 UI
查看旧业务
迁移旧功能
对比旧行为
```

均指 `legacy-app`。

旧项目仅用于：

```text
功能参考
UI 参考
业务行为参考
接口参考
```

旧项目不作为新架构设计参考。

不要直接复制旧项目中的高耦合结构。

---

# 2. New Project Technology Stack

新项目默认使用：

```text
Electron
React
TypeScript
electron-vite / Vite
React Router
Zustand
Tailwind CSS
pnpm workspace
Vitest
```

除非有明确需求，不要随意更换核心技术栈。

---

# 3. Architecture Principle

整个系统分成两部分：

```text
Core Application

+

Platform Packages
```

---

# 4. Core Application Responsibilities

主应用负责通用业务。

包括：

```text
登录
用户中心
店铺管理
设置中心
商品库 UI
知识库
关键词回复
AI 配置
黑白名单
转人工规则
日志
积分
请求层
状态管理
Electron 窗口管理
平台 Runtime 调度
```

主应用不能负责某个平台的具体实现。

---

# 5. Platform Package Responsibilities

所有平台特有能力必须放入：

```text
packages/<platform>
```

例如：

```text
packages/douyin
packages/kuaishou
packages/pinduoduo
packages/goofish
packages/qianniu
packages/wechat
packages/wework
```

每个平台负责：

```text
登录逻辑
WebView
Session / Partition
Preload
Hook
DOM 注入
消息监听
消息解析
消息发送
店铺信息获取
转人工
商品列表采集
商品详情采集
平台特殊逻辑
```

---

# 6. Hard Architecture Rules

以下规则必须严格遵守。

## Rule 1

Core 不得依赖具体平台。

错误：

```ts
import { sendDouyinMessage } from '@platforms/douyin/src/message'
```

正确：

```ts
const runtime = platformRegistry.get(platformId)
await runtime.messaging?.sendMessage(...)
```

---

## Rule 2

平台之间不能互相依赖。

错误：

```ts
packages/douyin
  ↓
packages/kuaishou
```

禁止：

```ts
import { xxx } from '@platforms/kuaishou'
```

---

## Rule 3

主应用不得直接 import 平台内部文件。

错误：

```ts
import xxx from '../../../packages/douyin/src/internal'
```

主应用只能使用平台公开入口。

例如：

```ts
import { douyinPlatform } from '@platforms/douyin'
```

---

## Rule 4

禁止在 Core 中大量判断具体平台。

避免：

```ts
if (platform === 'douyin') {
}

if (platform === 'kuaishou') {
}

if (platform === 'pinduoduo') {
}
```

应该使用：

```ts
const platformModule = platformRegistry.get(platform)

const runtime = platformModule.createRuntime(context)
```

---

## Rule 5

禁止创建新的超级组件。

旧项目中的 `MainWeb.vue` 同时处理：

```text
WebView
登录
Hook
消息
商品同步
AI 回复
转人工
平台特殊逻辑
```

React 版本禁止复制这种设计。

Renderer 中的平台工作区应该接近：

```tsx
<PlatformView shop={shop} />
```

而不是在一个组件里处理所有平台业务。

---

## Rule 6

平台原始数据不得直接进入 Core。

正确流程：

```text
平台原始数据

↓

Platform Adapter

↓

Normalize

↓

统一 DTO

↓

Core
```

---

# 7. Platform SDK

必须维护：

```text
packages/platform-sdk
```

Platform SDK 是所有平台共同遵守的接口层。

至少包含：

```text
PlatformModule
PlatformManifest
PlatformRuntime
PlatformRuntimeContext

PlatformAuthDriver
PlatformWebviewDriver
PlatformMessagingDriver
PlatformProductDriver
PlatformHandoffDriver
```

示例：

```ts
export interface PlatformModule {
  manifest: PlatformManifest

  createRuntime(
    context: PlatformRuntimeContext
  ): PlatformRuntime
}
```

Runtime：

```ts
export interface PlatformRuntime {
  auth?: PlatformAuthDriver

  webview?: PlatformWebviewDriver

  messaging?: PlatformMessagingDriver

  products?: PlatformProductDriver

  handoff?: PlatformHandoffDriver

  start(): Promise<void>

  stop(): Promise<void>
}
```

---

# 8. Platform Registry

所有平台必须通过统一 Registry 管理。

例如：

```ts
registry.register(douyinPlatform)

registry.register(kuaishouPlatform)

registry.register(goofishPlatform)
```

调用：

```ts
const module = registry.get(shop.platformEn)

const runtime = module.createRuntime(context)
```

主程序不关心平台具体实现。

---

# 9. Platform Scheduler

Electron Main Process 必须通过统一：

```text
PlatformScheduler
```

管理 Runtime。

例如：

```ts
platformScheduler.startShop(shop)

platformScheduler.stopShop(shop.id)

platformScheduler.restartShop(shop.id)
```

Main Process 不应直接包含：

```text
DouyinService
KuaishouService
PddService
```

的具体业务流程。

---

# 10. WebView Rules

每个平台独立决定：

```text
URL
Partition
Preload
Hook
Session
登录页识别
刷新规则
```

Platform SDK 提供统一 WebView Driver。

例如：

```ts
export interface PlatformWebviewDriver {
  getUrl(shop: Shop): string

  getPartition(shop: Shop): string

  getPreload?(): string
}
```

WebView Session 必须做到店铺级隔离。

---

# 11. Messaging Architecture

统一流程：

```text
平台收到消息

↓

PlatformMessagingDriver

↓

PlatformMessage

↓

AI Core

↓

生成回复

↓

PlatformMessagingDriver.sendMessage()
```

AI Core 不应该知道：

```text
抖店如何发送
快手如何发送
闲鱼如何发送
千牛如何发送
```

---

# 12. Product Architecture

商品库 UI 属于 Core。

商品采集属于 Platform。

调用方式：

```ts
runtime.products?.syncProducts(shop)
```

流程：

```text
Product UI

↓

Product Service

↓

Platform Registry

↓

Platform Product Driver

↓

Normalize Product

↓

Backend
```

新增平台后，只要实现：

```text
PlatformProductDriver
```

商品库就应该可以自动支持该平台。

---

# 13. Unified Contracts

必须维护统一 DTO。

至少包括：

```text
Shop
PlatformMessage
PlatformSession
Product
Sku
HandoffInput
HandoffResult
```

平台内部可以有自己的原始类型。

但是离开平台 package 前必须转换成统一 DTO。

---

# 14. Recommended Directory

目标目录：

```text
apps/
  desktop/
    src/
      main/
        bootstrap/
        scheduler/
        windows/
        ipc/

      preload/

      renderer/
        app/

        pages/
          login/
          home/
          products/
          knowledge/
          settings/
          logs/

        features/
          auth/
          shops/
          products/
          knowledge/
          ai/
          handoff/

        shared/
          components/
          api/
          hooks/
          stores/

packages/

  platform-sdk/
    src/
      contracts/
      registry/
      runtime/

  core/
    auth/
    shops/
    products/
    knowledge/
    ai/
    logs/

  douyin/

  kuaishou/

  pinduoduo/

  goofish/

  qianniu/

  wechat/

  wework/
```

目录允许根据实际情况微调。

但平台边界不可破坏。

---

# 15. Migration Strategy

禁止一次性重写整个项目。

必须按 Phase 开发。

---

## Phase 0

架构基础：

```text
pnpm workspace

platform-sdk

统一 DTO

PlatformRegistry

PlatformRuntime

PlatformScheduler

FakePlatform

Contract Test
```

Phase 0 不做复杂 UI。

---

## Phase 1

React 应用壳：

```text
登录
路由
AppHeader
AppSidebar
首页
PlatformSidebar
ShopSidebar
请求层
Zustand
主题
日志
```

---

## Phase 2

平台工作区：

```text
PlatformView

WebView Runtime

Session 隔离

Runtime 生命周期
```

---

## Phase 3

只迁移抖店。

抖店作为标准平台模板。

结构建议：

```text
packages/douyin/
  src/
    index.ts

    manifest.ts

    runtime/

    auth/

    webview/

    messaging/

    products/

    handoff/
```

需要迁移：

```text
Hook

自动登录

消息监听

消息解析

消息发送

转人工

商品列表

商品详情

店铺信息识别
```

---

## Phase 4

抖店完整闭环：

```text
添加店铺

↓

打开 WebView

↓

登录

↓

识别店铺

↓

消息监听

↓

AI Core

↓

AI 回复

↓

发送消息

↓

转人工

↓

商品同步
```

没有完成抖店闭环之前，不开始第二个平台。

---

## Phase 5

依次迁移：

```text
快手

拼多多

闲鱼

千牛

微信

企业微信
```

每次只处理一个平台。

---

## Phase 6

迁移 Core 页面：

```text
商品库

知识库

关键词回复

AI 设置

黑白名单

转人工设置

日志

用户中心
```

---

# 16. Development Workflow

每次收到任务后必须先执行：

```text
1. 阅读当前代码

2. 找到 legacy-app 对应实现

3. 理解旧功能行为

4. 判断功能属于 Core 还是 Platform

5. 明确涉及哪些文件

6. 检查是否已有公共能力

7. 再开始编码
```

不要看到需求后立即写代码。

---

# 17. Before Writing Platform Code

必须先回答：

```text
这个代码是不是平台专属？

如果换成另一个平台，这段逻辑是否还成立？
```

如果只对某个平台成立：

```text
必须进入 packages/<platform>
```

---

# 18. Before Writing Core Code

检查是否出现：

```text
douyin

kuaishou

pinduoduo

goofish

qianniu
```

等具体平台业务判断。

如果出现，应优先考虑通过：

```text
PlatformRegistry

PlatformRuntime

Driver

Capability
```

解决。

---

# 19. Testing

Platform SDK 必须维护统一 Contract Test。

所有平台应该能够运行相同的基础测试。

至少测试：

```text
Platform 可以注册

Runtime 可以创建

Runtime 可以 start

Runtime 可以 stop

重复 stop 不崩溃

Messaging Driver 满足契约

Product Driver 输出统一 Product DTO

平台 Runtime 相互隔离

一个平台异常不会导致其他平台退出
```

---

# 20. Isolation Requirement

重点验证：

> 修改 DouyinMessaging 时，不应该需要修改 KuaishouMessaging。

重点验证：

> Douyin Runtime 崩溃，不应该导致 Kuaishou Runtime 被销毁。

重点验证：

> 新增一个 Platform Package 时，不应该修改现有 Platform Package。

---

# 21. Legacy Code Migration Rules

迁移旧代码时：

不要直接复制文件。

先判断：

```text
这是通用逻辑？

还是平台逻辑？
```

通用逻辑进入：

```text
Core
platform-sdk
shared
```

平台逻辑进入：

```text
packages/<platform>
```

如果旧文件同时包含通用逻辑和平台逻辑：

必须拆分。

---

# 22. Code Quality

优先：

```text
明确接口

小模块

单一职责

类型安全

明确依赖方向

可测试

可销毁生命周期
```

避免：

```text
巨大文件

巨大 Hook

巨大组件

全局状态污染

跨平台共享 mutable state

平台字符串 switch

循环依赖
```

---

# 23. IPC Rules

Renderer 不要直接大面积使用：

```ts
ipcRenderer
```

统一通过 Preload 暴露 typed API。

例如：

```ts
window.desktop.xxx()
```

Preload → Main Process。

平台需要 Electron 能力时，也应该通过明确接口注入，而不是随意访问全局 IPC。

---

# 24. Dependency Direction

允许：

```text
apps/desktop
    ↓
platform-sdk

apps/desktop
    ↓
core

platform package
    ↓
platform-sdk

platform package
    ↓
shared contracts
```

禁止：

```text
core
  ↓
douyin

douyin
  ↓
kuaishou

platform-sdk
  ↓
具体平台
```

---

# 25. Completion Report

每完成一个任务后，必须汇报：

```text
完成内容

修改文件

新增文件

删除文件

架构变化

测试结果

是否存在临时方案

是否新增技术债

下一步建议
```

如果存在未完成内容，明确说明。

---

# 26. Git Rules

默认：

```text
允许修改代码
允许运行测试
允许创建 commit
```

未经用户明确要求：

```text
禁止 push
禁止 force push
禁止删除远程分支
禁止修改生产环境
```

---

# 27. Important Principle

本项目最重要的目标不是：

> 尽快把 Vue 页面变成 React。

而是：

> 借 React 重构建立长期可扩展的平台架构。

如果“快速完成当前功能”和“保持平台解耦”发生冲突：

优先保持平台解耦。

不要为了快速完成需求，把平台特殊逻辑重新写回主应用。

---

# 28. Current Default Task Rule

除非用户明确要求跨 Phase 工作：

只完成当前指定 Phase。

不要因为“顺手”而提前实现后续 Phase。

完成当前 Phase 后停止并汇报。

不要自行开始下一 Phase。
