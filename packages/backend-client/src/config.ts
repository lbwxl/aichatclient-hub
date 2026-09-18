export const MAIN_SERVER_CONFIG = {
  host: 'f.mchaoai.com',
  port: 8001,
  protocol: 'http'
} as const

export const MAIN_SERVER_BASE_URL = `${MAIN_SERVER_CONFIG.protocol}://${MAIN_SERVER_CONFIG.host}:${MAIN_SERVER_CONFIG.port}/api/v1`
