import { type GetProviderPricing, type GetMyTransactions, type GetMyCreditBalance, type ClaimSignupBonus } from 'wasp/server/operations'
import { HttpError } from 'wasp/server'

export const getProviderPricing: GetProviderPricing<void, any[]> = async (_args, context) => {
  return context.entities.ProviderPricing.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })
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

export const getMyCreditBalance: GetMyCreditBalance<void, { credits: number }> = async (_args, context) => {
  if (!context.user) throw new HttpError(401)

  // Find all pending payments for this user to sync
  const pendingPayments = await context.entities.Payment.findMany({
    where: {
      userId: context.user.id,
      status: "pending",
    },
  })

  if (pendingPayments.length > 0) {
    const DIGIMART_BASE = "https://pay.digimartsolutions.lk"
    const merchantKey = process.env.PAYHERE_MERCHANT_KEY!

    for (const payment of pendingPayments) {
      try {
        const res = await fetch(`${DIGIMART_BASE}/api/v1/status/${payment.payhereOrderId}`, {
          headers: { "Authorization": `Bearer ${merchantKey}` },
        })
        if (res.ok) {
          const body = await res.json() as { status: string; data: { status: string } }
          const apiStatus = body?.data?.status ?? null

          if (apiStatus === "SUCCESS") {
            const dbUser = await context.entities.User.findUnique({
              where: { id: context.user.id }
            })
            if (dbUser) {
              const newBalance = dbUser.credits + payment.creditsAwarded

              // Award credits atomically
              await context.entities.User.update({
                where: { id: context.user.id },
                data: {
                  credits: newBalance,
                  lifetimeCreditsEarned: { increment: payment.creditsAwarded },
                  lifetimeSpentLKR: { increment: payment.amountLKR },
                },
              })

              // Mark payment as paid
              await context.entities.Payment.update({
                where: { id: payment.id },
                data: {
                  status: "paid",
                  updatedAt: new Date(),
                },
              })

              // Create transaction log
              await context.entities.CreditTransaction.create({
                data: {
                  userId: context.user.id,
                  amount: payment.creditsAwarded,
                  balance: newBalance,
                  type: "purchase",
                  reference: payment.id,
                  description: `Purchased ${payment.creditsAwarded} credits — Rs. ${payment.amountLKR.toLocaleString()} (Sync Order: ${payment.payhereOrderId})`,
                },
              })

              console.log(`Synced & Credited ${payment.creditsAwarded} credits to user ${context.user.id}`)
            }
          } else if (apiStatus === "FAILED" || apiStatus === "CANCELLED") {
            await context.entities.Payment.update({
              where: { id: payment.id },
              data: {
                status: apiStatus === "FAILED" ? "failed" : "cancelled",
                updatedAt: new Date(),
              },
            })
          }
        }
      } catch (err) {
        console.error("Failed to sync payment status in getMyCreditBalance query:", err)
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

export const claimSignupBonus: ClaimSignupBonus<void, { credits: number }> = async (_args, context) => {
  if (!context.user) throw new HttpError(401)

  const user = await context.entities.User.findUnique({ where: { id: context.user.id } })
  if (!user) throw new HttpError(404)

  if (user.freeCreditsClaimed) {
    throw new HttpError(400, 'Signup bonus already claimed')
  }

  const BONUS_CREDITS = 2
  const newBalance = user.credits + BONUS_CREDITS

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
