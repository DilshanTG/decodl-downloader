import { type AuthUser } from "wasp/auth";
import { useQuery, adminGetOverviewStats } from "wasp/client/operations";
import DefaultLayout from "../../layout/DefaultLayout";
import Breadcrumb from "../../layout/Breadcrumb";
import { Shield, Server, Database, Clock, Users, Zap } from "lucide-react";

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-bold text-foreground ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2.5 bg-accent/20">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-extrabold text-foreground uppercase tracking-widest">{title}</h3>
      </div>
      <div className="px-6 py-2">{children}</div>
    </div>
  );
}

export default function SettingsPage({ user }: { user: AuthUser }) {
  const { data: stats } = useQuery(adminGetOverviewStats, undefined);

  const nodeEnv = (import.meta as any).env?.MODE ?? "unknown";

  return (
    <DefaultLayout user={user}>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Settings & System Info</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform configuration and operational overview</p>
        </div>

        {/* Admin Account */}
        <SectionCard title="Admin Account" icon={Shield}>
          <InfoRow label="Email" value={user.email ?? "—"} />
          <InfoRow label="Role" value={
            <span className="inline-flex items-center text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-primary/15 text-primary">Super Admin</span>
          } />
          <InfoRow label="User ID" value={user.id} mono />
          <InfoRow label="Admin Since" value={new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" })} />
        </SectionCard>

        {/* Platform Stats Snapshot */}
        <SectionCard title="Platform Snapshot" icon={Database}>
          <InfoRow label="Total Users" value={(stats?.totalUsers ?? 0).toLocaleString()} />
          <InfoRow label="Total Downloads" value={(stats?.totalDownloads ?? 0).toLocaleString()} />
          <InfoRow label="Completed Downloads" value={(stats?.completedDownloads ?? 0).toLocaleString()} />
          <InfoRow label="Failed Downloads" value={(stats?.failedDownloads ?? 0).toLocaleString()} />
          <InfoRow label="Pending Queue" value={(stats?.pendingDownloads ?? 0).toLocaleString()} />
          <InfoRow label="Processing Now" value={(stats?.processingDownloads ?? 0).toLocaleString()} />
          <InfoRow label="Total Revenue (LKR)" value={`Rs. ${((stats?.totalRevenueLKR ?? 0)).toLocaleString()}`} />
          <InfoRow label="Total Credits Issued" value={(stats?.totalCreditsIssued ?? 0).toFixed(1)} />
        </SectionCard>

        {/* Scheduled Jobs */}
        <SectionCard title="Scheduled Jobs" icon={Clock}>
          <InfoRow
            label="pollDecodlJobs"
            value={<span className="text-xs font-mono bg-muted px-2 py-1 rounded-lg">Every minute (*/1 * * * *)</span>}
          />
          <InfoRow
            label="expireOldDownloads"
            value={<span className="text-xs font-mono bg-muted px-2 py-1 rounded-lg">Daily at midnight (0 0 * * *)</span>}
          />
          <InfoRow
            label="dailyStatsJob"
            value={<span className="text-xs font-mono bg-muted px-2 py-1 rounded-lg">Hourly (0 * * * *)</span>}
          />
        </SectionCard>

        {/* Environment */}
        <SectionCard title="Server Environment" icon={Server}>
          <InfoRow label="Environment" value={
            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${nodeEnv === "production" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"}`}>
              {nodeEnv.toUpperCase()}
            </span>
          } />
          <InfoRow label="Wasp Version" value="0.22.x" />
          <InfoRow label="Decodl Base URL" value="https://decodl.ir" mono />
          <InfoRow label="Payment Gateway" value="PayHere (LKR)" />
          <InfoRow label="Database" value="PostgreSQL via Prisma" />
          <InfoRow label="Auth Method" value="Email + Password" />
        </SectionCard>

        {/* Quick Actions */}
        <SectionCard title="Quick Navigation" icon={Zap}>
          <div className="py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { href: "/admin/users", label: "Manage Users", color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
              { href: "/admin/downloads", label: "All Downloads", color: "bg-primary/10 text-primary hover:bg-primary/20" },
              { href: "/admin/payments", label: "Payment History", color: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" },
              { href: "/admin/providers", label: "Edit Providers", color: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" },
              { href: "/admin/credits", label: "Credit Ledger", color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20" },
              { href: "/dashboard", label: "← User App", color: "bg-muted text-muted-foreground hover:bg-accent" },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`flex items-center justify-center text-xs font-bold py-3 px-4 rounded-xl transition-colors ${link.color}`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </SectionCard>
      </div>
    </DefaultLayout>
  );
}
