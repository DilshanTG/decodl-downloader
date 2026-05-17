import { useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getMyDownloads, retryFailedDownload } from "wasp/client/operations";
import { Link } from "wasp/client/router";
import { routes } from "wasp/client/router";
import { DOWNLOAD_STATUS_COLORS, DOWNLOAD_STATUS_LABELS } from "../shared/constants";
import { groupDownloads, getBatchStatusText } from "../shared/grouping";
import { useToast } from "../client/hooks/use-toast";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../client/components/ui/card";

function getDownloadUrl(downloadId: string) {
  const base = import.meta.env.REACT_APP_API_URL || window.location.origin.replace(':3000', ':3001');
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${cleanBase}/api/download-file/${downloadId}`;
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-32"></div></td>
      <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-28"></div></td>
      <td className="py-4 px-4"><div className="h-5 bg-muted rounded-full w-20"></div></td>
      <td className="py-4 px-4"><div className="h-4 bg-muted rounded w-12"></div></td>
      <td className="py-4 px-4"><div className="h-8 bg-muted rounded-lg w-20"></div></td>
    </tr>
  );
}

export default function HistoryPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(
    getMyDownloads,
    { page, status: statusFilter || undefined, providerSlug: providerFilter || undefined },
    { refetchInterval: 8000 }
  );

  const rawDownloads = data?.downloads ?? [];
  const downloads: any[] = groupDownloads(rawDownloads);
  const totalPages: number = data?.totalPages ?? 1;
  const total: number = data?.total ?? 0;

  // Collect unique providers from results for filter dropdown
  const providerOptions = Array.from(new Set(downloads.map((d: any) => d.providerSlug))).filter(Boolean);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await retryFailedDownload({ id });
      refetch();
      toast({ title: "Retry submitted", description: "Your download has been re-queued." });
    } catch (err: any) {
      toast({ title: "Retry failed", description: err?.message || "Could not retry download.", variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  const isExpired = (d: any) => {
    if (!d.expiresAt) return false;
    return new Date(d.expiresAt) < new Date();
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pt-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Download History</h1>
            <p className="text-muted-foreground text-sm mt-1.5">{total > 0 ? `${total} total downloads` : "All your downloads"}</p>
          </div>
          <Button variant="default" asChild className="rounded-xl font-semibold shadow-sm">
            <Link to={routes.DashboardRoute?.to || "/dashboard"}>
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Download
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-border shadow-md p-4 mb-6 bg-card" variant="bento">
          <CardContent className="p-0 flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Status filters */}
            <div className="flex gap-2 flex-wrap">
              {STATUS_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  onClick={() => { setStatusFilter(f.value); setPage(1); }}
                  variant={statusFilter === f.value ? "default" : "secondary"}
                  size="sm"
                  className="rounded-lg text-xs font-semibold px-3 h-8 border border-border"
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {/* Provider filters */}
            {providerOptions.length > 0 && (
              <div className="w-full sm:w-auto">
                <select
                  value={providerFilter}
                  onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
                  className="w-full sm:w-auto border border-border rounded-lg px-3 py-1.5 text-xs text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                >
                  <option value="">All Providers</option>
                  {providerOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table view */}
        <Card className="border-border shadow-md overflow-hidden bg-card" variant="bento">
          <CardContent className="p-0">
            {/* Mobile view list */}
            <div className="block sm:hidden divide-y divide-border">
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse p-4">
                    <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-24"></div>
                  </div>
                ))
              ) : downloads.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground text-sm font-medium">No downloads found</p>
                  {(statusFilter || providerFilter) && (
                    <Button
                      onClick={() => { setStatusFilter(""); setProviderFilter(""); setPage(1); }}
                      variant="link"
                      className="text-primary text-sm hover:underline mt-2"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                downloads.map((d: any) => {
                  const statusInfo = d.isBulk
                    ? getBatchStatusText(d.items)
                    : {
                        text: DOWNLOAD_STATUS_LABELS[d.status] || d.status,
                        colorClass: DOWNLOAD_STATUS_COLORS[d.status] || "bg-muted text-foreground",
                        isProcessing: d.status === "processing"
                      };

                  return (
                    <div key={d.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {d.providerSlug}
                            {d.isBulk && (
                              <span className="ml-2 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Bulk ({d.items.length})
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.colorClass}`}>
                          {statusInfo.isProcessing && (
                            <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                          )}
                          {statusInfo.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-muted-foreground font-bold">{d.creditsCharged ? `${d.creditsCharged.toFixed(1)} credits` : "—"}</span>
                        <div className="ml-auto flex gap-2">
                          {!d.isBulk && d.status === "completed" && d.downloadUrl && !isExpired(d) && (
                            <Button size="sm" variant="default" asChild className="h-8 rounded-lg text-xs font-bold px-3">
                              <a href={getDownloadUrl(d.id)} target="_blank" rel="noopener noreferrer">
                                Download
                              </a>
                            </Button>
                          )}
                          {!d.isBulk && d.status === "failed" && d.retryCount < 3 && (
                            <Button
                              onClick={() => handleRetry(d.id)}
                              disabled={retryingId === d.id}
                              variant="secondary"
                              className="h-8 rounded-lg text-xs font-bold px-3 border border-border"
                            >
                              {retryingId === d.id ? "Retrying..." : "Retry"}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" asChild className="h-8 rounded-lg text-xs font-semibold px-3 border-border">
                            <Link to={routes.DownloadDetailRoute.build({ params: { id: d.id } }) as any}>
                              Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop view table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-accent/30">
                    <th className="text-left py-4 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Date</th>
                    <th className="text-left py-4 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Provider</th>
                    <th className="text-left py-4 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="text-left py-4 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Credits</th>
                    <th className="text-left py-4 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    [1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)
                  ) : downloads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-muted-foreground text-sm font-medium">
                        No downloads found.
                        {(statusFilter || providerFilter) && (
                          <Button
                            onClick={() => { setStatusFilter(""); setProviderFilter(""); setPage(1); }}
                            variant="link"
                            className="text-primary ml-1 hover:underline text-sm font-semibold"
                          >
                            Clear filters
                          </Button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    downloads.map((d: any) => {
                      const statusInfo = d.isBulk
                        ? getBatchStatusText(d.items)
                        : {
                            text: DOWNLOAD_STATUS_LABELS[d.status] || d.status,
                            colorClass: DOWNLOAD_STATUS_COLORS[d.status] || "bg-muted text-foreground",
                            isProcessing: d.status === "processing"
                          };

                      return (
                        <tr key={d.id} className="hover:bg-accent/20 transition-colors group">
                          <td className="py-4 px-5 text-muted-foreground text-xs whitespace-nowrap">
                            <span className="font-bold text-foreground">
                              {new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                            <br />
                            <span className="text-muted-foreground opacity-80">
                              {new Date(d.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </td>
                          <td className="py-4 px-5">
                            <span className="font-bold text-foreground">
                              {d.providerSlug}
                              {d.isBulk && (
                                <span className="ml-2 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Bulk ({d.items.length})
                                </span>
                              )}
                            </span>
                            {!d.isBulk && d.fileName && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">{d.fileName}</p>
                            )}
                          </td>
                          <td className="py-4 px-5">
                            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.colorClass}`}>
                              {statusInfo.isProcessing && (
                                <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                              )}
                              {statusInfo.text}
                            </span>
                            {!d.isBulk && d.status === "failed" && d.errorMessage && (
                              <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={d.errorMessage}>
                                {d.errorMessage}
                              </p>
                            )}
                          </td>
                          <td className="py-4 px-5 text-foreground font-extrabold tabular-nums">
                            {d.creditsCharged != null ? d.creditsCharged.toFixed(1) : "—"}
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex gap-2">
                              {!d.isBulk && d.status === "completed" && d.downloadUrl && !isExpired(d) && (
                                <Button size="sm" variant="default" asChild className="h-8 rounded-lg text-xs font-bold px-3">
                                  <a href={getDownloadUrl(d.id)} target="_blank" rel="noopener noreferrer">
                                    Download
                                  </a>
                                </Button>
                              )}
                              {!d.isBulk && d.status === "completed" && isExpired(d) && (
                                <span className="text-xs text-muted-foreground px-3 py-1.5 font-bold">Expired</span>
                              )}
                              {!d.isBulk && d.status === "failed" && d.retryCount < 3 && (
                                <Button
                                  onClick={() => handleRetry(d.id)}
                                  disabled={retryingId === d.id}
                                  variant="secondary"
                                  className="h-8 rounded-lg text-xs font-bold px-3 border border-border"
                                >
                                  {retryingId === d.id ? "Retrying..." : "Retry"}
                                </Button>
                              )}
                              {!d.isBulk && d.status === "failed" && d.retryCount >= 3 && (
                                <span className="text-xs text-red-500 px-3 py-1.5 font-semibold">Max retries</span>
                              )}
                              <Button size="sm" variant="outline" asChild className="h-8 rounded-lg text-xs font-semibold px-3 border-border">
                                <Link to={routes.DownloadDetailRoute.build({ params: { id: d.id } }) as any}>
                                  Details
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-accent/10">
                <p className="text-xs text-muted-foreground font-semibold">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs font-semibold h-8 border-border"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs font-semibold h-8 border-border"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
