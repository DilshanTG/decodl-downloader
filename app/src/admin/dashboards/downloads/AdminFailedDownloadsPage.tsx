import { useState } from "react";
import { useQuery, adminGetFailedDownloads, adminForceRetryDownload } from "wasp/client/operations";
import DefaultLayout from "../../layout/DefaultLayout";
import { useToast } from "../../../client/hooks/use-toast";
import { type AuthUser } from "wasp/auth";

export default function AdminFailedDownloadsPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [filterProvider, setFilterProvider] = useState("");
  const [retrying, setRetrying] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(adminGetFailedDownloads, {
    page,
    providerSlug: filterProvider || undefined,
  });

  const downloads = data?.downloads ?? [];
  const byProvider: { providerSlug: string; _count: { id: number }; _sum: { creditsCharged: number } }[] = data?.byProvider ?? [];
  const totalCreditsLost = byProvider.reduce((sum, p) => sum + (p._sum.creditsCharged ?? 0), 0);

  const handleRetry = async (id: string) => {
    setRetrying(id);
    try {
      await adminForceRetryDownload({ downloadId: id });
      toast({ title: "Retried", description: "Download requeued successfully." });
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRetrying(null);
    }
  };

  const copyJobId = (jobId: string) => {
    navigator.clipboard.writeText(jobId);
    setCopied(jobId);
    setTimeout(() => setCopied(null), 2000);
  };

  const exportCSV = () => {
    const rows = [
      ["Download ID", "Decodl Job ID", "Provider", "User Email", "Credits Charged", "Error", "Created At"],
      ...downloads.map((d: any) => [
        d.id, d.decodlJobId ?? "", d.providerSlug, d.user?.email ?? "", d.creditsCharged, d.errorMessage ?? "", new Date(d.createdAt).toISOString(),
      ]),
    ];
    const csv = rows.map(r => r.map(String).map((v: string) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `failed-downloads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DefaultLayout user={user}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-foreground">Failed Downloads</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Use Decodl Job IDs to request refunds from Decodl when they charged you for failed jobs.
            </p>
          </div>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 py-2.5 rounded-xl text-sm cursor-pointer transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV for Decodl
          </button>
        </div>

        {/* Summary by provider */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="text-3xl font-black text-red-500 mb-1">{data?.total ?? 0}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Failed</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="text-3xl font-black text-amber-500 mb-1">{totalCreditsLost.toFixed(1)}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Credits Charged</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="text-3xl font-black text-primary mb-1">{byProvider.length}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Providers Affected</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="text-3xl font-black text-emerald-500 mb-1">
              {downloads.filter((d: any) => d.decodlJobId).length}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Have Job IDs</div>
          </div>
        </div>

        {/* Provider breakdown */}
        {byProvider.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 mb-6">
            <h3 className="font-black text-sm mb-3 text-foreground">Failures by Provider (for Decodl refund claim)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {byProvider.map((p) => (
                <button
                  key={p.providerSlug}
                  onClick={() => { setFilterProvider(filterProvider === p.providerSlug ? "" : p.providerSlug); setPage(1); }}
                  className={`rounded-xl border p-3 text-left cursor-pointer transition-all ${filterProvider === p.providerSlug ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:border-primary/40"}`}
                >
                  <div className="font-black text-sm text-foreground">{p.providerSlug}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p._count.id} failed · {(p._sum.creditsCharged ?? 0).toFixed(1)} cr</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-5 items-center">
          {filterProvider && (
            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full">
              {filterProvider}
              <button onClick={() => { setFilterProvider(""); setPage(1); }} className="hover:text-primary/60 cursor-pointer">✕</button>
            </span>
          )}
          {filterProvider && <span className="text-xs text-muted-foreground">Showing failures for {filterProvider} only</span>}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Provider</th>
                  <th className="text-left py-3 px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Decodl Job ID</th>
                  <th className="text-right py-3 px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Credits</th>
                  <th className="text-left py-3 px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Error</th>
                  <th className="text-left py-3 px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="text-right py-3 px-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">Loading...</td></tr>
                ) : downloads.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No failed downloads found</td></tr>
                ) : downloads.map((d: any) => (
                  <tr key={d.id} className="hover:bg-accent/20 transition-colors">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-muted text-xs font-bold text-foreground">
                        {d.providerSlug}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground max-w-[160px] truncate">{d.user?.email ?? "—"}</td>
                    <td className="py-3 px-4">
                      {d.decodlJobId ? (
                        <button
                          onClick={() => copyJobId(d.decodlJobId)}
                          className="inline-flex items-center gap-1.5 font-mono text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg hover:bg-amber-500/20 cursor-pointer transition-colors"
                          title="Click to copy Job ID"
                        >
                          {copied === d.decodlJobId ? "Copied!" : d.decodlJobId.slice(0, 20) + "…"}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">No job ID</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-xs font-black ${d.creditsCharged > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                        {d.creditsCharged > 0 ? `-${d.creditsCharged} cr` : "0 cr"}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-[200px]">
                      <span className="text-xs text-muted-foreground truncate block" title={d.errorMessage ?? ""}>
                        {d.errorMessage ? d.errorMessage.slice(0, 50) + (d.errorMessage.length > 50 ? "…" : "") : "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRetry(d.id)}
                        disabled={retrying === d.id}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {retrying === d.id ? "Retrying…" : "Retry"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(data?.pages ?? 0) > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">Page {page} of {data?.pages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-40 cursor-pointer">Prev</button>
                <button onClick={() => setPage(p => Math.min(data?.pages ?? 1, p + 1))} disabled={page === data?.pages} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-40 cursor-pointer">Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Decodl refund guide */}
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h3 className="font-black text-sm text-foreground mb-2">How to request a refund from Decodl</h3>
          <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
            <li>Click <strong className="text-foreground">Export CSV</strong> above to download all failed jobs with Job IDs</li>
            <li>Filter by provider (e.g. Shutterstock) to get a specific list</li>
            <li>Copy the <span className="font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1 rounded">Decodl Job ID</span> for each failed download</li>
            <li>Submit refund request to Decodl support with the Job IDs and error messages</li>
          </ol>
        </div>
      </div>
    </DefaultLayout>
  );
}
