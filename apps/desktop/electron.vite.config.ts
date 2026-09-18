import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'node:path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
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
        '@aichat/contracts',
        '@aichat/core',
        '@aichat/platform-sdk',
        '@aichat/platform-douyin',
        '@aichat/platform-pinduoduo',
        '@aichat/platform-kuaishou',
        '@aichat/platform-goofish',
        '@aichat/platform-qianniu',
        '@aichat/platform-wechat',
        '@aichat/platform-wework'
      ]
    }
  }
})
