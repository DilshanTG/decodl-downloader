import { LogIn, Menu } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Link as ReactRouterLink, NavLink } from "react-router";
import { useAuth } from "wasp/client/auth";
import { useQuery } from "wasp/client/operations";
import { getMyCreditBalance } from "wasp/client/operations";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../../client/components/ui/sheet";
import { throttleWithTrailingInvocation } from "../../../shared/utils";
import { UserDropdown } from "../../../user/UserDropdown";
import { UserMenuItems } from "../../../user/UserMenuItems";
import { useIsLandingPage } from "../../hooks/useIsLandingPage";
// logo import removed — using branded text logo
import { cn } from "../../utils";
import DarkModeSwitcher from "../DarkModeSwitcher";
import { Announcement } from "./Announcement";

export interface NavigationItem {
  name: string;
  to: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function NavBar({
  navigationItems,
}: {
  navigationItems: NavigationItem[];
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const isLandingPage = useIsLandingPage();

  useEffect(() => {
    const throttledHandler = throttleWithTrailingInvocation(() => {
      setIsScrolled(window.scrollY > 0);
    }, 50);

    window.addEventListener("scroll", throttledHandler);

    return () => {
      window.removeEventListener("scroll", throttledHandler);
      throttledHandler.cancel();
    };
  }, []);

  return (
    <>
      {isLandingPage && <Announcement />}
      <header className="sticky top-0 z-50">
        <div className="bg-background/90 border-b border-border backdrop-blur-lg">
          <nav
            className={cn(
              "flex items-center justify-between transition-[padding] duration-200 mx-auto max-w-(--breakpoint-2xl)",
              isScrolled ? "px-6 lg:px-8 py-2" : "px-6 lg:px-8 py-4",
            )}
            aria-label="Global"
          >
            <div className="flex items-center gap-6">
              <WaspRouterLink
                to={routes.LandingPageRoute.to}
                className="flex items-center gap-2 transition-opacity hover:opacity-80"
              >
                <NavLogo isScrolled={isScrolled} />
              </WaspRouterLink>

              <ul className="ml-4 hidden items-center gap-6 lg:flex">
                {renderNavigationItems(navigationItems)}
              </ul>
            </div>
            <NavBarMobileMenu
              isScrolled={isScrolled}
              navigationItems={navigationItems}
            />
            <NavBarDesktopUserDropdown />
          </nav>
        </div>
      </header>
    </>
  );
}

function NavBarCreditSection() {
  const { data: balanceData } = useQuery(getMyCreditBalance, undefined, { staleTime: 10000, refetchInterval: 30000 });
  const creditBalance = balanceData?.available ?? (balanceData as any)?.credits ?? 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-sm">
        <span className="text-muted-foreground font-medium">Balance:</span>
        <span className="font-black text-primary tabular-nums">
          {typeof creditBalance === "number" ? creditBalance.toFixed(1) : "—"}
          <span className="text-xs font-bold text-muted-foreground ml-0.5">credits</span>
        </span>
      </div>
      <WaspRouterLink
        to={routes.PricingPageRoute.to}
        className="flex items-center gap-1 rounded-lg font-bold bg-primary text-primary-foreground text-xs px-3 py-1.5 transition-opacity hover:opacity-90"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        Buy Credits
      </WaspRouterLink>
    </div>
  );
}

function NavBarDesktopUserDropdown() {
  const { data: user, isLoading: isUserLoading } = useAuth();

  return (
    <div className="hidden items-center justify-end gap-3 lg:flex lg:flex-1">
      <ul className="flex items-center justify-center gap-2 sm:gap-4">
        <DarkModeSwitcher />
      </ul>
      {isUserLoading ? null : !user ? (
        <WaspRouterLink
          to={routes.LoginRoute.to}
          className="ml-3 text-sm leading-6 font-semibold"
        >
          <div className="text-foreground hover:text-primary flex items-center transition-colors duration-300 ease-in-out">
            Log in <LogIn size="1.1rem" className="mt-[0.1rem] ml-1" />
          </div>
        </WaspRouterLink>
      ) : (
        <div className="ml-3 flex items-center gap-3">
          <NavBarCreditSection />
          <UserDropdown user={user} />
        </div>
      )}
    </div>
  );
}

function NavBarMobileMenu({
  isScrolled,
  navigationItems,
}: {
  isScrolled: boolean;
  navigationItems: NavigationItem[];
}) {
  const { data: user, isLoading: isUserLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex lg:hidden">
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className={cn(
              "text-muted-foreground hover:text-muted hover:bg-accent inline-flex items-center justify-center rounded-md transition-colors",
            )}
          >
            <span className="sr-only">Open main menu</span>
            <Menu
              className={cn("transition-all duration-300", {
                "size-8 p-1": !isScrolled,
                "size-6 p-0.5": isScrolled,
              })}
              aria-hidden="true"
            />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center">
                <WaspRouterLink to={routes.LandingPageRoute.to}>
                <NavLogo isScrolled={false} />
              </WaspRouterLink>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 flow-root">
            <div className="divide-border -my-6 divide-y">
              <ul className="space-y-2 py-6">
                {renderNavigationItems(navigationItems, setMobileMenuOpen)}
              </ul>
              <div className="py-6">
                {isUserLoading ? null : !user ? (
                  <WaspRouterLink to={routes.LoginRoute.to}>
                    <div className="text-foreground hover:text-primary flex items-center justify-end transition-colors duration-300 ease-in-out">
                      Log in <LogIn size="1.1rem" className="ml-1" />
                    </div>
                  </WaspRouterLink>
                ) : (
                  <>
                    <div className="mb-4 pb-4 border-b border-border">
                      <NavBarCreditSection />
                    </div>
                    <ul className="space-y-2">
                      <UserMenuItems
                        user={user}
                        onItemClick={() => setMobileMenuOpen(false)}
                      />
                    </ul>
                  </>
                )}
              </div>
              <div className="py-6">
                <DarkModeSwitcher />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function renderNavigationItems(
  navigationItems: NavigationItem[],
  setMobileMenuOpen?: Dispatch<SetStateAction<boolean>>,
) {
  return navigationItems.map((item) => {
    const Icon = item.icon;
    const isExternal = item.to.startsWith("http");
    const isAnchor = item.to.includes("#");

    if (isExternal) {
      return (
        <li key={item.name}>
          <a
            href={item.to}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group flex items-center gap-2 rounded-lg text-sm font-medium transition-all duration-200",
              setMobileMenuOpen
                ? "w-full px-3 py-2.5 text-foreground hover:bg-accent"
                : "px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
            onClick={setMobileMenuOpen && (() => setMobileMenuOpen(false))}
          >
            {Icon && (
              <Icon
                className={cn(
                  "w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110",
                  setMobileMenuOpen
                    ? "text-muted-foreground"
                    : "text-muted-foreground/75 group-hover:text-primary"
                )}
              />
            )}
            <span>{item.name}</span>
          </a>
        </li>
      );
    }

    if (isAnchor) {
      return (
        <li key={item.name}>
          <a
            href={item.to}
            className={cn(
              "group flex items-center gap-2 rounded-lg text-sm font-medium transition-all duration-200",
              setMobileMenuOpen
                ? "w-full px-3 py-2.5 text-foreground hover:bg-accent"
                : "px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
            onClick={setMobileMenuOpen && (() => setMobileMenuOpen(false))}
          >
            {Icon && <Icon className="w-4.5 h-4.5 shrink-0 text-muted-foreground/75 group-hover:text-primary transition-transform group-hover:scale-110" />}
            <span>{item.name}</span>
          </a>
        </li>
      );
    }

    return (
      <li key={item.name}>
        <NavLink
          to={item.to}
          onClick={setMobileMenuOpen && (() => setMobileMenuOpen(false))}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-2 rounded-lg text-sm font-medium transition-all duration-200",
              setMobileMenuOpen
                ? cn(
                    "w-full px-3 py-2.5",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-accent"
                  )
                : cn(
                    "px-3 py-1.5",
                    isActive
                      ? "text-primary bg-primary/8 font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                  )
            )
          }
        >
          {({ isActive }) => (
            <>
              {Icon && (
                <Icon
                  className={cn(
                    "w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground/75 group-hover:text-primary"
                  )}
                />
              )}
              <span>{item.name}</span>
            </>
          )}
        </NavLink>
      </li>
    );
  });
}

const NavLogo = ({ isScrolled }: { isScrolled: boolean }) => (
  <img
    src="/stockmart-logo.svg"
    alt="StockMart.lk"
    className={`object-contain transition-all duration-200 ${isScrolled ? "h-10" : "h-12"}`}
  />
);
