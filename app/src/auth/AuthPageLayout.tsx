import { ReactNode } from "react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";

const FEATURES = [
  { text: "2 free credits on signup" },
  { text: "Pay in LKR — no USD needed" },
  { text: "20+ premium providers" },
  { text: "Auto-refund if download fails" },
  { text: "Credits never expire" },
];

export function AuthPageLayout({
  children,
  heading,
  subheading,
}: {
  children: ReactNode;
  heading?: string;
  subheading?: string;
}) {
  return (
    <div className="min-h-screen flex">

      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative flex-col items-center justify-center overflow-hidden bg-[hsl(261,30%,7%)] px-12 py-16">

        {/* Background: mesh gradient + subtle grid */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute -bottom-32 -right-16 h-[400px] w-[400px] rounded-full bg-secondary/15 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/8 blur-[140px]" />
          {/* Subtle dot grid */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        {/* Centered content block */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full gap-10">

          {/* Logo */}
          <WaspRouterLink to={routes.LandingPageRoute.to} className="hover:opacity-90 transition-opacity">
            <img src="/stockmart-logo.svg" alt="StockMart.lk" className="h-14 object-contain" />
          </WaspRouterLink>

          {/* Tagline */}
          <div>
            <h2 className="text-3xl font-black text-white leading-tight tracking-tight">
              Sri Lanka's{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                #1 Stock Media
              </span>{" "}
              Platform
            </h2>
            <p className="mt-3 text-sm text-white/55 leading-relaxed">
              Download from 20+ premium providers. Pay in LKR.
            </p>
          </div>

          {/* Feature pills */}
          <ul className="flex flex-col gap-3 w-full">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white/80">
                <svg className="w-4 h-4 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {f.text}
              </li>
            ))}
          </ul>

          {/* Footer */}
          <p className="text-[11px] text-white/30">
            By{" "}
            <a href="https://digimartsolutions.lk" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
              DigiMart Solutions (Pvt) Ltd
            </a>
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative bg-gradient-to-br from-background via-background to-muted/30">

        {/* Subtle background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-secondary/5 blur-[100px]" />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 relative z-10">
          <WaspRouterLink to={routes.LandingPageRoute.to}>
            <img src="/stockmart-logo.svg" alt="StockMart.lk" className="h-10 object-contain" />
          </WaspRouterLink>
        </div>

        {/* Form area */}
        <div className="relative z-10 w-full max-w-[400px]">
          {heading && (
            <div className="mb-7 text-center">
              <h1 className="text-2xl font-black text-foreground tracking-tight">{heading}</h1>
              {subheading && (
                <p className="text-sm text-muted-foreground mt-1.5">{subheading}</p>
              )}
            </div>
          )}

          <div className="bg-card/80 backdrop-blur-sm border border-border/60 rounded-2xl shadow-2xl shadow-black/8 p-8">
            {children}
          </div>

          {/* Back to home link */}
          <p className="text-center mt-5 text-xs text-muted-foreground/60">
            <WaspRouterLink to={routes.LandingPageRoute.to} className="hover:text-muted-foreground transition-colors">
              ← Back to stockmart.lk
            </WaspRouterLink>
          </p>
        </div>
      </div>

    </div>
  );
}
