import { type GetProviderPricing, type GetMyTransactions, type GetMyCreditBalance, type ClaimSignupBonus } from 'wasp/server/operations'
import { HttpError } from 'wasp/server'

// ─── Fix 1: Provider pricing cache (5-min TTL) ────────────────────────────────
// Eliminates repeated DB hits for the most-read query in the app.
// All 500 concurrent users share one cached result instead of hammering the DB.
let pricingCache: { data: any[] | null; at: number } = { data: null, at: 0 }
const PRICING_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export function invalidatePricingCache() {
  pricingCache = { data: null, at: 0 }
}

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
  const safePage = Math.max(1, Math.floor(Number(page) || 1))
  const skip = (safePage - 1) * PAGE_SIZE

  const [transactions, total] = await Promise.all([
    context.entities.CreditTransaction.findMany({
      where: { userId: context.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    context.entities.CreditTransaction.count({ where: { userId: context.user.id } }),
  ])

  return { transactions, total, page: safePage, totalPages: Math.ceil(total / PAGE_SIZE) }
}

// ─── Fix 2: Payment sync rate-limiter ─────────────────────────────────────────
// Prevents 500 users × 6 calls/min = 3,000 external DigiMart API calls/min.
// Each pending payment is only synced once per 2 minutes, and only if it's
// recent enough to still be plausible (created within the last 30 minutes).
const SYNC_COOLDOWN_MS   = 2 * 60 * 1000  // don't re-check same payment within 2 min
const SYNC_MAX_AGE_MS    = 30 * 60 * 1000 // stop checking after 30 min (stale = cancelled)
const DIGIMART_BASE      = 'https://pay.digimartsolutions.lk'

export const getMyCreditBalance: GetMyCreditBalance<void, { credits: number; reservedCredits: number; available: number }> = async (_args, context) => {
  if (!context.user) throw new HttpError(401)

  const userId = context.user.id

  const pendingPayments = await context.entities.Payment.findMany({
    where: { userId, status: 'pending' },
  })

  if (pendingPayments.length > 0) {
    const merchantKey = process.env.PAYHERE_MERCHANT_KEY!

    await Promise.all(pendingPayments.map(async (payment) => {
      const ageMs     = Date.now() - new Date(payment.createdAt).getTime()
      const updatedMs = Date.now() - new Date(payment.updatedAt).getTime()

      if (ageMs > SYNC_MAX_AGE_MS) {
        await context.entities.Payment.update({
          where: { id: payment.id },
          data: { status: 'cancelled', updatedAt: new Date() },
        })
        return
      }
      const isNeverChecked = Math.abs(payment.updatedAt.getTime() - payment.createdAt.getTime()) < 5000
      if (!isNeverChecked && updatedMs < SYNC_COOLDOWN_MS) return

      try {
        const res = await fetch(`${DIGIMART_BASE}/api/v1/status/${payment.payhereOrderId}`, {
          headers: { Authorization: `Bearer ${merchantKey}` },
          signal: AbortSignal.timeout(5000),
        })

        if (!res.ok) return

        const body      = await res.json() as { status: string; data: { status: string } }
        const apiStatus = body?.data?.status ?? null

        if (apiStatus === 'SUCCESS') {
          const syncClaimed = await context.entities.Payment.updateMany({
            where: { id: payment.id, status: 'pending' },
            data: { status: 'paid', updatedAt: new Date() },
          })
          if (syncClaimed.count === 0) return

          const dbUser = await context.entities.User.findUnique({ where: { id: userId } })
          if (!dbUser) return

          const estimatedBalance = dbUser.credits + payment.creditsAwarded

          await Promise.all([
            context.entities.User.update({
              where: { id: userId },
              data: {
                credits: { increment: payment.creditsAwarded },
                lifetimeCreditsEarned: { increment: payment.creditsAwarded },
                lifetimeSpentLKR: { increment: payment.amountLKR },
              },
            }),
            context.entities.CreditTransaction.create({
              data: {
                userId,
                amount: payment.creditsAwarded,
                balance: estimatedBalance,
                type: 'purchase',
                reference: payment.id,
                description: `Purchased ${payment.creditsAwarded} credits — Rs. ${payment.amountLKR.toLocaleString()} (Sync: ${payment.payhereOrderId})`,
              },
            }),
          ])

          console.log(`[Balance sync] Credited ${payment.creditsAwarded} credits to user ${userId}`)

        } else if (apiStatus === 'FAILED' || apiStatus === 'CANCELLED') {
          await context.entities.Payment.update({
            where: { id: payment.id },
            data: { status: apiStatus === 'FAILED' ? 'failed' : 'cancelled', updatedAt: new Date() },
          })
        } else {
          await context.entities.Payment.update({
            where: { id: payment.id },
            data: { updatedAt: new Date() },
          })
        }
      } catch (err) {
        console.error('[Balance sync] DigiMart status check failed:', err)
      }
    }))
  }

  const user = await context.entities.User.findUnique({
    where: { id: userId },
    select: { credits: true, reservedCredits: true },
  })

  if (!user) throw new HttpError(404)
  return {
    credits: user.credits,
    reservedCredits: user.reservedCredits,
    available: user.credits - user.reservedCredits,
  }
}

export const claimSignupBonus: ClaimSignupBonus<void, { credits: number }> = async (
  _args,
  context
) => {
  if (!context.user) throw new HttpError(401)

  const BONUS_CREDITS = 2

  // Atomic check-and-set: only update if freeCreditsClaimed is still false.
  // Prevents race condition where two simultaneous calls both award the bonus.
  const claimed = await context.entities.User.updateMany({
    where: { id: context.user.id, freeCreditsClaimed: false },
    data: {
      credits: { increment: BONUS_CREDITS },
      lifetimeCreditsEarned: { increment: BONUS_CREDITS },
      freeCreditsClaimed: true,
    },
  })
  if (claimed.count === 0) throw new HttpError(400, 'Signup bonus already claimed')

  const user = await context.entities.User.findUnique({
    where: { id: context.user.id },
    select: { credits: true },
  })

  await context.entities.CreditTransaction.create({
    data: {
      userId: context.user.id,
      amount: BONUS_CREDITS,
      balance: user?.credits ?? BONUS_CREDITS,
      type: 'bonus',
      description: 'Welcome bonus — 2 free credits on signup',
    },
  })

  return { credits: user?.credits ?? BONUS_CREDITS }
}
