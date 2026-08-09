import { type PayhereWebhook } from 'wasp/server/api'
import { prisma } from 'wasp/server'
import express from 'express'
import crypto from 'crypto'
import { alertCritical } from '../server/alerts'
import { log } from '../server/logger'

const DIGIMART_BASE = 'https://pay.digimartsolutions.lk'

export const payhereMiddlewareConfigFn = (middlewareConfig: any) => {
  // DigiMart POSTs webhook as application/x-www-form-urlencoded
  middlewareConfig.set('express.json', express.urlencoded({ extended: false }))
  return middlewareConfig
}

function verifyHmac(body: Record<string, string>, secret: string): boolean {
  const { merchant_id, order_id, status_code, md5sig } = body
  const amount = body.amount || body.payhere_amount
  const currency = body.currency || body.payhere_currency

  if (!md5sig || !merchant_id || !order_id || !amount || !currency || !status_code) {
    return false
  }

  const secretHash = crypto.createHash('md5').update(secret).digest('hex').toUpperCase()
  const raw = `${merchant_id}${order_id}${amount}${currency}${status_code}${secretHash}`
  const expected = crypto.createHash('md5').update(raw).digest('hex').toUpperCase()

  // timingSafeEqual prevents byte-by-byte timing attacks that could reveal the HMAC
  try {
    return crypto.timingSafeEqual(
      Buffer.from(md5sig.toUpperCase(), 'hex'),
      Buffer.from(expected, 'hex'),
    )
  } catch {
    return false // invalid hex in the incoming signature field
  }
}

async function fetchOrderStatus(orderId: string): Promise<string | null> {
  try {
    const res = await fetch(`${DIGIMART_BASE}/api/v1/status/${orderId}`, {
      headers: { 'Authorization': `Bearer ${process.env.PAYHERE_MERCHANT_KEY}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const body = await res.json() as { status: string; data: { status: string } }
    return body?.data?.status ?? null
  } catch {
    return null
  }
}

/**
 * Atomic claim → credit → ledger. Rolls back the claim if credit or ledger fails.
 * Returns true if this call granted credits; false if already processed.
 */
async function claimAndCreditPayment(args: {
  paymentId: string
  userId: string
  creditsAwarded: number
  amountLKR: number
  orderId: string
  payherePaymentId: string | null
  rawPayload: Record<string, string> | null
  description: string
}): Promise<boolean> {
  const result = await prisma.$transaction(async (tx) => {
    // Atomic check-and-set: prevents double-credit if webhook fires twice or
    // races with getMyCreditBalance polling the same payment simultaneously.
    const webhookClaimed = await tx.payment.updateMany({
      where: { id: args.paymentId, status: { not: 'paid' } },
      data: {
        status: 'paid',
        payherePaymentId: args.payherePaymentId,
        rawPayload: (args.rawPayload as any) ?? undefined,
        updatedAt: new Date(),
      },
    })
    if (webhookClaimed.count === 0) {
      return false
    }

    // Use increment (not absolute write) so concurrent credits don't overwrite each other
    const updatedUser = await tx.user.update({
      where: { id: args.userId },
      data: {
        credits: { increment: args.creditsAwarded },
        lifetimeCreditsEarned: { increment: args.creditsAwarded },
        lifetimeSpentLKR: { increment: args.amountLKR },
      },
    })

    await tx.creditTransaction.create({
      data: {
        userId: args.userId,
        amount: args.creditsAwarded,
        balance: updatedUser.credits,
        type: 'purchase',
        reference: args.paymentId,
        description: args.description,
      },
    })

    return true
  })

  return result
}

export const payhereWebhook: PayhereWebhook = async (req, res, _context) => {
  try {
    const data: Record<string, string> = req.body

    const { order_id, status_code } = data

    if (!order_id) {
      console.error('Webhook: missing order_id')
      return res.status(400).send('Missing order_id')
    }

    // Verify HMAC signature
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET!
    if (!verifyHmac(data, merchantSecret)) {
      console.error(`Webhook: HMAC mismatch or missing signature fields for order ${order_id}`)
      return res.status(400).send('Invalid signature')
    }

    // Find payment record by DigiMart's order_id
    const payment = await prisma.payment.findUnique({
      where: { payhereOrderId: order_id },
      include: { user: true },
    })

    if (!payment) {
      console.error(`Webhook: no payment found for order_id=${order_id}`)
      return res.status(404).send('Payment not found')
    }

    // Idempotency — skip if already fully processed
    if (payment.status === 'paid') {
      return res.status(200).send('Already processed')
    }

    // Cross-validate webhook amount against stored payment amount (defence-in-depth)
    const webhookAmount = parseFloat(data.amount || data.payhere_amount || '0')
    if (Math.abs(webhookAmount - payment.amountLKR) > 1) {
      console.error(`Webhook: amount mismatch for order ${order_id} — webhook: ${webhookAmount}, stored: ${payment.amountLKR}`)
      return res.status(400).send('Amount mismatch')
    }

    // Determine status: prefer webhook status_code, fall back to GET /status
    let resolvedStatus = 'unknown'

    if (status_code) {
      const code = parseInt(status_code, 10)
      if (code === 2)       resolvedStatus = 'SUCCESS'
      else if (code === 0)  resolvedStatus = 'PENDING'
      else if (code === -1) resolvedStatus = 'CANCELLED'
      else if (code === -2) resolvedStatus = 'FAILED'
      else if (code === -3) resolvedStatus = 'REFUNDED'
    }

    // Always double-verify with the status API for SUCCESS payments
    if (resolvedStatus === 'SUCCESS' || resolvedStatus === 'unknown') {
      const apiStatus = await fetchOrderStatus(order_id)
      if (apiStatus) resolvedStatus = apiStatus
    }

    log.info('webhook_status', { orderId: order_id, status: resolvedStatus, paymentId: payment.id })

    if (resolvedStatus === 'SUCCESS') {
      const credited = await claimAndCreditPayment({
        paymentId: payment.id,
        userId: payment.userId,
        creditsAwarded: payment.creditsAwarded,
        amountLKR: payment.amountLKR,
        orderId: order_id,
        payherePaymentId: data.payment_id ?? data.payhere_ref ?? null,
        rawPayload: data,
        description: `Purchased ${payment.creditsAwarded} credits — Rs. ${payment.amountLKR.toLocaleString()} (Order: ${order_id})`,
      })

      if (!credited) {
        return res.status(200).send('Already processed')
      }

      log.info('webhook_credited', {
        orderId: order_id,
        userId: payment.userId,
        credits: payment.creditsAwarded,
      })

    } else if (resolvedStatus === 'PENDING') {
      // Terminal states (paid/failed/cancelled/refunded) are immutable except via SUCCESS claim
      const updated = await prisma.payment.updateMany({
        where: { id: payment.id, status: 'pending' },
        data: { status: 'pending', rawPayload: data as any },
      })
      if (updated.count === 0) {
        console.log(`Webhook: skipped PENDING write for order ${order_id} — payment no longer pending`)
      }
    } else if (resolvedStatus === 'CANCELLED') {
      const updated = await prisma.payment.updateMany({
        where: { id: payment.id, status: 'pending' },
        data: { status: 'cancelled', rawPayload: data as any },
      })
      if (updated.count === 0) {
        console.log(`Webhook: skipped CANCELLED write for order ${order_id} — payment no longer pending`)
      }
    } else if (resolvedStatus === 'FAILED') {
      const updated = await prisma.payment.updateMany({
        where: { id: payment.id, status: 'pending' },
        data: { status: 'failed', rawPayload: data as any },
      })
      if (updated.count === 0) {
        console.log(`Webhook: skipped FAILED write for order ${order_id} — payment no longer pending`)
      }
    } else if (resolvedStatus === 'REFUNDED') {
      const updated = await prisma.payment.updateMany({
        where: { id: payment.id, status: 'pending' },
        data: { status: 'refunded', rawPayload: data as any },
      })
      if (updated.count === 0) {
        console.log(`Webhook: skipped REFUNDED write for order ${order_id} — payment no longer pending`)
      }
    }

    res.status(200).send('OK')
  } catch (error: any) {
    log.error('webhook_error', { error: error?.message || String(error) })
    void alertCritical('payment.webhook_error', {
      orderId: (req.body as any)?.order_id,
      message: error?.message || 'Internal error',
    })
    res.status(500).send('Internal error')
  }
}
