import { useEffect } from "react";
import { useAuth } from "wasp/client/auth";
import Hero from "./components/Hero";
import Clients from "./components/Clients";
import FeaturesGrid from "./components/FeaturesGrid";
import Testimonials from "./components/Testimonials";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";
import { features, testimonials, faqs, footerNavigation } from "./contentSections";

export default function LandingPage() {
  const { data: user, isLoading } = useAuth();

  useEffect(() => {
    if (user) {
      window.location.replace("/dashboard");
    }
  }, [user]);

  // Prevent flash of landing page content while loading or if user is authenticated
  if (isLoading || user) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary border-r-2"></div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Hero />
      <Clients />
      <FeaturesGrid features={features} />
      <Testimonials testimonials={testimonials} />
      <FAQ faqs={faqs} />
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
