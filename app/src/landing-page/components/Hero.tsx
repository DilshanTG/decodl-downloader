import { useState } from "react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../../client/components/ui/button";

export default function Hero() {
  const [demoUrl, setDemoUrl] = useState("");

  const demoDetect = (url: string) => {
    if (/shutterstock\.com/.test(url)) return "Shutterstock — 1 credit";
    if (/freepik\.com/.test(url)) return "Freepik — 0.5 credits";
    if (/stock\.adobe\.com/.test(url)) return "Adobe Stock — 1 credit";
    if (/elements\.envato\.com/.test(url)) return "Envato Elements — 1 credit";
    if (/istockphoto\.com/.test(url)) return "iStock — 1.5 credits";
    if (/depositphotos\.com/.test(url)) return "Depositphotos — 1.5 credits";
    if (url.length > 10) return "Provider detected — Credit cost varies";
    return null;
  };

  const detectedProvider = demoUrl ? demoDetect(demoUrl) : null;

  return (
    <div className="relative w-full pt-14 pb-10">
      <TopGradient />
      <BottomGradient />
      <div className="md:p-16">
        <div className="max-w-8xl mx-auto px-6 lg:px-8">
          <div className="lg:mb-10 mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping"></span>
              20+ Premium Providers Supported
            </div>
            <h1 className="text-foreground text-5xl font-bold sm:text-6xl tracking-tight leading-none">
              Download Premium Stock<br className="hidden sm:block" />
              <span className="text-gradient-primary"> in Sri Lankan Rupees</span>
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-8">
              Paste any URL from Shutterstock, Freepik, Adobe Stock, Envato Elements, and 16+ other catalogs.
              Receive your premium asset instantly — pay only with LKR credits.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg" variant="default" asChild>
                <WaspRouterLink to={routes.SignupRoute.to}>
                  Get Started Free <span aria-hidden="true">→</span>
                </WaspRouterLink>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <WaspRouterLink to={routes.PricingPageRoute.to}>
                  View LKR Packages
                </WaspRouterLink>
              </Button>
            </div>
          </div>

          {/* Interactive URL Paste Box in Hero */}
          <div className="mt-14 max-w-2xl mx-auto">
            <div className="bg-background/80 border border-border rounded-2xl shadow-2xl p-6 backdrop-blur-md">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-3 text-center sm:text-left">
                Try it out — paste any stock URL
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://www.shutterstock.com/image-photo/..."
                  className="flex-1 border border-border bg-background/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                <Button
                  disabled
                  className="bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl opacity-80 cursor-not-allowed"
                >
                  Download
                </Button>
              </div>
              {detectedProvider && (
                <div className="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Detected <strong>{detectedProvider}</strong></span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Create a free account to instantly download. <strong>No subscription required.</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopGradient() {
  return (
    <div
      className="absolute right-0 top-0 -z-10 w-full transform-gpu overflow-hidden blur-3xl sm:top-0"
      aria-hidden="true"
    >
      <div
        className="aspect-1020/880 w-280 flex-none bg-linear-to-tr from-amber-400 to-purple-300 opacity-10 sm:right-1/4 sm:translate-x-1/2 dark:hidden"
        style={{
          clipPath:
            "polygon(80% 20%, 90% 55%, 50% 100%, 70% 30%, 20% 50%, 50% 0)",
        }}
      />
    </div>
  );
}

function BottomGradient() {
  return (
    <div
      className="absolute inset-x-0 top-[calc(100%-40rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-65rem)]"
      aria-hidden="true"
    >
      <div
        className="relative aspect-1020/880 w-360 bg-linear-to-br from-amber-400 to-purple-300 opacity-10 sm:-left-3/4 sm:translate-x-1/4 dark:hidden"
        style={{
          clipPath: "ellipse(80% 30% at 80% 50%)",
        }}
      />
    </div>
  );
}
