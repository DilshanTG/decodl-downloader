import { HttpError, prisma } from 'wasp/server'
import type {
  AdminGetOverviewStats,
  AdminGetAllDownloads,
  AdminGetAllPayments,
  AdminGetProviderStats,
  AdminGetAllCreditTransactions,
  AdminAdjustUserCredits,
  AdminUpdateProviderPricing,
  AdminForceRetryDownload,
  AdminGetFailedDownloads,
  AdminSendPasswordReset,
} from 'wasp/server/operations'
import { processDecodlSubmission } from 'wasp/server/jobs'
import { invalidatePricingCache } from '../credits/operations'
import { sendPasswordResetEmail } from 'wasp/server/auth'
import { getPasswordResetEmailContent } from '../auth/email-and-pass/emails'

// ─── Guard helper ─────────────────────────────────────────────────────────────
function requireAdmin(context: any) {
  if (!context.user) throw new HttpError(401, 'Authentication required')
  if (!context.user.isAdmin) throw new HttpError(403, 'Admin access required')
}

// ─── Overview Stats ───────────────────────────────────────────────────────────
export const adminGetOverviewStats: AdminGetOverviewStats<void, any> = async (_args, context) => {
  requireAdmin(context)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [
    totalUsers,
    totalDownloads,
    pendingDownloads,
    processingDownloads,
    completedDownloads,
    failedDownloads,
    refundedDownloads,
    todayDownloads,
    todayFailed,
    totalCreditsIssued,
    recentFailures,
    totalRevenueLKR,
    recentPayments,
    topProviders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.download.count(),
    prisma.download.count({ where: { status: 'pending' } }),
    prisma.download.count({ where: { status: 'processing' } }),
    prisma.download.count({ where: { status: 'completed' } }),
    prisma.download.count({ where: { status: 'failed' } }),
    prisma.download.count({ where: { status: 'refunded' } }),
    prisma.download.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.download.count({ where: { status: 'failed', createdAt: { gte: todayStart } } }),
    prisma.creditTransaction.aggregate({ _sum: { amount: true }, where: { amount: { gt: 0 } } }),
    prisma.download.findMany({
      where: { status: 'failed' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { user: { select: { email: true } } },
    }),
    prisma.payment.aggregate({
      _sum: { amountLKR: true },
      where: { status: 'paid' },
    }),
    prisma.payment.findMany({
      where: { status: 'paid' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { email: true } } },
    }),
    prisma.download.groupBy({
      by: ['providerSlug'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 8,
    }),
  ])

  // 7-day revenue from payments
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const weeklyPayments = await prisma.payment.findMany({
    where: { status: 'paid', createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: 'asc' },
  })

  // Group by day
  const revenuByDay: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    revenuByDay[key] = 0
  }
  for (const p of weeklyPayments) {
    const key = p.createdAt.toISOString().slice(0, 10)
    if (revenuByDay[key] !== undefined) revenuByDay[key] += p.amountLKR
  }

  return {
    totalUsers,
    totalDownloads,
    pendingDownloads,
    processingDownloads,
    completedDownloads,
    failedDownloads,
    refundedDownloads,
    todayDownloads,
    todayFailed,
    totalCreditsIssued: totalCreditsIssued._sum.amount ?? 0,
    totalRevenueLKR: totalRevenueLKR._sum.amountLKR ?? 0,
    recentFailures,
    recentPayments,
    topProviders,
    weeklyRevenue: Object.entries(revenuByDay).map(([date, lkr]) => ({ date, lkr })),
  }
}

// ─── All Downloads (Admin) ────────────────────────────────────────────────────
type AdminGetAllDownloadsInput = {
  page?: number
  status?: string
  providerSlug?: string
  userEmail?: string
}

export const adminGetAllDownloads: AdminGetAllDownloads<AdminGetAllDownloadsInput, any> = async (
  { page = 1, status, providerSlug, userEmail } = {},
  context
) => {
  requireAdmin(context)

  const PAGE_SIZE = 20
  const safePage = Math.max(1, Math.floor(Number(page) || 1))
  const skip = (safePage - 1) * PAGE_SIZE

  const where: any = {}
  if (status) where.status = status
  if (providerSlug) where.providerSlug = providerSlug
  if (userEmail) {
    where.user = { email: { contains: userEmail, mode: 'insensitive' } }
  }

  const [downloads, total] = await Promise.all([
    prisma.download.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { user: { select: { email: true, username: true } } },
    }),
    prisma.download.count({ where }),
  ])

  return { downloads, total, page: safePage, totalPages: Math.ceil(total / PAGE_SIZE) }
}

// ─── All Payments (Admin) ─────────────────────────────────────────────────────
type AdminGetAllPaymentsInput = { page?: number; status?: string }

export const adminGetAllPayments: AdminGetAllPayments<AdminGetAllPaymentsInput, any> = async (
  { page = 1, status } = {},
  context
) => {
  requireAdmin(context)

  const PAGE_SIZE = 20
  const safePage = Math.max(1, Math.floor(Number(page) || 1))
  const skip = (safePage - 1) * PAGE_SIZE

  const where: any = {}
  if (status) where.status = status

  const [payments, total, totalRevenueLKR, totalCreditsIssued] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { user: { select: { email: true, username: true } } },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ _sum: { amountLKR: true }, where: { status: 'paid' } }),
    prisma.payment.aggregate({ _sum: { creditsAwarded: true }, where: { status: 'paid' } }),
  ])

  return {
    payments,
    total,
    page: safePage,
    totalPages: Math.ceil(total / PAGE_SIZE),
    totalRevenueLKR: totalRevenueLKR._sum.amountLKR ?? 0,
    totalCreditsIssued: totalCreditsIssued._sum.creditsAwarded ?? 0,
  }
}

// ─── Provider Stats (Admin) ───────────────────────────────────────────────────
export const adminGetProviderStats: AdminGetProviderStats<void, any> = async (_args, context) => {
  requireAdmin(context)

  const [providers, downloadsByProvider, failedByProvider] = await Promise.all([
    prisma.providerPricing.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.download.groupBy({
      by: ['providerSlug'],
      _count: { id: true },
      _sum: { creditsCharged: true },
    }),
    prisma.download.groupBy({
      by: ['providerSlug'],
      where: { status: 'failed' },
      _count: { id: true },
    }),
  ])

  const statsMap: Record<string, { total: number; credits: number; failed: number }> = {}
  for (const row of downloadsByProvider) {
    statsMap[row.providerSlug] = {
      total: row._count.id,
      credits: row._sum.creditsCharged ?? 0,
      failed: 0,
    }
  }
  for (const row of failedByProvider) {
    if (statsMap[row.providerSlug]) {
      statsMap[row.providerSlug].failed = row._count.id
    }
  }

  return providers.map((p: typeof providers[number]) => ({
    ...p,
    stats: statsMap[p.slug] ?? { total: 0, credits: 0, failed: 0 },
  }))
}

// ─── All Credit Transactions (Admin) ─────────────────────────────────────────
type AdminGetAllCreditTransactionsInput = { page?: number; type?: string; userEmail?: string }

export const adminGetAllCreditTransactions: AdminGetAllCreditTransactions<
  AdminGetAllCreditTransactionsInput,
  any
> = async ({ page = 1, type, userEmail } = {}, context) => {
  requireAdmin(context)

  const PAGE_SIZE = 25
  const safePage = Math.max(1, Math.floor(Number(page) || 1))
  const skip = (safePage - 1) * PAGE_SIZE

  const where: any = {}
  if (type) where.type = type
  if (userEmail) {
    where.user = { email: { contains: userEmail, mode: 'insensitive' } }
  }

  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { user: { select: { email: true, username: true } } },
    }),
    prisma.creditTransaction.count({ where }),
  ])

  return { transactions, total, page: safePage, totalPages: Math.ceil(total / PAGE_SIZE) }
}

// ─── Adjust User Credits ──────────────────────────────────────────────────────
type AdminAdjustUserCreditsInput = {
  userId: string
  amount: number
  reason: string
}

export const adminAdjustUserCredits: AdminAdjustUserCredits<
  AdminAdjustUserCreditsInput,
  { newBalance: number }
> = async ({ userId, amount, reason }, context) => {
  requireAdmin(context)
  if (!userId || amount === undefined) throw new HttpError(400, 'userId and amount required')
  if (reason?.trim().length === 0) throw new HttpError(400, 'Reason is required')
  if (!Number.isFinite(amount)) throw new HttpError(400, 'Amount must be a finite number.')
  if (Math.abs(amount) > 10_000) throw new HttpError(400, 'Adjustment amount cannot exceed ±10,000 credits per operation.')

  const adminUser = context.user!
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new HttpError(404, 'User not found')

  const newBalance = Math.max(0, user.credits + amount)

  await Promise.all([
    prisma.user.update({
      where: { id: userId },
      data: {
        credits: newBalance,
        ...(amount > 0
          ? { lifetimeCreditsEarned: { increment: amount } }
          : { lifetimeCreditsSpent: { increment: Math.abs(amount) } }),
      },
    }),
    prisma.creditTransaction.create({
      data: {
        userId,
        amount,
        balance: newBalance,
        type: 'admin_adjust',
        description: `Admin adjustment: ${reason} (by admin ${adminUser.email ?? adminUser.id})`,
      },
    }),
  ])

  return { newBalance }
}

// ─── Update Provider Pricing ──────────────────────────────────────────────────
type AdminUpdateProviderPricingInput = {
  id: string
  creditCost?: number
  isActive?: boolean
  displayName?: string
  sortOrder?: number
}

export const adminUpdateProviderPricing: AdminUpdateProviderPricing<
  AdminUpdateProviderPricingInput,
  any
> = async ({ id, creditCost, isActive, displayName, sortOrder }, context) => {
  requireAdmin(context)
  if (!id) throw new HttpError(400, 'Provider ID required')

  if (creditCost !== undefined && creditCost < 0) throw new HttpError(400, 'Credit cost cannot be negative.')

  const data: any = {}
  if (creditCost !== undefined) data.creditCost = creditCost
  if (isActive !== undefined) data.isActive = isActive
  if (displayName !== undefined) data.displayName = displayName
  if (sortOrder !== undefined) data.sortOrder = sortOrder

  const result = await prisma.providerPricing.update({ where: { id }, data })
  invalidatePricingCache()
  return result
}

// ─── Force Retry Download (Admin) ─────────────────────────────────────────────
type AdminForceRetryDownloadInput = { downloadId: string }

export const adminForceRetryDownload: AdminForceRetryDownload<
  AdminForceRetryDownloadInput,
  { success: boolean }
> = async ({ downloadId }, context) => {
  requireAdmin(context)
  if (!downloadId) throw new HttpError(400, 'downloadId required')

  const download = await prisma.download.findUnique({ where: { id: downloadId } })
  if (!download) throw new HttpError(404, 'Download not found')

  // Set creditsCharged=0 so confirmDownloadCharge skips deduction (cost <= 0 guard).
  // The original credits were already released when the download failed.
  // Without this, confirmDownloadCharge would do credits -= cost with no matching
  // reservation, permanently corrupting the user's reservedCredits balance.
  await prisma.download.update({
    where: { id: downloadId },
    data: {
      status: 'pending',
      errorMessage: null,
      decodlJobId: null,
      lastPolledAt: null,
      creditsCharged: 0,
    },
  })

  // Actually requeue the job — without this the download stays pending forever
  await processDecodlSubmission.submit({ downloadId })

  return { success: true }
}

// ─── Get Failed Downloads (for Decodl refund requests) ───────────────────────
type AdminGetFailedDownloadsInput = { page?: number; providerSlug?: string }

export const adminGetFailedDownloads: AdminGetFailedDownloads<
  AdminGetFailedDownloadsInput,
  any
> = async ({ page = 1, providerSlug } = {}, context) => {
  requireAdmin(context)
  const PAGE_SIZE = 50
  const where: any = { status: 'failed' }
  if (providerSlug) where.providerSlug = providerSlug

  const [downloads, total] = await Promise.all([
    prisma.download.findMany({
      where,
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.download.count({ where }),
  ])

  // Group by provider for summary
  const byProvider = await prisma.download.groupBy({
    by: ['providerSlug'],
    where: { status: 'failed' },
    _count: { id: true },
    _sum: { creditsCharged: true },
  })

  return { downloads, total, pages: Math.ceil(total / PAGE_SIZE), byProvider }
}

// ─── Send Password Reset Email (Admin) ───────────────────────────────────────
type AdminSendPasswordResetInput = { userId: string }

export const adminSendPasswordReset: AdminSendPasswordReset<
  AdminSendPasswordResetInput,
  { success: boolean }
> = async ({ userId }, context) => {
  requireAdmin(context)
  if (!userId) throw new HttpError(400, 'userId required')

  const authIdentity = await prisma.authIdentity.findFirst({
    where: { authId: { in: (await prisma.auth.findMany({ where: { userId } })).map(a => a.id) }, providerName: 'email' },
  })
  if (!authIdentity) throw new HttpError(404, 'No email auth found for this user')

  const providerData = JSON.parse(authIdentity.providerData ?? '{}')
  const email = providerData.email
  if (!email) throw new HttpError(404, 'No email found for this user')

  const content = getPasswordResetEmailContent({ passwordResetLink: `https://www.stockmart.lk/request-password-reset` })
  await sendPasswordResetEmail(email, { ...content, to: email })

  return { success: true }
}
