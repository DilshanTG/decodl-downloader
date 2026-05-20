interface NavigationItem {
  name: string;
  href: string;
}

export default function Footer({
  footerNavigation,
}: {
  footerNavigation: {
    app: NavigationItem[];
    company: NavigationItem[];
  };
}) {
  return (
    <footer className="border-t border-border bg-card/50 mt-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <img src="/stockmart-logo.svg" alt="StockMart.lk" className="h-14 object-contain" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Sri Lanka's premium stock media download platform. Pay in LKR. Download from 20+ global providers.
            </p>
            <p className="text-xs text-muted-foreground/70">
              By <a href="https://digimartsolutions.lk" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">DigiMart Solutions (Pvt) Ltd</a>
            </p>
          </div>

          {/* App links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">Platform</h3>
            <ul className="space-y-3">
              {footerNavigation.app.map(item => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">Company</h3>
            <ul className="space-y-3">
              {footerNavigation.company.map(item => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} DigiMart Solutions (Pvt) Ltd · Sri Lanka · All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
