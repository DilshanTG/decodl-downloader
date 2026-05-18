import { Link as WaspRouterLink, routes } from "wasp/client/router";

const STEPS = [
  {
    number: "01",
    title: "Paste Any Stock URL",
    description: "Copy the URL of any asset from Shutterstock, Freepik, Adobe Stock, Envato Elements, iStock and 15+ more providers. Paste it into StockMart.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Instant Cost Preview",
    description: "Our system automatically detects the provider, checks the asset, and shows you the exact credit cost. No surprises — you see the price before you confirm.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Confirm & Download",
    description: "Click Download. Credits are deducted from your balance and your file is processed instantly. You'll get an email notification when it's ready.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Pay in LKR — Always",
    description: "Top up your credit balance using PayHere. Pay in Sri Lankan Rupees with no USD conversion fees, no international card required, no monthly subscription.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-card/30 border-y border-border/50">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary tracking-wide uppercase mb-4">
            Simple Process
          </span>
          <h2 className="text-4xl font-black tracking-tight text-foreground">
            How It Works
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            From URL to downloaded file in under a minute. No subscriptions, no USD cards, no hassle.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step, idx) => (
            <div key={step.number} className="relative">
              {/* Connector line (hidden on mobile, last item) */}
              {idx < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-border -translate-x-4 z-0" />
              )}

              <div className="relative z-10 flex flex-col gap-4">
                {/* Icon + number */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    {step.icon}
                  </div>
                  <span className="text-3xl font-black text-muted-foreground/20 tabular-nums">
                    {step.number}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <WaspRouterLink
            to={routes.SignupRoute.to}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
          >
            Start Free — 2 Credits Included →
          </WaspRouterLink>
          <p className="mt-3 text-xs text-muted-foreground">No credit card required · Credits never expire</p>
        </div>

      </div>
    </section>
  );
}
