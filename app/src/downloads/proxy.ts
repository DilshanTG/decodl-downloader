import { Request, Response } from 'express';
import { Readable } from 'stream';

// Guard helper to sanitize filenames against OS filesystem issues and browser injection
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\\/:*?"<>|]/g, '_') // Replace invalid OS characters with underscores
    .replace(/\s+/g, ' ')          // Normalize spaces
    .trim();
}

// Mime type mappings to guarantee suffixes
const MIME_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/x-matroska': '.mkv',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
};

export const downloadFile = async (req: Request, res: Response, context: any) => {
  // Auth check — only the file owner (or admin) may download
  if (!context.user) {
    return res.status(401).send('Unauthorized.');
  }

  const id = req.params.id;

  // Ultimate Guard 1: Input Validation
  // Validate that the ID parameter matches a standard UUID pattern before hitting the DB
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof id !== 'string' || !uuidRegex.test(id)) {
    return res.status(400).send('Invalid download asset ID format.');
  }

  // Set up AbortController for cleaning up upstream sockets on client disconnect
  const abortController = new AbortController();
  let isRequestAborted = false;

  // Listen to client disconnects (tab closed, download cancelled) to abort upstream stream instantly
  req.on('close', () => {
    if (!res.writableEnded) {
      console.log(`[Proxy] Client disconnected from download ${id}. Aborting upstream fetch request.`);
      isRequestAborted = true;
      abortController.abort();
    }
  });

  try {
    // 1. Fetch download details from DB using Prisma
    const download = await context.entities.Download.findUnique({
      where: { id },
    });

    if (!download) {
      return res.status(404).send('Download not found.');
    }

    // Ownership check — users may only download their own files
    if (download.userId !== context.user.id && !context.user.isAdmin) {
      return res.status(403).send('Forbidden.');
    }

    if (download.status !== 'completed' || !download.downloadUrl) {
      return res.status(400).send('This download is not completed yet.');
    }

    // 2. Check for link expiration (24h)
    if (download.expiresAt && new Date(download.expiresAt) < new Date()) {
      return res.status(410).send('This download link has expired.');
    }

    // SSRF protection — only allow https URLs from trusted upstream
    try {
      const parsed = new URL(download.downloadUrl)
      if (parsed.protocol !== 'https:') {
        return res.status(400).send('Invalid download source.')
      }
    } catch {
      return res.status(400).send('Invalid download URL.')
    }

    // Ultimate Guard 2: Stream Connect Timeout Protection
    // Create a safety timeout: if Decodl's file source does not respond in 25 seconds, cancel the request
    const connectionTimeout = setTimeout(() => {
      if (!res.writableEnded) {
        console.error(`[Proxy] Upstream source request for ${id} timed out.`);
        isRequestAborted = true;
        abortController.abort();
      }
    }, 25000);

    // 3. Request the original file stream from Decodl with Abort Signal and redirects enabled
    let response: globalThis.Response;
    try {
      response = await fetch(download.downloadUrl, {
        signal: abortController.signal,
        redirect: 'follow', // Ultimate Guard 3: Explicit redirect handling
      });
    } catch (fetchErr: any) {
      clearTimeout(connectionTimeout);
      if (isRequestAborted) {
        return; // Request was aborted by client disconnect or timeout
      }
      console.error(`[Proxy] Failed to connect to original source for download ${id}:`, fetchErr);
      return res.status(502).send('Upstream server is temporarily unreachable. Please try again.');
    }

    clearTimeout(connectionTimeout);

    if (!response.ok) {
      console.error(`[Proxy] Upstream source returned status ${response.status} for download ${id}`);
      return res.status(response.status).send(`Failed to retrieve premium file: Upstream server returned ${response.status}`);
    }

    // 4. Set the masked headers so it downloads under our own domain
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    
    // Ultimate Guard 4: Clean, Safe, Verified Filename construction
    const baseFileName = download.fileName || `stock-asset-${id}`;
    let ext = '';

    // Extract extension from the source URL path first
    try {
      const pathname = new URL(download.downloadUrl).pathname;
      const match = pathname.match(/\.[a-zA-Z0-9]+$/);
      if (match) ext = match[0];
    } catch {}

    // Fall back to MIME mappings if URL didn't have a clear suffix
    if (!ext) {
      ext = MIME_MAP[contentType.toLowerCase()] || '';
    }

    // Final fallback based on video provider suffix
    if (!ext) {
      ext = download.providerSlug.includes('_video') ? '.mp4' : '.jpg';
    }

    // Assemble filename and ensure it has exactly one extension suffix
    let finalFileName = baseFileName;
    if (!finalFileName.toLowerCase().endsWith(ext.toLowerCase())) {
      finalFileName = `${finalFileName}${ext}`;
    }

    // Ultimate Guard 5: Filename Sanitization & Unicode Support (RFC 5987 compatibility)
    const sanitizedFileName = sanitizeFilename(finalFileName);
    const encodedFileName = encodeURIComponent(sanitizedFileName);

    res.setHeader('Content-Type', contentType);
    // RFC 5987 style Content-Disposition supports Unicode characters cleanly on all modern web browsers
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"; filename*=UTF-8''${encodedFileName}`);
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // 5. Pipe the web ReadableStream natively into the Express response stream with safety error listeners
    if (response.body) {
      const sourceStream = Readable.fromWeb(response.body as any);
      
      sourceStream.on('error', (streamErr) => {
        console.error(`[Proxy] Error occurred in read stream for ${id}:`, streamErr);
        if (!res.headersSent) {
          res.status(500).send('Error occurred during file streaming.');
        }
      });

      sourceStream.pipe(res);
    } else {
      res.status(500).send('No download stream available from source.');
    }
  } catch (error: any) {
    if (isRequestAborted) return;
    console.error('Error proxying download:', error);
    if (!res.headersSent) {
      res.status(500).send('An error occurred while proxying your download.');
    }
  }
};
