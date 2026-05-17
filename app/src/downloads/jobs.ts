import { checkDecodlJobStatus } from '../decodl/client'

export const pollDecodlJobs = async (_args: unknown, context: any) => {
  const processingDownloads = await context.entities.Download.findMany({
    where: {
      status: 'processing',
      decodlJobId: { not: null },
    },
    take: 50,
    orderBy: { lastPolledAt: 'asc' },
  })

  console.log(`Polling ${processingDownloads.length} processing downloads...`)

  for (const download of processingDownloads) {
    // Skip downloads that were polled in the last 25 seconds
    if (download.lastPolledAt) {
      const secondsSincePoll = (Date.now() - download.lastPolledAt.getTime()) / 1000
      if (secondsSincePoll < 25) continue
    }

    // Timeout: mark as failed if processing for >30 minutes
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
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
            lastPolledAt: new Date(),
          },
        })
        console.log(`Download ${download.id} completed.`)
      } else if (result.status === 'failed') {
        await handleDownloadFailure(download, context, result.errorMessage || 'Download failed')
      } else {
        const currentOptions = (download.options as any) || {}
        const updatedOptions = { ...currentOptions, progress: result.progress || 0 }

        await context.entities.Download.update({
          where: { id: download.id },
          data: { 
            lastPolledAt: new Date(),
            options: updatedOptions
          },
        })
      }
    } catch (err: any) {
      console.error(`Error polling download ${download.id}:`, err.message)
      await context.entities.Download.update({
        where: { id: download.id },
        data: { lastPolledAt: new Date(), errorMessage: err.message },
      })
    }
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

  console.log(`Refunded ${download.creditsCharged} credits to user ${download.userId} for failed download ${download.id}`)
}

export const expireOldDownloads = async (_args: unknown, context: any) => {
  const result = await context.entities.Download.updateMany({
    where: {
      status: 'completed',
      expiresAt: { lt: new Date() },
    },
    data: { downloadUrl: null },
  })
  console.log(`Expired ${result.count} download links.`)
}
