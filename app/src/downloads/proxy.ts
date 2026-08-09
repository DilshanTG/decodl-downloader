import { Request, Response } from 'express'
import crypto from 'crypto'

const TRUSTED_DECODL_HOSTS = new Set(['decodl.net', 'decodl.ir', 'decodlbot.ir'])

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
  'image/webp': '.webp', 'image/svg+xml': '.svg', 'video/mp4': '.mp4',
  'video/quicktime': '.mov', 'application/zip': '.zip',
}

function sanitize(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim()
}

/**
 * Constant-time token compare (mirrors payment/webhook.ts HMAC check).
 * Length mismatch short-circuits to false without leaking which side was short.
 */
function tokensMatch(provided: string | undefined, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// Returns 200 with X-Source-Url / X-Filename for the Cloudflare Worker only.
// The Decodl source URL is NEVER placed in Location or CORS-exposed headers —
// customers only ever hit dl.stockmart.lk; the Worker fetches Decodl server-side.
export const downloadFile = async (req: Request, res: Response, context: any) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  const token = req.query.token as string | undefined

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!id || !uuidRegex.test(id)) return res.status(400).send('Invalid ID.')

  const download = await context.entities.Download.findUnique({ where: { id } })
  if (!download) return res.status(404).send('Not found.')
  if (download.status !== 'completed' || !download.downloadUrl) return res.status(400).send('Not ready.')
  if (download.expiresAt && new Date(download.expiresAt) < new Date()) return res.status(410).send('Expired.')

  // Verify ownership token — prevents IDOR (downloading another user's paid file)
  if (!tokensMatch(token, download.downloadToken)) {
    return res.status(403).send('Forbidden.')
  }

  try {
    const parsed = new URL(download.downloadUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).send('Invalid source.')
    if (!TRUSTED_DECODL_HOSTS.has(parsed.hostname)) return res.status(400).send('Source not trusted.')
  } catch { return res.status(400).send('Bad URL.') }

  // Build branded filename
  const slug = (download.providerSlug as string) || 'stockmart'
  const isVideo = slug.includes('_video')
  const base = sanitize(download.fileName || `stockmart-${slug}-${id.slice(0, 8)}`)

  // Prefer the real extension carried by the upstream filename (.zip, .rar, …) so
  // archives are not mislabelled as .jpg. A trailing token only counts as an
  // extension if it is short and contains a letter — that keeps a version suffix
  // like "hero shot v2.1" from being read as a ".1" extension, while still
  // allowing digit-leading ones such as ".7z".
  const trailing = base.match(/\.[a-z0-9]{1,5}$/i)?.[0].toLowerCase()
  const extFromName = trailing && /[a-z]/.test(trailing) ? trailing : undefined
  const ext = extFromName || MIME_EXT[isVideo ? 'video/mp4' : 'image/jpeg'] || '.jpg'

  // When the extension came from `base` it is already the suffix, so this never
  // double-appends (no "file.zip.zip", no "file.zip.jpg").
  const filename = base.toLowerCase().endsWith(ext) ? base : `${base}${ext}`

  // Source URL travels ONLY in a Worker-facing header (not Location, not CORS-exposed).
  // Empty body — the Worker never needs a body from Railway.
  res.status(200)
  res.setHeader('X-Source-Url', download.downloadUrl)
  res.setHeader('X-Filename', filename)
  res.setHeader('Cache-Control', 'no-store')
  // Deliberately NO Access-Control-Expose-Headers — browser JS must not read X-Source-Url.

  console.log(`[Download] ${id} → handed to CF Worker (source masked)`)
  return res.end()
}
