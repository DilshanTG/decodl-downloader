import { useState } from "react";
import { routes } from "wasp/client/router";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Open mailto as fallback — backend email can be wired later
    const body = `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`;
    window.location.href = `mailto:support@stockmart.lk?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => { setSent(true); setSending(false); }, 500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Hero */}
      <section className="relative pt-20 pb-16 px-4 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
        </div>
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-primary mb-6">
            We're here to help
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Contact Us</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Have a question about credits, downloads, or your account? We're a Sri Lankan team and we reply fast.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── Contact info sidebar ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* WhatsApp — fastest */}
            <a
              href="https://wa.me/94772503124"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all duration-200 cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <p className="font-black text-sm text-foreground">WhatsApp — Fastest</p>
                <p className="text-sm text-muted-foreground">+94 77 250 3124</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Usually replies within minutes</p>
              </div>
            </a>

            {/* Email */}
            <a
              href="mailto:support@stockmart.lk"
              className="flex items-start gap-4 p-5 rounded-2xl border border-primary/20 bg-primary/5 hover:border-primary/40 hover:bg-primary/10 transition-all duration-200 cursor-pointer group"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-black text-sm text-foreground">Email Support</p>
                <p className="text-sm text-muted-foreground">support@stockmart.lk</p>
                <p className="text-xs text-muted-foreground/70 font-medium mt-1">Reply within 24 hours</p>
              </div>
            </a>

            {/* Business */}
            <div className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card">
              <div className="w-11 h-11 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="font-black text-sm text-foreground">Company</p>
                <p className="text-sm text-muted-foreground">DigiMart Solutions (Pvt) Ltd</p>
                <a href="https://digimartsolutions.lk" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline font-semibold mt-1 block">
                  digimartsolutions.lk →
                </a>
              </div>
            </div>

            {/* FAQ shortcut */}
            <div className="rounded-2xl border border-border bg-muted/30 p-5">
              <p className="font-black text-sm text-foreground mb-2">Quick Answers</p>
              <p className="text-xs text-muted-foreground mb-3">Most questions are answered in our FAQ.</p>
              <a
                href="/#faq"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Browse FAQ
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          {/* ── Contact Form ── */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-2xl shadow-lg p-7">
              {sent ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="font-black text-xl mb-2">Message Sent!</h3>
                  <p className="text-sm text-muted-foreground mb-6">Your email client should have opened. We'll reply as soon as possible.</p>
                  <button onClick={() => setSent(false)} className="text-sm font-bold text-primary hover:underline cursor-pointer">
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="font-black text-xl mb-1">Send a Message</h2>
                  <p className="text-sm text-muted-foreground mb-6">We'll get back to you within 24 hours.</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Your Name *</label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Kasun Perera"
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Subject *</label>
                      <select
                        required
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all text-foreground cursor-pointer"
                      >
                        <option value="">Select a topic...</option>
                        <option value="Download Issue">Download Issue</option>
                        <option value="Payment / Credits">Payment / Credits</option>
                        <option value="Account Problem">Account Problem</option>
                        <option value="Provider Not Working">Provider Not Working</option>
                        <option value="Agency / Bulk Enquiry">Agency / Bulk Enquiry</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Message *</label>
                      <textarea
                        required
                        rows={5}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="Describe your issue or question in detail. Include your account email if relevant."
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3.5 rounded-xl text-sm shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {sending ? "Opening email client..." : "Send Message"}
                    </button>

                    <p className="text-[11px] text-muted-foreground/60 text-center">
                      For fastest support, use{" "}
                      <a href="https://wa.me/94772503124" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                        WhatsApp
                      </a>
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
