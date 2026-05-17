import { type GetMyDownloads, type GetDownloadById, type SubmitDownload, type RetryFailedDownload, type GetAssetInfo } from 'wasp/server/operations'
import { HttpError } from 'wasp/server'
import { submitDecodlDownload, detectProviderFromUrl, getDecodlAssetInfo } from '../decodl/client'

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

  // Detect provider from URL if not provided
  let resolvedSlug = providerSlug
  if (!resolvedSlug && link) {
    resolvedSlug = detectProviderFromUrl(link) || undefined
  }
  if (!resolvedSlug) throw new HttpError(400, 'Could not detect provider. Please paste a valid URL.')

  // Look up pricing
  const resolvedVariant = variant || 'normal'
  const pricing = await context.entities.ProviderPricing.findFirst({
    where: {
      slug: resolvedSlug,
      variant: resolvedVariant,
      isActive: true,
    },
  })

  if (!pricing) throw new HttpError(404, `Provider "${resolvedSlug}" (${resolvedVariant}) not found or inactive.`)

  const creditCost = pricing.creditCost
  const user = await context.entities.User.findUnique({ where: { id: context.user.id } })
  if (!user) throw new HttpError(404)

  if (user.credits < creditCost) {
    throw new HttpError(402, `Insufficient credits. You need ${creditCost} credits but have ${user.credits.toFixed(1)}.`)
  }

  // Atomic transaction: deduct credits, create download, call Decodl
  let decodlJobId: string | null = null
  let downloadStatus = 'pending'
  let errorMessage: string | null = null

  try {
    const decodlResult = await submitDecodlDownload({ link, code, providerName: resolvedSlug, options })
    decodlJobId = decodlResult.jobId
    downloadStatus = 'processing'
  } catch (err: any) {
    downloadStatus = 'failed'
    errorMessage = err.message || 'Decodl API error'
    console.error('Decodl submit error:', err)
  }

  const newBalance = user.credits - (downloadStatus === 'failed' ? 0 : creditCost)

  const [download] = await Promise.all([
    context.entities.Download.create({
      data: {
        userId: user.id,
        status: downloadStatus,
        decodlJobId,
        providerSlug: resolvedSlug,
        code: code || null,
        link: link || null,
        options: options.length > 0 ? options : undefined,
        creditsCharged: downloadStatus === 'failed' ? 0 : creditCost,
        errorMessage,
        lastPolledAt: downloadStatus === 'processing' ? new Date() : null,
      },
    }),
    ...(downloadStatus !== 'failed'
      ? [
          context.entities.User.update({
            where: { id: user.id },
            data: {
              credits: newBalance,
              lifetimeCreditsSpent: { increment: creditCost },
            },
          }),
          context.entities.CreditTransaction.create({
            data: {
              userId: user.id,
              amount: -creditCost,
              balance: newBalance,
              type: 'download',
              description: `Download from ${pricing.displayName}`,
            },
          }),
        ]
      : []),
  ])

  if (downloadStatus === 'failed') {
    throw new HttpError(503, errorMessage || 'Download service temporarily unavailable')
  }

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
  if (user.credits < download.creditsCharged) {
    throw new HttpError(402, `Insufficient credits. You need ${download.creditsCharged} credits.`)
  }

  let decodlJobId: string | null = null
  let newStatus = 'failed'
  let errorMsg: string | null = null

  try {
    const result = await submitDecodlDownload({
      link: download.link || undefined,
      code: download.code || undefined,
      providerName: download.providerSlug,
      options: (download.options as any[]) || [],
    })
    decodlJobId = result.jobId
    newStatus = 'processing'
  } catch (err: any) {
    errorMsg = err.message
  }

  const newBalance = newStatus === 'processing' ? user.credits - download.creditsCharged : user.credits

  await Promise.all([
    context.entities.Download.update({
      where: { id },
      data: {
        status: newStatus,
        decodlJobId,
        retryCount: { increment: 1 },
        errorMessage: errorMsg,
        lastPolledAt: newStatus === 'processing' ? new Date() : undefined,
      },
    }),
    ...(newStatus === 'processing'
      ? [
          context.entities.User.update({
            where: { id: user.id },
            data: { credits: newBalance, lifetimeCreditsSpent: { increment: download.creditsCharged } },
          }),
          context.entities.CreditTransaction.create({
            data: {
              userId: user.id,
              amount: -download.creditsCharged,
              balance: newBalance,
              type: 'download',
              description: `Retry download from ${download.providerSlug}`,
            },
          }),
        ]
      : []),
  ])

  return { success: newStatus === 'processing' }
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
  if (!resolvedSlug && link) {
    resolvedSlug = detectProviderFromUrl(link) || undefined
  }
  if (!resolvedSlug) throw new HttpError(400, 'Could not detect provider. Please paste a valid URL.')

  try {
    const info = await getDecodlAssetInfo({ link, code, providerName: resolvedSlug, options })

    const pricing = await context.entities.ProviderPricing.findFirst({
      where: {
        slug: resolvedSlug,
        isActive: true,
      },
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
      where: {
        slug: resolvedSlug,
        isActive: true,
      },
    })
    const baseCost = pricing ? pricing.creditCost : 1.0

    return {
      providerSlug: resolvedSlug,
      ratio: 1.0,
      calculatedCost: baseCost,
      options: [],
      error: err.message || 'Could not fetch live dynamic options.',
    }
  }
}

