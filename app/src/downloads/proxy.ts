import { Request, Response } from 'express';

const TRUSTED_DECODL_HOSTS = new Set(['decodl.net', 'decodl.ir', 'decodlbot.ir'])

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
  'image/webp': '.webp', 'image/svg+xml': '.svg', 'video/mp4': '.mp4',
  'video/quicktime': '.mov', 'application/zip': '.zip',
}

function sanitize(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim()
}

// Returns 302 redirect to Decodl URL with branded filename in custom headers.
// Cloudflare Worker reads those headers, fetches from Decodl, streams to user —
// so the customer only ever sees our domain, never Decodl's.
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
  if (!token || token !== download.downloadToken) return res.status(403).send('Forbidden.')

  try {
    const parsed = new URL(download.downloadUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).send('Invalid source.')
    if (!TRUSTED_DECODL_HOSTS.has(parsed.hostname)) return res.status(400).send('Source not trusted.')
  } catch { return res.status(400).send('Bad URL.') }

  // Build branded filename
  const slug = (download.providerSlug as string) || 'stockmart'
  const isVideo = slug.includes('_video')
  const ext = MIME_EXT[isVideo ? 'video/mp4' : 'image/jpeg'] || '.jpg'
  const base = sanitize(download.fileName || `stockmart-${slug}-${id.slice(0, 8)}`)
  const filename = base.toLowerCase().endsWith(ext) ? base : `${base}${ext}`

  // Pass the Decodl URL and filename to Cloudflare Worker via headers.
  // Worker fetches the actual file — customer never sees Decodl domain.
  res.setHeader('X-Decodl-Url', download.downloadUrl)
  res.setHeader('X-Filename', filename)
  res.setHeader('Access-Control-Expose-Headers', 'X-Decodl-Url, X-Filename')

  console.log(`[Download] ${id} → handed to CF Worker`)
  return res.redirect(302, download.downloadUrl)
}
