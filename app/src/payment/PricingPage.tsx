import { useState } from "react";
import { useAuth } from "wasp/client/auth";
import { createPayherePayment } from "wasp/client/operations";
import { Link, routes } from "wasp/client/router";
import { CREDIT_PACKAGES } from "../shared/constants";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../client/components/ui/accordion";
import { useToast } from "../client/hooks/use-toast";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../client/components/ui/card";

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

const PROVIDER_COSTS: Array<{ provider: string; cost: string }> = [
  { provider: "Shutterstock (Image)", cost: "1 credit" },
  { provider: "Freepik (Image/Vector)", cost: "0.5 credits" },
  { provider: "Adobe Stock (Image)", cost: "1 credit" },
  { provider: "Envato Elements", cost: "1 credit" },
  { provider: "iStock (Image)", cost: "1.5 credits" },
  { provider: "Flaticon", cost: "0.2 credits" },
  { provider: "Shutterstock (Video HD)", cost: "65 credits" },
  { provider: "Adobe Stock (Video)", cost: "30 credits" },
  { provider: "Motion Array", cost: "1 credit" },
];

export default function PricingPage() {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);

  const handleBuy = async (packageId: string) => {
    if (!user) {
      window.location.href = routes.SignupRoute.to;
      return;
    }
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
    <div className="min-h-screen bg-background text-foreground py-12 px-4">
      {/* Hero */}
      <div className="max-w-4xl mx-auto text-center mb-16 pt-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          Simple, <span className="text-gradient-primary">Transparent Pricing</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Buy credits in LKR. No subscriptions, no hidden fees. Download from 20+ premium stock providers on your own schedule.
        </p>
        {!user && (
          <p className="mt-4 text-sm text-muted-foreground">
            <Link to={routes.SignupRoute.to} className="text-primary hover:underline font-semibold">
              Create a free account
            </Link>{" "}
            to get 2 bonus credits.
          </p>
        )}
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Package cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {CREDIT_PACKAGES.map((pkg) => {
            const isPopular = "popular" in pkg && pkg.popular;
            const isLoading = loadingPackage === pkg.id;

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
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap shadow-md">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-2 pt-6">
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {pkg.name}
                  </span>
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
                      <span className="text-foreground font-semibold">{pkg.credits} credits</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <svg className="w-4.5 h-4.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Rs. {pkg.perCredit}/credit</span>
                    </li>
                    {"savings" in pkg && pkg.savings ? (
                      <li className="flex items-center gap-2.5 text-sm text-green-600 dark:text-green-400 font-medium">
                        <svg className="w-4.5 h-4.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save Rs. {pkg.savings.toLocaleString()}</span>
                      </li>
                    ) : null}
                    <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <svg className="w-4.5 h-4.5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Credits never expire</span>
                    </li>
                  </ul>

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

        {/* Credit cost per provider */}
        <Card className="border border-border p-6 mb-20 bg-card shadow-md" variant="bento">
          <h2 className="text-xl font-bold tracking-tight mb-5 text-foreground">
            Credit Cost by Provider
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {PROVIDER_COSTS.map((item) => (
              <div
                key={item.provider}
                className="flex items-center justify-between px-4 py-3 bg-accent/40 border border-border rounded-xl"
              >
                <span className="text-sm font-medium text-foreground">{item.provider}</span>
                <span className="text-sm font-extrabold text-primary">{item.cost}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Exact credit costs are shown before every download. Some file types (like high-offset Shutterstock files or 4K videos) may cost more.
          </p>
        </Card>

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
          <a href="mailto:support@digimart.lk" className="text-primary hover:underline font-semibold">
            support@digimart.lk
          </a>
        </p>
      </div>
    </div>
  );
}
