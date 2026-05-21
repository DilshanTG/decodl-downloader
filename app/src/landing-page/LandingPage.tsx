import { Link as WaspLink, routes } from "wasp/client/router";

// Only slugs that have actual files in /public/provider-logos/
const PROVIDERS = [
  "shutterstock","freepik","adobestock","envato_elements","istockphoto",
  "flaticon","vecteezy","123rf","depositphotos","dreamstime",
  "motionarray","alamy","vectorstock","creative_fabrica","rawpixel",
  "iconscout","pngtree","vexels","yellowimages","ui8",
];

const FEATURES = [
  { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", title: "Pay in LKR Only", desc: "Zero USD. Zero bank fees. Zero card blocks. Pure Sri Lankan Rupees.", accent: "border-emerald-500/20 bg-emerald-500/5", icon_c: "text-emerald-500 bg-emerald-500/10" },
  { icon: "M13 10V3L4 14h7v7l9-11h-7z", title: "Instant File Delivery", desc: "Paste URL, confirm cost, receive file. Under 60 seconds for most downloads.", accent: "border-primary/20 bg-primary/5", icon_c: "text-primary bg-primary/10" },
  { icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", title: "Auto-Refund Guarantee", desc: "Download fails? Credits returned in seconds. Every single time.", accent: "border-amber-500/20 bg-amber-500/5", icon_c: "text-amber-500 bg-amber-500/10" },
  { icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", title: "20+ Premium Sources", desc: "Shutterstock, Freepik, Adobe Stock, Envato, iStock, Getty — one account.", accent: "border-secondary/20 bg-secondary/5", icon_c: "text-secondary bg-secondary/10" },
  { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", title: "Credits Never Expire", desc: "Buy in bulk, use when you need. Your balance stays forever.", accent: "border-blue-500/20 bg-blue-500/5", icon_c: "text-blue-500 bg-blue-500/10" },
  { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", title: "No Subscription Traps", desc: "No monthly bills, no lock-in. Buy credits only when you have work.", accent: "border-rose-500/20 bg-rose-500/5", icon_c: "text-rose-500 bg-rose-500/10" },
];

const PACKAGES = [
  { name: "Single", credits: 1, price: 200, per: 200 },
  { name: "Starter", credits: 10, price: 1800, per: 180, save: 200 },
  { name: "Value", credits: 50, price: 8500, per: 170, save: 1500, popular: true },
  { name: "Pro", credits: 100, price: 16000, per: 160, save: 4000 },
  { name: "Business", credits: 500, price: 75000, per: 150, save: 25000 },
  { name: "Agency", credits: 1000, price: 140000, per: 140, save: 60000 },
];

const TESTIMONIALS = [
  { initials: "PK", color: "bg-purple-600", name: "Pradeep Kumara", role: "Freelance Graphic Designer", quote: "StockMart changed my workflow. I download Shutterstock vectors in LKR without any USD drama. Saved me 40% on every project." },
  { initials: "DS", color: "bg-pink-600", name: "Dilini Senanayake", role: "Creative Director, Agency", quote: "We run a team of 8 designers. The Business pack means we never run out of assets mid-project. Best investment this year." },
  { initials: "KJ", color: "bg-blue-600", name: "Kasun Jayawardena", role: "Video Editor & Motion Designer", quote: "iStock 4K footage in LKR? I couldn't believe it. No subscription, no card blocks. I top up credits when I land a project." },
  { initials: "RA", color: "bg-emerald-600", name: "Randika Amarasinghe", role: "UI/UX Designer", quote: "Freepik premium vectors and Flaticon packs — all under one roof. 2 free trial credits sold me instantly." },
];

const FAQS = [
  { q: "What exactly does StockMart provide?", a: "We provide the downloaded asset files (JPG, PNG, vector, video, etc.) from premium stock platforms. We do NOT generate license certificates or transfer platform subscriptions." },
  { q: "How much does 1 credit cost in LKR?", a: "Credits range from Rs. 140/credit (Agency) to Rs. 200/credit (Single). Most standard images cost 1 credit. Videos and premium assets may cost 2–5 credits." },
  { q: "Which stock sites are supported?", a: "20+ platforms: Shutterstock, Freepik, Adobe Stock, Envato Elements, iStock, Getty Images, Flaticon, Vecteezy, 123RF, DepositPhotos, Dreamstime, Pixta, Pond5, Motion Array, Storyblocks and more." },
  { q: "What if my download fails?", a: "Credits are automatically refunded within seconds. You'll never lose credits on a failed download." },
  { q: "Do you provide licenses or subscriptions?", a: "No — files only. We do not generate license certificates in your name or transfer platform accounts. Ensure your use complies with the original platform's terms." },
  { q: "How fast are downloads?", a: "Most files ready in 30–90 seconds. Bulk downloads take 2–5 minutes." },
];

// Provider logo marquee
function ProviderMarquee() {
  const logos = [...PROVIDERS, ...PROVIDERS];
  return (
    <div className="relative overflow-hidden py-4">
      <div className="flex animate-[marquee_30s_linear_infinite] w-max gap-6 items-center">
        {logos.map((slug, i) => (
          <div key={i} className="w-28 h-9 flex items-center justify-center bg-white dark:bg-white/90 rounded-xl px-3 py-2 shadow-sm border border-border/10 shrink-0">
            <img src={`/provider-logos/png/${slug}.png`} alt={slug} className="w-full h-full object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
              onError={(e) => { const img = e.currentTarget; if (!img.dataset.tried) { img.dataset.tried = "1"; img.src = `/provider-logos/${slug}.svg`; } else img.style.display = "none"; }} />
          </div>
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[95vh] flex items-center overflow-hidden pt-20 pb-16 px-4">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 opacity-[0.022]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-primary/12 blur-[130px]" />
          <div className="absolute bottom-0 right-[-5%] w-[400px] h-[400px] rounded-full bg-secondary/8 blur-[100px]" />
        </div>

        <div className="max-w-5xl mx-auto text-center w-full">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-primary mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Sri Lanka's #1 Stock Media Platform
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[88px] font-black tracking-[-0.03em] leading-[1.0] mb-6">
            Premium Assets.<br />
            <span className="text-primary">Pay in LKR.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-4">
            Download from <strong className="text-foreground">20+ global stock platforms</strong> — Shutterstock, Freepik, Adobe Stock, Envato Elements and more.{" "}
            <strong className="text-foreground">No USD. No subscriptions. No card blocks.</strong>
          </p>
          <p className="text-base text-primary font-semibold mb-10">
            Built for Sri Lankan designers, editors & creative agencies. 🇱🇰
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-14">
            <WaspLink to={routes.SignupRoute.to} className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-4 rounded-2xl text-base shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Start Free — 2 Credits on Signup
            </WaspLink>
            <WaspLink to={routes.PricingPageRoute.to} className="inline-flex items-center gap-2 border border-border hover:border-primary/30 bg-card text-foreground font-bold px-8 py-4 rounded-2xl text-base hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              View LKR Pricing
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </WaspLink>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center text-sm text-muted-foreground mb-12">
            {["2 free credits, no card required", "No USD conversion ever", "Credits never expire", "Auto-refund on failures"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                {t}
              </span>
            ))}
          </div>

          <div className="max-w-4xl mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-3">Download from these platforms</p>
            <ProviderMarquee />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-border bg-muted/20 py-8 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[{ value: "20+", label: "Premium Providers" }, { value: "LKR", label: "Local Currency Only" }, { value: "60s", label: "Avg Download Time" }, { value: "100%", label: "Auto-Refund on Fail" }].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-black text-primary mb-1">{s.value}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT CAN YOU DOWNLOAD ────────────────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Everything in one place</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">What Can You Download?</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Photos, videos, vectors, icons, templates — all from the world's best platforms, all in LKR.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Stock Photos */}
            <div className="group relative rounded-3xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-xl transition-all duration-300 p-7">
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
              <div className="flex items-start gap-5 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-black mb-1">Stock Photos & Illustrations</h3>
                  <p className="text-sm text-muted-foreground">Millions of high-res photos, vectors, editorial images, and AI-generated art from Shutterstock, Freepik, Adobe Stock and more.</p>
                </div>
              </div>
              {/* Photo grid visual */}
              <div className="grid grid-cols-4 gap-1.5 rounded-xl overflow-hidden">
                {[
                  "bg-gradient-to-br from-rose-400 to-orange-300",
                  "bg-gradient-to-br from-sky-400 to-indigo-400",
                  "bg-gradient-to-br from-emerald-400 to-teal-300",
                  "bg-gradient-to-br from-violet-400 to-purple-300",
                  "bg-gradient-to-br from-amber-400 to-yellow-300",
                  "bg-gradient-to-br from-pink-400 to-rose-300",
                  "bg-gradient-to-br from-cyan-400 to-sky-300",
                  "bg-gradient-to-br from-fuchsia-400 to-pink-300",
                ].map((c, i) => (
                  <div key={i} className={`${c} aspect-square rounded-lg opacity-80 group-hover:opacity-100 transition-opacity`} />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Shutterstock", "Freepik", "Adobe Stock", "Getty Images", "Vecteezy"].map((p) => (
                  <span key={p} className="text-[11px] font-bold bg-muted px-2.5 py-1 rounded-full text-muted-foreground">{p}</span>
                ))}
              </div>
            </div>

            {/* Videos */}
            <div className="group relative rounded-3xl border border-border bg-card overflow-hidden hover:border-secondary/30 hover:shadow-xl transition-all duration-300 p-7">
              <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/5 rounded-full blur-[60px] pointer-events-none" />
              <div className="flex items-start gap-5 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.869v6.263a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-black mb-1">HD & 4K Video Footage</h3>
                  <p className="text-sm text-muted-foreground">Cinematic stock footage, motion graphics, SFX and music from iStock, Pond5, Storyblocks and Motion Array.</p>
                </div>
              </div>
              {/* Film strip visual */}
              <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
                <div className="flex gap-1 p-2">
                  {[
                    "bg-gradient-to-br from-slate-700 to-slate-900",
                    "bg-gradient-to-br from-blue-800 to-indigo-900",
                    "bg-gradient-to-br from-emerald-700 to-teal-900",
                    "bg-gradient-to-br from-rose-700 to-pink-900",
                    "bg-gradient-to-br from-amber-700 to-orange-900",
                  ].map((c, i) => (
                    <div key={i} className={`${c} flex-1 aspect-video rounded-lg relative flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity`}>
                      <svg className="w-5 h-5 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["iStock", "Pond5", "Storyblocks", "Motion Array", "Getty"].map((p) => (
                  <span key={p} className="text-[11px] font-bold bg-muted px-2.5 py-1 rounded-full text-muted-foreground">{p}</span>
                ))}
              </div>
            </div>

            {/* Icons & Vectors */}
            <div className="group relative rounded-3xl border border-border bg-card overflow-hidden hover:border-amber-500/30 hover:shadow-xl transition-all duration-300 p-7">
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none" />
              <div className="flex items-start gap-5 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-black mb-1">Icons, Vectors & SVGs</h3>
                  <p className="text-sm text-muted-foreground">Millions of scalable vector icons, UI kits, illustrations and SVG assets from Flaticon, Freepik and Vecteezy.</p>
                </div>
              </div>
              {/* Icon grid visual */}
              <div className="grid grid-cols-6 gap-2 p-3 bg-muted/20 rounded-xl">
                {Array.from({ length: 18 }).map((_, i) => {
                  const icons = ["M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6","M12 18h.01M8 21l4-4 4 4M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z","M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z","M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z","M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z","M13 10V3L4 14h7v7l9-11h-7z"];
                  return (
                    <div key={i} className="aspect-square rounded-lg bg-card border border-border/50 flex items-center justify-center group-hover:border-amber-500/20 transition-colors">
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={icons[i % icons.length]} />
                      </svg>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Flaticon", "Freepik", "Vecteezy", "123RF"].map((p) => (
                  <span key={p} className="text-[11px] font-bold bg-muted px-2.5 py-1 rounded-full text-muted-foreground">{p}</span>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div className="group relative rounded-3xl border border-border bg-card overflow-hidden hover:border-rose-500/30 hover:shadow-xl transition-all duration-300 p-7">
              <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-[60px] pointer-events-none" />
              <div className="flex items-start gap-5 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-black mb-1">Templates & Creative Assets</h3>
                  <p className="text-sm text-muted-foreground">PSD files, Canva templates, Premiere Pro presets, After Effects projects, fonts and branding kits from Envato Elements.</p>
                </div>
              </div>
              {/* Template grid visual */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Logo Kit", bg: "bg-gradient-to-br from-violet-500/20 to-purple-500/10 border-violet-500/20" },
                  { label: "Social Post", bg: "bg-gradient-to-br from-rose-500/20 to-pink-500/10 border-rose-500/20" },
                  { label: "Flyer", bg: "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/20" },
                  { label: "Presentation", bg: "bg-gradient-to-br from-sky-500/20 to-blue-500/10 border-sky-500/20" },
                  { label: "UI Kit", bg: "bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-emerald-500/20" },
                  { label: "Motion FX", bg: "bg-gradient-to-br from-fuchsia-500/20 to-pink-500/10 border-fuchsia-500/20" },
                ].map((t) => (
                  <div key={t.label} className={`${t.bg} border rounded-xl p-3 text-center aspect-square flex flex-col items-center justify-center gap-1`}>
                    <div className="w-6 h-1 rounded-full bg-current opacity-40 mb-1" />
                    <div className="w-10 h-0.5 rounded-full bg-current opacity-20" />
                    <div className="w-8 h-0.5 rounded-full bg-current opacity-20" />
                    <span className="text-[10px] font-bold text-muted-foreground mt-1">{t.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Envato Elements", "Freepik", "Motion Array"].map((p) => (
                  <span key={p} className="text-[11px] font-bold bg-muted px-2.5 py-1 rounded-full text-muted-foreground">{p}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICE COMPARISON ─────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-muted/30 border-y border-border relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[500px] h-[400px] bg-primary/8 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-secondary/6 rounded-full blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">The Math is Simple</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 text-foreground">
              Why Pay USD Prices<br />
              <span className="text-primary">When You Can Pay LKR?</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Monthly subscriptions cost thousands in LKR — even when you barely use them. StockMart lets you pay only for what you download.
            </p>
          </div>

          {/* Comparison cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { name: "Shutterstock", plan: "Standard 10/mo", usd: "$49/mo", lkr: "Rs. 16,170", perAsset: "Rs. 1,617/image", color: "border-red-500/20 bg-red-500/5", badge: "text-red-600 dark:text-red-400", badgeBg: "bg-red-500/10" },
              { name: "Adobe Stock", plan: "Standard 10/mo", usd: "$54.99/mo", lkr: "Rs. 18,147", perAsset: "Rs. 1,815/image", color: "border-orange-500/20 bg-orange-500/5", badge: "text-orange-600 dark:text-orange-400", badgeBg: "bg-orange-500/10" },
              { name: "Freepik", plan: "Premium Monthly", usd: "$24.99/mo", lkr: "Rs. 8,247", perAsset: "Rs. 825/image", color: "border-yellow-500/20 bg-yellow-500/5", badge: "text-yellow-600 dark:text-yellow-400", badgeBg: "bg-yellow-500/10" },
              { name: "Envato Elements", plan: "Individual", usd: "$16.50/mo", lkr: "Rs. 5,445", perAsset: "Committed monthly", color: "border-pink-500/20 bg-pink-500/5", badge: "text-pink-600 dark:text-pink-400", badgeBg: "bg-pink-500/10" },
            ].map((p) => (
              <div key={p.name} className={`rounded-2xl border ${p.color} p-5 text-center`}>
                <div className={`inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${p.badgeBg} ${p.badge} mb-3`}>
                  Their Price
                </div>
                <div className="font-black text-foreground text-lg mb-0.5">{p.name}</div>
                <div className="text-xs text-muted-foreground/60 mb-3">{p.plan}</div>
                <div className="text-2xl font-black text-foreground mb-0.5">{p.usd}</div>
                <div className="text-base font-black text-muted-foreground mb-3">{p.lkr}</div>
                <div className="text-xs text-muted-foreground/60 border-t border-border pt-3">{p.perAsset}</div>
              </div>
            ))}
          </div>

          {/* VS divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-border" />
            <div className="px-5 py-2 rounded-full border border-border bg-background text-muted-foreground text-xs font-black uppercase tracking-widest">vs StockMart.lk</div>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* StockMart card */}
          <div className="rounded-2xl border border-primary/40 bg-primary/8 p-6 text-center relative overflow-hidden mb-10">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-primary/15 text-primary mb-4">
              StockMart Price
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div>
                <div className="text-4xl font-black text-foreground mb-1">Rs. 200</div>
                <div className="text-xs text-muted-foreground font-bold">Per standard image</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-black mt-1">Single credit</div>
              </div>
              <div>
                <div className="text-4xl font-black text-foreground mb-1">Rs. 1,800</div>
                <div className="text-xs text-muted-foreground font-bold">10 downloads</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-black mt-1">Rs. 180/image</div>
              </div>
              <div>
                <div className="text-4xl font-black text-foreground mb-1">Rs. 0</div>
                <div className="text-xs text-muted-foreground font-bold">Monthly commitment</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-black mt-1">Pay only when you work</div>
              </div>
            </div>
          </div>

          {/* Savings row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { vs: "vs Shutterstock", save: "Rs. 14,370", pct: "89%", sub: "per 10 images/month" },
              { vs: "vs Adobe Stock", save: "Rs. 16,347", pct: "91%", sub: "per 10 images/month" },
              { vs: "vs Freepik", save: "Rs. 6,447", pct: "78%", sub: "per 10 downloads" },
              { vs: "vs Envato Elements", save: "Rs. 3,645", pct: "67%", sub: "per 10 downloads" },
            ].map((s) => (
              <div key={s.vs} className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-center">
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">{s.vs}</div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mb-0.5">Save {s.save}</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-300">{s.pct} cheaper</div>
                <div className="text-[10px] text-muted-foreground/50 mt-1">{s.sub}</div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground/40 mt-6">* Comparison based on 1 USD = Rs. 330. Subscription prices as of 2026. Savings calculated for 10 standard images/month.</p>
        </div>
      </section>

      {/* ── WHO IS THIS FOR ── */}
      <section id="for-you" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Built for you</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Made for Sri Lanka's Creative Community</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Stop paying USD subscription prices. StockMart is purpose-built for the people who create Sri Lanka's visual culture.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", title: "Graphic & UI Designers", points: ["Freepik vectors & PSD templates", "Shutterstock illustrations", "Flaticon icon packs", "Adobe Stock creative assets"] },
              { icon: "M15 10l4.553-2.069A1 1 0 0121 8.869v6.263a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z", title: "Video Editors & Motion Designers", points: ["iStock & Getty 4K footage", "Pond5 music & SFX", "Storyblocks video clips", "Motion Array templates"] },
              { icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", title: "Creative Agencies", points: ["Bulk credit packs for teams", "Manage multiple clients", "One dashboard, all downloads", "Business & Agency pricing"] },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-200">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={card.icon} /></svg>
                </div>
                <h3 className="text-lg font-black mb-3">{card.title}</h3>
                <ul className="space-y-2">
                  {card.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-4 bg-muted/20 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Simple as 1-2-3</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">No complicated setup. No subscriptions. Just fast, clean asset delivery.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Create Your Free Account", desc: "Sign up in 30 seconds. Get 2 free credits instantly — no credit card needed.", color: "border-primary/30 bg-primary/8 text-primary" },
              { n: "02", title: "Buy Credits in LKR", desc: "Choose a package. Pay via PayHere — Visa, Mastercard, eZ Cash. Instant credit top-up.", color: "border-secondary/30 bg-secondary/8 text-secondary" },
              { n: "03", title: "Paste URL → Download", desc: "Paste any stock URL. We detect the provider, show the cost, deliver your file in seconds.", color: "border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400" },
            ].map((step, i) => (
              <div key={step.n} className="relative flex flex-col items-center text-center">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] right-[-50%] h-px border-t border-dashed border-border z-0" />
                )}
                <div className={`w-16 h-16 rounded-2xl border-2 ${step.color} font-black text-2xl flex items-center justify-center mb-5 relative z-10 shadow-sm`}>
                  {step.n}
                </div>
                <h3 className="text-lg font-black mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Why StockMart</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Everything a Sri Lankan Creative Needs</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className={`rounded-2xl border ${f.accent} p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-200`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.icon_c}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={f.icon} /></svg>
                </div>
                <h3 className="font-black text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ── */}
      <section id="pricing" className="py-24 px-4 bg-muted/20 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Transparent Pricing</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Simple LKR Packages</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">No subscriptions. No hidden fees. Credits never expire.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {PACKAGES.map((pkg) => (
              <div key={pkg.name} className={`relative rounded-2xl border p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${pkg.popular ? "border-primary/60 bg-primary/5 shadow-md" : "border-border bg-card"}`}>
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">Best Value</span>
                  </div>
                )}
                <div className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground mb-1 mt-1">{pkg.name}</div>
                <div className="text-xl font-black text-foreground mb-0.5">{pkg.credits}<span className="text-xs font-bold text-muted-foreground ml-0.5">cr</span></div>
                <div className="text-base font-black text-primary mb-1">Rs. {pkg.price.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Rs. {pkg.per}/cr</div>
                {pkg.save && <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Save Rs. {pkg.save.toLocaleString()}</div>}
              </div>
            ))}
          </div>

          <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-5 flex gap-4 items-start mb-8">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Credit costs:</strong> Shutterstock standard = 1cr · Freepik = 0.5cr · Adobe Stock = 1cr · Envato = 1cr · iStock HD video = 5cr · Pond5 music = 2cr.{" "}
              <span className="text-primary font-semibold">Exact cost shown before every download.</span>
            </p>
          </div>
          <div className="text-center">
            <WaspLink to={routes.PricingPageRoute.to} className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-4 rounded-2xl text-sm shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-all cursor-pointer">
              See Full Pricing & Provider Rates
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </WaspLink>
          </div>
        </div>
      </section>

      {/* ── FILES ONLY DISCLAIMER ── */}
      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-6 flex gap-4 items-start">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h3 className="font-black text-base text-foreground mb-1.5">Important: We Provide Files Only</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                StockMart delivers the downloaded <strong className="text-foreground">asset file</strong> to your account. We <strong className="text-foreground">do not</strong> generate license certificates, transfer subscriptions, or provide platform account access. Please ensure your use complies with the <strong className="text-foreground">original platform's licensing terms</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-24 px-4 bg-muted/20 border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">Real Users</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Loved by Sri Lankan Creatives</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-200">
                <div className="flex mb-3">{[...Array(5)].map((_, i) => (<svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>))}</div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.color} text-white font-black text-sm flex items-center justify-center`}>{t.initials}</div>
                  <div>
                    <div className="font-bold text-sm text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">FAQ</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Common Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group rounded-2xl border border-border bg-card overflow-hidden">
                <summary className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer font-bold text-sm text-foreground hover:bg-accent/30 transition-colors list-none">
                  {faq.q}
                  <svg className="w-4 h-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div className="px-6 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative rounded-3xl overflow-hidden border border-primary/20 bg-card p-12 shadow-xl">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/8 rounded-full blur-[80px]" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/6 rounded-full blur-[80px]" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-4 py-1.5 text-xs font-bold tracking-wider uppercase text-primary mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />Free to Start
              </div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
                Stop Paying USD.<br />
                <span className="text-primary">Start Downloading in LKR.</span>
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">Join hundreds of Sri Lankan designers, editors and agencies. 2 free credits — no card required.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <WaspLink to={routes.SignupRoute.to} className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-4 rounded-2xl text-base shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all cursor-pointer">
                  Create Free Account
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </WaspLink>
                <WaspLink to={routes.LoginRoute.to} className="inline-flex items-center gap-2 border border-border hover:border-primary/30 bg-background text-foreground font-bold px-8 py-4 rounded-2xl text-base hover:-translate-y-0.5 transition-all cursor-pointer">
                  Sign In
                </WaspLink>
              </div>
              <p className="text-xs text-muted-foreground mt-5">No credit card · 2 free credits on signup · Credits never expire</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
