import { HttpError, prisma } from 'wasp/server'
import { emailSender } from 'wasp/server/email'
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
  AdminGetCreditPackages,
  AdminCreateCreditPackage,
  AdminUpdateCreditPackage,
  AdminDeleteCreditPackage,
  AdminDeleteUser,
} from 'wasp/server/operations'
import { processDecodlSubmission } from 'wasp/server/jobs'
import { invalidatePricingCache } from '../credits/operations'
import { invalidatePackagesCache } from '../payment/operations'
import { createPasswordResetLink } from 'wasp/server/auth/email'
import { getPasswordResetEmailContent } from '../auth/email-and-pass/emails'
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation'
import { fetchDecodlBalance } from '../decodl/client'
import { lastReconcileSummary } from '../downloads/jobs'
import * as z from 'zod'

// ─── Guard helper ─────────────────────────────────────────────────────────────
function requireAdmin(context: any) {
  if (!context.user) throw new HttpError(401, 'Authentication required')
  if (!context.user.isAdmin) throw new HttpError(403, 'Admin access required')
}

/**
 * Append-only privileged-action trail. Accepts prisma or a $transaction client.
 * NEVER pass secrets, reset links, or tokens in metadata.
 */
async function writeAudit(
  client: { adminAuditLog: { create: (args: any) => Promise<any> } },
  adminUser: { id: string; email?: string | null },
  action: string,
  targetType?: string | null,
  targetId?: string | null,
  metadata?: Record<string, unknown> | null,
) {
  await client.adminAuditLog.create({
    data: {
      adminId: adminUser.id,
      adminEmail: adminUser.email ?? null,
      action,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      metadata: metadata ?? undefined,
    },
  })
}

// ─── Zod schemas for mutating admin inputs ────────────────────────────────────
const adminAdjustUserCreditsSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().finite(),
  reason: z.string().min(1),
})

const adminUpdateProviderPricingSchema = z.object({
  id: z.string().min(1),
  creditCost: z.number().finite().optional(),
  isActive: z.boolean().optional(),
  displayName: z.string().optional(),
  sortOrder: z.number().finite().optional(),
})

const adminCreateCreditPackageSchema = z.object({
  packageId: z.string().min(1),
  name: z.string().min(1),
  credits: z.number().finite(),
  priceLKR: z.number().finite(),
  badge: z.string().optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().finite().optional(),
  description: z.string().optional(),
})

const adminUpdateCreditPackageSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  credits: z.number().finite().optional(),
  priceLKR: z.number().finite().optional(),
  badge: z.string().nullable().optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().finite().optional(),
  description: z.string().nullable().optional(),
})

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

// ─── System Health (operator pane) ────────────────────────────────────────────
export const adminGetSystemHealth = async (_args: void, context: any) => {
  requireAdmin(context)

  const now = Date.now()
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000)
  const fifteenMinAgo = new Date(now - 15 * 60 * 1000)

  const [
    recentAudit,
    pendingPayments,
    failedDownloads24h,
    refundedDownloads24h,
    pendingDownloads,
    processingDownloads,
  ] = await Promise.all([
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.payment.count({
      where: { status: 'pending', createdAt: { lt: fifteenMinAgo } },
    }),
    prisma.download.count({
      where: { status: 'failed', createdAt: { gte: dayAgo } },
    }),
    prisma.download.count({
      where: { status: 'refunded', createdAt: { gte: dayAgo } },
    }),
    prisma.download.count({ where: { status: 'pending' } }),
    prisma.download.count({ where: { status: 'processing' } }),
  ])

  const decodl = await fetchDecodlBalance()

  return {
    recentAudit,
    pendingPayments,
    failedDownloads24h,
    refundedDownloads24h,
    activeDownloads: pendingDownloads + processingDownloads,
    pendingDownloads,
    processingDownloads,
    decodlBalance: decodl.balance,
    decodlAvailable: decodl.available,
    lastReconcile: lastReconcileSummary,
    generatedAt: new Date().toISOString(),
  }
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
> = async (rawArgs, context) => {
  requireAdmin(context)
  const { userId, amount, reason: rawReason } = ensureArgsSchemaOrThrowHttpError(
    adminAdjustUserCreditsSchema,
    rawArgs,
  )
  if (typeof rawReason !== 'string' || rawReason.trim().length === 0) {
    throw new HttpError(400, 'Reason is required')
  }
  const reason = rawReason.trim().slice(0, 500)
  if (Math.abs(amount) > 10_000) {
    throw new HttpError(400, 'Adjustment amount cannot exceed ±10,000 credits per operation.')
  }

  const adminUser = context.user!
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new HttpError(404, 'User not found')

  const description = `Admin adjustment: ${reason} (by admin ${adminUser.email ?? adminUser.id})`

  if (amount < 0) {
    // Guarded atomic debit: cannot push credits below zero; no absolute clamp write.
    const newBalance = await prisma.$transaction(async (tx) => {
      const spent = Math.abs(amount)
      const rows = await tx.$executeRaw`
        UPDATE "User"
        SET
          "credits" = "credits" + ${amount},
          "lifetimeCreditsSpent" = "lifetimeCreditsSpent" + ${spent}
        WHERE "id" = ${userId}
          AND "credits" + ${amount} >= 0
      `
      if (Number(rows) === 0) {
        const fresh = await tx.user.findUnique({ where: { id: userId }, select: { credits: true } })
        throw new HttpError(
          400,
          `Cannot adjust balance below zero. User has ${fresh?.credits ?? user.credits} credits.`
        )
      }
      const updated = await tx.user.findUnique({ where: { id: userId }, select: { credits: true } })
      if (!updated) throw new HttpError(404, 'User not found')
      await tx.creditTransaction.create({
        data: {
          userId,
          amount,
          balance: updated.credits,
          type: 'admin_adjust',
          description,
        },
      })
      await writeAudit(tx, adminUser, 'adjust_credits', 'User', userId, {
        amount,
        reason,
        newBalance: updated.credits,
      })
      return updated.credits
    })
    return { newBalance }
  }

  // Positive (or zero) adjustments: increment + ledger in one transaction
  const newBalance = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        credits: { increment: amount },
        ...(amount > 0 ? { lifetimeCreditsEarned: { increment: amount } } : {}),
      },
    })
    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        balance: updatedUser.credits,
        type: 'admin_adjust',
        description,
      },
    })
    await writeAudit(tx, adminUser, 'adjust_credits', 'User', userId, {
      amount,
      reason,
      newBalance: updatedUser.credits,
    })
    return updatedUser.credits
  })

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
> = async (rawArgs, context) => {
  requireAdmin(context)
  const { id, creditCost, isActive, displayName, sortOrder } = ensureArgsSchemaOrThrowHttpError(
    adminUpdateProviderPricingSchema,
    rawArgs,
  )

  if (creditCost !== undefined && creditCost < 0) throw new HttpError(400, 'Credit cost cannot be negative.')

  const existing = await prisma.providerPricing.findUnique({ where: { id } })
  if (!existing) throw new HttpError(404, 'Provider pricing not found')

  const data: any = {}
  if (creditCost !== undefined) data.creditCost = creditCost
  if (isActive !== undefined) data.isActive = isActive
  if (displayName !== undefined) data.displayName = displayName
  if (sortOrder !== undefined) data.sortOrder = sortOrder

  const result = await prisma.providerPricing.update({ where: { id }, data })
  invalidatePricingCache()

  await writeAudit(prisma, context.user!, 'update_provider_pricing', 'ProviderPricing', id, {
    before: {
      creditCost: existing.creditCost,
      isActive: existing.isActive,
      displayName: existing.displayName,
      sortOrder: existing.sortOrder,
    },
    after: {
      creditCost: result.creditCost,
      isActive: result.isActive,
      displayName: result.displayName,
      sortOrder: result.sortOrder,
    },
  })

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
      attemptStartedAt: new Date(),
      creditsCharged: 0,
    },
  })

  // Actually requeue the job — without this the download stays pending forever
  await processDecodlSubmission.submit({ downloadId })

  await writeAudit(prisma, context.user!, 'force_retry_download', 'Download', downloadId, {
    previousStatus: download.status,
    providerSlug: download.providerSlug,
  })

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
// Security: never return the reset link to the admin. Email the user only.
// Refuse admin targets so a compromised admin cannot mint takeovers of peer admins.
type AdminSendPasswordResetInput = { userId: string }

export const adminSendPasswordReset: AdminSendPasswordReset<
  AdminSendPasswordResetInput,
  { sent: true; email: string }
> = async ({ userId }, context) => {
  requireAdmin(context)
  if (!userId) throw new HttpError(400, 'userId required')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, isAdmin: true },
  })
  if (!user) throw new HttpError(404, 'User not found')

  if (user.isAdmin) {
    throw new HttpError(
      403,
      'Password resets for admin accounts must be done by the account owner directly.'
    )
  }

  // Resolve email from User or AuthIdentity
  let email = user.email ?? null
  if (!email) {
    const auth = await prisma.auth.findUnique({ where: { userId }, include: { identities: true } })
    const identity = auth?.identities.find((i) => i.providerName === 'email')
    email = identity?.providerUserId ?? null
  }

  if (!email) throw new HttpError(404, 'No email auth found for this user')

  // Generate link server-side, email it, never return it in the response/logs
  const resetLink = await createPasswordResetLink(email, '/password-reset')
  const content = getPasswordResetEmailContent({ passwordResetLink: resetLink })

  await emailSender.send({
    from: { name: 'StockMart.lk', email: 'noreply@stockmart.lk' },
    to: email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  })

  await writeAudit(prisma, context.user!, 'send_password_reset', 'User', userId, {
    // Never log the link itself
    emailDomain: email.includes('@') ? email.split('@')[1] : undefined,
  })

  return { sent: true as const, email }
}

// ─── Grant Free Credits (Admin Approve) ──────────────────────────────────────
type AdminGrantFreeCreditsInput = { userId: string }

// @ts-ignore — AdminGrantFreeCredits type generated after wasp build
export const adminGrantFreeCredits = async ({ userId }: AdminGrantFreeCreditsInput, context: any) => {
  requireAdmin(context)
  if (!userId) throw new HttpError(400, 'userId required')

  const BONUS = 2
  const adminUser = context.user!

  const finalBalance = await prisma.$transaction(async (tx) => {
    const claimUpdate = await tx.user.updateMany({
      where: { id: userId, freeCreditsClaimed: false },
      data: {
        credits: { increment: BONUS },
        lifetimeCreditsEarned: { increment: BONUS },
        freeCreditsClaimed: true,
      },
    })

    if (claimUpdate.count === 0) {
      throw new HttpError(400, 'Free credits already granted or user not found')
    }

    const updatedUser = await tx.user.findUnique({ where: { id: userId } })
    const balance = updatedUser?.credits ?? BONUS

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: BONUS,
        balance,
        type: 'admin_adjust',
        description: 'Admin-approved welcome bonus (2 free credits)',
      },
    })

    await writeAudit(tx, adminUser, 'grant_free_credits', 'User', userId, {
      amount: BONUS,
      newBalance: balance,
    })

    return balance
  })

  return { newBalance: finalBalance }
}

// ─── Credit Package CRUD ──────────────────────────────────────────────────────

export const adminGetCreditPackages: AdminGetCreditPackages<void, any> = async (_args, context) => {
  requireAdmin(context)
  return prisma.creditPackage.findMany({ orderBy: { sortOrder: 'asc' } })
}

type AdminCreateCreditPackageInput = {
  packageId: string
  name: string
  credits: number
  priceLKR: number
  badge?: string
  isPopular?: boolean
  isActive?: boolean
  sortOrder?: number
  description?: string
}

export const adminCreateCreditPackage: AdminCreateCreditPackage<AdminCreateCreditPackageInput, any> = async (
  rawArgs,
  context
) => {
  requireAdmin(context)
  const {
    packageId,
    name,
    credits,
    priceLKR,
    badge,
    isPopular = false,
    isActive = true,
    sortOrder = 0,
    description,
  } = ensureArgsSchemaOrThrowHttpError(adminCreateCreditPackageSchema, rawArgs)

  if (!packageId.trim()) throw new HttpError(400, 'Package ID is required')
  if (!name.trim()) throw new HttpError(400, 'Name is required')
  if (credits <= 0) throw new HttpError(400, 'Credits must be greater than 0')
  if (priceLKR <= 0) throw new HttpError(400, 'Price must be greater than 0')

  const existing = await prisma.creditPackage.findUnique({ where: { packageId } })
  if (existing) throw new HttpError(400, `Package ID "${packageId}" already exists`)

  const pkg = await prisma.creditPackage.create({
    data: {
      packageId: packageId.trim().toLowerCase(),
      name: name.trim(),
      credits,
      priceLKR,
      badge: badge?.trim() || null,
      isPopular,
      isActive,
      sortOrder,
      description: description?.trim() || null,
    },
  })
  invalidatePackagesCache()

  await writeAudit(prisma, context.user!, 'create_credit_package', 'CreditPackage', pkg.id, {
    packageId: pkg.packageId,
    credits: pkg.credits,
    priceLKR: pkg.priceLKR,
  })

  return pkg
}

type AdminUpdateCreditPackageInput = {
  id: string
  name?: string
  credits?: number
  priceLKR?: number
  badge?: string | null
  isPopular?: boolean
  isActive?: boolean
  sortOrder?: number
  description?: string | null
}

export const adminUpdateCreditPackage: AdminUpdateCreditPackage<AdminUpdateCreditPackageInput, any> = async (
  rawArgs,
  context
) => {
  requireAdmin(context)
  const { id, name, credits, priceLKR, badge, isPopular, isActive, sortOrder, description } =
    ensureArgsSchemaOrThrowHttpError(adminUpdateCreditPackageSchema, rawArgs)

  if (credits !== undefined && credits <= 0) throw new HttpError(400, 'Credits must be greater than 0')
  if (priceLKR !== undefined && priceLKR <= 0) throw new HttpError(400, 'Price must be greater than 0')

  const existing = await prisma.creditPackage.findUnique({ where: { id } })
  if (!existing) throw new HttpError(404, 'Package not found')

  const data: any = {}
  if (name !== undefined) data.name = name.trim()
  if (credits !== undefined) data.credits = credits
  if (priceLKR !== undefined) data.priceLKR = priceLKR
  if (badge !== undefined) data.badge = badge?.trim() || null
  if (isPopular !== undefined) data.isPopular = isPopular
  if (isActive !== undefined) data.isActive = isActive
  if (sortOrder !== undefined) data.sortOrder = sortOrder
  if (description !== undefined) data.description = description?.trim() || null

  const pkg = await prisma.creditPackage.update({ where: { id }, data })
  invalidatePackagesCache()

  await writeAudit(prisma, context.user!, 'update_credit_package', 'CreditPackage', id, {
    before: {
      name: existing.name,
      credits: existing.credits,
      priceLKR: existing.priceLKR,
      isActive: existing.isActive,
      isPopular: existing.isPopular,
      sortOrder: existing.sortOrder,
    },
    after: {
      name: pkg.name,
      credits: pkg.credits,
      priceLKR: pkg.priceLKR,
      isActive: pkg.isActive,
      isPopular: pkg.isPopular,
      sortOrder: pkg.sortOrder,
    },
  })

  return pkg
}

export const adminDeleteCreditPackage: AdminDeleteCreditPackage<{ id: string }, { success: boolean }> = async (
  { id },
  context
) => {
  requireAdmin(context)
  if (!id) throw new HttpError(400, 'Package ID required')

  const pkg = await prisma.creditPackage.findUnique({ where: { id } })
  if (!pkg) throw new HttpError(404, 'Package not found')

  await prisma.creditPackage.delete({ where: { id } })
  invalidatePackagesCache()

  await writeAudit(prisma, context.user!, 'delete_credit_package', 'CreditPackage', id, {
    packageId: pkg.packageId,
    name: pkg.name,
  })

  return { success: true }
}

// ─── Delete User ──────────────────────────────────────────────────────────────

export const adminDeleteUser: AdminDeleteUser<{ userId: string }, { success: boolean }> = async (
  { userId },
  context
) => {
  requireAdmin(context)
  if (!userId) throw new HttpError(400, 'userId required')
  if (context.user!.id === userId) throw new HttpError(400, 'Cannot delete your own account')

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new HttpError(404, 'User not found')
  if (user.isAdmin) throw new HttpError(400, 'Cannot delete an admin account')

  const adminUser = context.user!

  await prisma.$transaction(async (tx) => {
    // Related records first (no FK cascade on these). PhoneOtp has userId without relation.
    await tx.contactFormMessage.deleteMany({ where: { userId } })
    await tx.creditTransaction.deleteMany({ where: { userId } })
    await tx.payment.deleteMany({ where: { userId } })
    await tx.download.deleteMany({ where: { userId } })
    await tx.phoneOtp.deleteMany({ where: { userId } })

    // Auth → AuthIdentity → Session cascade via schema onDelete: Cascade
    await tx.user.delete({ where: { id: userId } })

    await writeAudit(tx, adminUser, 'delete_user', 'User', userId, {
      email: user.email,
      username: user.username,
    })
  })

  return { success: true }
}
