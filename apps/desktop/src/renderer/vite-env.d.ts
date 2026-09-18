/// <reference types="vite/client" />

interface Window {
  readonly desktopBridge?: import('@aichat/contracts').DesktopBridge
  readonly desktopWindow?: {
    minimize(): Promise<void>
    maximize(): Promise<boolean>
    close(): Promise<void>
  }
  readonly workbench?: import('@aichat/contracts').WorkbenchBridge
}

interface ImportMetaEnv {
  readonly VITE_MAIN_SERVER_HOST?: string
  readonly VITE_MAIN_SERVER_PORT?: string
  readonly VITE_MAIN_SERVER_PROTOCOL?: string
  readonly VITE_ENABLE_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        partition?: string
        allowpopups?: boolean
      }
    }
  }
}
