import { type GetMyDownloads, type GetDownloadById, type SubmitDownload, type RetryFailedDownload, type GetAssetInfo, type GetDecodlBalance } from 'wasp/server/operations'
import { HttpError } from 'wasp/server'
import { processDecodlSubmission } from 'wasp/server/jobs'
import { detectProviderFromUrl, getDecodlAssetInfo, fetchDecodlBalance } from '../decodl/client'

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
  // magnific_video/magnific are rebranded freepik — DB pricing lives under freepik slugs.
  const billingSlug = resolvedSlug === 'magnific_video' ? 'freepik_video'
                    : resolvedSlug === 'magnific'       ? 'freepik'
                    : resolvedSlug
  const resolvedVariant = variant || 'normal'
  const pricing = await context.entities.ProviderPricing.findFirst({
    where: { slug: billingSlug, variant: resolvedVariant, isActive: true },
  }) ?? await context.entities.ProviderPricing.findFirst({
    where: { slug: billingSlug, isActive: true },
    orderBy: { creditCost: 'asc' },
  })
  if (!pricing) throw new HttpError(404, `Provider "${resolvedSlug}" (${resolvedVariant}) not found or inactive.`)

  const SANDBOX_SLUGS = new Set<string>([])
  const isSandbox = SANDBOX_SLUGS.has(resolvedSlug)

  // Credit cost = max(our DB price, Decodl's actual cost for this asset).
  // We call Decodl /info to get their real cost so the charge matches what the user saw in the preview.
  // Falls back to our DB price if Decodl /info is unavailable (fail-safe).
  // Hard cap: never charge more than 500 credits per download regardless of what Decodl reports.
  // Max legitimate price in our DB is 95 cr (Shutterstock 4K Select) — 500 gives headroom
  // while still blocking wildly wrong values (9999+) if Decodl API is ever compromised.
  const MAX_CREDIT_COST = 500
  let creditCost = Math.min(pricing.creditCost, MAX_CREDIT_COST)
  if (!isSandbox) {
    try {
      const assetInfo = await getDecodlAssetInfo({ link, code, providerName: resolvedSlug, options })
      creditCost = parseFloat(Math.min(Math.max(pricing.creditCost, assetInfo.ratio), MAX_CREDIT_COST).toFixed(2))
    } catch {
      // Decodl /info failed — fall back to our DB price, which is always safe to charge
    }
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

  // 4. ATOMIC credit reserve — skipped for sandbox (free) providers.
  if (!isSandbox) {
    // updateMany WHERE clause is evaluated atomically at the DB level.
    // Two simultaneous requests cannot both succeed: the first increments reservedCredits,
    // causing the second's WHERE check (reservedCredits <= credits - cost) to fail.
    const reserved = await context.entities.User.updateMany({
      where: {
        id: user.id,
        reservedCredits: { lte: user.credits - creditCost },
      },
      data: { reservedCredits: { increment: creditCost } },
    })
    if (reserved.count === 0) {
      const available = user.credits - user.reservedCredits
      throw new HttpError(402, `Insufficient credits. You need ${creditCost} credits but have ${available.toFixed(1)} available (${user.reservedCredits.toFixed(1)} reserved in active downloads).`)
    }
  }

  const availableAfterReserve = isSandbox
    ? (user.credits - user.reservedCredits)
    : (user.credits - user.reservedCredits - creditCost)

  const txOps = isSandbox ? [] : [
    context.entities.CreditTransaction.create({
      data: {
        userId: user.id,
        amount: -creditCost,
        balance: availableAfterReserve,
        type: 'download',
        description: `Credits reserved for download from ${pricing.displayName} (pending)`,
      },
    }),
  ]

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
    ...txOps,
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

    // Magnific is the rebranded Freepik — DB pricing lives under freepik/freepik_video slugs.
    const dbSlug = resolvedSlug === 'magnific_video' ? 'freepik_video'
                 : resolvedSlug === 'magnific'       ? 'freepik'
                 : resolvedSlug

    // For providers with format variants (video HD/4K), look up the variant-specific price.
    const formatOption = (options as Array<{ name: string; value: string }>).find(o => o.name === 'format')
    const pricing = formatOption
      ? (await context.entities.ProviderPricing.findFirst({
          where: { slug: dbSlug, variant: formatOption.value, isActive: true },
        }) ?? await context.entities.ProviderPricing.findFirst({
          where: { slug: dbSlug, isActive: true },
          orderBy: { creditCost: 'asc' },
        }))
      : await context.entities.ProviderPricing.findFirst({
          where: { slug: dbSlug, isActive: true },
          orderBy: { creditCost: 'asc' },
        })

    const ourCost    = pricing ? pricing.creditCost : 1.0
    const decodlCost = info.ratio  // Decodl's actual credit cost for this exact asset + format

    // decodlCost is authoritative for the selected format — use it as the floor.
    // Only apply ourCost if it's higher (we mark up above Decodl's base rate).
    const displayCost = parseFloat(Math.max(ourCost, decodlCost).toFixed(2))

    return {
      providerSlug: resolvedSlug,
      ratio: info.ratio,
      calculatedCost: displayCost,
      options: info.options || [],
    }
  } catch (err: any) {
    console.error('Decodl /info retrieval error:', err)
    const fallbackSlug = resolvedSlug === 'magnific_video' ? 'freepik_video'
                       : resolvedSlug === 'magnific'       ? 'freepik'
                       : resolvedSlug
    const pricing = await context.entities.ProviderPricing.findFirst({
      where: { slug: fallbackSlug, isActive: true },
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

// Cached Decodl balance — re-fetches at most once per 2 minutes server-side
let decodlBalanceCache: { balance: number; fetchedAt: number } | null = null
const BALANCE_CACHE_MS = 2 * 60 * 1000

export const getDecodlBalance: GetDecodlBalance<void, { balance: number; available: boolean }> = async (_args, context) => {
  if (!context.user) throw new HttpError(401)

  const now = Date.now()
  if (decodlBalanceCache && now - decodlBalanceCache.fetchedAt < BALANCE_CACHE_MS) {
    return { balance: decodlBalanceCache.balance, available: decodlBalanceCache.balance !== -1 }
  }

  const result = await fetchDecodlBalance()
  decodlBalanceCache = { balance: result.balance, fetchedAt: now }
  return result
}
