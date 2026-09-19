import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'node:path'

const workspacePackages = [
  '@aichat/contracts',
  '@aichat/core',
  '@aichat/platform-sdk',
  '@aichat/backend-client',
  '@aichat/platform-douyin',
  '@aichat/platform-goofish',
  '@aichat/platform-kuaishou',
  '@aichat/platform-pinduoduo',
  '@aichat/platform-qianniu',
  '@aichat/platform-wechat',
  '@aichat/platform-wework'
]

export default defineConfig({
  main: {
    // Workspace packages expose TypeScript source during development. Bundle
    // them into Electron instead of asking Node ESM to resolve extensionless
    // source imports such as `./errors`.
    plugins: [externalizeDepsPlugin({ exclude: workspacePackages })]
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: workspacePackages })],
    build: {
      rollupOptions: {
        output: {
          format: 'cjs'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    plugins: [react(), tailwindcss()],
    server: {
      port: 4317,
      strictPort: false
    },
    optimizeDeps: {
      exclude: [
        ...workspacePackages
      ]
    }
  }
})
