import { routes } from "wasp/client/router";
import type { NavigationItem } from "./NavBar";

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Providers", to: "/#providers" },
  { name: "How It Works", to: "/#how-it-works" },
  { name: "Pricing", to: routes.PricingPageRoute.to },
] as const;

export const appNavigationItems: NavigationItem[] = [
  { name: "Dashboard", to: routes.DashboardRoute.to },
  { name: "History", to: routes.DownloadHistoryRoute.to },
  { name: "Credits", to: routes.CreditsRoute.to },
  { name: "Pricing", to: routes.PricingPageRoute.to },
] as const;
