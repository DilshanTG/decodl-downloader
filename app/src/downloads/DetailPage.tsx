import { useEffect, useState } from "react";
import { useQuery } from "wasp/client/operations";
import { getDownloadById, retryFailedDownload, getMyDownloads, getProviderPricing } from "wasp/client/operations";
import type { ProviderPricing } from "wasp/entities";
import { useParams } from "react-router";
import { Link } from "wasp/client/router";
import { routes } from "wasp/client/router";
import { DOWNLOAD_STATUS_COLORS, DOWNLOAD_STATUS_LABELS } from "../shared/constants";
import { useToast } from "../client/hooks/use-toast";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../client/components/ui/card";

const TERMINAL_STATUSES = new Set(["completed", "failed", "refunded"]);

function getDownloadUrl(downloadId: string, downloadToken?: string) {
  const base = `https://dl.stockmart.lk/file/${downloadId}`;
  return downloadToken ? `${base}?token=${downloadToken}` : base;
}

const TIMELINE_STEPS = [
  { key: "submitted", label: "Submitted", statuses: ["pending", "processing", "completed", "failed", "refunded"] },
  { key: "processing", label: "Processing", statuses: ["processing", "completed", "failed"] },
  { key: "ready", label: "Ready", statuses: ["completed"] },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ExpiryCountdown({ expiresAt, onExpire }: { expiresAt: string; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const calc = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("Expired");
        onExpire?.();
        clearInterval(timer);
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (h > 0) setRemaining(`${h}h ${m}m`);
      else if (m > 0) setRemaining(`${m}m ${s}s`);
      else setRemaining(`${s}s`);
    };
    calc();
    timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const isExpired = remaining === "Expired";

  return (
    <span className={`font-extrabold ${isExpired ? "text-red-500" : "text-amber-500 animate-pulse"}`}>
      {remaining}
    </span>
  );
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);

  const { data: download, isLoading, refetch } = useQuery(
    getDownloadById,
    { id: id! },
    {
      enabled: !!id,
      refetchInterval: (data: any) => {
        if (!data) return false;
        return TERMINAL_STATUSES.has(data.status) ? false : 5000;
      },
    }
  );

  const { data: downloadsData } = useQuery(getMyDownloads, {});
  const allDownloads = downloadsData?.downloads ?? [];
  const { data: pricingData } = useQuery(getProviderPricing, undefined, { staleTime: 5 * 60 * 1000 });

  const getDisplayName = (slug: string) => {
    if (!pricingData) return slug;
    const found = (pricingData as ProviderPricing[]).find(p => p.slug === slug);
    return found?.displayName?.replace(/ \(.*\)$/, "").replace(/ HD$| 4K$| VIP.*$/, "") ?? slug;
  };

  const optionsArray = download?.options;
  const isBulk = Array.isArray(optionsArray) && optionsArray.some((o: any) => o.name === "isBulk" && o.value === "true");
  const batchId = Array.isArray(optionsArray) && optionsArray.find((o: any) => o.name === "batchId")?.value;

  const batchItems = batchId
    ? allDownloads.filter((d: any) => {
        const opts = d.options;
        return Array.isArray(opts) && opts.find((o: any) => o.name === "batchId")?.value === batchId;
      })
    : [];

  const resolvedBatchItems = batchItems.length > 0 ? batchItems : (download ? [download] : []);

  const handleRetry = async () => {
    if (!id) return;
    setIsRetrying(true);
    try {
      await retryFailedDownload({ id });
      refetch();
      toast({ title: "Retry submitted", description: "Your download has been re-queued." });
    } catch (err: any) {
      toast({ title: "Retry failed", description: err?.message || "Could not retry.", variant: "destructive" });
    } finally {
      setIsRetrying(false);
    }
  };

  const isExpired = download?.expiresAt ? new Date(download.expiresAt) < new Date() : false;
  const canDownload = !isBulk && download?.status === "completed" && download?.downloadUrl && !isExpired;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 text-primary mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <p className="text-muted-foreground text-sm font-semibold">Loading download details...</p>
        </div>
      </div>
    );
  }

  if (!download) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="font-extrabold mb-3 text-lg">Download not found</p>
          <Button variant="outline" asChild className="rounded-xl border-border">
            <Link to={routes.DownloadHistoryRoute?.to || "/history"}>
              Back to History
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Button variant="ghost" asChild className="mb-6 hover:bg-accent/40 rounded-xl text-xs font-semibold text-muted-foreground">
          <Link to={routes.DownloadHistoryRoute?.to || "/history"}>
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Back to History
          </Link>
        </Button>

        {/* Main card */}
        <Card className="border-border shadow-md overflow-hidden bg-card" variant="bento">
          {/* Thumbnail */}
          <div className="w-full aspect-video bg-muted/30 border-b border-border overflow-hidden flex items-center justify-center relative">
            {download.thumbnailUrl ? (
              <img
                src={download.thumbnailUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.removeAttribute("hidden");
                }}
              />
            ) : null}
            <div className={`${download.thumbnailUrl ? "hidden" : ""} flex flex-col items-center gap-2 text-muted-foreground`}>
              <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium opacity-50">No preview available</span>
            </div>
          </div>

          <CardContent className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
              <div>
                <CardTitle className="text-2xl font-black">{getDisplayName(download.providerSlug)}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  {new Date(download.createdAt).toLocaleDateString("en-GB", {
                    weekday: "long", day: "2-digit", month: "long", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <span className={`self-start ${DOWNLOAD_STATUS_COLORS[download.status] || "bg-muted text-foreground"}`}>
                {download.status === "processing" && (
                  <svg className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                )}
                {DOWNLOAD_STATUS_LABELS[download.status] || download.status}
              </span>
            </div>

            {/* Status timeline */}
            <div className="mb-8 border-t border-border pt-5">
              <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                Progress Status
              </span>
              <div className="relative flex items-center justify-between px-2">
                {/* connector line */}
                <div className="absolute left-2 right-2 top-4 h-0.5 bg-muted"></div>
                <div
                  className="absolute left-2 top-4 h-0.5 bg-gradient-to-r from-primary to-secondary transition-all duration-500 shadow-[0_0_8px_rgba(107,0,246,0.35)]"
                  style={{
                    width: download.status === "pending" ? "0%"
                      : download.status === "processing" ? "50%"
                      : download.status === "completed" ? "100%"
                      : download.status === "failed" ? "50%"
                      : "0%"
                  }}
                ></div>

                {TIMELINE_STEPS.map((step, idx) => {
                  const isActive = TIMELINE_STEPS[idx].statuses.includes(download.status);
                  const isFailed = download.status === "failed" && step.key === "processing";
                  const isCurrent = (download.status === "pending" && step.key === "submitted")
                    || (download.status === "processing" && step.key === "processing")
                    || (download.status === "completed" && step.key === "ready");

                  return (
                    <div key={step.key} className="relative flex flex-col items-center z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isFailed
                          ? "bg-red-500/10 text-red-500 border-2 border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                          : isCurrent
                          ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(107,0,246,0.5)] border border-primary-foreground/20 scale-110 animate-pulse"
                          : isActive
                          ? "bg-primary text-primary-foreground shadow-md border border-primary-foreground/20"
                          : "bg-background border-2 border-border text-muted-foreground"
                      }`}>
                        {isFailed ? (
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : isActive ? (
                          <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span className={`text-xs mt-2.5 font-bold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Download Action */}
            {canDownload && (
              <div className="mb-4">
                <Button
                  asChild
                  className="w-full py-7 rounded-xl font-extrabold text-base tracking-wide shadow-md transition-all duration-200 active:scale-[0.98] hover:scale-[1.01] hover:shadow-lg bg-green-500 hover:bg-green-600 text-white cursor-pointer"
                >
                  <a href={getDownloadUrl(download.id, download.downloadToken)} target="_blank" rel="noopener noreferrer">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Complete File
                  </a>
                </Button>
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  👆 Click to save the file to your computer's Downloads folder
                  {download.expiresAt && !isExpired && (
                    <> · <span className="text-amber-500 font-semibold">Available until {new Date(download.expiresAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span></>
                  )}
                </p>
              </div>
            )}

            {download.status === "completed" && isExpired && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl px-4 py-4 mb-4 text-center">
                <p className="text-sm font-bold mb-1">⏰ Download link expired</p>
                <p className="text-xs opacity-90">Files are only available for <strong>24 hours</strong> after completion. This file is no longer accessible. You can retry the download from the button below (credits will be charged again).</p>
              </div>
            )}

            {download.status === "processing" && (
              <div className="bg-primary/10 border border-primary/20 text-primary rounded-xl p-4 mb-4 flex flex-col gap-3 shadow-[0_0_12px_rgba(var(--primary),0.05)]">
                <div className="flex items-center gap-2.5 text-sm font-bold">
                  <svg className="animate-spin w-4.5 h-4.5 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span>
                    {(download.options as any)?.progress
                      ? `Preparing premium media: ${(download.options as any).progress}% completed`
                      : "Your premium file is being prepared..."}
                  </span>
                </div>
                <p className="text-xs text-primary/80 font-medium">⏱ Usually ready in <strong>30–90 seconds</strong>. This page updates automatically — no need to refresh.</p>
                {!!(download.options as any)?.progress && (
                  <div className="w-full bg-primary/20 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-500 shadow-[0_0_10px_#ea580c]" 
                      style={{ width: `${(download.options as any).progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {download.status === "failed" && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold mb-1">Download process failed</p>
                {download.errorMessage && (
                  <p className="text-xs font-semibold opacity-90 break-words" title={download.errorMessage}>
                    {download.errorMessage}
                  </p>
                )}
                {download.retryCount < 3 && (
                  <Button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="mt-4 font-bold rounded-lg h-9 text-xs px-4"
                  >
                    {isRetrying ? (
                      <>
                        <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Retrying...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Retry ({3 - download.retryCount} attempts left)
                      </>
                    )}
                  </Button>
                )}
                {download.retryCount >= 3 && (
                  <p className="text-xs text-red-500 mt-2 font-bold">Maximum retry attempts reached. Please contact support.</p>
                )}
              </div>
            )}

            {/* Batch Items list */}
            {isBulk && resolvedBatchItems.length > 0 && (
              <div className="mb-8 border-t border-border pt-5">
                <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Batch Assets ({resolvedBatchItems.length} items)
                </span>
                <div className="space-y-3">
                  {resolvedBatchItems.map((item: any, idx: number) => {
                    const isItemExpired = item.expiresAt ? new Date(item.expiresAt) < new Date() : false;
                    const canDownloadItem = item.status === "completed" && item.downloadUrl && !isItemExpired;
                    const itemLabel = item.link || item.code || `Asset #${idx + 1}`;

                    return (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-background/50 gap-3 hover:border-primary/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate max-w-md" title={itemLabel}>
                            {itemLabel}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wide">
                            {item.providerSlug}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-1 rounded-full ${DOWNLOAD_STATUS_COLORS[item.status] || "bg-muted text-foreground"}`}>
                            {DOWNLOAD_STATUS_LABELS[item.status] || item.status}
                          </span>
                          {canDownloadItem ? (
                            <Button size="sm" variant="default" asChild className="h-8 rounded-lg text-xs font-bold px-3 shadow-sm">
                              <a href={getDownloadUrl(item.id, item.downloadToken)} target="_blank" rel="noopener noreferrer">
                                Download File
                              </a>
                            </Button>
                          ) : item.status === "completed" && isItemExpired ? (
                            <span className="text-xs text-muted-foreground font-bold">Expired</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Details list */}
            <div className="border-t border-border pt-5 mt-4">
              <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
                Asset Metadata
              </span>
              <div className="bg-muted/20 dark:bg-muted/5 border border-border/85 rounded-2xl p-4 space-y-3.5 shadow-inner">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-semibold">Provider</span>
                  <span className="text-foreground font-extrabold">{getDisplayName(download.providerSlug)}</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-semibold">Credits Charged</span>
                  <span className="text-foreground font-extrabold">{download.creditsCharged ?? "—"}</span>
                </div>
                {(download.link || download.code) && (
                  <>
                    <div className="h-px bg-border/50" />
                    <div className="flex justify-between text-sm gap-4 items-start">
                      <span className="text-muted-foreground font-semibold shrink-0">{download.link ? "Submitted URL" : "Submitted Code"}</span>
                      <span className="text-right max-w-[260px]">
                        {download.link ? (
                          <a
                            href={download.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-xs font-semibold hover:underline break-all"
                            title={download.link}
                          >
                            {download.link.length > 60 ? download.link.slice(0, 57) + "…" : download.link}
                          </a>
                        ) : (
                          <span className="text-foreground font-mono text-xs font-bold">{download.code}</span>
                        )}
                      </span>
                    </div>
                  </>
                )}
                {download.fileName && (
                  <>
                    <div className="h-px bg-border/50" />
                    <div className="flex justify-between text-sm gap-4">
                      <span className="text-muted-foreground font-semibold shrink-0">File Name</span>
                      <span className="text-foreground font-extrabold text-right truncate max-w-[280px]" title={download.fileName}>
                        {download.fileName}
                      </span>
                    </div>
                  </>
                )}
                {download.fileSize && (
                  <>
                    <div className="h-px bg-border/50" />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-semibold">File Size</span>
                      <span className="text-foreground font-extrabold">{formatBytes(download.fileSize)}</span>
                    </div>
                  </>
                )}
                {download.expiresAt && download.status === "completed" && !isExpired && (
                  <>
                    <div className="h-px bg-border/50" />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-semibold">Expires In</span>
                      <span><ExpiryCountdown expiresAt={download.expiresAt} onExpire={refetch} /></span>
                    </div>
                  </>
                )}
                <div className="h-px bg-border/50" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-semibold">Retry Count</span>
                  <span className="text-foreground font-extrabold">{download.retryCount} / 3</span>
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-semibold">Download ID</span>
                  <span className="text-muted-foreground font-mono text-xs select-all">{download.id}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
