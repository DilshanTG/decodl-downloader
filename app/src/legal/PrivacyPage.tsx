import { Link } from "wasp/client/router";

export default function PrivacyPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-black text-primary">StockMart.lk</Link>
        <div className="flex gap-4 text-sm">
          <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">Login</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: May 2026 · StockMart.lk by DigiMart Solutions (Pvt) Ltd</p>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Who We Are</h2>
            <p>StockMart.lk is operated by <strong className="text-foreground">DigiMart Solutions (Pvt) Ltd</strong>, a company registered in Sri Lanka. We provide a credit-based platform that allows users to download premium stock media from global providers and pay in Sri Lankan Rupees (LKR).</p>
            <p className="mt-2">Contact: <a href="mailto:support@stockmart.lk" className="text-primary hover:underline">support@stockmart.lk</a> · <a href="https://wa.me/94772503124" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatsApp Support</a></p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Information We Collect</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-foreground">Account data:</strong> Email address, username, and password hash when you register.</li>
              <li><strong className="text-foreground">Transaction data:</strong> Credit purchase history, download history, payment reference numbers, and amounts paid in LKR.</li>
              <li><strong className="text-foreground">Usage data:</strong> URLs submitted for download, provider accessed, file names, file sizes, and download timestamps.</li>
              <li><strong className="text-foreground">Device data:</strong> IP address, browser type, and operating system (collected automatically via server logs).</li>
              <li><strong className="text-foreground">Payment data:</strong> We do not store full card details. Payments are processed by PayHere (Sri Lanka) under their PCI-DSS compliant environment. We only retain payment reference IDs and confirmation status.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. How We Use Your Information</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>To create and manage your account and credit balance.</li>
              <li>To process downloads and charge credits accordingly.</li>
              <li>To send transactional emails: download completion, download failure, payment confirmation.</li>
              <li>To provide customer support when you contact us.</li>
              <li>To detect fraud, abuse, or misuse of the platform.</li>
              <li>To comply with legal obligations under Sri Lankan law.</li>
            </ul>
            <p className="mt-3">We do <strong className="text-foreground">not</strong> sell, rent, or share your personal data with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Third-Party Services</h2>
            <p>We use the following third-party services which may process your data under their own privacy policies:</p>
            <ul className="space-y-2 list-disc list-inside mt-3">
              <li><strong className="text-foreground">PayHere</strong> — Payment processing (Sri Lanka). <a href="https://www.payhere.lk/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a></li>
              <li><strong className="text-foreground">Decodl API</strong> — Stock media download service. Your submitted URL and provider info is shared to fulfil the download request.</li>
              <li><strong className="text-foreground">Supabase</strong> — Database hosting. Data is stored on servers in the Asia-Pacific region.</li>
              <li><strong className="text-foreground">Railway / Vercel</strong> — Server and frontend hosting infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Data Retention</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Account data is retained for as long as your account is active.</li>
              <li>Download records are kept for 12 months for support and dispute resolution purposes.</li>
              <li>Payment records are retained for 7 years to comply with Sri Lankan financial regulations.</li>
              <li>Downloaded file links expire after 24 hours and are not permanently stored by us.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="space-y-2 list-disc list-inside mt-3">
              <li><strong className="text-foreground">Access</strong> the personal data we hold about you.</li>
              <li><strong className="text-foreground">Correct</strong> inaccurate or outdated information.</li>
              <li><strong className="text-foreground">Delete</strong> your account and associated data (subject to legal retention obligations).</li>
              <li><strong className="text-foreground">Opt out</strong> of non-essential communications by contacting us at support@stockmart.lk.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, email us at <a href="mailto:support@stockmart.lk" className="text-primary hover:underline">support@stockmart.lk</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Cookies</h2>
            <p>We use essential cookies only — for session management and authentication. We do not use advertising or tracking cookies. No cookie consent banner is required as we do not use non-essential cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Security</h2>
            <p>We implement industry-standard security practices including encrypted connections (HTTPS), hashed passwords, and access-controlled databases. However, no system is 100% secure and we cannot guarantee absolute security of your data.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Changes to This Policy</h2>
            <p>We may update this policy from time to time. Material changes will be notified via email or a banner on the platform. Continued use of StockMart.lk after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Contact</h2>
            <p>For privacy-related questions or requests, contact us at:</p>
            <div className="mt-3 p-4 rounded-xl border border-border bg-card">
              <p className="font-bold text-foreground">DigiMart Solutions (Pvt) Ltd</p>
              <p className="mt-1">Email: <a href="mailto:support@stockmart.lk" className="text-primary hover:underline">support@stockmart.lk</a></p>
              <p>WhatsApp: <a href="https://wa.me/94772503124" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">+94 77 250 3124</a></p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">← Back to StockMart.lk</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link to="/refund-policy" className="hover:text-foreground transition-colors">Refund Policy</Link>
        </div>
      </main>
    </div>
  );
}
