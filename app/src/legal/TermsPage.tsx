import { Link } from "wasp/client/router";

export default function TermsPage() {
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
        <h1 className="text-4xl font-black text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: May 2026 · StockMart.lk by DigiMart Solutions (Pvt) Ltd</p>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>By registering for or using StockMart.lk ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, you must not use the Platform. These terms apply to all users, including visitors, registered users, and anyone who accesses any part of the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. The Service</h2>
            <p>StockMart.lk is a credit-based platform operated by <strong className="text-foreground">DigiMart Solutions (Pvt) Ltd</strong> that enables Sri Lankan users to download premium stock media assets from third-party providers (such as Shutterstock, Freepik, Adobe Stock, Envato Elements, and others) using LKR-denominated credits.</p>
            <p className="mt-2">We act as an intermediary service. The actual content is owned by the respective stock media providers and is subject to their licensing terms. We do not create, own, or host the downloaded assets.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Account Registration</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>You must be at least 18 years old to register.</li>
              <li>You must provide accurate, current, and complete information.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>One account per person. Multiple accounts are not permitted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Credits and Payments</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Credits are a virtual currency used solely within StockMart.lk.</li>
              <li>Credits are purchased in LKR through PayHere, our payment processor.</li>
              <li>Credits have no cash value and cannot be transferred, sold, or refunded once purchased (see our <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>).</li>
              <li>Credits do not expire.</li>
              <li>Credit prices may change at any time. Purchased credits retain their face value.</li>
              <li>New accounts may receive a welcome bonus of free credits at our discretion.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Downloads and Licensing</h2>
            <p className="mb-3"><strong className="text-foreground">Important:</strong> When you download an asset through StockMart.lk, you are obtaining access under the license terms of the originating stock media provider. You must comply with those license terms.</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>Downloaded assets may not be used for resale, redistribution, or sublicensing unless explicitly permitted by the provider's license.</li>
              <li>You may not use downloaded assets for AI training datasets, NFT creation, or any unlawful purpose.</li>
              <li>Download links are temporary and expire after 24 hours. We do not guarantee re-access after expiry.</li>
              <li>Failed downloads that are confirmed as a platform error will receive an automatic credit refund.</li>
              <li>We do not guarantee that any specific asset will be downloadable. Provider availability may change.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Prohibited Use</h2>
            <p>You may not use StockMart.lk to:</p>
            <ul className="space-y-2 list-disc list-inside mt-3">
              <li>Attempt to bypass, hack, or exploit the platform or its APIs.</li>
              <li>Use automated scripts or bots to submit download requests.</li>
              <li>Share account access or credentials with other users.</li>
              <li>Download assets for purposes that violate the provider's licensing terms.</li>
              <li>Use the service for commercial resale of downloaded stock assets.</li>
              <li>Engage in any activity that disrupts or damages the platform or other users' experience.</li>
            </ul>
            <p className="mt-3">Violations may result in immediate account suspension and forfeiture of remaining credits without refund.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Service Availability</h2>
            <p>We aim for maximum uptime but do not guarantee uninterrupted service. We may perform maintenance, updates, or suspend access to parts of the platform at any time. We are not liable for losses arising from service downtime or delays.</p>
            <p className="mt-2">Third-party provider availability is outside our control. If a provider API becomes unavailable, we will attempt to notify users but are not responsible for resulting download failures.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by Sri Lankan law, DigiMart Solutions (Pvt) Ltd and its directors, employees, and agents shall not be liable for:</p>
            <ul className="space-y-2 list-disc list-inside mt-3">
              <li>Indirect, incidental, or consequential damages arising from use of the Platform.</li>
              <li>Loss of data, revenue, or business opportunities.</li>
              <li>Issues arising from third-party provider content, licensing, or availability.</li>
              <li>Any damages exceeding the total credits purchased by you in the 3 months prior to the claim.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Intellectual Property</h2>
            <p>The StockMart.lk platform, brand, logo, and all original software are owned by DigiMart Solutions (Pvt) Ltd. Downloaded content remains the property of the originating stock media provider and is subject to their respective licenses.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or at our sole discretion. You may close your account at any time by contacting support. Unused credits are non-refundable upon voluntary or involuntary account closure.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Governing Law</h2>
            <p>These Terms are governed by the laws of the <strong className="text-foreground">Democratic Socialist Republic of Sri Lanka</strong>. Any disputes shall be subject to the exclusive jurisdiction of the courts of Sri Lanka.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">12. Changes to Terms</h2>
            <p>We may update these Terms at any time. We will notify you via email for material changes. Continued use of the Platform after changes constitutes acceptance. It is your responsibility to review these Terms periodically.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">13. Contact</h2>
            <div className="mt-3 p-4 rounded-xl border border-border bg-card">
              <p className="font-bold text-foreground">DigiMart Solutions (Pvt) Ltd</p>
              <p className="mt-1">Email: <a href="mailto:support@stockmart.lk" className="text-primary hover:underline">support@stockmart.lk</a></p>
              <p>WhatsApp: <a href="https://wa.me/94772503124" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">+94 77 250 3124</a></p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">← Back to StockMart.lk</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/refund-policy" className="hover:text-foreground transition-colors">Refund Policy</Link>
        </div>
      </main>
    </div>
  );
}
