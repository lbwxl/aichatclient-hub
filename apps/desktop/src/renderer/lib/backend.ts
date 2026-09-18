import { createBackendClient, MAIN_SERVER_BASE_URL } from '@aichat/backend-client'

const env = import.meta.env as ImportMetaEnv & {
  readonly VITE_MAIN_SERVER_HOST?: string
  readonly VITE_MAIN_SERVER_PORT?: string
  readonly VITE_MAIN_SERVER_PROTOCOL?: string
}

const host = env.VITE_MAIN_SERVER_HOST || 'f.mchaoai.com'
const port = env.VITE_MAIN_SERVER_PORT || '8001'
const protocol = env.VITE_MAIN_SERVER_PROTOCOL || 'http'

export const mainServerBaseUrl = `${protocol}://${host}:${port}/api/v1` || MAIN_SERVER_BASE_URL
export const backendClient = createBackendClient({ baseUrl: mainServerBaseUrl })
