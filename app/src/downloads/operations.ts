import { type GetMyDownloads, type GetDownloadById, type SubmitDownload, type RetryFailedDownload, type GetAssetInfo } from 'wasp/server/operations'
import { HttpError } from 'wasp/server'
import { processDecodlSubmission } from 'wasp/server/jobs'
import { detectProviderFromUrl, getDecodlAssetInfo } from '../decodl/client'

type GetMyDownloadsInput = { page?: number; status?: string; providerSlug?: string }
type GetMyDownloadsOutput = { downloads: any[]; total: number; page: number; totalPages: number }

export const getMyDownloads: GetMyDownloads<GetMyDownloadsInput, GetMyDownloadsOutput> = async (
  { page = 1, status, providerSlug } = {},
  context
) => {
  if (!context.user) throw new HttpError(401)

  const PAGE_SIZE = 20
  const skip = (page - 1) * PAGE_SIZE

  const where: any = { userId: context.user.id }
  if (status) where.status = status
  if (providerSlug) where.providerSlug = providerSlug

  const [downloads, total] = await Promise.all([
    context.entities.Download.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    context.entities.Download.count({ where }),
  ])

  return { downloads, total, page, totalPages: Math.ceil(total / PAGE_SIZE) }
}

export const getDownloadById: GetDownloadById<{ id: string }, any> = async ({ id }, context) => {
  if (!context.user) throw new HttpError(401)

  const download = await context.entities.Download.findUnique({ where: { id } })
  if (!download) throw new HttpError(404, 'Download not found')
  if (download.userId !== context.user.id && !context.user.isAdmin) throw new HttpError(403)

  return download
}

type SubmitDownloadInput = {
  link?: string
  code?: string
  providerSlug?: string
  variant?: string
  options?: Array<{ name: string; value: string }>
}

export const submitDownload: SubmitDownload<SubmitDownloadInput, any> = async (
  { link, code, providerSlug, variant, options = [] },
  context
) => {
  if (!context.user) throw new HttpError(401)

  // 1. Detect provider
  let resolvedSlug = providerSlug
  if (!resolvedSlug && link) resolvedSlug = detectProviderFromUrl(link) || undefined
  if (!resolvedSlug) throw new HttpError(400, 'Could not detect provider. Please paste a valid URL.')

  // 2. Look up credit cost from DB (not the 5-min cache — pricing is used for billing, must be fresh)
  const resolvedVariant = variant || 'normal'
  const pricing = await context.entities.ProviderPricing.findFirst({
    where: { slug: resolvedSlug, variant: resolvedVariant, isActive: true },
  })
  if (!pricing) throw new HttpError(404, `Provider "${resolvedSlug}" (${resolvedVariant}) not found or inactive.`)

  const creditCost = pricing.creditCost

  // 3. Check user balance and concurrent cap
  const user = await context.entities.User.findUnique({ where: { id: context.user.id } })
  if (!user) throw new HttpError(404)

  const available = user.credits - user.reservedCredits
  if (available < creditCost) {
    throw new HttpError(402, `Insufficient credits. You need ${creditCost} credits but have ${available.toFixed(1)} available (${user.reservedCredits.toFixed(1)} reserved in active downloads).`)
  }

  const MAX_CONCURRENT = 5
  const activeCount = await context.entities.Download.count({
    where: { userId: user.id, status: { in: ['pending', 'processing'] } },
  })
  if (activeCount >= MAX_CONCURRENT) {
    throw new HttpError(429, `You already have ${activeCount} downloads in progress. Wait for them to finish before submitting more.`)
  }

  // 4. RESERVE credits (do NOT deduct yet).
  //    credits stays unchanged — only reservedCredits increases.
  //    Available balance = credits - reservedCredits.
  //    Credits are only permanently deducted when the download is confirmed complete.
  //    On failure: reservedCredits decreases back to 0, credits untouched = full refund guaranteed.
  const availableAfterReserve = user.credits - user.reservedCredits - creditCost

  const [download] = await Promise.all([
    context.entities.Download.create({
      data: {
        userId: user.id,
        status: 'pending',
        decodlJobId: null,
        providerSlug: resolvedSlug,
        code: code || null,
        link: link || null,
        options: options.length > 0 ? options : undefined,
        creditsCharged: creditCost,
        errorMessage: null,
        lastPolledAt: null,
      },
    }),
    context.entities.User.update({
      where: { id: user.id },
      data: { reservedCredits: { increment: creditCost } },
    }),
    context.entities.CreditTransaction.create({
      data: {
        userId: user.id,
        amount: -creditCost,
        balance: availableAfterReserve,
        type: 'download',
        description: `Credits reserved for download from ${pricing.displayName} (pending)`,
      },
    }),
  ])

  // 5. Enqueue the Decodl submission — PgBoss runs it with max 5 concurrent workers.
  //    If this fails (PgBoss DB insert error), we have a pending download with no job —
  //    the pendingTimeout check in pollDecodlJobs will auto-refund it after 5 minutes.
  await processDecodlSubmission.submit({ downloadId: download.id })

  return download
}

export const retryFailedDownload: RetryFailedDownload<{ id: string }, any> = async ({ id }, context) => {
  if (!context.user) throw new HttpError(401)

  const download = await context.entities.Download.findUnique({ where: { id } })
  if (!download) throw new HttpError(404)
  if (download.userId !== context.user.id) throw new HttpError(403)
  if (download.status !== 'failed') throw new HttpError(400, 'Only failed downloads can be retried')
  if (download.retryCount >= 3) throw new HttpError(400, 'Maximum retry attempts (3) reached')

  const user = await context.entities.User.findUnique({ where: { id: context.user.id } })
  if (!user) throw new HttpError(404)

  const available = user.credits - user.reservedCredits
  if (available < download.creditsCharged) {
    throw new HttpError(402, `Insufficient credits. You need ${download.creditsCharged} credits but have ${available.toFixed(1)} available.`)
  }

  const availableAfterReserve = available - download.creditsCharged

  // Reserve credits for the retry — same pattern as initial submit
  await Promise.all([
    context.entities.Download.update({
      where: { id },
      data: {
        status: 'pending',
        decodlJobId: null,
        retryCount: { increment: 1 },
        errorMessage: null,
        lastPolledAt: null,
      },
    }),
    context.entities.User.update({
      where: { id: user.id },
      data: { reservedCredits: { increment: download.creditsCharged } },
    }),
    context.entities.CreditTransaction.create({
      data: {
        userId: user.id,
        amount: -download.creditsCharged,
        balance: availableAfterReserve,
        type: 'download',
        description: `Credits reserved for retry — ${download.providerSlug} (pending)`,
      },
    }),
  ])

  await processDecodlSubmission.submit({ downloadId: id })

  return { success: true }
}

type GetAssetInfoInput = {
  link?: string
  code?: string
  providerSlug?: string
  options?: Array<{ name: string; value: string }>
}

export const getAssetInfo: GetAssetInfo<GetAssetInfoInput, any> = async (
  { link, code, providerSlug, options = [] },
  context
) => {
  if (!context.user) throw new HttpError(401)

  let resolvedSlug = providerSlug
  if (!resolvedSlug && link) resolvedSlug = detectProviderFromUrl(link) || undefined
  if (!resolvedSlug) throw new HttpError(400, 'Could not detect provider. Please paste a valid URL.')

  try {
    const info = await getDecodlAssetInfo({ link, code, providerName: resolvedSlug, options })

    const pricing = await context.entities.ProviderPricing.findFirst({
      where: { slug: resolvedSlug, isActive: true },
    })

    const baseCost = pricing ? pricing.creditCost : 1.0
    const calculatedCost = baseCost * info.ratio

    return {
      providerSlug: resolvedSlug,
      ratio: info.ratio,
      calculatedCost: Math.max(0.1, parseFloat(calculatedCost.toFixed(2))),
      options: info.options || [],
    }
  } catch (err: any) {
    console.error('Decodl /info retrieval error:', err)
    const pricing = await context.entities.ProviderPricing.findFirst({
      where: { slug: resolvedSlug, isActive: true },
    })
    return {
      providerSlug: resolvedSlug,
      ratio: 1.0,
      calculatedCost: pricing ? pricing.creditCost : 1.0,
      options: [],
      error: err.message || 'Could not fetch live asset info.',
    }
  }
}
