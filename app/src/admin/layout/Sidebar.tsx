import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  AlertTriangle,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Users,
  Zap,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import Logo from "../../client/static/logo.webp";
import { cn } from "../../client/utils";
import SidebarLinkGroup from "./SidebarLinkGroup";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const NAV_LINKS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users, end: true },
  { to: "/admin/downloads", label: "Downloads", icon: Download, end: true },
  { to: "/admin/failed-downloads", label: "Failed Downloads", icon: AlertTriangle, end: true },
  { to: "/admin/payments", label: "Payments", icon: CreditCard, end: true },
  { to: "/admin/providers", label: "Providers", icon: Zap, end: true },
  { to: "/admin/packages", label: "Credit Packages", icon: Package, end: true },
  { to: "/admin/credits", label: "Credit Ledger", icon: BarChart3, end: true },
  { to: "/admin/settings", label: "Settings", icon: Settings, end: true },
];

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const location = useLocation();
  const { pathname } = location;

  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);

  const storedSidebarExpanded = localStorage.getItem("sidebar-expanded");
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === "true",
  );

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  useEffect(() => {
    localStorage.setItem("sidebar-expanded", sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector("body")?.classList.add("sidebar-expanded");
    } else {
      document.querySelector("body")?.classList.remove("sidebar-expanded");
    }
  }, [sidebarExpanded]);

  return (
    <aside
      ref={sidebar}
      className={cn(
        "bg-muted absolute top-0 left-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden border-r duration-300 ease-linear lg:static lg:translate-x-0",
        {
          "translate-x-0": sidebarOpen,
          "-translate-x-full": !sidebarOpen,
        },
      )}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5 border-b border-border">
        <NavLink to="/" className="flex items-center gap-2">
          <img src={Logo} alt="Logo" width={36} className="rounded-lg" />
          <div>
            <p className="text-xs font-extrabold text-foreground leading-tight">StockGrab</p>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Admin Panel</p>
          </div>
        </NavLink>

        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          className="block lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear flex-1">
        {/* Sidebar Menu */}
        <nav className="mt-5 px-4 py-4 lg:mt-6 lg:px-4">
          {/* Main Menu */}
          <div>
            <h3 className="text-muted-foreground mb-3 ml-3 text-[10px] font-extrabold uppercase tracking-widest">
              Management
            </h3>

            <ul className="mb-6 flex flex-col gap-1">
              {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-semibold text-sm duration-200 ease-in-out transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                        {label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Link back to app */}
          <div className="border-t border-border pt-4 mt-2">
            <h3 className="text-muted-foreground mb-3 ml-3 text-[10px] font-extrabold uppercase tracking-widest">
              App
            </h3>
            <NavLink
              to="/dashboard"
              className="group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 font-semibold text-sm text-muted-foreground hover:bg-accent hover:text-foreground duration-200 transition-all"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              Back to App
            </NavLink>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
