import { defineEnvValidationSchema } from 'wasp/env'
import { z } from 'zod'

import { authEnvSchema } from './auth/env'

const payhereEnvSchema = z.object({
  PAYHERE_MERCHANT_KEY: z.string().min(1),
  PAYHERE_MERCHANT_ID: z.string().min(1),
  PAYHERE_MERCHANT_SECRET: z.string().min(1),
  PAYHERE_NOTIFY_URL: z.string().url(),
  PAYHERE_RETURN_URL: z.string().url(),
  PAYHERE_CANCEL_URL: z.string().url(),
})

const decodlEnvSchema = z.object({
  DECODL_APP_KEY: z.string().min(1),
  DECODL_TOKEN: z.string().min(1),
})

export const serverEnvValidationSchema = defineEnvValidationSchema(
  authEnvSchema
    .merge(payhereEnvSchema)
    .merge(decodlEnvSchema)
)
