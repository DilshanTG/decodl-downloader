/**
 * Wasp client setupFn — runs once on app load.
 * Initializes Sentry when REACT_APP_SENTRY_DSN is set; no-ops otherwise.
 */
export async function clientSetup() {
  const dsn = (import.meta as any).env?.REACT_APP_SENTRY_DSN as string | undefined
  if (!dsn) return

  try {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn,
      environment: (import.meta as any).env?.MODE || 'development',
      release: (import.meta as any).env?.REACT_APP_SENTRY_RELEASE || undefined,
      tracesSampleRate: 0.05,
      beforeSend(event) {
        if (event.request?.headers) {
          const headers = { ...event.request.headers }
          for (const key of Object.keys(headers)) {
            if (/authorization|cookie|token/i.test(key)) {
              headers[key] = '[Redacted]'
            }
          }
          event.request.headers = headers
        }
        if (event.user) {
          event.user = { id: event.user.id }
        }
        return event
      },
    })
  } catch (err) {
    console.error('[Sentry] client init failed', err)
  }
}

/** Capture a client-side exception (ErrorBoundary). No-op without DSN. */
export async function captureClientException(
  error: Error,
  extra?: Record<string, unknown>
): Promise<void> {
  const dsn = (import.meta as any).env?.REACT_APP_SENTRY_DSN as string | undefined
  if (!dsn) {
    console.error('[CAPTURE]', error, extra)
    return
  }
  try {
    const Sentry = await import('@sentry/react')
    Sentry.captureException(error, { extra })
  } catch {
    console.error('[CAPTURE]', error, extra)
  }
}
