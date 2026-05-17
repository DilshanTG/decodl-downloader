import { type GetProviderPricing, type GetMyTransactions, type GetMyCreditBalance, type ClaimSignupBonus } from 'wasp/server/operations'
import { HttpError } from 'wasp/server'

// ─── Fix 1: Provider pricing cache (5-min TTL) ────────────────────────────────
// Eliminates repeated DB hits for the most-read query in the app.
// All 500 concurrent users share one cached result instead of hammering the DB.
let pricingCache: { data: any[] | null; at: number } = { data: null, at: 0 }
const PRICING_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export const getProviderPricing: GetProviderPricing<void, any[]> = async (_args, context) => {
  if (pricingCache.data !== null && Date.now() - pricingCache.at < PRICING_CACHE_TTL_MS) {
    return pricingCache.data
  }
  const data = await context.entities.ProviderPricing.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
  pricingCache = { data, at: Date.now() }
  return data
}

type GetMyTransactionsInput = { page?: number }
type GetMyTransactionsOutput = { transactions: any[]; total: number; page: number; totalPages: number }

export const getMyTransactions: GetMyTransactions<GetMyTransactionsInput, GetMyTransactionsOutput> = async (
  { page = 1 } = {},
  context
) => {
  if (!context.user) throw new HttpError(401)

  const PAGE_SIZE = 20
  const skip = (page - 1) * PAGE_SIZE

  const [transactions, total] = await Promise.all([
    context.entities.CreditTransaction.findMany({
      where: { userId: context.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    context.entities.CreditTransaction.count({ where: { userId: context.user.id } }),
  ])

  return { transactions, total, page, totalPages: Math.ceil(total / PAGE_SIZE) }
}

// ─── Fix 2: Payment sync rate-limiter ─────────────────────────────────────────
// Prevents 500 users × 6 calls/min = 3,000 external DigiMart API calls/min.
// Each pending payment is only synced once per 2 minutes, and only if it's
// recent enough to still be plausible (created within the last 30 minutes).
const SYNC_COOLDOWN_MS   = 2 * 60 * 1000  // don't re-check same payment within 2 min
const SYNC_MAX_AGE_MS    = 30 * 60 * 1000 // stop checking after 30 min (stale = cancelled)
const DIGIMART_BASE      = 'https://pay.digimartsolutions.lk'

export const getMyCreditBalance: GetMyCreditBalance<void, { credits: number }> = async (_args, context) => {
  if (!context.user) throw new HttpError(401)

  const pendingPayments = await context.entities.Payment.findMany({
    where: { userId: context.user.id, status: 'pending' },
  })

  if (pendingPayments.length > 0) {
    const merchantKey = process.env.PAYHERE_MERCHANT_KEY!

    for (const payment of pendingPayments) {
      const ageMs      = Date.now() - new Date(payment.createdAt).getTime()
      const updatedMs  = Date.now() - new Date(payment.updatedAt).getTime()

      // Skip: too old (likely abandoned) or checked too recently
      if (ageMs > SYNC_MAX_AGE_MS) {
        await context.entities.Payment.update({
          where: { id: payment.id },
          data: { status: 'cancelled', updatedAt: new Date() },
        })
        continue
      }
      if (updatedMs < SYNC_COOLDOWN_MS) continue

      try {
        const res = await fetch(`${DIGIMART_BASE}/api/v1/status/${payment.payhereOrderId}`, {
          headers: { Authorization: `Bearer ${merchantKey}` },
          signal: AbortSignal.timeout(5000), // 5s timeout — don't block the balance response
        })

        if (!res.ok) continue

        const body      = await res.json() as { status: string; data: { status: string } }
        const apiStatus = body?.data?.status ?? null

        if (apiStatus === 'SUCCESS') {
          const dbUser = await context.entities.User.findUnique({ where: { id: context.user.id } })
          if (!dbUser) continue

          const newBalance = dbUser.credits + payment.creditsAwarded

          await Promise.all([
            context.entities.User.update({
              where: { id: context.user.id },
              data: {
                credits: newBalance,
                lifetimeCreditsEarned: { increment: payment.creditsAwarded },
                lifetimeSpentLKR: { increment: payment.amountLKR },
              },
            }),
            context.entities.Payment.update({
              where: { id: payment.id },
              data: { status: 'paid', updatedAt: new Date() },
            }),
            context.entities.CreditTransaction.create({
              data: {
                userId: context.user.id,
                amount: payment.creditsAwarded,
                balance: newBalance,
                type: 'purchase',
                reference: payment.id,
                description: `Purchased ${payment.creditsAwarded} credits — Rs. ${payment.amountLKR.toLocaleString()} (Sync: ${payment.payhereOrderId})`,
              },
            }),
          ])

          console.log(`[Balance sync] Credited ${payment.creditsAwarded} credits to user ${context.user.id}`)

        } else if (apiStatus === 'FAILED' || apiStatus === 'CANCELLED') {
          await context.entities.Payment.update({
            where: { id: payment.id },
            data: { status: apiStatus === 'FAILED' ? 'failed' : 'cancelled', updatedAt: new Date() },
          })
        } else {
          // Still pending — just update timestamp to reset cooldown clock
          await context.entities.Payment.update({
            where: { id: payment.id },
            data: { updatedAt: new Date() },
          })
        }
      } catch (err) {
        console.error('[Balance sync] DigiMart status check failed:', err)
      }
    }
  }

  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { credits: true },
  })

  if (!user) throw new HttpError(404)
  return { credits: user.credits }
}

export const claimSignupBonus: ClaimSignupBonus<void, { credits: number }> = async (
  _args,
  context
) => {
  if (!context.user) throw new HttpError(401)

  const user = await context.entities.User.findUnique({ where: { id: context.user.id } })
  if (!user) throw new HttpError(404)

  if (user.freeCreditsClaimed) throw new HttpError(400, 'Signup bonus already claimed')

  const BONUS_CREDITS = 2
  const newBalance    = user.credits + BONUS_CREDITS

  await Promise.all([
    context.entities.User.update({
      where: { id: user.id },
      data: {
        credits: newBalance,
        lifetimeCreditsEarned: { increment: BONUS_CREDITS },
        freeCreditsClaimed: true,
      },
    }),
    context.entities.CreditTransaction.create({
      data: {
        userId: user.id,
        amount: BONUS_CREDITS,
        balance: newBalance,
        type: 'bonus',
        description: 'Welcome bonus — 2 free credits on signup',
      },
    }),
  ])

  return { credits: newBalance }
}
