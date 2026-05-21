import { useState, useEffect } from "react";
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
  icon: "Icons & UI Assets",
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
    <div className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-border/80 bg-background/50 hover:border-primary/40 hover:bg-card hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 group">
      <div className="w-full h-12 flex items-center justify-center rounded-xl bg-white/95 dark:bg-white px-2 shadow-sm border border-border/10">
        <img
          src={`/provider-logos/png/${slug}.png`}
          alt={name}
          className="h-8 w-full object-contain group-hover:scale-105 transition-transform duration-200"
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
      <span className="text-[10px] font-extrabold tracking-wider uppercase text-primary bg-primary/10 dark:bg-primary/20 px-3 py-0.5 rounded-full shadow-sm">
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

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "cancelled") {
      toast({
        title: "Payment cancelled",
        description: "Your payment was cancelled. No charges were made. You can try again anytime.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (payment === "failed") {
      toast({
        title: "Payment failed",
        description: "Your payment could not be processed. Please try again or use a different card.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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
    if (confirmPackage !== packageId) {
      setConfirmPackage(packageId);
      return;
    }
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

      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-16 pb-10 px-4">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute top-0 -right-20 h-48 w-48 rounded-full bg-secondary/15 blur-[100px]" />
        </div>

        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold tracking-wide uppercase text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Pay in LKR · No Subscriptions
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-heading tracking-tight mb-4 leading-[1.08]">
            Simple,{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Transparent
            </span>{" "}
            Pricing
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Buy credits in <strong className="text-foreground">LKR</strong>. No subscriptions, no hidden fees.
            Download from <strong className="text-foreground">20+ premium providers</strong> — pay only for what you use.
          </p>
          {!user && (
            <p className="mt-4 text-sm text-muted-foreground">
              <Link to={routes.SignupRoute.to} className="text-primary hover:underline font-bold">
                Create a free account
              </Link>{" "}
              and get <strong className="text-foreground">2 bonus credits</strong> — no credit card required.
            </p>
          )}
        </div>
      </section>

      <div className="px-4 pb-20">
        <div className="max-w-6xl mx-auto">

          {/* Credit explanation — compact inline strip */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/5 p-4 sm:p-5 flex items-start sm:items-center gap-4 overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -z-10" />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary text-xl shadow-inner border border-primary/10">
                💡
              </div>
              <div className="flex-1 text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-semibold">1 credit is approximately Rs. 180</strong>. Most standard images and vectors cost just <strong className="text-foreground font-semibold">1 credit</strong>. Remaining balance <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">never expires</strong>.{" "}
                <button
                  onClick={() => {
                    document.getElementById("provider-rates")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-0.5 text-primary hover:underline font-bold transition-all group"
                >
                  See provider credit rates 
                  <span className="inline-block transform group-hover:translate-y-0.5 transition-transform">↓</span>
                </button>
              </div>
            </div>
          </div>

          {/* Package cards — ABOVE THE FOLD */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-black font-heading tracking-tight mb-2 text-foreground">
              Choose Your Credit Pack
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Unlock instant downloads from 20+ stock providers. Pay once, use anytime.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {CREDIT_PACKAGES.map((pkg) => {
              const isPopular = "popular" in pkg && pkg.popular;
              const badge = "badge" in pkg ? pkg.badge : null;
              const isLoading = loadingPackage === pkg.id;
              const isConfirming = confirmPackage === pkg.id;
              const savings = "savings" in pkg ? pkg.savings : null;
              const totalWithFee = Math.round(pkg.priceLKR * 1.03);

              return (
                <div key={pkg.id} className="relative flex flex-col pt-5">
                  {badge && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-gradient-to-r from-primary to-secondary text-primary-foreground text-[10px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg ring-2 ring-background uppercase tracking-wider">
                        {badge}
                      </span>
                    </div>
                  )}
                <Card
                  className={`relative flex flex-col flex-1 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(107,0,246,0.12)] hover:-translate-y-1.5 border rounded-3xl overflow-hidden ${
                    isPopular
                      ? "border-primary/80 shadow-[0_10px_30px_rgba(107,0,246,0.08)] bg-gradient-to-b from-primary/[0.03] to-transparent"
                      : "border-border shadow-md bg-card"
                  }`}
                  variant="bento"
                >
                  {isPopular && (
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
                  )}

                  <CardHeader className="text-center pb-2 pt-8">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                      {pkg.name}
                    </span>
                    <p className="text-xs text-muted-foreground/80 mt-1 font-semibold">
                      {{
                        single: "Try 1 download",
                        starter: "Good for small projects",
                        value: "Most popular · Best value",
                        pro: "Good for freelancers",
                        business: "Good for agencies",
                        agency: "Unlimited projects",
                      }[pkg.id] ?? ""}
                    </p>
                    <div className="my-3">
                      <span className="text-4xl sm:text-5xl font-black font-heading tracking-tight text-foreground">
                        Rs. {pkg.priceLKR.toLocaleString()}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-col flex-1 px-6 pb-6">
                    <ul className="space-y-3.5 mb-8 flex-1 border-t border-border/80 pt-5">
                      <li className="flex items-center gap-3 text-sm">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-foreground font-bold">{pkg.credits} {pkg.credits === 1 ? "credit" : "credits"}</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span>Rs. {pkg.perCredit}/credit</span>
                      </li>
                      {savings ? (
                        <li className="flex items-center gap-3 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span>Save Rs. {savings.toLocaleString()}</span>
                        </li>
                      ) : null}
                      <li className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span>Credits never expire</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span>All 20+ providers included</span>
                      </li>
                    </ul>

                    {isConfirming ? (
                      <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 text-center transition-all duration-300 shadow-inner">
                        <div className="flex justify-center mb-1.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            💳 Standard Gateway Fee
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-2 leading-normal">
                          A minor <strong className="text-foreground">3% card processing fee</strong> is applied by the PayHere gateway.
                        </p>
                        <div className="bg-background/80 rounded-xl p-2.5 border border-border/60 mb-3 space-y-0.5">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Base Price:</span>
                            <span>Rs. {pkg.priceLKR.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Gateway Fee (3%):</span>
                            <span>Rs. {(totalWithFee - pkg.priceLKR).toLocaleString()}</span>
                          </div>
                          <div className="h-px bg-border my-1.5" />
                          <div className="flex justify-between text-xs font-bold text-foreground">
                            <span>Total Charge:</span>
                            <span className="text-primary font-heading font-extrabold text-sm">Rs. {totalWithFee.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmPackage(null)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold border border-border bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98] transition-all duration-150"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleBuy(pkg.id)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.98] transition-all duration-150 shadow-md shadow-primary/10"
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
                        className="w-full py-6 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] cursor-pointer hover:shadow-lg duration-200"
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin w-4 h-4 mr-2 text-current" fill="none" viewBox="0 0 24 24">
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
                </div>
              );
            })}
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
            {[
              { icon: "🔒", label: "Secure Payments", sub: "via PayHere Gateway" },
              { icon: "🇱🇰", label: "Pay in LKR", sub: "No USD conversions" },
              { icon: "⚡", label: "Instant Credits", sub: "Credited in seconds" },
              { icon: "♾️", label: "Never Expire", sub: "Lifetime validity" },
            ].map((item) => (
              <div 
                key={item.label} 
                className="border border-border/80 rounded-2xl p-5 text-center bg-card/50 hover:bg-card hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
              >
                <div className="text-3xl mb-2.5 filter drop-shadow-sm">{item.icon}</div>
                <p className="text-sm font-bold text-foreground font-heading">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Provider rates — collapsible */}
          <div id="provider-rates" className="mb-16">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="providers" className="border border-border rounded-2xl overflow-hidden bg-card/60 backdrop-blur-md shadow-lg transition-all duration-300">
                <AccordionTrigger className="px-6 py-5 hover:no-underline hover:bg-accent/30 transition-all group">
                  <div className="flex items-center gap-4 text-left">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted border border-border group-hover:border-primary/30 transition-colors text-lg shadow-sm">
                      📋
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground font-heading tracking-tight">
                        What can I download? — Credit rates by provider
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        20+ premium providers supported · Images, vectors, icons, and HD/4K videos
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-4 border-t border-border/80">

                  <p className="text-xs text-muted-foreground mb-6">
                    Credit cost per download, by provider and file type.
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
                                  <th className="text-left py-3 px-3 sm:px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground w-10"></th>
                                  <th className="text-left py-3 px-3 sm:px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Provider</th>
                                  <th className="text-left py-3 px-3 sm:px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Type / Variant</th>
                                  <th className="text-right py-3 px-3 sm:px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Credits</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {rows.map((p) => (
                                  <tr key={`${p.slug}-${p.variant}`} className="hover:bg-accent/20 transition-colors">
                                    <td className="py-3 px-3 sm:px-4">
                                      <div className="w-24 sm:w-28 h-8 flex items-center justify-center bg-white rounded-lg px-2 shadow-sm border border-border/10">
                                        <img
                                          src={`/provider-logos/png/${p.slug}.png`}
                                          alt={p.displayName}
                                          className="h-6 w-full object-contain"
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
                                    <td className="py-3 px-3 sm:px-4 font-semibold text-foreground text-xs sm:text-sm">{p.displayName.replace(/ \(.*\)$/, "").replace(/ HD$| 4K$| Select$| HD Select$| 4K Select$/, "")}</td>
                                    <td className="py-3 px-3 sm:px-4 text-muted-foreground capitalize text-xs sm:text-sm">
                                      {p.variant === "normal" ? "Standard" : p.variant.replace(/_/g, "").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                    </td>
                                    <td className="py-3 px-3 sm:px-4 text-right">
                                      <span className={`inline-block font-extrabold text-xs px-2.5 py-0.5 rounded-full ${
                                        p.creditCost === 0 ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                                        p.creditCost <= 1 ? "bg-primary/10 text-primary" :
                                        p.creditCost <= 5 ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
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
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl font-black font-heading tracking-tight text-center mb-8 text-foreground">
              Frequently Asked Questions
            </h2>
            <Accordion
              type="single"
              collapsible
              className="w-full bg-card/65 backdrop-blur-md rounded-2xl border border-border divide-y divide-border overflow-hidden shadow-md"
            >
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-0">
                  <AccordionTrigger className="px-6 py-4.5 text-sm font-bold text-foreground hover:no-underline hover:bg-accent/30 transition-all text-left">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4.5 pt-1 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>


        </div>
      </div>
    </div>
  );
}
