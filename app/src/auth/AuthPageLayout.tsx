import { ReactNode } from "react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";

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
    <div className="min-h-screen bg-background flex">

      {/* Left brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] relative flex-col justify-between overflow-hidden bg-[hsl(261,28%,6%)] p-12">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/25 blur-[100px]" />
          <div className="absolute bottom-20 right-0 h-64 w-64 rounded-full bg-secondary/20 blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex justify-center">
          <WaspRouterLink to={routes.LandingPageRoute.to}>
            <img src="/stockmart-logo.svg" alt="StockMart.lk" className="h-16 object-contain" />
          </WaspRouterLink>
        </div>

        {/* Middle content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-black text-white leading-tight mb-3">
              Sri Lanka's #1<br />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Stock Media Platform
              </span>
            </h2>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Download from 20+ premium providers — Shutterstock, Freepik, Adobe Stock and more. Pay in LKR. No USD conversion.
            </p>
          </div>

          <ul className="space-y-4">
            {[
              { icon: "✦", text: "2 free credits on signup — try before you pay" },
              { icon: "✦", text: "Pay in LKR via PayHere — no USD needed" },
              { icon: "✦", text: "20+ providers, one account" },
              { icon: "✦", text: "Auto-refund if download fails" },
              { icon: "✦", text: "Credits never expire" },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm text-white/75">
                <span className="text-secondary font-black mt-0.5 shrink-0">{item.icon}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-white/40">
            By{" "}
            <a href="https://digimartsolutions.lk" target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">
              DigiMart Solutions (Pvt) Ltd
            </a>
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative">
        {/* Background glow for mobile */}
        <div className="pointer-events-none absolute inset-0 lg:hidden overflow-hidden">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-primary/15 blur-[80px]" />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 relative z-10 flex justify-center">
          <WaspRouterLink to={routes.LandingPageRoute.to}>
            <img src="/stockmart-logo.svg" alt="StockMart.lk" className="h-9 object-contain" />
          </WaspRouterLink>
        </div>

        {/* Form card */}
        <div className="relative z-10 w-full max-w-md">
          {heading && (
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-black text-foreground">{heading}</h1>
              {subheading && (
                <p className="text-sm text-muted-foreground mt-1">{subheading}</p>
              )}
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/5 p-8">
            {children}
          </div>
        </div>
      </div>

    </div>
  );
}
