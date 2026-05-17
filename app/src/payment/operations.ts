import { type CreatePayherePayment } from 'wasp/server/operations'
import { HttpError } from 'wasp/server'

const DIGIMART_BASE = 'https://pay.digimartsolutions.lk'

const PACKAGES = {
  single:   { credits: 1,    amountLKR: 200,    name: 'Single'   },
  starter:  { credits: 10,   amountLKR: 1800,   name: 'Starter'  },
  value:    { credits: 50,   amountLKR: 8500,   name: 'Value'    },
  pro:      { credits: 100,  amountLKR: 16000,  name: 'Pro'      },
  business: { credits: 500,  amountLKR: 75000,  name: 'Business' },
  agency:   { credits: 1000, amountLKR: 140000, name: 'Agency'   },
} as const

type PackageId = keyof typeof PACKAGES

type CreatePayherePaymentInput  = { packageId: PackageId }
type CreatePayherePaymentOutput = { paymentUrl: string }

export const createPayherePayment: CreatePayherePayment<
  CreatePayherePaymentInput,
  CreatePayherePaymentOutput
> = async ({ packageId }, context) => {
  if (!context.user) throw new HttpError(401)

  const pkg = PACKAGES[packageId]
  if (!pkg) throw new HttpError(400, 'Invalid package')

  // Dedup: prevent double payment from rapid re-clicks (5-min window per user+package)
  const recentPending = await context.entities.Payment.findFirst({
    where: {
      userId: context.user.id,
      packageId,
      status: 'pending',
      createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
    },
  })
  if (recentPending) throw new HttpError(429, 'A payment for this package is already in progress. Please complete or wait for it to expire.')

  const merchantKey = process.env.PAYHERE_MERCHANT_KEY!
  const clientOrderId = `SG-${Date.now()}-${context.user.id.slice(0, 8)}`

  // Call DigiMart init endpoint
  const initRes = await fetch(`${DIGIMART_BASE}/api/v1/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${merchantKey}`,
    },
    body: JSON.stringify({
      amount: pkg.amountLKR,
      return_url: process.env.PAYHERE_RETURN_URL,
      notify_url: process.env.PAYHERE_NOTIFY_URL,
      client_order_id: clientOrderId,
      customer_email: context.user.email ?? '',
      first_name: context.user.email?.split('@')[0] ?? 'Customer',
    }),
  })

  if (!initRes.ok) {
    const err = await initRes.text()
    console.error('DigiMart init error:', initRes.status, err)
    throw new HttpError(502, 'Payment gateway error. Please try again.')
  }

  const body = await initRes.json() as {
    status: string
    data: { order_id: string; payment_url: string }
  }

  if (body.status !== 'success' || !body.data?.payment_url) {
    console.error('DigiMart unexpected response:', body)
    throw new HttpError(502, 'Payment gateway returned an unexpected response.')
  }

  const { order_id, payment_url } = body.data

  // Persist the payment record — use DigiMart's order_id for webhook lookup
  await context.entities.Payment.create({
    data: {
      userId: context.user.id,
      payhereOrderId: order_id,
      payherePaymentId: null,
      amountLKR: pkg.amountLKR,
      packageId,
      creditsAwarded: pkg.credits,
      status: 'pending',
      rawPayload: { clientOrderId },
    },
  })

  console.log(`Payment initiated: ${order_id} (${pkg.name}, Rs. ${pkg.amountLKR}) for user ${context.user.id}`)

  return { paymentUrl: payment_url }
}
