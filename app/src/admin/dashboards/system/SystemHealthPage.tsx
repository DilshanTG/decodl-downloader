import { useQuery } from "wasp/client/operations";
// @ts-ignore — type generated after wasp build
import { adminGetSystemHealth } from "wasp/client/operations";
import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../layout/DefaultLayout";
import { cn } from "../../../client/utils";

function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "ok" | "amber" | "red";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-500/40 bg-red-500/5"
      : tone === "amber"
        ? "border-amber-500/40 bg-amber-500/5"
        : tone === "ok"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-card";

  return (
    <div className={cn("rounded-2xl border p-5 shadow-sm", toneClass)}>
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </p>
      <p className="text-3xl font-black tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function SystemHealthPage({ user }: { user: AuthUser }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery(
    adminGetSystemHealth,
    undefined,
    { refetchInterval: 30_000 }
  );

  const pendingPayments = data?.pendingPayments ?? 0;
  const failed24h = data?.failedDownloads24h ?? 0;
  const decodlAvailable = data?.decodlAvailable ?? false;
  const decodlBalance = data?.decodlBalance ?? -1;

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-foreground">System Health</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live operator view — audit trail, pipeline backlog, Decodl balance
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold hover:bg-accent transition-colors"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {(error as any)?.message ?? "Failed to load system health"}
          </div>
        )}

        {isLoading || !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl border border-border bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Active downloads"
                value={data.activeDownloads}
                sub={`${data.pendingDownloads} pending · ${data.processingDownloads} processing`}
                tone={data.activeDownloads > 50 ? "amber" : "default"}
              />
              <StatCard
                label="Stale pending payments"
                value={pendingPayments}
                sub="status=pending older than 15 min"
                tone={pendingPayments > 5 ? "red" : pendingPayments > 0 ? "amber" : "ok"}
              />
              <StatCard
                label="Failed (24h)"
                value={failed24h}
                sub={`${data.refundedDownloads24h} refunded in 24h`}
                tone={failed24h > 30 ? "red" : failed24h > 10 ? "amber" : "default"}
              />
              <StatCard
                label="Decodl balance"
                value={decodlAvailable ? decodlBalance.toFixed(1) : "n/a"}
                sub={decodlAvailable ? "wholesale credits" : "balance unavailable"}
                tone={
                  !decodlAvailable
                    ? "red"
                    : decodlBalance < 50
                      ? "amber"
                      : "ok"
                }
              />
            </div>

            {/* Last reconcile */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground mb-3">
                Last reservation reconcile
              </h2>
              {data.lastReconcile ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">When</p>
                    <p className="font-semibold tabular-nums">
                      {new Date(data.lastReconcile.at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Scanned</p>
                    <p className="font-semibold tabular-nums">{data.lastReconcile.scanned}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Healed</p>
                    <p className={cn("font-semibold tabular-nums", data.lastReconcile.healed > 0 && "text-emerald-600")}>
                      {data.lastReconcile.healed}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Drift alerts</p>
                    <p className={cn("font-semibold tabular-nums", data.lastReconcile.driftAlerts > 0 && "text-amber-600")}>
                      {data.lastReconcile.driftAlerts}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reconcile run yet in this process (job runs daily at 03:00 UTC).
                </p>
              )}
            </div>

            {/* Recent audit */}
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                  Recent admin actions
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-4 font-bold">When</th>
                      <th className="py-3 px-4 font-bold">Admin</th>
                      <th className="py-3 px-4 font-bold">Action</th>
                      <th className="py-3 px-4 font-bold">Target</th>
                      <th className="py-3 px-4 font-bold">Meta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.recentAudit ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No audit rows yet
                        </td>
                      </tr>
                    ) : (
                      data.recentAudit.map((row: any) => (
                        <tr key={row.id} className="border-b border-border/60 hover:bg-muted/30">
                          <td className="py-3 px-4 tabular-nums text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(row.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold">
                            {row.adminEmail ?? row.adminId.slice(0, 8)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                              {row.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {row.targetType ?? "—"}
                            {row.targetId ? (
                              <span className="ml-1 font-mono text-[10px] opacity-70">
                                {String(row.targetId).slice(0, 8)}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3 px-4 text-[10px] font-mono text-muted-foreground max-w-[200px] truncate">
                            {row.metadata ? JSON.stringify(row.metadata) : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="px-5 py-3 text-[10px] text-muted-foreground border-t border-border">
                Generated {new Date(data.generatedAt).toLocaleString()} · auto-refreshes every 30s
              </p>
            </div>
          </>
        )}
      </div>
    </DefaultLayout>
  );
}
