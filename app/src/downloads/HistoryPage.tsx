import { useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getMyDownloads, retryFailedDownload, getProviderPricing } from "wasp/client/operations";
import { Link } from "wasp/client/router";
import { routes } from "wasp/client/router";
import { groupDownloads, getBatchStatusText } from "../shared/grouping";
import { useToast } from "../client/hooks/use-toast";
import { Button } from "../client/components/ui/button";
import type { ProviderPricing } from "wasp/entities";
import {
  CheckCircle2, XCircle, Clock, Loader2, RotateCcw,
  Download, Layers, ChevronRight, Plus, AlertCircle,
} from "lucide-react";

function getDownloadUrl(downloadId: string, downloadToken?: string) {
  const base = `https://stockmart-dl.dilshantharakagunasekara.workers.dev/file/${downloadId}`;
  return downloadToken ? `${base}?token=${downloadToken}` : base;
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function groupByDate(downloads: any[]): { label: string; items: any[] }[] {
  const groups: Record<string, any[]> = {};
  for (const d of downloads) {
    const key = new Date(d.createdAt).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  }
  return Object.entries(groups).map(([key, items]) => ({
    label: getDateLabel(items[0].createdAt),
    items,
  }));
}

function StatusIcon({ status, isProcessing }: { status: string; isProcessing: boolean }) {
  if (isProcessing) return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
  if (status === "completed") return <CheckCircle2 className="w-3.5 h-3.5" />;
  if (status === "failed") return <XCircle className="w-3.5 h-3.5" />;
  if (status === "refunded") return <RotateCcw className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "badge-premium badge-premium-pending",
  processing: "badge-premium badge-premium-processing",
  completed:  "badge-premium badge-premium-completed",
  failed:     "badge-premium badge-premium-failed",
  refunded:   "badge-premium badge-premium-refunded",
};

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending",    label: "Getting Ready" },
  { value: "processing", label: "In Progress" },
  { value: "completed",  label: "Completed" },
  { value: "failed",     label: "Failed" },
];

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card">
      <div className="skeleton-shimmer w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton-shimmer h-4 rounded w-32" />
        <div className="skeleton-shimmer h-3 rounded w-20" />
      </div>
      <div className="skeleton-shimmer h-6 rounded-full w-20" />
      <div className="skeleton-shimmer h-8 rounded-lg w-20" />
    </div>
  );
}

export default function HistoryPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery(
    getMyDownloads,
    { page, status: statusFilter || undefined },
    { refetchInterval: 15000, staleTime: 10000 }
  );
  const { data: pricingData } = useQuery(getProviderPricing, undefined, { staleTime: 5 * 60 * 1000 });

  const rawDownloads = data?.downloads ?? [];
  const downloads: any[] = groupDownloads(rawDownloads);
  const totalPages: number = data?.totalPages ?? 1;
  const total: number = data?.total ?? 0;
  const dateGroups = groupByDate(downloads);

  const getDisplayName = (slug: string) => {
    if (!pricingData) return slug;
    const found = (pricingData as ProviderPricing[]).find(p => p.slug === slug);
    return found?.displayName?.replace(/ \(.*\)$/, "").replace(/ HD$| 4K$| VIP.*$/, "") ?? slug;
  };

  const isExpired = (d: any) => d.expiresAt && new Date(d.expiresAt) < new Date();

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await retryFailedDownload({ id });
      refetch();
      toast({ title: "Retry submitted", description: "Your download has been re-queued." });
    } catch (err: any) {
      toast({ title: "Retry failed", description: err?.message || "Could not retry.", variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 pt-10 pb-20">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Download History</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total > 0 ? `${total} total downloads` : "No downloads yet"}
            </p>
          </div>
          <Button asChild className="rounded-xl font-bold gap-2 shadow-sm">
            <Link to={routes.DashboardRoute?.to || "/dashboard"}>
              <Plus className="w-4 h-4" />
              New Download
            </Link>
          </Button>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap mb-6">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : downloads.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-3xl bg-card/30">
            <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Download className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-bold text-foreground mb-1">
              {statusFilter ? "No downloads match this filter" : "No downloads yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              {statusFilter ? "Try a different filter" : "Head to dashboard and paste your first stock URL"}
            </p>
            {statusFilter ? (
              <button
                onClick={() => { setStatusFilter(""); setPage(1); }}
                className="text-sm text-primary font-bold hover:underline"
              >
                Clear filter
              </button>
            ) : (
              <Button asChild size="sm" className="rounded-xl font-bold">
                <Link to={routes.DashboardRoute?.to || "/dashboard"}>Go to Dashboard →</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {dateGroups.map(({ label, items }) => (
              <div key={label}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-semibold">{items.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {items.map((d: any) => {
                    const statusInfo = d.isBulk
                      ? getBatchStatusText(d.items)
                      : {
                          text: {
                            pending: "Getting Ready", processing: "In Progress",
                            completed: "Completed", failed: "Download Failed", refunded: "Credits Returned",
                          }[d.status as string] ?? d.status,
                          colorClass: STATUS_COLORS[d.status] ?? "bg-muted text-muted-foreground",
                          isProcessing: d.status === "processing" || d.status === "pending",
                        };

                    const isCompleted = !d.isBulk && d.status === "completed" && d.downloadUrl && !isExpired(d);
                    const isFailed = !d.isBulk && d.status === "failed";
                    const isExpiredDownload = !d.isBulk && d.status === "completed" && isExpired(d);

                    return (
                      <div
                        key={d.id}
                        className={`group flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border transition-all duration-200 ${
                          isCompleted
                            ? "border-green-500/20 bg-green-500/5 hover:border-green-500/40"
                            : isFailed
                            ? "border-red-500/10 bg-red-500/5 hover:border-red-500/20"
                            : "border-border bg-card hover:border-primary/20 hover:bg-accent/30"
                        }`}
                      >
                        {/* Provider logo + info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 p-1.5 ${
                            isCompleted ? "bg-white" : isFailed ? "bg-red-50 dark:bg-red-950/30" : "bg-white"
                          }`}>
                            <img
                              src={`/provider-logos/png/${d.providerSlug}.png`}
                              alt=""
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const img = e.currentTarget;
                                if (!img.dataset.triedSvg) {
                                  img.dataset.triedSvg = "1";
                                  img.src = `/provider-logos/${d.providerSlug}.svg`;
                                } else {
                                  img.style.display = "none";
                                }
                              }}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-foreground">
                                {d.isBulk ? "Bulk Batch" : getDisplayName(d.providerSlug)}
                              </span>
                              {d.isBulk && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                  <Layers className="w-2.5 h-2.5" />
                                  {d.items.length} files
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {new Date(d.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {d.creditsCharged != null && (
                                <>
                                  <span className="text-muted-foreground/40 text-xs">·</span>
                                  <span className="text-xs font-semibold text-muted-foreground">{d.creditsCharged.toFixed(1)} credits</span>
                                </>
                              )}
                              {isExpiredDownload && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                                  <AlertCircle className="w-2.5 h-2.5" /> Expired
                                </span>
                              )}
                              {!d.isBulk && d.expiresAt && !isExpired(d) && d.status === "completed" && (
                                <span className="text-[10px] text-amber-500 font-semibold">
                                  Until {new Date(d.expiresAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>
                            {isFailed && d.errorMessage && (
                              <p className="text-xs text-red-500 mt-1 font-medium truncate max-w-xs" title={d.errorMessage}>
                                {d.errorMessage}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status + Actions */}
                        <div className="flex items-center gap-2 shrink-0 pl-13 sm:pl-0">
                          {/* Status badge */}
                          <span className={statusInfo.colorClass}>
                            <StatusIcon status={d.status} isProcessing={statusInfo.isProcessing} />
                            {statusInfo.text}
                          </span>

                          {/* Save file button */}
                          {isCompleted && (
                            <a
                              href={getDownloadUrl(d.id, d.downloadToken)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-green-500 hover:bg-green-600 text-white transition-all shadow-sm shadow-green-500/20 active:scale-95"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Save File
                            </a>
                          )}

                          {/* Retry button */}
                          {isFailed && d.retryCount < 3 && (
                            <button
                              onClick={() => handleRetry(d.id)}
                              disabled={retryingId === d.id}
                              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-all disabled:opacity-50"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${retryingId === d.id ? "animate-spin" : ""}`} />
                              {retryingId === d.id ? "Retrying..." : "Retry"}
                            </button>
                          )}

                          {/* Details button */}
                          <Link
                            to={routes.DownloadDetailRoute.build({ params: { id: d.id } }) as any}
                            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                          >
                            Details
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && downloads.length > 0 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <span className="text-xs text-muted-foreground font-semibold">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold border-border h-8 px-3"
              >
                <span className="hidden sm:inline">← Previous</span>
                <span className="sm:hidden">←</span>
              </Button>
              <Button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold border-border h-8 px-3"
              >
                <span className="hidden sm:inline">Next →</span>
                <span className="sm:hidden">→</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
