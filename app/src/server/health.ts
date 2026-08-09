import { prisma } from 'wasp/server'
import type { Healthz } from 'wasp/server/api'

/**
 * Public readiness probe — cheap DB liveness only.
 * 200 { status: 'ok', db: 'up' } | 503 { status: 'degraded', db: 'down' }
 * Does not leak connection strings or error internals.
 */
export const healthz: Healthz = async (_req, res, _context) => {
  const ts = new Date().toISOString()

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('db_timeout')), 2000)
      ),
    ])
    return res.status(200).json({ status: 'ok', db: 'up', ts })
  } catch {
    return res.status(503).json({ status: 'degraded', db: 'down', ts })
  }
}
