import { useState } from "react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../../client/components/ui/button";

const PROVIDER_PILLS = [
  { slug: "shutterstock",    label: "Shutterstock" },
  { slug: "freepik",         label: "Freepik" },
  { slug: "adobestock",      label: "Adobe Stock" },
  { slug: "envato_elements", label: "Envato Elements" },
  { slug: "istockphoto",     label: "iStock" },
  { slug: "flaticon",        label: "Flaticon" },
  { slug: "depositphotos",   label: "Depositphotos" },
  { slug: "alamy",           label: "Alamy" },
];

export default function Hero() {
  const [demoUrl, setDemoUrl] = useState("");

  const demoDetect = (url: string) => {
    if (/shutterstock\.com/.test(url)) return { provider: "Shutterstock", cost: "1 credit", color: "text-green-400" };
    if (/freepik\.com/.test(url))      return { provider: "Freepik", cost: "0.5 credits", color: "text-green-400" };
    if (/stock\.adobe\.com/.test(url)) return { provider: "Adobe Stock", cost: "1 credit", color: "text-green-400" };
    if (/elements\.envato\.com/.test(url)) return { provider: "Envato Elements", cost: "1 credit", color: "text-green-400" };
    if (/istockphoto\.com/.test(url))  return { provider: "iStockphoto", cost: "1.5 credits", color: "text-green-400" };
    if (/flaticon\.com/.test(url))     return { provider: "Flaticon", cost: "from 0.1 credits", color: "text-green-400" };
    if (url.length > 10) return { provider: "Provider detected", cost: "Credit cost varies", color: "text-green-400" };
    return null;
  };

  const detected = demoUrl ? demoDetect(demoUrl) : null;

  return (
    <section className="relative w-full overflow-hidden bg-background pt-16 pb-20">

      {/* Background glow orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-secondary/15 blur-[100px]" />
        <div className="absolute bottom-0 -left-20 h-64 w-64 rounded-full bg-primary/10 blur-[80px]" />
      </div>

      <div className="mx-auto max-w-6xl px-6 lg:px-8">

        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary tracking-wide uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Sri Lanka's #1 Stock Media Platform
          </span>
        </div>

        {/* Headline */}
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.05]">
            Download Any{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Premium Asset
              </span>
            </span>
            <br />
            Pay in <span className="text-secondary">LKR</span>
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
            One account for <strong className="text-foreground">20+ providers</strong> — Shutterstock, Freepik, Adobe Stock, Envato Elements and more.
            No USD conversion. No monthly subscription. Pay only for what you download.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild className="h-12 px-8 text-base font-bold rounded-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
            <WaspRouterLink to={routes.SignupRoute.to}>
              Start Free — 2 Credits Included →
            </WaspRouterLink>
          </Button>
          <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base font-semibold rounded-xl border-border">
            <WaspRouterLink to={routes.PricingPageRoute.to}>
              View LKR Packages
            </WaspRouterLink>
          </Button>
        </div>

        {/* Trust line */}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No credit card required · Credits never expire · Auto-refund on failed downloads
        </p>

        {/* Provider Pills */}
        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {PROVIDER_PILLS.map(p => (
            <span key={p.slug} title={p.label} className="inline-flex items-center rounded-full border border-border bg-white dark:bg-white px-3 py-1.5 hover:border-primary/40 hover:shadow-sm transition-all">
              <img
                src={`/provider-logos/${p.slug}.svg`}
                alt={p.label}
                className="h-5 w-auto object-contain max-w-[80px]"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.style.display = "none";
                  const fallback = img.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "inline";
                }}
              />
              <span className="hidden text-xs font-semibold text-gray-600">{p.label}</span>
            </span>
          ))}
          <span className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground/60">
            +{20 - PROVIDER_PILLS.length} more
          </span>
        </div>

        {/* Interactive demo box */}
        <div className="mt-14 mx-auto max-w-2xl">
          <div className="relative rounded-2xl border border-border bg-card/80 p-6 shadow-2xl shadow-primary/10 backdrop-blur-sm">
            {/* Card glow */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent" />

            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Try it — paste any stock URL to preview cost
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                value={demoUrl}
                onChange={e => setDemoUrl(e.target.value)}
                placeholder="https://www.shutterstock.com/image-photo/..."
                className="flex-1 rounded-xl border border-border bg-background/60 px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              <WaspRouterLink
                to={routes.SignupRoute.to}
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Try Free →
              </WaspRouterLink>
            </div>

            {detected ? (
              <div className="mt-3 flex items-center justify-between gap-2.5 rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    <strong>{detected.provider}</strong> — {detected.cost}
                  </span>
                </div>
                <WaspRouterLink
                  to={routes.SignupRoute.to}
                  className="text-xs font-bold text-primary hover:underline whitespace-nowrap"
                >
                  Download now →
                </WaspRouterLink>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Preview cost instantly. <strong className="text-foreground">Sign up free to download.</strong>
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 sm:gap-10 border-t border-border pt-10">
          {[
            { value: "20+", label: "Premium Providers" },
            { value: "LKR", label: "Local Currency Only" },
            { value: "24/7", label: "Auto Download & Refund" },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-black text-primary">{stat.value}</p>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
