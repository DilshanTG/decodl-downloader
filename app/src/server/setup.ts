import type { ServerSetupFn } from 'wasp/server'
import { initServerSentry } from './sentry'
import { log } from './logger'

/**
 * Wasp server setupFn — runs once on process start.
 * Initializes Sentry (no-op without SENTRY_DSN).
 */
export const serverSetup: ServerSetupFn = async () => {
  initServerSentry()
  log.info('server_setup_complete', {
    nodeEnv: process.env.NODE_ENV,
    hasSentry: !!process.env.SENTRY_DSN,
  })
}
