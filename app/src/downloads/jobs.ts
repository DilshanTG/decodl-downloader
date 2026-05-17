import { checkDecodlJobStatus } from '../decodl/client'

// ─── Fix 3: Concurrency lock ──────────────────────────────────────────────────
// Prevents overlapping cron runs. If the previous poll tick is still running
// when the next minute fires, the new tick exits immediately instead of
// spawning a second concurrent loop that doubles Decodl API calls.
let isPolling = false

export const pollDecodlJobs = async (_args: unknown, context: any) => {
  if (isPolling) {
    console.log('[Poll] Previous run still in progress — skipping this tick.')
    return
  }

  isPolling = true
  const startedAt = Date.now()

  try {
    const processingDownloads = await context.entities.Download.findMany({
      where: {
        status: 'processing',
        decodlJobId: { not: null },
      },
      // Hard cap: never process more than 50 per tick to stay within Decodl rate limits.
      // Oldest-polled-first so every download gets attention, not just the newest.
      take: 50,
      orderBy: { lastPolledAt: 'asc' },
    })

    if (processingDownloads.length === 0) return

    console.log(`[Poll] Checking ${processingDownloads.length} downloads...`)

    for (const download of processingDownloads) {
      // Skip: polled within last 25 seconds (Decodl updates ~every 30s)
      if (download.lastPolledAt) {
        const secondsSincePoll = (Date.now() - download.lastPolledAt.getTime()) / 1000
        if (secondsSincePoll < 25) continue
      }

      // Timeout: 30 minutes stuck in processing = failure + auto-refund
      const minutesProcessing = (Date.now() - download.createdAt.getTime()) / 60000
      if (minutesProcessing > 30) {
        await handleDownloadFailure(download, context, 'Download timed out after 30 minutes')
        continue
      }

      try {
        const result = await checkDecodlJobStatus(download.decodlJobId!)

        if (result.status === 'completed' && result.downloadUrl) {
          await context.entities.Download.update({
            where: { id: download.id },
            data: {
              status: 'completed',
              downloadUrl: result.downloadUrl,
              fileName: result.fileName || null,
              fileSize: result.fileSize || null,
              thumbnailUrl: result.thumbnailUrl || null,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              lastPolledAt: new Date(),
            },
          })
          console.log(`[Poll] Download ${download.id} completed.`)

        } else if (result.status === 'failed') {
          await handleDownloadFailure(download, context, result.errorMessage || 'Download failed')

        } else {
          // Still processing — update progress + timestamp
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
  } finally {
    // Always release the lock — even if something throws
    isPolling = false
  }
}

async function handleDownloadFailure(download: any, context: any, errorMessage: string) {
  const user = await context.entities.User.findUnique({ where: { id: download.userId } })
  if (!user) return

  const newBalance = user.credits + download.creditsCharged

  await Promise.all([
    context.entities.Download.update({
      where: { id: download.id },
      data: { status: 'failed', errorMessage, lastPolledAt: new Date() },
    }),
    context.entities.User.update({
      where: { id: user.id },
      data: {
        credits: newBalance,
        lifetimeCreditsSpent: { decrement: download.creditsCharged },
      },
    }),
    context.entities.CreditTransaction.create({
      data: {
        userId: user.id,
        amount: download.creditsCharged,
        balance: newBalance,
        type: 'refund',
        reference: download.id,
        description: `Refund for failed download from ${download.providerSlug}`,
      },
    }),
  ])

  console.log(`[Poll] Refunded ${download.creditsCharged} credits to user ${download.userId} — ${errorMessage}`)
}

export const expireOldDownloads = async (_args: unknown, context: any) => {
  const result = await context.entities.Download.updateMany({
    where: {
      status: 'completed',
      expiresAt: { lt: new Date() },
    },
    data: { downloadUrl: null },
  })
  if (result.count > 0) console.log(`[Expire] Cleared ${result.count} expired download links.`)
}
