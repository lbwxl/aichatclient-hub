import type { PlatformId } from '@aichat/contracts'

export class PlatformNotRegisteredError extends Error {
  constructor(readonly platformId: PlatformId) {
    super(`Platform "${platformId}" is not registered`)
    this.name = 'PlatformNotRegisteredError'
  }
}

export class DuplicatePlatformError extends Error {
  constructor(readonly platformId: PlatformId) {
    super(`Platform "${platformId}" is already registered`)
    this.name = 'DuplicatePlatformError'
  }
}

export class PlatformOperationError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
    override readonly cause?: unknown
  ) {
    super(message)
    this.name = 'PlatformOperationError'
  }
}
