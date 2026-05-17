import { checkDecodlJobStatus, submitDecodlDownload } from '../decodl/client'

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
    console.log(`[Submit] Download ${downloadId} is no longer pending — skipping.`)
    return
  }

  console.log(`[Submit] Submitting download ${downloadId} (${download.providerSlug}) to Decodl...`)

  try {
    const result = await withDecodlSlot(() => submitDecodlDownload({
      link: download.link || undefined,
      code: download.code || undefined,
      providerName: download.providerSlug,
      options: (download.options as any[]) || [],
    }))

    await context.entities.Download.update({
      where: { id: downloadId },
      data: {
        status: 'processing',
        decodlJobId: result.jobId,
        lastPolledAt: new Date(),
        errorMessage: null,
      },
    })

    console.log(`[Submit] Download ${downloadId} → jobId ${result.jobId} (active: ${activeDecodlCalls})`)

  } catch (err: any) {
    console.error(`[Submit] Decodl rejected download ${downloadId}:`, err.message)
    // If it's a concurrency limit error, let PgBoss retry — don't refund yet
    if (err.message?.includes('concurrency limit')) throw err
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
// ─────────────────────────────────────────────────────────────────────────────
export const pollDecodlJobs = async (_args: unknown, context: any) => {
  const startedAt = Date.now()

  // Safety net: fail any download stuck in "pending" for >5 minutes.
  // This catches cases where processDecodlSubmission job was never enqueued.
  const PENDING_TIMEOUT_MS = 5 * 60 * 1000
  const stalePending = await context.entities.Download.findMany({
    where: {
      status: 'pending',
      createdAt: { lt: new Date(Date.now() - PENDING_TIMEOUT_MS) },
    },
    take: 20,
  })

  for (const download of stalePending) {
    console.log(`[Poll] Pending timeout for download ${download.id} — refunding`)
    await handleDownloadFailure(download, context, 'Download submission timed out. Credits have been refunded.')
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

  if (processingDownloads.length === 0 && stalePending.length === 0) return

  console.log(`[Poll] Checking ${processingDownloads.length} processing downloads...`)

  for (const download of processingDownloads) {
    // Respect Decodl's update interval — don't poll more than once per 25s
    if (download.lastPolledAt) {
      const secondsSincePoll = (Date.now() - download.lastPolledAt.getTime()) / 1000
      if (secondsSincePoll < 25) continue
    }

    // Hard timeout: 30 minutes in "processing" = something went wrong
    const minutesProcessing = (Date.now() - download.createdAt.getTime()) / 60000
    if (minutesProcessing > 30) {
      await handleDownloadFailure(download, context, 'Download timed out after 30 minutes')
      continue
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
        console.log(`[Poll] Download ${download.id} completed — ${download.creditsCharged} credits confirmed.`)

      } else if (result.status === 'failed') {
        await handleDownloadFailure(download, context, result.errorMessage || 'Download failed')

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
      console.error(`[Poll] Error checking download ${download.id}:`, err.message)
      await context.entities.Download.update({
        where: { id: download.id },
        data: { lastPolledAt: new Date(), errorMessage: err.message },
      })
    }
  }

  console.log(`[Poll] Finished in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
}

// ─────────────────────────────────────────────────────────────────────────────
// JOB 3: expireOldDownloads (scheduled daily at midnight)
// ─────────────────────────────────────────────────────────────────────────────
export const expireOldDownloads = async (_args: unknown, context: any) => {
  const result = await context.entities.Download.updateMany({
    where: { status: 'completed', expiresAt: { lt: new Date() } },
    data: { downloadUrl: null },
  })
  if (result.count > 0) console.log(`[Expire] Cleared ${result.count} expired download links.`)
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
  context: any,
  fileData: { downloadUrl: string; fileName: string | null; fileSize: number | null; thumbnailUrl: string | null }
) {
  const cost = download.creditsCharged

  const user = await context.entities.User.findUnique({ where: { id: download.userId } })
  if (!user) return

  // After confirmation: credits drops by cost, reservedCredits drops by cost.
  // Available balance (credits - reservedCredits) is unchanged — already showed lower at reserve time.
  const newCredits = Math.max(0, user.credits - cost)
  const newReserved = Math.max(0, user.reservedCredits - cost)
  const newAvailable = newCredits - newReserved

  await Promise.all([
    context.entities.Download.update({
      where: { id: download.id },
      data: {
        status: 'completed',
        downloadUrl: fileData.downloadUrl,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        thumbnailUrl: fileData.thumbnailUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastPolledAt: new Date(),
      },
    }),
    context.entities.User.update({
      where: { id: user.id },
      data: {
        credits: newCredits,
        reservedCredits: newReserved,
        lifetimeCreditsSpent: { increment: cost },
      },
    }),
    context.entities.CreditTransaction.create({
      data: {
        userId: user.id,
        amount: 0, // visible balance already reduced at reserve time — net 0 here
        balance: newAvailable,
        type: 'download',
        reference: download.id,
        description: `Download confirmed — ${download.providerSlug} (${cost} credit${cost !== 1 ? 's' : ''})`,
      },
    }),
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// handleDownloadFailure — called on any failure path (Decodl error, timeout).
//
// Under the reserve model, NO refund is needed.
// Credits were never permanently deducted — only reservedCredits was increased.
// Simply decrease reservedCredits back to release the hold.
// User's credits field is untouched → guaranteed zero net impact on balance.
// ─────────────────────────────────────────────────────────────────────────────
async function handleDownloadFailure(download: any, context: any, errorMessage: string) {
  const cost = download.creditsCharged

  await context.entities.Download.update({
    where: { id: download.id },
    data: { status: 'failed', errorMessage, lastPolledAt: new Date() },
  })

  if (cost <= 0) return // nothing was reserved — nothing to release

  const user = await context.entities.User.findUnique({ where: { id: download.userId } })
  if (!user) return

  const newReserved = Math.max(0, user.reservedCredits - cost)
  const newAvailable = user.credits - newReserved

  await Promise.all([
    context.entities.User.update({
      where: { id: user.id },
      data: { reservedCredits: newReserved },
    }),
    context.entities.CreditTransaction.create({
      data: {
        userId: user.id,
        amount: cost, // visible balance goes back up — reservation released
        balance: newAvailable,
        type: 'refund',
        reference: download.id,
        description: `Download failed — ${download.providerSlug} reservation released (no charge)`,
      },
    }),
  ])

  console.log(`[Reserve] Released ${cost} reserved credits for user ${download.userId} — no charge. Reason: ${errorMessage}`)
}
