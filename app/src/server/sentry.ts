/**
 * Server-side Sentry helpers.
 * If SENTRY_DSN is unset, all functions no-op (dev-safe).
 *
 * FALLBACK when Sentry is unavailable: captureError emits structured
 * console.error with prefix [CAPTURE] so a log drain can pattern-match.
 */

import * as Sentry from '@sentry/node'
import { log } from './logger'

let initialized = false

const SECRET_KEY_RE = /authorization|password|secret|token|cookie|api[_-]?key|md5sig|resetlink/i

function scrubValue(key: string, value: unknown): unknown {
  if (SECRET_KEY_RE.test(key)) return '[Redacted]'
  if (typeof value === 'string' && value.length > 500) return value.slice(0, 500) + '…'
  return value
}

function scrubObject(obj: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!obj) return obj
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = scrubObject(v as Record<string, unknown>)
    } else {
      out[k] = scrubValue(k, v)
    }
  }
  return out
}

export function initServerSentry(): void {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) {
    log.info('Sentry disabled (SENTRY_DSN not set)')
    return
  }
  if (initialized) return

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
    tracesSampleRate: 0.05,
    beforeSend(event) {
      if (event.request?.headers) {
        const headers = { ...event.request.headers }
        for (const key of Object.keys(headers)) {
          if (SECRET_KEY_RE.test(key)) headers[key] = '[Redacted]'
        }
        event.request.headers = headers
      }
      if (event.extra) {
        event.extra = scrubObject(event.extra as Record<string, unknown>)
      }
      // Never send email/PII fields if present
      if (event.user) {
        event.user = { id: event.user.id }
      }
      return event
    },
  })
  initialized = true
  log.info('Sentry initialized', { environment: process.env.NODE_ENV })
}

export function isSentryEnabled(): boolean {
  return initialized
}

/** Capture an exception. Safe to call when Sentry is disabled. */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  const scrubbed = scrubObject(context)
  if (initialized) {
    Sentry.captureException(err, { extra: scrubbed })
  }
  // Always also log for Railway / [CAPTURE] drain fallback
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      msg: '[CAPTURE]',
      error: message,
      stack,
      ...(scrubbed || {}),
    })
  )
}

/** Capture a free-form critical message (alerts). */
export function captureMessage(
  message: string,
  level: 'error' | 'warning' | 'info' = 'error',
  context?: Record<string, unknown>
): void {
  const scrubbed = scrubObject(context)
  if (initialized) {
    Sentry.captureMessage(message, {
      level,
      tags: { alert: level === 'error' ? 'critical' : 'info' },
      extra: scrubbed,
    })
  }
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: level === 'warning' ? 'warn' : level,
      msg: `[CAPTURE] ${message}`,
      ...(scrubbed || {}),
    })
  )
}
