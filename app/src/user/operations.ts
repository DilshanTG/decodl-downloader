import { type Prisma } from "@prisma/client";
import { type User } from "wasp/entities";
import { HttpError, prisma } from "wasp/server";
import {
  type GetPaginatedUsers,
  type UpdateIsUserAdminById,
  // @ts-ignore
  type SendPhoneOtp,
  // @ts-ignore
  type VerifyPhoneOtp,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const SMS_USER_ID = process.env.SMS_USER_ID ?? '1335'
const SMS_API_KEY = process.env.SMS_API_KEY ?? ''
const SMS_SENDER_ID = process.env.SMS_SENDER_ID ?? 'DIGIMART'
const OTP_TTL_MS = 10 * 60 * 1000  // 10 minutes
const OTP_RATE_LIMIT_MS = 60 * 1000 // 1 per minute

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function sendSms(contact: string, message: string): Promise<void> {
  const url = new URL('https://smslenz.lk/api/send-sms')
  url.searchParams.set('user_id', SMS_USER_ID)
  url.searchParams.set('api_key', SMS_API_KEY)
  url.searchParams.set('sender_id', SMS_SENDER_ID)
  url.searchParams.set('contact', contact)
  url.searchParams.set('message', message)
  const res = await fetch(url.toString(), { method: 'POST' })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`SMSlenz error ${res.status}: ${body}`)
  }
}

export const sendPhoneOtp: SendPhoneOtp<void, { sent: boolean }> = async (_args, context) => {
  if (!context.user) throw new HttpError(401)

  const user = await prisma.user.findUnique({ where: { id: context.user.id } })
  if (!user) throw new HttpError(404, 'User not found')
  if (!user.phone) throw new HttpError(400, 'No phone number on your account. Please contact support.')
  if ((user as any).phoneVerified) throw new HttpError(400, 'Phone already verified')
  if (user.freeCreditsClaimed) throw new HttpError(400, 'Free credits already claimed')

  // Rate limit: one OTP per minute
  const recent = await prisma.phoneOtp.findFirst({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - OTP_RATE_LIMIT_MS) } },
    orderBy: { createdAt: 'desc' },
  })
  if (recent) {
    const secondsLeft = Math.ceil((OTP_RATE_LIMIT_MS - (Date.now() - recent.createdAt.getTime())) / 1000)
    throw new HttpError(429, `Please wait ${secondsLeft} seconds before requesting another OTP`)
  }

  const code = generateOtp()
  await prisma.phoneOtp.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      phone: user.phone,
      code,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  })

  await sendSms(user.phone, `Your StockMart.lk verification code is: ${code}. Valid for 10 minutes. Do not share this code.`)

  return { sent: true }
}

export const verifyPhoneOtp: VerifyPhoneOtp<{ code: string }, { success: boolean; newBalance: number }> = async ({ code }, context) => {
  if (!context.user) throw new HttpError(401)
  if (!code?.trim()) throw new HttpError(400, 'OTP code is required')

  const user = await prisma.user.findUnique({ where: { id: context.user.id } })
  if (!user) throw new HttpError(404, 'User not found')
  if ((user as any).phoneVerified) throw new HttpError(400, 'Phone already verified')
  if (user.freeCreditsClaimed) throw new HttpError(400, 'Free credits already claimed')

  const otp = await prisma.phoneOtp.findFirst({
    where: {
      userId: user.id,
      code: code.trim(),
      used: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (!otp) throw new HttpError(400, 'Invalid or expired code. Please request a new OTP.')

  // Mark OTP used
  await prisma.phoneOtp.update({ where: { id: otp.id }, data: { used: true } })

  const BONUS = 2
  // Atomically grant credits and mark phone verified + freeCreditsClaimed
  const updated = await prisma.user.updateMany({
    where: { id: user.id, freeCreditsClaimed: false },
    data: {
      phoneVerified: true,
      freeCreditsClaimed: true,
      credits: { increment: BONUS },
      lifetimeCreditsEarned: { increment: BONUS },
    },
  })
  if (updated.count === 0) throw new HttpError(400, 'Credits already claimed')

  const fresh = await prisma.user.findUnique({ where: { id: user.id } })
  await prisma.creditTransaction.create({
    data: {
      userId: user.id,
      amount: BONUS,
      balance: fresh?.credits ?? BONUS,
      type: 'bonus',
      description: 'Welcome bonus — 2 free credits after phone verification',
    },
  })

  return { success: true, newBalance: fresh?.credits ?? BONUS }
}

const updateUserAdminByIdInputSchema = z.object({
  id: z.string().nonempty(),
  isAdmin: z.boolean(),
});

type UpdateUserAdminByIdInput = z.infer<typeof updateUserAdminByIdInputSchema>;

export const updateIsUserAdminById: UpdateIsUserAdminById<
  UpdateUserAdminByIdInput,
  User
> = async (rawArgs, context) => {
  const { id, isAdmin } = ensureArgsSchemaOrThrowHttpError(
    updateUserAdminByIdInputSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  if (!context.user.isAdmin) {
    throw new HttpError(
      403,
      "Only admins are allowed to perform this operation",
    );
  }

  return context.entities.User.update({
    where: { id },
    data: { isAdmin },
  });
};

type GetPaginatedUsersOutput = {
  users: Pick<
    User,
    | "id"
    | "email"
    | "username"
    | "isAdmin"
    | "credits"
    | "lifetimeSpentLKR"
  >[];
  totalPages: number;
};

const getPaginatorArgsSchema = z.object({
  skipPages: z.number().int().min(0),
  filter: z.object({
    emailContains: z.string().nonempty().optional(),
    isAdmin: z.boolean().optional(),
    hasPaid: z.boolean().optional(),
  }),
});

type GetPaginatedUsersInput = z.infer<typeof getPaginatorArgsSchema>;

export const getPaginatedUsers: GetPaginatedUsers<
  GetPaginatedUsersInput,
  GetPaginatedUsersOutput
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(
      401,
      "Only authenticated users are allowed to perform this operation",
    );
  }

  if (!context.user.isAdmin) {
    throw new HttpError(
      403,
      "Only admins are allowed to perform this operation",
    );
  }

  const {
    skipPages,
    filter: { emailContains, isAdmin, hasPaid },
  } = ensureArgsSchemaOrThrowHttpError(getPaginatorArgsSchema, rawArgs);

  const pageSize = 10;

  const userPageQuery: Prisma.UserFindManyArgs = {
    skip: skipPages * pageSize,
    take: pageSize,
    where: {
      AND: [
        {
          email: {
            contains: emailContains,
            mode: "insensitive",
          },
          isAdmin,
        },
        hasPaid !== undefined
          ? { lifetimeSpentLKR: hasPaid ? { gt: 0 } : { equals: 0 } }
          : {},
      ],
    },
    select: {
      id: true,
      email: true,
      username: true,
      isAdmin: true,
      credits: true,
      lifetimeSpentLKR: true,
      freeCreditsClaimed: true,
    },
    orderBy: {
      username: "asc",
    },
  };

  const [pageOfUsers, totalUsers] = await prisma.$transaction([
    context.entities.User.findMany(userPageQuery),
    context.entities.User.count({ where: userPageQuery.where }),
  ]);
  const totalPages = Math.ceil(totalUsers / pageSize);

  return {
    users: pageOfUsers,
    totalPages,
  };
};
