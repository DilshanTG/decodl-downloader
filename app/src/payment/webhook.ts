import { type PayhereWebhook } from 'wasp/server/api'
import express from 'express'
import crypto from 'crypto'

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
    })
    if (!res.ok) return null
    const body = await res.json() as { status: string; data: { status: string } }
    return body?.data?.status ?? null
  } catch {
    return null
  }
}

export const payhereWebhook: PayhereWebhook = async (req, res, context) => {
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
    const payment = await context.entities.Payment.findUnique({
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

    console.log(`Webhook: order=${order_id} status=${resolvedStatus}`)

    if (resolvedStatus === 'SUCCESS') {
      // Atomic check-and-set: prevents double-credit if webhook fires twice or
      // races with getMyCreditBalance polling the same payment simultaneously.
      const webhookClaimed = await context.entities.Payment.updateMany({
        where: { id: payment.id, status: { not: 'paid' } },
        data: {
          status: 'paid',
          payherePaymentId: data.payment_id ?? data.payhere_ref ?? null,
          rawPayload: data as any,
          updatedAt: new Date(),
        },
      })
      if (webhookClaimed.count === 0) {
        return res.status(200).send('Already processed')
      }

      // Use increment (not absolute write) so concurrent credits don't overwrite each other
      await context.entities.User.update({
        where: { id: payment.userId },
        data: {
          credits: { increment: payment.creditsAwarded },
          lifetimeCreditsEarned: { increment: payment.creditsAwarded },
          lifetimeSpentLKR: { increment: payment.amountLKR },
        },
      })

      const newBalance = payment.user.credits + payment.creditsAwarded // approximate for display
      await context.entities.CreditTransaction.create({
        data: {
          userId: payment.userId,
          amount: payment.creditsAwarded,
          balance: newBalance,
          type: 'purchase',
          reference: payment.id,
          description: `Purchased ${payment.creditsAwarded} credits — Rs. ${payment.amountLKR.toLocaleString()} (Order: ${order_id})`,
        },
      })

      console.log(`Credited ${payment.creditsAwarded} credits to user ${payment.userId}`)

    } else if (resolvedStatus === 'PENDING') {
      await context.entities.Payment.update({
        where: { id: payment.id },
        data: { status: 'pending', rawPayload: data as any },
      })
    } else if (resolvedStatus === 'CANCELLED') {
      await context.entities.Payment.update({
        where: { id: payment.id },
        data: { status: 'cancelled', rawPayload: data as any },
      })
    } else if (resolvedStatus === 'FAILED') {
      await context.entities.Payment.update({
        where: { id: payment.id },
        data: { status: 'failed', rawPayload: data as any },
      })
    } else if (resolvedStatus === 'REFUNDED') {
      await context.entities.Payment.update({
        where: { id: payment.id },
        data: { status: 'refunded', rawPayload: data as any },
      })
    }

    res.status(200).send('OK')
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).send('Internal error')
  }
}
