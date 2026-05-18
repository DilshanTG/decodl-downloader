import { Request, Response } from 'express';

const TRUSTED_DECODL_HOSTS = new Set(['decodl.net', 'decodl.ir', 'decodlbot.ir'])

export const downloadFile = async (req: Request, res: Response, context: any) => {
  const id = req.params.id;

  // UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof id !== 'string' || !uuidRegex.test(id)) {
    return res.status(400).send('Invalid download ID.');
  }

  const download = await context.entities.Download.findUnique({ where: { id } });

  if (!download) return res.status(404).send('Download not found.');
  if (download.status !== 'completed' || !download.downloadUrl) {
    return res.status(400).send('Download not ready yet.');
  }
  if (download.expiresAt && new Date(download.expiresAt) < new Date()) {
    return res.status(410).send('Download link has expired.');
  }

  // Validate URL is from trusted Decodl domain
  try {
    const parsed = new URL(download.downloadUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('Invalid download source.')
    }
    if (!TRUSTED_DECODL_HOSTS.has(parsed.hostname)) {
      return res.status(400).send('Download source not trusted.')
    }
  } catch {
    return res.status(400).send('Invalid download URL.')
  }

  // Redirect directly to Decodl — file transfers happen user ↔ Decodl,
  // not through our server. Zero Railway bandwidth cost.
  console.log(`[Download] ${id} → redirect → ${new URL(download.downloadUrl).hostname}`)
  return res.redirect(302, download.downloadUrl)
};
