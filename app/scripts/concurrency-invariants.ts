/**
 * Concurrency invariant harness for StockMart financial core (F1/F2/F3/F6).
 *
 * SAFETY: refuses to run unless ALLOW_DB_TESTS=1.
 * Creates exactly one dedicated test user and deletes only that user's rows on exit.
 *
 * Run:
 *   ALLOW_DB_TESTS=1 npm run test:concurrency
 *   ALLOW_DB_TESTS=1 npx tsx scripts/concurrency-invariants.ts
 *
 * SQL predicates mirror production (downloads/operations.ts, downloads/jobs.ts, payment/webhook.ts).
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env.server') })

const TEST_EMAIL = '__concurrency_test__@stockmart.internal'
const EPS = 1e-9

if (process.env.ALLOW_DB_TESTS !== '1') {
  console.error(
    'REFUSED: set ALLOW_DB_TESTS=1 to run concurrency-invariants against the database.\n' +
      'This script writes rows (scoped to a dedicated test user) and will not run by accident.'
  )
  process.exit(2)
}

if (!process.env.DATABASE_URL) {
  console.error('REFUSED: DATABASE_URL missing (load from .env.server failed).')
  process.exit(2)
}

const prisma = new PrismaClient()

type FailDetail = { test: string; iteration: number; message: string; state?: unknown }

function assert(cond: boolean, detail: FailDetail): asserts cond {
  if (!cond) {
    const err = new Error(detail.message) as Error & { detail: FailDetail }
    err.detail = detail
    throw err
  }
}

async function dumpUserState(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const downloads = await prisma.download.findMany({
    where: { userId },
    select: { id: true, status: true, creditsCharged: true, retryCount: true },
  })
  const payments = await prisma.payment.findMany({
    where: { userId },
    select: { id: true, status: true, creditsAwarded: true },
  })
  const txs = await prisma.creditTransaction.findMany({
    where: { userId },
    select: { id: true, type: true, amount: true, balance: true },
  })
  return { user, downloads, payments, txs }
}

async function ensureTestUser(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
  if (existing) {
    // Wipe prior residue for this dedicated user only
    await prisma.creditTransaction.deleteMany({ where: { userId: existing.id } })
    await prisma.download.deleteMany({ where: { userId: existing.id } })
    await prisma.payment.deleteMany({ where: { userId: existing.id } })
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        credits: 0,
        reservedCredits: 0,
        lifetimeCreditsEarned: 0,
        lifetimeCreditsSpent: 0,
        lifetimeSpentLKR: 0,
      },
    })
    return existing.id
  }
  const created = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      username: `__concurrency_test_${Date.now()}`,
      credits: 0,
      reservedCredits: 0,
    },
  })
  return created.id
}

async function teardownTestUser(userId: string | null) {
  if (!userId) return
  // Only rows belonging to the dedicated test user
  await prisma.creditTransaction.deleteMany({ where: { userId } })
  await prisma.download.deleteMany({ where: { userId } })
  await prisma.payment.deleteMany({ where: { userId } })
  await prisma.user.deleteMany({ where: { id: userId, email: TEST_EMAIL } })
}

// ── Production-mirrored SQL ───────────────────────────────────────────────────

/** jobs.ts confirmDownloadCharge guarded decrement */
async function settleReserved(userId: string, cost: number): Promise<number> {
  return Number(
    await prisma.$executeRaw`
      UPDATE "User"
      SET
        "credits" = "credits" - ${cost},
        "reservedCredits" = "reservedCredits" - ${cost},
        "lifetimeCreditsSpent" = "lifetimeCreditsSpent" + ${cost}
      WHERE "id" = ${userId}
        AND "reservedCredits" >= ${cost}
    `
  )
}

/** downloads/operations.ts reserveCredits */
async function reserveCredits(userId: string, cost: number): Promise<number> {
  return Number(
    await prisma.$executeRaw`
      UPDATE "User"
      SET "reservedCredits" = "reservedCredits" + ${cost}
      WHERE "id" = ${userId}
        AND "reservedCredits" + ${cost} <= "credits"
    `
  )
}

/** jobs.ts handleDownloadFailure reserved release */
async function releaseReserved(userId: string, cost: number): Promise<number> {
  return Number(
    await prisma.$executeRaw`
      UPDATE "User"
      SET "reservedCredits" = "reservedCredits" - ${cost}
      WHERE "id" = ${userId}
        AND "reservedCredits" >= ${cost}
    `
  )
}

async function assertBalanceInvariants(userId: string, test: string, iteration: number) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const state = { credits: user.credits, reservedCredits: user.reservedCredits }
  assert(user.reservedCredits >= -EPS, {
    test,
    iteration,
    message: `reservedCredits < 0 (${user.reservedCredits})`,
    state,
  })
  assert(user.credits >= -EPS, {
    test,
    iteration,
    message: `credits < 0 (${user.credits})`,
    state,
  })
  assert(user.reservedCredits <= user.credits + EPS, {
    test,
    iteration,
    message: `reservedCredits (${user.reservedCredits}) > credits (${user.credits})`,
    state,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testA_ReservationVsSettlement(userId: string) {
  const name = 'A-F2-reservation-vs-settlement'
  const ITER = 50
  for (let i = 0; i < ITER; i++) {
    // Seed: credits=10, reserved=10, one processing download charged 10
    await prisma.user.update({
      where: { id: userId },
      data: { credits: 10, reservedCredits: 10, lifetimeCreditsSpent: 0 },
    })
    await prisma.download.deleteMany({ where: { userId } })
    await prisma.download.create({
      data: {
        userId,
        status: 'processing',
        providerSlug: 'test_provider',
        creditsCharged: 10,
        decodlJobId: `test-job-a-${i}`,
      },
    })

    await Promise.all([
      settleReserved(userId, 10),
      reserveCredits(userId, 5),
    ])

    await assertBalanceInvariants(userId, name, i)
  }
  return `${name}: PASS (${ITER} iterations)`
}

async function testB_SingleWinnerRetryClaim(userId: string) {
  const name = 'B-F3-F6-single-winner-retry-claim'
  const ITER = 20
  for (let i = 0; i < ITER; i++) {
    await prisma.download.deleteMany({ where: { userId } })
    const dl = await prisma.download.create({
      data: {
        userId,
        status: 'failed',
        providerSlug: 'test_provider',
        creditsCharged: 3,
        retryCount: 0,
        errorMessage: 'seeded failure',
      },
    })

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        prisma.download.updateMany({
          where: {
            id: dl.id,
            userId,
            status: 'failed',
            retryCount: { lt: 3 },
          },
          data: {
            status: 'pending',
            decodlJobId: null,
            retryCount: { increment: 1 },
            errorMessage: null,
            lastPolledAt: null,
            attemptStartedAt: new Date(),
          },
        })
      )
    )

    const winners = results.filter((r) => r.count === 1).length
    const final = await prisma.download.findUniqueOrThrow({ where: { id: dl.id } })

    assert(winners === 1, {
      test: name,
      iteration: i,
      message: `expected exactly 1 claim winner, got ${winners}`,
      state: { winners, final },
    })
    assert(final.retryCount === 1, {
      test: name,
      iteration: i,
      message: `expected retryCount === 1, got ${final.retryCount}`,
      state: final,
    })
    assert(final.status === 'pending', {
      test: name,
      iteration: i,
      message: `expected status pending, got ${final.status}`,
      state: final,
    })
  }
  return `${name}: PASS (${ITER} iterations)`
}

async function testC_TerminalStateExclusivity(userId: string) {
  const name = 'C-F3-terminal-state-exclusivity'
  const ITER = 20
  const cost = 10

  for (let i = 0; i < ITER; i++) {
    await prisma.user.update({
      where: { id: userId },
      data: { credits: 10, reservedCredits: 10 },
    })
    await prisma.download.deleteMany({ where: { userId } })
    const dl = await prisma.download.create({
      data: {
        userId,
        status: 'processing',
        providerSlug: 'test_provider',
        creditsCharged: cost,
        decodlJobId: `test-job-c-${i}`,
      },
    })

    // Mirror jobs.ts: claim + credit move inside concurrent transactions
    const confirmPath = async () => {
      await prisma.$transaction(async (tx) => {
        const claimResult = await tx.download.updateMany({
          where: { id: dl.id, status: 'processing' },
          data: {
            status: 'completed',
            lastPolledAt: new Date(),
          },
        })
        if (claimResult.count === 0) return
        await tx.$executeRaw`
          UPDATE "User"
          SET
            "credits" = "credits" - ${cost},
            "reservedCredits" = "reservedCredits" - ${cost},
            "lifetimeCreditsSpent" = "lifetimeCreditsSpent" + ${cost}
          WHERE "id" = ${userId}
            AND "reservedCredits" >= ${cost}
        `
      })
    }

    const failPath = async () => {
      await prisma.$transaction(async (tx) => {
        const claimResult = await tx.download.updateMany({
          where: { id: dl.id, status: { notIn: ['completed', 'failed', 'refunded'] } },
          data: {
            status: 'failed',
            errorMessage: 'concurrent fail claim',
            lastPolledAt: new Date(),
          },
        })
        if (claimResult.count === 0) return
        await tx.$executeRaw`
          UPDATE "User"
          SET "reservedCredits" = "reservedCredits" - ${cost}
          WHERE "id" = ${userId}
            AND "reservedCredits" >= ${cost}
        `
      })
    }

    await Promise.all([confirmPath(), failPath()])

    const final = await prisma.download.findUniqueOrThrow({ where: { id: dl.id } })
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

    assert(
      final.status === 'completed' || final.status === 'failed',
      {
        test: name,
        iteration: i,
        message: `expected terminal status, got ${final.status}`,
        state: final,
      }
    )

    // Exactly one credit move: reserved must be 0 (released once, not twice)
    assert(Math.abs(user.reservedCredits) < EPS, {
      test: name,
      iteration: i,
      message: `reservedCredits should be 0 after single release/settle, got ${user.reservedCredits}`,
      state: { user, final },
    })

    if (final.status === 'completed') {
      assert(Math.abs(user.credits) < EPS, {
        test: name,
        iteration: i,
        message: `completed path should leave credits=0, got ${user.credits}`,
        state: { user, final },
      })
    } else {
      // fail path: credits untouched at 10
      assert(Math.abs(user.credits - 10) < EPS, {
        test: name,
        iteration: i,
        message: `failed path should leave credits=10, got ${user.credits}`,
        state: { user, final },
      })
    }

    await assertBalanceInvariants(userId, name, i)
  }
  return `${name}: PASS (${ITER} iterations)`
}

async function testD_PaymentClaimIdempotency(userId: string) {
  const name = 'D-F1-payment-claim-idempotency'
  const awarded = 50

  await prisma.creditTransaction.deleteMany({ where: { userId } })
  await prisma.payment.deleteMany({ where: { userId } })
  await prisma.user.update({
    where: { id: userId },
    data: { credits: 0, reservedCredits: 0, lifetimeCreditsEarned: 0, lifetimeSpentLKR: 0 },
  })

  const payment = await prisma.payment.create({
    data: {
      userId,
      payhereOrderId: `test-order-${Date.now()}`,
      amountLKR: 1000,
      packageId: 'test_pkg',
      creditsAwarded: awarded,
      status: 'pending',
    },
  })

  // Mirror webhook.ts claimAndCreditPayment: claim status != paid + increment + ledger
  await Promise.all(
    Array.from({ length: 10 }, () =>
      prisma.$transaction(async (tx) => {
        const webhookClaimed = await tx.payment.updateMany({
          where: { id: payment.id, status: { not: 'paid' } },
          data: {
            status: 'paid',
            updatedAt: new Date(),
          },
        })
        if (webhookClaimed.count === 0) return

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            credits: { increment: awarded },
            lifetimeCreditsEarned: { increment: awarded },
            lifetimeSpentLKR: { increment: 1000 },
          },
        })

        await tx.creditTransaction.create({
          data: {
            userId,
            amount: awarded,
            balance: updatedUser.credits,
            type: 'purchase',
            reference: payment.id,
            description: `Test purchase claim (${payment.payhereOrderId})`,
          },
        })
      })
    )
  )

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const purchaseCount = await prisma.creditTransaction.count({
    where: { userId, type: 'purchase', reference: payment.id },
  })
  const paid = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })

  assert(paid.status === 'paid', {
    test: name,
    iteration: 0,
    message: `payment status expected paid, got ${paid.status}`,
    state: paid,
  })
  assert(Math.abs(user.credits - awarded) < EPS, {
    test: name,
    iteration: 0,
    message: `user credited exactly once: expected ${awarded}, got ${user.credits}`,
    state: user,
  })
  assert(purchaseCount === 1, {
    test: name,
    iteration: 0,
    message: `expected exactly 1 purchase CreditTransaction, got ${purchaseCount}`,
    state: await dumpUserState(userId),
  })

  return `${name}: PASS (10 concurrent claims → single credit)`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  let userId: string | null = null
  const results: string[] = []

  try {
    userId = await ensureTestUser()
    console.log(`Test user: ${TEST_EMAIL} (${userId})`)

    results.push(await testA_ReservationVsSettlement(userId))
    console.log(results[results.length - 1])

    results.push(await testB_SingleWinnerRetryClaim(userId))
    console.log(results[results.length - 1])

    results.push(await testC_TerminalStateExclusivity(userId))
    console.log(results[results.length - 1])

    results.push(await testD_PaymentClaimIdempotency(userId))
    console.log(results[results.length - 1])

    console.log('\n=== ALL CONCURRENCY INVARIANTS PASSED ===')
    for (const r of results) console.log(`  ✓ ${r}`)
    process.exitCode = 0
  } catch (err: any) {
    console.error('\n=== CONCURRENCY INVARIANT FAILURE ===')
    if (err?.detail) {
      console.error(JSON.stringify(err.detail, null, 2))
      if (userId) {
        console.error('row state:', JSON.stringify(await dumpUserState(userId), null, 2))
      }
    } else {
      console.error(err)
    }
    process.exitCode = 1
  } finally {
    try {
      await teardownTestUser(userId)
      console.log('Teardown: test user rows deleted')
    } catch (teardownErr) {
      console.error('Teardown error (manual cleanup may be needed):', teardownErr)
    }
    await prisma.$disconnect()
  }
}

main()
