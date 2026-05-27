import {
  type GetPasswordResetEmailContentFn,
  type GetVerificationEmailContentFn,
} from "wasp/server/auth";

const CLIENT_URL = process.env.WASP_WEB_CLIENT_URL ?? 'https://www.stockmart.lk'

function baseHtml(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 16px">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px">
              <a href="${CLIENT_URL}" style="text-decoration:none">
                <span style="font-size:26px;font-weight:900;color:#6d28d9;letter-spacing:-0.5px">StockMart</span><span style="font-size:26px;font-weight:900;color:#a78bfa">.lk</span>
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;padding:40px 40px 32px">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 8px;font-size:12px;color:#9ca3af;line-height:1.8">
              StockMart.lk &middot; DigiMart Solutions (Pvt) Ltd &middot; Sri Lanka<br>
              <a href="mailto:support@stockmart.lk" style="color:#a78bfa;text-decoration:none">support@stockmart.lk</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export const getVerificationEmailContent: GetVerificationEmailContentFn = ({ verificationLink }) => ({
  subject: "Verify your StockMart.lk account",
  text: `Welcome to StockMart.lk!\n\nClick the link below to verify your email:\n${verificationLink}\n\nThis link expires in 30 minutes.\n\n— StockMart.lk`,
  html: baseHtml(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center">Verify your email</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;text-align:center">Welcome to StockMart.lk</p>

    <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0">

    <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;text-align:center">
      Click the button below to verify your email address and activate your account.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${verificationLink}"
            style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.2px">
            Verify Email Address
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#9ca3af">
      Link expires in <strong style="color:#6b7280">30 minutes</strong>
    </p>

    <hr style="border:none;border-top:1px solid #f0f0f0;margin:28px 0 20px">

    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
      If you didn't create an account, you can safely ignore this email.
    </p>
  `)
})

export const getPasswordResetEmailContent: GetPasswordResetEmailContentFn = ({ passwordResetLink }) => ({
  subject: "Reset your StockMart.lk password",
  text: `You requested a password reset for your StockMart.lk account.\n\nClick the link below to reset your password:\n${passwordResetLink}\n\nThis link expires in 30 minutes.\n\nIf you didn't request this, you can safely ignore this email.\n\n— StockMart.lk`,
  html: baseHtml(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;text-align:center">Reset your password</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;text-align:center">StockMart.lk account</p>

    <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0">

    <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;text-align:center">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${passwordResetLink}"
            style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.2px">
            Reset Password
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#9ca3af">
      Link expires in <strong style="color:#6b7280">30 minutes</strong>
    </p>

    <hr style="border:none;border-top:1px solid #f0f0f0;margin:28px 0 20px">

    <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
      If you didn't request a password reset, you can safely ignore this email.
    </p>
  `)
})
