import { routes } from "wasp/client/router";
import type { NavigationItem } from "./NavBar";
import {
  LayoutDashboard,
  History,
  Coins,
  CreditCard,
  Zap,
  HelpCircle,
  Users,
  Phone,
  Star,
  Home,
} from "lucide-react";

export const marketingNavigationItems: NavigationItem[] = [
  { name: "Home", to: routes.LandingPageRoute.to, icon: Home },
  { name: "For Who", to: "/#for-you", icon: Users },
  { name: "How It Works", to: "/#how-it-works", icon: HelpCircle },
  { name: "Features", to: "/#features", icon: Zap },
  { name: "Pricing", to: "/#pricing", icon: CreditCard },
  { name: "Reviews", to: "/#testimonials", icon: Star },
  { name: "Contact", to: "/contact", icon: Phone },
] as const;

export const appNavigationItems: NavigationItem[] = [
  { name: "Dashboard", to: routes.DashboardRoute.to, icon: LayoutDashboard },
  { name: "Downloads", to: routes.DownloadHistoryRoute.to, icon: History },
  { name: "Credits", to: routes.CreditsRoute.to, icon: Coins },
  { name: "Pricing", to: routes.PricingPageRoute.to, icon: CreditCard },
  { name: "Contact", to: "/contact", icon: Phone },
] as const;
