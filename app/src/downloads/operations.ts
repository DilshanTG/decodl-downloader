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
  const safePage = Math.max(1, Math.floor(Number(page) || 1))
  const skip = (safePage - 1) * PAGE_SIZE

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

  return { downloads, total, page: safePage, totalPages: Math.ceil(total / PAGE_SIZE) }
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

  // Input validation
  if (link && link.length > 2048) throw new HttpError(400, 'URL is too long.')
  if (code && code.length > 500)  throw new HttpError(400, 'Code is too long.')
  if (options.length > 20)        throw new HttpError(400, 'Too many options provided.')
  if (link) {
    try {
      const parsed = new URL(link)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new HttpError(400, 'Only http:// and https:// URLs are supported.')
    } catch (e) {
      if (e instanceof HttpError) throw e
      throw new HttpError(400, 'Invalid URL format.')
    }
  }
  for (const opt of options) {
    if (opt.name.length > 100 || opt.value.length > 500) throw new HttpError(400, 'Option name or value is too long.')
  }

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

  // Credit cost = max(our DB price, Decodl's actual cost for this asset).
  // We call Decodl /info to get their real cost so the charge matches what the user saw in the preview.
  // Falls back to our DB price if Decodl /info is unavailable (fail-safe).
  let creditCost = pricing.creditCost
  try {
    const assetInfo = await getDecodlAssetInfo({ link, code, providerName: resolvedSlug, options })
    creditCost = parseFloat(Math.max(pricing.creditCost, assetInfo.ratio).toFixed(2))
  } catch {
    // Decodl /info failed — fall back to our DB price, which is always safe to charge
  }

  // 3. Check user balance and concurrent cap
  const user = await context.entities.User.findUnique({ where: { id: context.user.id } })
  if (!user) throw new HttpError(404)

  const MAX_CONCURRENT = 5
  const activeCount = await context.entities.Download.count({
    where: { userId: user.id, status: { in: ['pending', 'processing'] } },
  })
  if (activeCount >= MAX_CONCURRENT) {
    throw new HttpError(429, `You already have ${activeCount} downloads in progress. Wait for them to finish before submitting more.`)
  }

  // 4. ATOMIC credit reserve — prevents double-submit race condition.
  //    updateMany WHERE clause is evaluated atomically at the DB level.
  //    Two simultaneous requests cannot both succeed: the first increments reservedCredits,
  //    causing the second's WHERE check (reservedCredits <= credits - cost) to fail.
  //    credits stays unchanged — only reservedCredits increases.
  const reserved = await context.entities.User.updateMany({
    where: {
      id: user.id,
      reservedCredits: { lte: user.credits - creditCost }, // atomic: credits - reservedCredits >= creditCost
    },
    data: { reservedCredits: { increment: creditCost } },
  })
  if (reserved.count === 0) {
    const available = user.credits - user.reservedCredits
    throw new HttpError(402, `Insufficient credits. You need ${creditCost} credits but have ${available.toFixed(1)} available (${user.reservedCredits.toFixed(1)} reserved in active downloads).`)
  }

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

  // Atomic reserve — same race-condition-proof pattern as submitDownload
  const reserved = await context.entities.User.updateMany({
    where: {
      id: user.id,
      reservedCredits: { lte: user.credits - download.creditsCharged },
    },
    data: { reservedCredits: { increment: download.creditsCharged } },
  })
  if (reserved.count === 0) {
    const available = user.credits - user.reservedCredits
    throw new HttpError(402, `Insufficient credits. You need ${download.creditsCharged} credits but have ${available.toFixed(1)} available.`)
  }

  const availableAfterReserve = user.credits - user.reservedCredits - download.creditsCharged

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

// Rate limiter: max 30 preview requests per user per minute (prevents Decodl quota exhaustion)
const assetInfoCalls = new Map<string, number[]>()
const ASSET_INFO_MAX_PER_MIN = 30

export const getAssetInfo: GetAssetInfo<GetAssetInfoInput, any> = async (
  { link, code, providerSlug, options = [] },
  context
) => {
  if (!context.user) throw new HttpError(401)

  // Input validation (same rules as submitDownload)
  if (link && link.length > 2048) throw new HttpError(400, 'URL is too long.')
  if (code && code.length > 500)  throw new HttpError(400, 'Code is too long.')
  if (options.length > 20)        throw new HttpError(400, 'Too many options provided.')
  if (link) {
    try {
      const parsed = new URL(link)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new HttpError(400, 'Only http:// and https:// URLs are supported.')
    } catch (e) {
      if (e instanceof HttpError) throw e
      throw new HttpError(400, 'Invalid URL format.')
    }
  }
  for (const opt of options) {
    if (opt.name.length > 100 || opt.value.length > 500) throw new HttpError(400, 'Option name or value is too long.')
  }

  const now = Date.now()
  const key = context.user.id
  const recent = (assetInfoCalls.get(key) || []).filter(t => now - t < 60_000)
  if (recent.length >= ASSET_INFO_MAX_PER_MIN) {
    throw new HttpError(429, 'Too many preview requests. Please wait a moment before trying again.')
  }
  assetInfoCalls.set(key, [...recent, now])

  let resolvedSlug = providerSlug
  if (!resolvedSlug && link) resolvedSlug = detectProviderFromUrl(link) || undefined
  if (!resolvedSlug) throw new HttpError(400, 'Could not detect provider. Please paste a valid URL.')

  try {
    const info = await getDecodlAssetInfo({ link, code, providerName: resolvedSlug, options })

    const pricing = await context.entities.ProviderPricing.findFirst({
      where: { slug: resolvedSlug, isActive: true },
    })

    const ourCost    = pricing ? pricing.creditCost : 1.0
    const decodlCost = info.ratio  // Decodl's actual credit cost for this asset (not a multiplier)

    // Show our price unless Decodl charges more — in that case pass the higher cost to the user.
    // If decodlCost < ourCost we already profit at ourCost, so show ourCost.
    // If decodlCost > ourCost Decodl costs us more than we planned, so show decodlCost.
    const displayCost = parseFloat(Math.max(ourCost, decodlCost).toFixed(2))

    return {
      providerSlug: resolvedSlug,
      ratio: info.ratio,
      calculatedCost: displayCost,
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
      error: 'Could not fetch live asset info. Default pricing will be used.',
    }
  }
}
