import { emailSender } from 'wasp/server/email'

const CLIENT_URL = process.env.WASP_WEB_CLIENT_URL ?? 'https://www.stockmart.lk'

export async function sendDownloadReadyEmail({
  toEmail,
  providerSlug,
  fileName,
  downloadId,
  creditsCharged,
}: {
  toEmail: string
  providerSlug: string
  fileName: string | null
  downloadId: string
  creditsCharged: number
}) {
  const downloadLink = `${CLIENT_URL}/download/${downloadId}`
  const displayName = providerSlug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const fileLabel = fileName ?? 'Your file'

  try {
    await emailSender.send({
      from: { name: 'StockMart.lk', email: 'noreply@stockmart.lk' },
      to: toEmail,
      subject: `✅ Download Ready — ${displayName}`,
      text: `Your download from ${displayName} is ready!\n\nFile: ${fileLabel}\nCredits used: ${creditsCharged}\n\nDownload here: ${downloadLink}\n\nNote: Link expires in 24 hours.\n\n— StockMart.lk`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 32px 24px">
      <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px">StockMart.lk</h1>
      <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.8)">Premium Stock Media Downloads</p>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <div style="background:#16a34a15;border:1px solid #16a34a30;border-radius:12px;padding:16px;margin-bottom:24px;display:flex;align-items:center;gap:12px">
        <span style="font-size:24px">✅</span>
        <div>
          <p style="margin:0;font-size:16px;font-weight:700;color:#4ade80">Download Ready!</p>
          <p style="margin:4px 0 0;font-size:13px;color:#86efac">Your file has been processed successfully</p>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #2a2a2a">
            <span style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Provider</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right">
            <span style="font-size:14px;font-weight:600;color:#e5e7eb">${displayName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #2a2a2a">
            <span style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px">File</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right">
            <span style="font-size:14px;font-weight:600;color:#e5e7eb">${fileLabel}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0">
            <span style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Credits Used</span>
          </td>
          <td style="padding:10px 0;text-align:right">
            <span style="font-size:14px;font-weight:700;color:#a78bfa">${creditsCharged} cr</span>
          </td>
        </tr>
      </table>

      <a href="${downloadLink}"
         style="display:block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:800;letter-spacing:-0.3px">
        ⬇️ Download Your File
      </a>

      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#6b7280">
        ⚠️ Link expires in <strong style="color:#9ca3af">24 hours</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #2a2a2a;background:#111">
      <p style="margin:0;font-size:12px;color:#4b5563;text-align:center">
        StockMart.lk · <a href="https://digimartsolutions.lk" style="color:#6366f1;text-decoration:none">DigiMart Solutions (Pvt) Ltd</a> · Sri Lanka<br>
        <a href="${CLIENT_URL}/refund-policy" style="color:#6366f1;text-decoration:none">Refund Policy</a>
        &nbsp;·&nbsp;
        <a href="mailto:support@stockmart.lk" style="color:#6366f1;text-decoration:none">support@stockmart.lk</a>
      </p>
    </div>

  </div>
</body>
</html>`,
    })
    console.log(`[Email] Download ready email sent to ${toEmail}`)
  } catch (err) {
    // Email failures should never block the download flow
    console.error(`[Email] Failed to send download ready email to ${toEmail}:`, err)
  }
}

export async function sendDownloadFailedEmail({
  toEmail,
  providerSlug,
  errorMessage,
  creditsRefunded,
}: {
  toEmail: string
  providerSlug: string
  errorMessage: string
  creditsRefunded: number
}) {
  const displayName = providerSlug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  try {
    await emailSender.send({
      from: { name: 'StockMart.lk', email: 'noreply@stockmart.lk' },
      to: toEmail,
      subject: `❌ Download Failed — ${displayName} (Credits Refunded)`,
      text: `Your download from ${displayName} failed.\n\nReason: ${errorMessage}\n\nGood news: ${creditsRefunded} credits have been automatically refunded to your account.\n\nDashboard: ${CLIENT_URL}/dashboard\n\n— StockMart.lk`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 32px 24px">
      <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">StockMart.lk</h1>
    </div>
    <div style="padding:32px">
      <div style="background:#ef444415;border:1px solid #ef444430;border-radius:12px;padding:16px;margin-bottom:24px">
        <p style="margin:0;font-size:16px;font-weight:700;color:#f87171">❌ Download Failed</p>
        <p style="margin:8px 0 0;font-size:13px;color:#fca5a5">${errorMessage}</p>
      </div>
      <div style="background:#16a34a15;border:1px solid #16a34a30;border-radius:12px;padding:16px;margin-bottom:24px">
        <p style="margin:0;font-size:14px;font-weight:700;color:#4ade80">✅ ${creditsRefunded} credits automatically refunded</p>
        <p style="margin:6px 0 0;font-size:13px;color:#86efac">Your balance has been fully restored. No charges applied.</p>
      </div>
      <a href="${CLIENT_URL}/dashboard" style="display:block;background:#1f2937;color:#e5e7eb;text-decoration:none;text-align:center;padding:14px;border-radius:12px;font-size:14px;font-weight:700">
        Go to Dashboard →
      </a>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #2a2a2a">
      <p style="margin:0;font-size:12px;color:#4b5563;text-align:center">
        Need help? <a href="mailto:support@stockmart.lk" style="color:#6366f1">support@stockmart.lk</a>
      </p>
    </div>
  </div>
</body>
</html>`,
    })
    console.log(`[Email] Download failed email sent to ${toEmail}`)
  } catch (err) {
    console.error(`[Email] Failed to send download failed email to ${toEmail}:`, err)
  }
}
