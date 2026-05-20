const PROVIDERS_ROW1 = [
  { slug: "shutterstock",       label: "Shutterstock" },
  { slug: "adobestock",         label: "Adobe Stock" },
  { slug: "freepik",            label: "Freepik" },
  { slug: "envato_elements",    label: "Envato Elements" },
  { slug: "flaticon",           label: "Flaticon" },
  { slug: "istockphoto",        label: "iStock" },
  { slug: "depositphotos",      label: "Depositphotos" },
];

const PROVIDERS_ROW2 = [
  { slug: "dreamstime",         label: "Dreamstime" },
  { slug: "alamy",              label: "Alamy" },
  { slug: "123rf",              label: "123RF" },
  { slug: "yellowimages",       label: "Yellow Images" },
  { slug: "shutterstock_video", label: "Shutterstock Video" },
  { slug: "istockphoto_video",  label: "iStock Video" },
  { slug: "adobestock_video",   label: "Adobe Stock Video" },
];

function ProviderLogo({ slug, label }: { slug: string; label: string }) {
  return (
    <div className="group flex items-center justify-center mx-8 w-36 shrink-0">
      <img
        src={`/provider-logos/${slug}.svg`}
        alt={label}
        title={label}
        className="h-12 w-full object-contain opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-300"
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          const fallback = el.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = "block";
        }}
      />
      <span className="hidden text-xs font-bold text-muted-foreground/60">{label}</span>
    </div>
  );
}

function MarqueeRow({ providers, reverse = false }: { providers: typeof PROVIDERS_ROW1; reverse?: boolean }) {
  const doubled = [...providers, ...providers];
  return (
    <div className="group relative flex overflow-hidden">
      <div
        className={`flex items-center animate-marquee group-hover:[animation-play-state:paused] ${reverse ? "animate-marquee-reverse" : ""}`}
        style={{ willChange: "transform" }}
      >
        {doubled.map((p, i) => (
          <ProviderLogo key={`${p.slug}-${i}`} slug={p.slug} label={p.label} />
        ))}
      </div>
    </div>
  );
}

export default function Clients() {
  return (
    <section id="providers" className="py-16 border-y border-border/50 bg-card/20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-8">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Download from 20+ premium asset providers
        </p>
      </div>

      <div className="space-y-6">
        <MarqueeRow providers={PROVIDERS_ROW1} />
        <MarqueeRow providers={PROVIDERS_ROW2} reverse />
      </div>

      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
    </section>
  );
}
