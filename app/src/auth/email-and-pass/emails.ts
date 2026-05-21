import {
  type GetPasswordResetEmailContentFn,
  type GetVerificationEmailContentFn,
} from "wasp/server/auth";

const CLIENT_URL = process.env.WASP_WEB_CLIENT_URL ?? 'https://www.stockmart.lk'

const baseStyle = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f0f0f`
const cardStyle = `max-width:520px;margin:40px auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden`
const headerStyle = `background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 32px 24px`
const bodyStyle = `padding:32px`
const btnStyle = `display:block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:800`
const footerStyle = `padding:20px 32px;border-top:1px solid #2a2a2a;text-align:center;font-size:12px;color:#4b5563`

export const getVerificationEmailContent: GetVerificationEmailContentFn = ({ verificationLink }) => ({
  subject: "✅ Verify your StockMart.lk account",
  text: `Welcome to StockMart.lk!\n\nClick the link below to verify your email:\n${verificationLink}\n\nThis link expires in 30 minutes.\n\n— StockMart.lk`,
  html: `
<!DOCTYPE html><html>
<body style="margin:0;padding:0;${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">
      <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">StockMart.lk</h1>
      <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.8)">Premium Stock Media Downloads</p>
    </div>
    <div style="${bodyStyle}">
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#e5e7eb">Verify your email</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6">
        Welcome! Click the button below to verify your email address and activate your StockMart.lk account.
        You'll get <strong style="color:#a78bfa">2 free credits</strong> after verifying.
      </p>
      <a href="${verificationLink}" style="${btnStyle}">✅ Verify Email Address</a>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#6b7280">
        Link expires in <strong style="color:#9ca3af">30 minutes</strong>
      </p>
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
    <div style="${footerStyle}">
      StockMart.lk · <a href="https://digimartsolutions.lk" style="color:#6366f1;text-decoration:none">DigiMart Solutions (Pvt) Ltd</a> · Sri Lanka<br>
      <a href="mailto:support@stockmart.lk" style="color:#6366f1;text-decoration:none">support@stockmart.lk</a>
    </div>
  </div>
</body></html>`,
})

export const getPasswordResetEmailContent: GetPasswordResetEmailContentFn = ({ passwordResetLink }) => ({
  subject: "🔑 Reset your StockMart.lk password",
  text: `You requested a password reset for your StockMart.lk account.\n\nClick the link below to reset your password:\n${passwordResetLink}\n\nThis link expires in 30 minutes.\n\nIf you didn't request this, you can safely ignore this email.\n\n— StockMart.lk`,
  html: `
<!DOCTYPE html><html>
<body style="margin:0;padding:0;${baseStyle}">
  <div style="${cardStyle}">
    <div style="${headerStyle}">
      <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">StockMart.lk</h1>
      <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.8)">Premium Stock Media Downloads</p>
    </div>
    <div style="${bodyStyle}">
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#e5e7eb">Reset your password</h2>
      <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;line-height:1.6">
        We received a request to reset your StockMart.lk password. Click the button below to choose a new password.
      </p>
      <a href="${passwordResetLink}" style="${btnStyle}">🔑 Reset Password</a>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#6b7280">
        Link expires in <strong style="color:#9ca3af">30 minutes</strong>
      </p>
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280">
        If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
      </p>
    </div>
    <div style="${footerStyle}">
      StockMart.lk · <a href="https://digimartsolutions.lk" style="color:#6366f1;text-decoration:none">DigiMart Solutions (Pvt) Ltd</a> · Sri Lanka<br>
      <a href="mailto:support@stockmart.lk" style="color:#6366f1;text-decoration:none">support@stockmart.lk</a>
    </div>
  </div>
</body></html>`,
})
