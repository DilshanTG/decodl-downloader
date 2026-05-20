import { routes } from "wasp/client/router";
import type { NavigationItem } from "./NavBar";
import {
  LayoutDashboard,
  History,
  Coins,
  CreditCard,
  MessageSquare,
  Zap,
  HelpCircle
} from "lucide-react";

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Providers", to: "/#providers", icon: Zap },
  { name: "How It Works", to: "/#how-it-works", icon: HelpCircle },
  { name: "Pricing", to: routes.PricingPageRoute.to, icon: CreditCard },
] as const;

export const appNavigationItems: NavigationItem[] = [
  { name: "Dashboard", to: routes.DashboardRoute.to, icon: LayoutDashboard },
  { name: "Downloads", to: routes.DownloadHistoryRoute.to, icon: History },
  { name: "Credits", to: routes.CreditsRoute.to, icon: Coins },
  { name: "Pricing", to: routes.PricingPageRoute.to, icon: CreditCard },
  { name: "Support", to: "https://wa.me/94772503124", icon: MessageSquare },
] as const;
