import { useState } from "react";
import { useAuth } from "wasp/client/auth";
import { createPayherePayment, getProviderPricing } from "wasp/client/operations";
import { useQuery } from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import type { ProviderPricing } from "wasp/entities";
import { CREDIT_PACKAGES } from "../shared/constants";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../client/components/ui/accordion";
import { useToast } from "../client/hooks/use-toast";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader } from "../client/components/ui/card";

const FAQS = [
  {
    q: "Do credits expire?",
    a: "No. Credits never expire. Buy in bulk and use them whenever you need.",
  },
  {
    q: "How are downloads charged?",
    a: "Each provider has a set credit cost. The exact cost is shown before you confirm any download.",
  },
  {
    q: "Can I get a refund?",
    a: "If a download fails, credits are automatically refunded. For billing issues, contact us within 7 days.",
  },
  {
    q: "Which payment methods are accepted?",
    a: "We accept all major credit/debit cards, and other local payment methods via PayHere — Sri Lanka's trusted payment gateway.",
  },
  {
    q: "Can I buy multiple packages?",
    a: "Yes. You can purchase any number of packages. Credits accumulate in your account.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes! New accounts receive 2 free credits on signup — enough to try a download before committing.",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  image: "Images & Vectors",
  icon:  "Icons & UI Assets",
  video: "Video Footage",
};

function ProviderLogoCard({ slug, name, minCost, maxCost }: {
  slug: string; name: string; minCost: number; maxCost: number;
}) {
  const costLabel = minCost === 0
    ? "Free"
    : minCost === maxCost
    ? `${minCost} cr`
    : `from ${minCost} cr`;

  return (
    <div className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 group">
      <div className="w-full h-12 flex items-center justify-center rounded-xl bg-white px-2">
        <img
          src={`/provider-logos/png/${slug}.png`}
          alt={name}
          className="h-8 w-full object-contain"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.dataset.triedSvg) {
              img.dataset.triedSvg = "1";
              img.src = `/provider-logos/${slug}.svg`;
            } else {
              img.style.display = "none";
              const fb = img.nextElementSibling as HTMLElement | null;
              if (fb) fb.style.display = "flex";
            }
          }}
        />
        <span className="hidden w-full h-8 items-center justify-center text-xs font-bold text-gray-600 rounded-lg">
          {name}
        </span>
      </div>
      <span className="text-xs font-extrabold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
        {costLabel}
      </span>
    </div>
  );
}

export default function PricingPage() {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [confirmPackage, setConfirmPackage] = useState<string | null>(null);
  const { data: pricingData } = useQuery(getProviderPricing);

  // Build per-slug min/max cost, grouped by category (exclude lorempicsum test provider)
  const providerGroups = (() => {
    if (!pricingData) return {} as Record<string, { slug: string; name: string; minCost: number; maxCost: number }[]>;
    const map: Record<string, { slug: string; name: string; category: string; minCost: number; maxCost: number }> = {};
    for (const p of pricingData as ProviderPricing[]) {
      if (p.slug === "lorempicsum") continue;
      if (!map[p.slug]) {
        map[p.slug] = { slug: p.slug, name: p.displayName.replace(/ \(.*\)$/, "").replace(/ HD$| 4K$| VIP.*$/, ""), category: p.category, minCost: p.creditCost, maxCost: p.creditCost };
      } else {
        map[p.slug].minCost = Math.min(map[p.slug].minCost, p.creditCost);
        map[p.slug].maxCost = Math.max(map[p.slug].maxCost, p.creditCost);
      }
    }
    const groups: Record<string, { slug: string; name: string; minCost: number; maxCost: number }[]> = {};
    for (const v of Object.values(map)) {
      if (!groups[v.category]) groups[v.category] = [];
      groups[v.category].push({ slug: v.slug, name: v.name, minCost: v.minCost, maxCost: v.maxCost });
    }
    return groups;
  })();

  const handleBuy = async (packageId: string) => {
    if (!user) {
      window.location.href = routes.SignupRoute.to;
      return;
    }
    // First click — show fee confirmation
    if (confirmPackage !== packageId) {
      setConfirmPackage(packageId);
      return;
    }
    // Second click — confirmed, proceed
    setConfirmPackage(null);
    setLoadingPackage(packageId);
    try {
      const { paymentUrl } = await createPayherePayment({ packageId: packageId as any });
      window.location.href = paymentUrl;
    } catch (err: any) {
      toast({
        title: "Payment error",
        description: err?.message || "Could not initiate payment. Please try again.",
        variant: "destructive",
      });
      setLoadingPackage(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16 px-4">
        {/* Background glow orbs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute top-32 -right-20 h-64 w-64 rounded-full bg-secondary/15 blur-[100px]" />
          <div className="absolute bottom-0 -left-16 h-48 w-48 rounded-full bg-primary/10 blur-[80px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary tracking-wide uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Pay in LKR · No Subscriptions
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-5 leading-[1.08]">
            Simple,{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Transparent
            </span>{" "}
            Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Buy credits in <strong className="text-foreground">LKR</strong>. No subscriptions, no hidden fees.
            Download from <strong className="text-foreground">20+ premium stock providers</strong> on your own schedule.
          </p>
          {!user && (
            <p className="mt-5 text-sm text-muted-foreground">
              <Link to={routes.SignupRoute.to} className="text-primary hover:underline font-bold">
                Create a free account
              </Link>{" "}
              to get{" "}
              <strong className="text-foreground">2 bonus credits</strong> — no card required.
            </p>
          )}

          {/* Quick stats */}
          <div className="mt-10 inline-flex flex-wrap justify-center gap-6 text-center border border-border/60 rounded-2xl px-8 py-4 bg-card/60 backdrop-blur-sm shadow-sm">
            {[
              { value: "20+", label: "Providers" },
              { value: "LKR", label: "Local Currency" },
              { value: "∞", label: "Credits Never Expire" },
              { value: "2", label: "Free Credits on Signup" },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col items-center min-w-[80px]">
                <span className="text-xl font-black text-primary">{stat.value}</span>
                <span className="text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="px-4 pb-20">

      <div className="max-w-6xl mx-auto">

        {/* Credit cost per provider — logo grid (shown FIRST so users know what they can download) */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-2">What Can You Download?</h2>
          <p className="text-sm text-muted-foreground text-center mb-10">
            One credit balance works across all 20+ providers. Credit costs vary by provider and file type.
          </p>

          {(["image", "icon", "video"] as const).map((cat) => {
            const providers = providerGroups[cat];
            if (!providers?.length) return null;
            return (
              <div key={cat} className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {providers.map((p) => (
                    <ProviderLogoCard
                      key={p.slug}
                      slug={p.slug}
                      name={p.name}
                      minCost={p.minCost}
                      maxCost={p.maxCost}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Package cards — 6 tiers, 3-col on desktop */}
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-2">Choose Your Credit Pack</h2>
          <p className="text-sm text-muted-foreground">Buy once, use anytime. Credits never expire.</p>
          <p className="text-xs text-muted-foreground mt-1 opacity-70">1 credit ≈ Rs. 180 · Most downloads cost 1–3 credits</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {CREDIT_PACKAGES.map((pkg) => {
            const isPopular = "popular" in pkg && pkg.popular;
            const badge = "badge" in pkg ? pkg.badge : null;
            const isLoading = loadingPackage === pkg.id;
            const isConfirming = confirmPackage === pkg.id;
            const savings = "savings" in pkg ? pkg.savings : null;
            const totalWithFee = Math.round(pkg.priceLKR * 1.03);

            return (
              <Card
                key={pkg.id}
                className={`relative flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border ${
                  isPopular
                    ? "border-primary shadow-xl ring-2 ring-primary/20"
                    : "border-border shadow-md"
                }`}
                variant="bento"
              >
                {badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap shadow-md">
                      {badge}
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-2 pt-6">
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {pkg.name}
                  </span>
                  {isPopular && (
                    <p className="text-xs text-primary font-semibold mt-0.5">Best value · Chosen by most users</p>
                  )}
                  <div className="my-2">
                    <span className="text-4xl font-extrabold tracking-tight">
                      Rs. {pkg.priceLKR.toLocaleString()}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 px-6 pb-6">
                  <ul className="space-y-3 mb-8 flex-1 border-t border-border pt-4">
                    <li className="flex items-center gap-2.5 text-sm">
                      <svg className="w-4.5 h-4.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-foreground font-semibold">{pkg.credits} {pkg.credits === 1 ? "credit" : "credits"}</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <svg className="w-4.5 h-4.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Rs. {pkg.perCredit}/credit</span>
                    </li>
                    {savings ? (
                      <li className="flex items-center gap-2.5 text-sm text-green-600 dark:text-green-400 font-medium">
                        <svg className="w-4.5 h-4.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save Rs. {savings.toLocaleString()}</span>
                      </li>
                    ) : null}
                    <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <svg className="w-4.5 h-4.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Credits never expire</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <svg className="w-4.5 h-4.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>All 20+ providers included</span>
                    </li>
                  </ul>

                  {isConfirming ? (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center animate-in fade-in slide-in-from-bottom-1 duration-150">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-0.5">
                        3% card fee applies
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Rs. {pkg.priceLKR.toLocaleString()} + Rs. {(totalWithFee - pkg.priceLKR).toLocaleString()} fee = <strong className="text-foreground">Rs. {totalWithFee.toLocaleString()}</strong>
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmPackage(null)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold border border-border hover:bg-accent transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleBuy(pkg.id)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                        >
                          Confirm & Pay
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleBuy(pkg.id)}
                      disabled={isLoading}
                      variant={isPopular ? "default" : "outline"}
                      className="w-full py-6 rounded-xl font-bold text-sm tracking-wide transition-all shadow-sm"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                          Redirecting...
                        </>
                      ) : user ? (
                        "Buy Now"
                      ) : (
                        "Sign Up to Buy"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-20">
          {[
            { icon: "🔒", label: "Secure Payments", sub: "via PayHere" },
            { icon: "🇱🇰", label: "Pay in LKR", sub: "No USD conversion" },
            { icon: "⚡", label: "Instant Credits", sub: "After payment" },
            { icon: "♾️", label: "Never Expire", sub: "Use anytime" },
          ].map((item) => (
            <Card key={item.label} className="border border-border p-5 text-center bg-card shadow-sm" variant="bento">
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
            </Card>
          ))}
        </div>

        {/* Full credit cost breakdown table */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-2">Full Credit Cost Breakdown</h2>
          <p className="text-sm text-muted-foreground text-center mb-10">
            Exact deduction per download, by provider and file type.
          </p>

          {(["image", "icon", "video"] as const).map((cat) => {
            const rows = (pricingData as ProviderPricing[] | undefined)
              ?.filter(p => p.category === cat && p.slug !== "lorempicsum")
              .sort((a, b) => a.sortOrder - b.sortOrder);
            if (!rows?.length) return null;

            return (
              <div key={cat} className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <Card className="border border-border overflow-hidden shadow-sm" variant="bento">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="text-left py-3 px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground w-10"></th>
                          <th className="text-left py-3 px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Provider</th>
                          <th className="text-left py-3 px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Type / Variant</th>
                          <th className="text-right py-3 px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Credits</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.map((p) => (
                          <tr key={`${p.slug}-${p.variant}`} className="hover:bg-accent/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="w-32 h-10 bg-white rounded-lg flex items-center justify-center px-2.5">
                                <img
                                  src={`/provider-logos/png/${p.slug}.png`}
                                  alt={p.displayName}
                                  className="h-7 w-full object-contain"
                                  onError={(e) => {
                                    const img = e.currentTarget;
                                    if (!img.dataset.triedSvg) {
                                      img.dataset.triedSvg = "1";
                                      img.src = `/provider-logos/${p.slug}.svg`;
                                    } else {
                                      img.style.display = "none";
                                    }
                                  }}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-foreground">{p.displayName.replace(/ \(.*\)$/, "").replace(/ HD$| 4K$| Select$| HD Select$| 4K Select$/, "")}</td>
                            <td className="py-3 px-4 text-muted-foreground capitalize">
                              {p.variant === "normal" ? "Standard" : p.variant.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`inline-block font-extrabold text-sm px-2.5 py-0.5 rounded-full ${
                                p.creditCost === 0 ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                                p.creditCost <= 1 ? "bg-primary/10 text-primary" :
                                p.creditCost <= 5 ? "bg-primary/10 text-primary" :
                                "bg-secondary/10 text-secondary"
                              }`}>
                                {p.creditCost} cr
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-8">
            Frequently Asked Questions
          </h2>
          <Accordion
            type="single"
            collapsible
            className="w-full bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden shadow-sm"
          >
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-0">
                <AccordionTrigger className="px-6 py-4 text-sm font-semibold hover:no-underline hover:bg-accent/40 transition-colors">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 pt-0 text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact note */}
        <p className="text-center text-sm text-muted-foreground mt-10">
          Questions? Email us at{" "}
          <a href="mailto:support@stockmart.lk" className="text-primary hover:underline font-semibold">
            support@stockmart.lk
          </a>{" "}or WhatsApp{" "}
          <a href="https://wa.me/94772503124" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">
            +94 77 250 3124
          </a>
        </p>
      </div>
      </div>
    </div>
  );
}
