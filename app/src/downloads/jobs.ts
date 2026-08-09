import { prisma } from 'wasp/server'
import {
  checkDecodlJobStatus,
  submitDecodlDownload,
  scrubDecodlBrand,
  isTransientDecodlError,
} from '../decodl/client'
import { sendDownloadReadyEmail, sendDownloadFailedEmail } from './emails'
import { alertCritical } from '../server/alerts'
import { log } from '../server/logger'

/** Last reconcile summary for admin System Health (in-process only). */
export let lastReconcileSummary: {
  at: string
  scanned: number
  healed: number
  driftAlerts: number
} | null = null

// ─── Concurrency gate for Decodl submissions ──────────────────────────────────
// PgBoss worker teamSize isn't configurable via Wasp's DSL, so we implement
// our own counter. Max 5 simultaneous Decodl calls per server process.
// Each additional job waits up to 10s; if it can't get a slot it exits and
// PgBoss retries it (retryLimit: 2 in main.wasp).
let activeDecodlCalls = 0
const MAX_DECODL_CONCURRENT = 5

async function withDecodlSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (activeDecodlCalls >= MAX_DECODL_CONCURRENT) {
    // Wait up to 10s for a free slot (poll every 500ms)
    const deadline = Date.now() + 10_000
    while (activeDecodlCalls >= MAX_DECODL_CONCURRENT && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 500))
    }
    if (activeDecodlCalls >= MAX_DECODL_CONCURRENT) {
      throw new Error('Decodl concurrency limit reached — job will be retried by PgBoss')
    }
  }
  activeDecodlCalls++
  try {
    return await fn()
  } finally {
    activeDecodlCalls--
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB 1: processDecodlSubmission (on-demand, max 5 concurrent via PgBoss)
//
// Submitted by submitDownload/retryFailedDownload actions.
// Calls Decodl API and moves download from "pending" → "processing".
// If Decodl rejects the request, refunds credits and marks as "failed".
//
// Why 5 concurrent? Decodl processes requests sequentially per-provider.
// Sending 500 simultaneous calls would trigger rate limiting.
// 5 workers = controlled throughput without hammering their API.
// ─────────────────────────────────────────────────────────────────────────────
export const processDecodlSubmission = async (
  args: { downloadId: string },
  context: any
): Promise<void> => {
  const { downloadId } = args

  const download = await context.entities.Download.findUnique({ where: { id: downloadId } })

  // Guard: skip if already moved out of pending (duplicate job, race condition)
  if (!download || download.status !== 'pending') {
    log.info('submit_skip_not_pending', { downloadId, status: download?.status })
    return
  }

  log.info('submit_start', { downloadId, providerSlug: download.providerSlug })

  try {
    const result = await withDecodlSlot(() => submitDecodlDownload({
      link: download.link || undefined,
      code: download.code || undefined,
      providerName: download.providerSlug,
      options: (download.options as any[]) || [],
    }))

    // Atomic pending→processing claim. If poll/timeout already failed this download
    // after we submitted to Decodl, do NOT resurrect it or touch credits.
    const claimed = await context.entities.Download.updateMany({
      where: { id: downloadId, status: 'pending' },
      data: {
        status: 'processing',
        decodlJobId: result.jobId,
        lastPolledAt: new Date(),
        errorMessage: null,
      },
    })

    if (claimed.count === 0) {
      log.error('submit_orphaned_job', { downloadId, decodlJobId: result.jobId })
      return
    }

    log.info('submit_claimed', { downloadId, decodlJobId: result.jobId, active: activeDecodlCalls })

  } catch (err: any) {
    log.error('submit_rejected', { downloadId, error: err.message, transient: isTransientDecodlError(err) })
    // Concurrency-limit and transient provider errors → PgBoss retry (download stays pending).
    // Hard 4xx application rejections → permanent fail + reservation release.
    if (err.message?.includes('concurrency limit') || isTransientDecodlError(err)) {
      throw err
    }
    await handleDownloadFailure(download, context, err.message || 'Decodl submission failed')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB 2: pollDecodlJobs (scheduled every 1 minute)
//
// PgBoss guarantees only ONE instance of a scheduled job runs at a time
// across ALL server machines — no in-memory lock needed.
//
// Also handles the "pending timeout" safety net: if a download has been
// pending for >5 minutes (job never ran or PgBoss insert failed), refund it.
// Timeouts are measured from attemptStartedAt (per-attempt clock), not createdAt.
// ─────────────────────────────────────────────────────────────────────────────
export const pollDecodlJobs = async (_args: unknown, context: any) => {
  const startedAt = Date.now()

  // Safety net: fail any download stuck in "pending" for >5 minutes on this attempt.
  const PENDING_TIMEOUT_MS = 5 * 60 * 1000
  const stalePending = await context.entities.Download.findMany({
    where: {
      status: 'pending',
      attemptStartedAt: { lt: new Date(Date.now() - PENDING_TIMEOUT_MS) },
    },
    take: 20,
  })

  for (const download of stalePending) {
    log.warn('poll_pending_timeout', { downloadId: download.id })
    await handleDownloadFailure(download, context, 'Download submission timed out. Credits have been refunded.')
  }

  // Zombie sweep: processing + null decodlJobId is invisible to the main poll query
  // (missing-jobId path before validation, or claim with undefined jobId historically).
  // These never hit the 30-min timeout check — sweep them after 5 minutes.
  const zombies = await context.entities.Download.findMany({
    where: {
      status: 'processing',
      decodlJobId: null,
      attemptStartedAt: { lt: new Date(Date.now() - PENDING_TIMEOUT_MS) },
    },
    take: 20,
  })
  for (const download of zombies) {
    log.warn('poll_zombie_sweep', { downloadId: download.id })
    await handleDownloadFailure(
      download,
      context,
      'Download was accepted but no provider job was created. Credits have been refunded.'
    )
  }

  // Main poll: check all "processing" downloads with a Decodl job ID
  const processingDownloads = await context.entities.Download.findMany({
    where: {
      status: 'processing',
      decodlJobId: { not: null },
    },
    take: 50,
    orderBy: { lastPolledAt: 'asc' },
  })

  if (
    processingDownloads.length === 0 &&
    stalePending.length === 0 &&
    zombies.length === 0
  ) {
    return
  }

  log.info('poll_checking', { count: processingDownloads.length })

  // Bounded tick: chunks of 5 concurrent status checks, 50s deadline.
  // lastPolledAt ASC ensures deferred rows are first next tick.
  const TICK_DEADLINE_MS = 50_000
  const CHUNK_SIZE = 5

  const processOneDownload = async (download: any) => {
    // Respect Decodl's update interval — don't poll more than once per 25s
    if (download.lastPolledAt) {
      const secondsSincePoll = (Date.now() - download.lastPolledAt.getTime()) / 1000
      if (secondsSincePoll < 25) return
    }

    // Hard timeout: 30 minutes on this attempt (attemptStartedAt), not lifetime createdAt
    const attemptStart: Date = download.attemptStartedAt ?? download.createdAt
    const minutesProcessing = (Date.now() - attemptStart.getTime()) / 60000
    if (minutesProcessing > 30) {
      await handleDownloadFailure(download, context, 'Download timed out after 30 minutes')
      return
    }

    try {
      const result = await checkDecodlJobStatus(download.decodlJobId!)

      if (result.status === 'completed' && result.downloadUrl) {
        // Confirm the charge: ONLY NOW do we permanently deduct credits.
        // credits -= cost, reservedCredits -= cost → net change to visible balance = 0
        // (visible balance = credits - reservedCredits, which stayed the same since submit)
        await confirmDownloadCharge(download, context, {
          downloadUrl: result.downloadUrl,
          fileName: result.fileName || null,
          fileSize: result.fileSize || null,
          thumbnailUrl: result.thumbnailUrl || null,
        })
        log.info('poll_completed', { downloadId: download.id, creditsCharged: download.creditsCharged })

      } else if (result.status === 'failed') {
        await handleDownloadFailure(download, context, scrubDecodlBrand(result.errorMessage || 'Download failed'))

      } else {
        // Still processing — update progress + bump lastPolledAt
        const currentOptions = Array.isArray(download.options) ? download.options : []
        const baseOptions    = currentOptions.filter((o: any) => o.name !== 'progress')
        const updatedOptions = result.progress !== undefined
          ? [...baseOptions, { name: 'progress', value: String(result.progress) }]
          : baseOptions

        await context.entities.Download.update({
          where: { id: download.id },
          data: { lastPolledAt: new Date(), options: updatedOptions },
        })
      }
    } catch (err: any) {
      log.error('poll_check_error', { downloadId: download.id, error: err.message })
      await context.entities.Download.update({
        where: { id: download.id },
        data: { lastPolledAt: new Date(), errorMessage: scrubDecodlBrand(err.message || '') },
      })
    }
  }

  for (let i = 0; i < processingDownloads.length; i += CHUNK_SIZE) {
    if (Date.now() - startedAt > TICK_DEADLINE_MS) {
      const deferred = processingDownloads.length - i
      log.warn('poll_tick_deadline', { deferred })
      break
    }
    const chunk = processingDownloads.slice(i, i + CHUNK_SIZE)
    await Promise.allSettled(chunk.map((d: any) => processOneDownload(d)))
  }

  log.info('poll_finished', { elapsedSec: Number(((Date.now() - startedAt) / 1000).toFixed(1)) })
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB 3: expireOldDownloads (scheduled daily at midnight)
// ─────────────────────────────────────────────────────────────────────────────
export const expireOldDownloads = async (_args: unknown, context: any) => {
  const result = await context.entities.Download.updateMany({
    where: { status: 'completed', expiresAt: { lt: new Date() } },
    data: { downloadUrl: null },
  })
  if (result.count > 0) log.info('expire_cleared', { count: result.count })
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB 4: reconcileReservedCredits (scheduled daily at 03:00)
//
// Invariant: User.reservedCredits == SUM(creditsCharged) over pending|processing.
// - ZERO active downloads + reserved != 0 + last download idle >15m → self-heal
// - Active downloads with drift → log only (mid-flight ops; do not auto-fix)
// ─────────────────────────────────────────────────────────────────────────────
type DriftedUserRow = {
  userId: string
  reservedCredits: number
  expectedReserved: number
  activeDownloads: number
}

export const reconcileReservedCredits = async (_args: unknown, _context: any) => {
  const startedAt = Date.now()

  // Find users whose reservedCredits drifts from the sum of active download charges.
  // Float tolerance 0.001. Parameterized $queryRaw only.
  const drifted: DriftedUserRow[] = await prisma.$queryRaw`
    SELECT
      u."id" AS "userId",
      u."reservedCredits" AS "reservedCredits",
      COALESCE(a."expectedReserved", 0)::float8 AS "expectedReserved",
      COALESCE(a."activeDownloads", 0)::int AS "activeDownloads"
    FROM "User" u
    LEFT JOIN (
      SELECT
        d."userId",
        SUM(d."creditsCharged")::float8 AS "expectedReserved",
        COUNT(*)::int AS "activeDownloads"
      FROM "Download" d
      WHERE d."status" IN ('pending', 'processing')
      GROUP BY d."userId"
    ) a ON a."userId" = u."id"
    WHERE ABS(u."reservedCredits" - COALESCE(a."expectedReserved", 0)) > 0.001
  `

  let healed = 0
  let driftAlerts = 0
  const IDLE_MS = 15 * 60 * 1000

  for (const row of drifted) {
    const reserved = Number(row.reservedCredits)
    const expected = Number(row.expectedReserved)
    const active = Number(row.activeDownloads)

    if (active === 0 && Math.abs(reserved) > 0.001) {
      // Unambiguous orphan reservation — only heal if last download is idle >15 min
      // (or user has never had a download, which is also safe to heal).
      const latest = await prisma.download.findFirst({
        where: { userId: row.userId },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      })

      const idleEnough =
        !latest || Date.now() - latest.updatedAt.getTime() > IDLE_MS

      if (!idleEnough) {
        log.warn('reconcile_drift_recent_activity', {
          userId: row.userId, reserved, expected, activeDownloads: active,
        })
        void alertCritical('ledger.reservation_drift', {
          userId: row.userId, reserved, expected, activeDownloads: active, reason: 'recent_activity',
        })
        driftAlerts++
        continue
      }

      // Compare-and-swap heal: only clear if reservedCredits still equals observed value
      const healedNow = await prisma.$transaction(async (tx) => {
        const rows = await tx.$executeRaw`
          UPDATE "User"
          SET "reservedCredits" = 0
          WHERE "id" = ${row.userId}
            AND "reservedCredits" = ${reserved}
        `
        if (Number(rows) === 0) return false

        const user = await tx.user.findUnique({
          where: { id: row.userId },
          select: { credits: true, reservedCredits: true },
        })
        const balance = user ? user.credits - user.reservedCredits : 0

        await tx.creditTransaction.create({
          data: {
            userId: row.userId,
            amount: reserved,
            balance,
            type: 'refund',
            description: 'Reconciliation: released orphaned reservation',
          },
        })
        return true
      })

      if (healedNow) {
        healed++
        log.info('reconcile_healed', { userId: row.userId, released: reserved })
      } else {
        // Concurrent mutation — leave for tomorrow
        log.warn('reconcile_drift_cas_miss', {
          userId: row.userId, reserved, expected, activeDownloads: active,
        })
        void alertCritical('ledger.reservation_drift', {
          userId: row.userId, reserved, expected, activeDownloads: active, reason: 'cas_miss',
        })
        driftAlerts++
      }
      continue
    }

    // Live active downloads with drift — never auto-fix
    log.warn('reconcile_drift_active', {
      userId: row.userId, reserved, expected, activeDownloads: active,
    })
    void alertCritical('ledger.reservation_drift', {
      userId: row.userId, reserved, expected, activeDownloads: active, reason: 'active_downloads',
    })
    driftAlerts++
  }

  const elapsedSec = Number(((Date.now() - startedAt) / 1000).toFixed(1))
  lastReconcileSummary = {
    at: new Date().toISOString(),
    scanned: drifted.length,
    healed,
    driftAlerts,
  }
  log.info('reconcile_summary', { ...lastReconcileSummary, elapsedSec })
  if (healed > 0 || driftAlerts > 0) {
    void alertCritical('ledger.reconcile_summary', {
      scanned: drifted.length,
      healed,
      driftAlerts,
      elapsedSec,
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// confirmDownloadCharge — called ONLY when Decodl confirms the file is ready.
//
// This is the ONLY place where credits are permanently deducted.
// Atomically: credits -= cost, reservedCredits -= cost, download = completed.
// Net effect on visible balance (credits - reservedCredits) = zero, because
// the reservation already reduced the visible balance at submit time.
// lifetimeCreditsSpent only increments here — on confirmed success.
// ─────────────────────────────────────────────────────────────────────────────
async function confirmDownloadCharge(
  download: any,
  _context: any,
  fileData: { downloadUrl: string; fileName: string | null; fileSize: number | null; thumbnailUrl: string | null }
) {
  const cost = download.creditsCharged

  // Claim + credit settlement in one transaction so a crash cannot leave
  // download completed without credit movement (or vice versa).
  let confirmInvariantBroken = false
  const claimed = await prisma.$transaction(async (tx) => {
    const claimResult = await tx.download.updateMany({
      where: { id: download.id, status: 'processing' },
      data: {
        status: 'completed',
        downloadUrl: fileData.downloadUrl,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        thumbnailUrl: fileData.thumbnailUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastPolledAt: new Date(),
      },
    })
    if (claimResult.count === 0) return false

    if (cost > 0) {
      // Guarded raw update: cannot push reservedCredits negative
      const rows = await tx.$executeRaw`
        UPDATE "User"
        SET
          "credits" = "credits" - ${cost},
          "reservedCredits" = "reservedCredits" - ${cost},
          "lifetimeCreditsSpent" = "lifetimeCreditsSpent" + ${cost}
        WHERE "id" = ${download.userId}
          AND "reservedCredits" >= ${cost}
      `

      if (Number(rows) === 0) {
        confirmInvariantBroken = true
        log.error('confirm_invariant_violation', {
          downloadId: download.id,
          userId: download.userId,
          cost,
        })
      }

      const user = await tx.user.findUnique({ where: { id: download.userId } })
      const balance = user
        ? user.credits - user.reservedCredits
        : 0

      await tx.creditTransaction.create({
        data: {
          userId: download.userId,
          amount: 0, // visible balance unchanged — reservation already reduced it at submit time
          balance,
          type: 'download',
          reference: download.id,
          description: `Download confirmed — ${download.providerSlug} (${cost} credit${cost !== 1 ? 's' : ''})`,
        },
      })
    }

    return true
  })

  if (confirmInvariantBroken) {
    void alertCritical('ledger.confirm_invariant', {
      downloadId: download.id,
      userId: download.userId,
      cost,
    })
  }

  if (!claimed) return // already completed by a concurrent worker

  // Email OUTSIDE the transaction (non-blocking — never stops the download flow)
  const userForEmail = await prisma.user.findUnique({
    where: { id: download.userId },
    select: { email: true },
  })
  if (userForEmail?.email) {
    sendDownloadReadyEmail({
      toEmail: userForEmail.email,
      providerSlug: download.providerSlug,
      fileName: fileData.fileName,
      downloadId: download.id,
      creditsCharged: cost,
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// handleDownloadFailure — called on any failure path (Decodl error, timeout).
//
// Under the reserve model, NO refund is needed.
// Credits were never permanently deducted — only reservedCredits was increased.
// Simply decrease reservedCredits back to release the hold.
// User's credits field is untouched → guaranteed zero net impact on balance.
// ─────────────────────────────────────────────────────────────────────────────
async function handleDownloadFailure(download: any, _context: any, errorMessage: string) {
  const cost = download.creditsCharged

  let releaseInvariantBroken = false
  const claimed = await prisma.$transaction(async (tx) => {
    // Covers 'pending' (processDecodlSubmission) and 'processing' (pollDecodlJobs).
    // Only one concurrent failer transitions to 'failed'.
    const claimResult = await tx.download.updateMany({
      where: { id: download.id, status: { notIn: ['completed', 'failed', 'refunded'] } },
      data: { status: 'failed', errorMessage, lastPolledAt: new Date() },
    })
    if (claimResult.count === 0) return false

    if (cost > 0) {
      const rows = await tx.$executeRaw`
        UPDATE "User"
        SET "reservedCredits" = "reservedCredits" - ${cost}
        WHERE "id" = ${download.userId}
          AND "reservedCredits" >= ${cost}
      `

      if (Number(rows) === 0) {
        releaseInvariantBroken = true
        log.error('release_invariant_violation', {
          downloadId: download.id,
          userId: download.userId,
          cost,
        })
      }

      const user = await tx.user.findUnique({ where: { id: download.userId } })
      const balance = user
        ? user.credits - user.reservedCredits
        : 0

      await tx.creditTransaction.create({
        data: {
          userId: download.userId,
          amount: cost, // visible balance goes back up — reservation released
          balance,
          type: 'refund',
          reference: download.id,
          description: `Download failed — ${download.providerSlug} reservation released (no charge)`,
        },
      })
    }

    return true
  })

  if (releaseInvariantBroken) {
    void alertCritical('ledger.release_invariant', {
      downloadId: download.id,
      userId: download.userId,
      cost,
    })
  }

  if (!claimed) return // already in a terminal state — skip

  // Email OUTSIDE the transaction
  const userForEmail = await prisma.user.findUnique({
    where: { id: download.userId },
    select: { email: true },
  })
  if (userForEmail?.email && cost > 0) {
    sendDownloadFailedEmail({
      toEmail: userForEmail.email,
      providerSlug: download.providerSlug,
      errorMessage,
      creditsRefunded: cost,
    })
  }

  log.info('reserve_released', {
    downloadId: download.id,
    userId: download.userId,
    cost,
    reason: errorMessage,
  })
}
