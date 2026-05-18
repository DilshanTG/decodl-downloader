import { useQuery, adminGetOverviewStats } from "wasp/client/operations";
import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../layout/DefaultLayout";
import { DOWNLOAD_STATUS_COLORS, DOWNLOAD_STATUS_LABELS } from "../../../shared/constants";

function StatCard({
  label,
  value,
  sub,
  icon,
  color = "text-primary",
  bgColor = "bg-primary/10",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
  bgColor?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl ${bgColor} flex items-center justify-center shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-foreground mt-0.5 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AnalyticsDashboardPage({ user }: { user: AuthUser }) {
  const { data: stats, isLoading } = useQuery(adminGetOverviewStats, undefined, { refetchInterval: 30000 });

  const totalDl = stats?.totalDownloads ?? 0;

  return (
    <DefaultLayout user={user}>
      <div className="space-y-7">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-foreground">Admin Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live platform health & activity</p>
        </div>

        {/* Top stat cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Users"
            value={isLoading ? "—" : (stats?.totalUsers ?? 0).toLocaleString()}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /></svg>}
            color="text-blue-500"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            label="Total Downloads"
            value={isLoading ? "—" : (stats?.totalDownloads ?? 0).toLocaleString()}
            sub={`${stats?.todayDownloads ?? 0} today`}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
            color="text-primary"
            bgColor="bg-primary/10"
          />
          <StatCard
            label="Revenue (LKR)"
            value={isLoading ? "—" : `Rs. ${((stats?.totalRevenueLKR ?? 0) / 100).toLocaleString()}`}
            sub="All time paid"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            color="text-emerald-500"
            bgColor="bg-emerald-500/10"
          />
          <StatCard
            label="Failed Today"
            value={isLoading ? "—" : stats?.todayFailed ?? 0}
            sub={`${stats?.pendingDownloads ?? 0} pending`}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            color="text-red-500"
            bgColor="bg-red-500/10"
          />
        </div>

        {/* Row 2 — Status breakdown + Credits */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Download Status Breakdown */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-extrabold text-foreground uppercase tracking-widest mb-5">Download Status Breakdown</h2>
            {isLoading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-8 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : (
              <div className="space-y-4">
                {[
                  { key: "completed", value: stats?.completedDownloads ?? 0, color: "bg-emerald-500" },
                  { key: "processing", value: stats?.processingDownloads ?? 0, color: "bg-blue-500" },
                  { key: "pending", value: stats?.pendingDownloads ?? 0, color: "bg-amber-500" },
                  { key: "failed", value: stats?.failedDownloads ?? 0, color: "bg-red-500" },
                  { key: "refunded", value: stats?.refundedDownloads ?? 0, color: "bg-purple-500" },
                ].map(({ key, value, color }) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-muted-foreground capitalize">{DOWNLOAD_STATUS_LABELS[key] ?? key}</span>
                      <span className="text-foreground font-extrabold tabular-nums">{value.toLocaleString()}</span>
                    </div>
                    <MiniBar value={value} max={totalDl} color={color} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Providers */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-extrabold text-foreground uppercase tracking-widest mb-5">Top Providers</h2>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : (
              <div className="space-y-2">
                {(stats?.topProviders ?? []).slice(0, 8).map((p: any) => (
                  <div key={p.providerSlug} className="flex items-center justify-between py-1.5">
                    <span className="text-sm font-semibold text-foreground truncate max-w-[60%]">{p.providerSlug}</span>
                    <div className="flex items-center gap-3">
                      <MiniBar value={p._count.id} max={stats?.topProviders?.[0]?._count?.id ?? 1} color="bg-primary" />
                      <span className="text-xs font-extrabold text-muted-foreground tabular-nums w-12 text-right">{p._count.id.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {(stats?.topProviders ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No downloads yet</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 3 — Recent failures + Recent payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Failures */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-foreground uppercase tracking-widest">Recent Failures</h2>
              <a href="/admin/downloads?status=failed" className="text-xs text-primary font-bold hover:underline">View all →</a>
            </div>
            {isLoading ? (
              <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : (stats?.recentFailures ?? []).length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground font-medium">No failures 🎉</div>
            ) : (
              <div className="divide-y divide-border">
                {(stats?.recentFailures ?? []).map((f: any) => (
                  <div key={f.id} className="px-6 py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{f.user?.email ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground font-medium">{f.providerSlug}</p>
                      {f.errorMessage && (
                        <p className="text-[10px] text-red-500 font-semibold mt-0.5 truncate max-w-sm">{f.errorMessage}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                      {new Date(f.updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-foreground uppercase tracking-widest">Recent Payments</h2>
              <a href="/admin/payments" className="text-xs text-primary font-bold hover:underline">View all →</a>
            </div>
            {isLoading ? (
              <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>
            ) : (stats?.recentPayments ?? []).length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground font-medium">No payments yet</div>
            ) : (
              <div className="divide-y divide-border">
                {(stats?.recentPayments ?? []).map((p: any) => (
                  <div key={p.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{p.user?.email ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground font-medium">{p.creditsAwarded} credits · {p.packageId}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-extrabold text-emerald-500">Rs. {(p.amountLKR / 100).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Credits summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Credits Issued (All Time)"
            value={isLoading ? "—" : (stats?.totalCreditsIssued ?? 0).toFixed(1)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            color="text-amber-500"
            bgColor="bg-amber-500/10"
          />
          <StatCard
            label="Active (Processing)"
            value={isLoading ? "—" : stats?.processingDownloads ?? 0}
            sub="Currently being processed"
            icon={<svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>}
            color="text-blue-500"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            label="Pending Queue"
            value={isLoading ? "—" : stats?.pendingDownloads ?? 0}
            sub="Waiting to be picked up"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            color="text-amber-500"
            bgColor="bg-amber-500/10"
          />
        </div>
      </div>
    </DefaultLayout>
  );
}
