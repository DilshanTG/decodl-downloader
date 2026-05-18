import { Link } from "wasp/client/router";

export default function RefundPolicyPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-black text-primary">StockMart.lk</Link>
        <div className="flex gap-4 text-sm">
          <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">Login</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-black text-foreground mb-2">Refund Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: June 2026 · StockMart.lk by DigiMart Solutions (Pvt) Ltd</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-8">

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Credit Purchases — Non-Refundable</h2>
            <p className="text-muted-foreground leading-relaxed">
              All credit purchases made through StockMart.lk are <strong className="text-foreground">final and non-refundable</strong> once the
              payment is confirmed and credits have been added to your account. Credits are a digital product that are
              consumed upon use and have no real-world monetary equivalent outside of our platform.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We strongly recommend purchasing a smaller package first to test the service before committing to larger packages.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Automatic Refund — Failed Downloads</h2>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                ✅ This is guaranteed — no action needed from you.
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              If a download fails due to any reason on our side or the provider's side, <strong className="text-foreground">your credits are
              automatically and instantly refunded</strong> to your account. This happens atomically — the system never permanently
              deducts credits until a successful download is confirmed.
            </p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li className="flex gap-2"><span className="text-emerald-500 font-bold">✓</span> Provider API error or timeout</li>
              <li className="flex gap-2"><span className="text-emerald-500 font-bold">✓</span> Asset not found or unavailable</li>
              <li className="flex gap-2"><span className="text-emerald-500 font-bold">✓</span> Download stuck for more than 30 minutes</li>
              <li className="flex gap-2"><span className="text-emerald-500 font-bold">✓</span> Server-side processing error</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Credits Validity</h2>
            <p className="text-muted-foreground leading-relaxed">
              Credits <strong className="text-foreground">never expire</strong>. Once purchased, they remain in your account indefinitely until used.
              There are no maintenance fees, inactivity charges, or expiry dates.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Exceptional Cases — Manual Review</h2>
            <p className="text-muted-foreground leading-relaxed">
              We handle the following situations on a case-by-case basis via our support email:
            </p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li className="flex gap-2"><span className="text-blue-500 font-bold">→</span> Double payment due to technical error</li>
              <li className="flex gap-2"><span className="text-blue-500 font-bold">→</span> Payment debited from bank but credits not received after 24 hours</li>
              <li className="flex gap-2"><span className="text-blue-500 font-bold">→</span> Service completely unavailable for more than 72 hours</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To request a manual review, email us at{" "}
              <a href="mailto:support@stockmart.lk" className="text-primary font-semibold hover:underline">
                support@stockmart.lk
              </a>{" "}
              with your account email, payment reference number, and description of the issue.
              We respond within 24 business hours.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. What We Cannot Refund</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex gap-2"><span className="text-red-500 font-bold">✗</span> Credits already used for successful downloads</li>
              <li className="flex gap-2"><span className="text-red-500 font-bold">✗</span> Downloads where the file was successfully delivered but you didn't like it</li>
              <li className="flex gap-2"><span className="text-red-500 font-bold">✗</span> Purchases made with correct awareness of pricing</li>
              <li className="flex gap-2"><span className="text-red-500 font-bold">✗</span> Credits used in violation of our Terms of Service</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Contact</h2>
            <div className="bg-card border border-border rounded-xl p-5 space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">Company:</span> DigiMart Solutions (Pvt) Ltd, Sri Lanka
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">Website:</span>{" "}
                <a href="https://digimartsolutions.lk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">digimartsolutions.lk</a>
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">Email:</span>{" "}
                <a href="mailto:support@stockmart.lk" className="text-primary hover:underline">support@stockmart.lk</a>
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">WhatsApp:</span>{" "}
                <a href="https://wa.me/94772503124" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">+94 77 250 3124</a>
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">Response time:</span> Within 24 business hours
              </p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 text-center text-xs text-muted-foreground">
        © 2026 StockMart.lk — DigiMart Solutions (Pvt) Ltd ·{" "}
        <a href="/refund-policy" className="hover:text-foreground underline">Refund Policy</a>
      </footer>
    </div>
  );
}
