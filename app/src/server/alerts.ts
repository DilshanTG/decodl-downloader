/**
 * Critical money-safety / pipeline alerts.
 * Dual-path: Sentry captureMessage + email to ops.
 * Debounces identical event+targetId to at most once per 10 minutes.
 */

import { emailSender } from 'wasp/server/email'
import { captureMessage } from './sentry'
import { log } from './logger'

const DEBOUNCE_MS = 10 * 60 * 1000
const recentAlerts = new Map<string, number>()

function resolveAlertEmail(): string | null {
  const dedicated = process.env.ADMIN_ALERT_EMAIL?.trim()
  if (dedicated) return dedicated
  const list = process.env.ADMIN_EMAILS?.split(',').map((s) => s.trim()).filter(Boolean)
  return list?.[0] ?? null
}

function debounceKey(event: string, detail: Record<string, unknown>): string {
  const target =
    detail.downloadId ??
    detail.userId ??
    detail.orderId ??
    detail.targetId ??
    'global'
  return `${event}::${String(target)}`
}

function shouldSend(key: string): boolean {
  const now = Date.now()
  const last = recentAlerts.get(key)
  if (last && now - last < DEBOUNCE_MS) return false
  recentAlerts.set(key, now)
  // Cap map size
  if (recentAlerts.size > 500) {
    const cutoff = now - DEBOUNCE_MS
    for (const [k, t] of recentAlerts) {
      if (t < cutoff) recentAlerts.delete(k)
    }
  }
  return true
}

/**
 * Fire a critical alert. Never include secrets, reset links, or card data in detail.
 */
export async function alertCritical(
  event: string,
  detail: Record<string, unknown> = {}
): Promise<void> {
  const key = debounceKey(event, detail)
  if (!shouldSend(key)) {
    log.warn('alert_debounced', { event, key })
    return
  }

  // (a) Sentry / [CAPTURE] fallback
  captureMessage(`[StockMart ALERT] ${event}`, 'error', { event, ...detail })

  // (b) Email to ops
  const to = resolveAlertEmail()
  if (!to) {
    log.error('alert_no_recipient', { event, detail })
    return
  }

  const detailLines = Object.entries(detail)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('\n')

  try {
    await emailSender.send({
      from: { name: 'StockMart Alerts', email: 'noreply@stockmart.lk' },
      to,
      subject: `[StockMart ALERT] ${event}`,
      text:
        `Critical alert from StockMart production.\n\n` +
        `Event: ${event}\n` +
        `Time: ${new Date().toISOString()}\n\n` +
        `${detailLines}\n\n` +
        `— StockMart observability`,
      html:
        `<p><strong>Critical alert</strong></p>` +
        `<p>Event: <code>${event}</code></p>` +
        `<p>Time: ${new Date().toISOString()}</p>` +
        `<pre style="background:#f4f4f5;padding:12px;border-radius:8px;font-size:12px">${detailLines
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre>`,
    })
    log.info('alert_email_sent', { event, to })
  } catch (err: any) {
    log.error('alert_email_failed', { event, error: err?.message })
  }
}
