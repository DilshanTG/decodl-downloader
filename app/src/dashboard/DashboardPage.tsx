import { useState, useEffect, useRef } from "react";
import { useAuth } from "wasp/client/auth";
import { useQuery } from "wasp/client/operations";
import {
 getMyDownloads,
 getMyCreditBalance,
 getProviderPricing,
 submitDownload,
 claimSignupBonus,
 getAssetInfo,
 getDecodlBalance,
} from "wasp/client/operations";
import { Link } from "wasp/client/router";
import { routes } from "wasp/client/router";
import { DOWNLOAD_STATUS_COLORS, DOWNLOAD_STATUS_LABELS } from "../shared/constants";
import { groupDownloads, getBatchStatusText } from "../shared/grouping";
import { useToast } from "../client/hooks/use-toast";
import type { ProviderPricing } from "wasp/entities";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../client/components/ui/card";

function detectProvider(url: string): string | null {
 if (/lorempicsum\.com|picsum\.photos/.test(url)) return"lorempicsum";
 if (/shutterstock\.com\/video/.test(url)) return"shutterstock_video";
 if (/shutterstock\.com/.test(url)) return"shutterstock";
 if (/stock\.adobe\.com\/video/.test(url)) return"adobestock_video";
 if (/stock\.adobe\.com/.test(url)) return"adobestock";
 if (/magnific\.com\/(free-video|premium-video)/.test(url)) return"magnific_video";
 if (/magnific\.com/.test(url)) return"magnific";
 if (/freepik\.com\/video/.test(url)) return"freepik_video";
 if (/freepik\.com/.test(url)) return"freepik";
 if (/flaticon\.com/.test(url)) return"flaticon";
 if (/alamy\.com/.test(url)) return"alamy";
 if (/depositphotos\.com/.test(url)) return"depositphotos";
 if (/dreamstime\.com/.test(url)) return"dreamstime";
 if (/elements\.envato\.com/.test(url)) return"envato_elements";
 if (/istockphoto\.com\/video/.test(url)) return"istockphoto_video";
 if (/istockphoto\.com/.test(url)) return"istockphoto";
 if (/123rf\.com/.test(url)) return"123rf";
 if (/vecteezy\.com/.test(url)) return"vecteezy";
 if (/vectorstock\.com/.test(url)) return"vectorstock";
 if (/yellowimages\.com/.test(url)) return"yellowimages";
 if (/motionarray\.com/.test(url)) return"motionarray";
 if (/iconscout\.com/.test(url)) return"iconscout";
 if (/ui8\.net/.test(url)) return"ui8";
 if (/rawpixel\.com/.test(url)) return"rawpixel";
 if (/pngtree\.com/.test(url)) return"pngtree";
 if (/creativefabrica\.com/.test(url)) return"creative_fabrica";
 if (/vexels\.com/.test(url)) return"vexels";
 return null;
}

const TERMINAL_STATUSES = new Set(["completed","failed","refunded"]);

// Reuse single AudioContext — creating one per call leaks memory
let _audioCtx: AudioContext | null = null;
function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === "closed") _audioCtx = new AudioContext();
  return _audioCtx;
}

// Play a pleasant two-tone chime using Web Audio API — no external files needed
function playChime() {
 try {
 const ctx = getAudioCtx();
 const times = [0, 0.18];
 const freqs = [1046.5, 1318.5]; // C6, E6
 times.forEach((t, i) => {
 const osc = ctx.createOscillator();
 const gain = ctx.createGain();
 osc.connect(gain);
 gain.connect(ctx.destination);
 osc.type = "sine";
 osc.frequency.value = freqs[i];
 gain.gain.setValueAtTime(0, ctx.currentTime + t);
 gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
 gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.6);
 osc.start(ctx.currentTime + t);
 osc.stop(ctx.currentTime + t + 0.6);
 });
 } catch {}
}

// Show browser notification — only if user has already granted permission (never auto-request)
async function showNotification(title: string, body: string) {
 if (!("Notification"in window)) return;
 if (Notification.permission !== "granted") return;
 new Notification(title, {
 body,
 icon: "/stockmart-logo.svg",
 badge: "/stockmart-logo.svg",
 silent: true,
 });
}

function SkeletonRow() {
 return (
 <div className= "animate-pulse flex items-center gap-4 py-4 border-b border-border">
 <div className= "h-4 bg-muted rounded w-24"></div>
 <div className= "h-4 bg-muted rounded w-32 flex-1"></div>
 <div className= "h-5 bg-muted rounded-full w-20"></div>
 <div className= "h-4 bg-muted rounded w-12"></div>
 </div>
 );
}

export default function DashboardPage() {
 const { data: user } = useAuth();
 const { toast } = useToast();

 const [url, setUrl] = useState("");
 const [manuallySelectedProvider, setManuallySelectedProvider] = useState("");
 const [selectedVariant, setSelectedVariant] = useState("normal");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isClaimingBonus, setIsClaimingBonus] = useState(false);

 const [liveInfo, setLiveInfo] = useState<{
 calculatedCost: number;
 ratio: number;
 options: Array<{ name: string; values: string[]; defaultValue?: string }>;
 error?: string;
 } | null>(null);
 const [liveInfoLoading, setLiveInfoLoading] = useState(false);
 const [assetError, setAssetError] = useState<{
 type: "not-found"|"not-supported"|"no-package"|"error";
 message: string;
 } | null>(null);
 const [selectedFormat, setSelectedFormat] = useState("");
 const [activeTab, setActiveTab] = useState<"single"|"bulk">("single");
 const [bulkUrls, setBulkUrls] = useState("");
 const [bulkSubmitting, setBulkSubmitting] = useState(false);
 const [bulkSelectedProvider, setBulkSelectedProvider] = useState("");

 const isUrlMode = url.includes(".") || url.includes("/") || url.startsWith("http");
 const detectedSlug = isUrlMode
 ? (url.length > 5 ? detectProvider(url) : null)
 : (manuallySelectedProvider || null);
 const [pollInterval, setPollInterval] = useState<number | false>(2000);
 const downloadsRef = useRef<HTMLDivElement>(null);
 const urlInputRef = useRef<HTMLInputElement>(null);
 const [justCompletedIds, setJustCompletedIds] = useState<Set<string>>(new Set());
 // Track previous statuses to detect transitions → completed/failed
 const prevStatusesRef = useRef<Record<string, string>>({});
 // In-site notifications
 const [notifications, setNotifications] = useState<Array<{
 id: string; type: "success"|"error"; title: string; body: string; read: boolean; ts: number;
 }>>([]);
 const [notifOpen, setNotifOpen] = useState(false);
 const [sandboxOpen, setSandboxOpen] = useState(false);
 const [duplicateWarning, setDuplicateWarning] = useState(false);
 const unreadCount = notifications.filter(n => !n.read).length;

 const {
 data: downloadsData,
 isLoading: downloadsLoading,
 refetch: refetchDownloads,
 } = useQuery(getMyDownloads, { page: 1 }, { refetchInterval: pollInterval, staleTime: 5000 });

 const {
 data: balanceData,
 isLoading: balanceLoading,
 refetch: refetchBalance,
 } = useQuery(getMyCreditBalance, undefined, { refetchInterval: 30000, staleTime: 30000 });

 const { data: pricingData } = useQuery(getProviderPricing, undefined, { staleTime: 5 * 60 * 1000 });
 const { data: decodlBalanceData } = useQuery(getDecodlBalance, undefined, { staleTime: 2 * 60 * 1000 });

 // Removed unconditional admin redirect so admins can view the dashboard too.

 useEffect(() => {
 const params = new URLSearchParams(window.location.search);
 const payment = params.get("payment");
 if (payment === "success") {
 toast({
 title: "Payment successful!",
 description: "Your credits have been added. It may take a moment to reflect.",
 });
 } else if (payment === "failed") {
 toast({
 title: "Payment failed",
 description: "Your payment could not be processed. No charges were made. Try again from the Pricing page.",
 variant: "destructive",
 });
 }
 if (payment) window.history.replaceState({},"", window.location.pathname);
 }, []);

 useEffect(() => {
 if (!downloadsData?.downloads?.length) {
 setPollInterval(false);
 return;
 }
 const hasActive = downloadsData.downloads
 .slice(0, 10)
 .some((d: any) => !TERMINAL_STATUSES.has(d.status));
 setPollInterval(hasActive ? 2000 : false);
 }, [downloadsData]);

 // Detect download status transitions → fire chime + browser + in-site notification
 useEffect(() => {
 const downloads = downloadsData?.downloads ?? [];
 if (downloads.length === 0) return;

 const prev = prevStatusesRef.current;
 const newNotifs: typeof notifications = [];

 downloads.forEach((d: any) => {
 const wasActive = prev[d.id] && !TERMINAL_STATUSES.has(prev[d.id]);
 if (wasActive && d.status === "completed") {
 playChime();
 showNotification("✅ Download Ready!", `${d.providerSlug} — your file is ready.`);
 newNotifs.push({
 id: `${d.id}-done`,
 type: "success",
 title: "Download Ready!",
 body: `${d.providerSlug} — click to download.`,
 read: false,
 ts: Date.now(),
 });
 setJustCompletedIds(prev => new Set([...prev, d.id]));
 setTimeout(() => setJustCompletedIds(prev => { const n = new Set(prev); n.delete(d.id); return n; }), 8000);
 }
 if (wasActive && d.status === "failed") {
 showNotification("❌ Download Failed", `${d.providerSlug} — credits refunded.`);
 newNotifs.push({
 id: `${d.id}-fail`,
 type: "error",
 title: "Download Failed",
 body: `${d.providerSlug} — credits refunded automatically.`,
 read: false,
 ts: Date.now(),
 });
 }
 });

 if (newNotifs.length > 0) {
 setNotifications(prev => [...newNotifs, ...prev].slice(0, 20));
 }

 const next: Record<string, string> = {};
 downloads.forEach((d: any) => { next[d.id] = d.status; });
 prevStatusesRef.current = next;
 }, [downloadsData]);

 useEffect(() => {
 if (!url.trim()) {
 setLiveInfo(null);
 setAssetError(null);
 setSelectedFormat("");
 return;
 }

 const delayDebounceFn = setTimeout(async () => {
 if (!detectedSlug) {
 setLiveInfo(null);
 setAssetError(null);
 return;
 }

 setLiveInfoLoading(true);
 setAssetError(null);

 try {
 const payload: any = {};
 if (isUrlMode) {
 payload.link = url.trim();
 payload.providerSlug = detectedSlug;
 } else {
 payload.code = url.trim();
 payload.providerSlug = detectedSlug;
 }

 if (selectedFormat) {
 payload.options = [{ name: "format", value: selectedFormat }];
 }

 const info = await getAssetInfo(payload);
 setLiveInfo(info);
 setAssetError(null);

 if (info.options?.length > 0 && !selectedFormat) {
 const formatOpt = info.options.find((opt: any) => opt.name === 'format');
 if (formatOpt?.values?.length > 0) {
 setSelectedFormat(formatOpt.defaultValue || formatOpt.values[0]);
 }
 }
 } catch (err: any) {
 setLiveInfo(null);
 const msg = (err?.message ||"").toLowerCase();
 const exCode = err?.exceptionCode;
 const decodlCode = err?.code;

 if (msg.includes("not-found") || msg.includes("not found") || exCode === 404005) {
 setAssetError({ type: "not-found", message: "This asset was not found. Please double-check the URL — make sure you copied the full link from the browser address bar."});
 } else if (
 msg.includes("not-supported") || msg.includes("not supported") ||
 msg.includes("editorial") || msg.includes("only support") ||
 msg.includes("not support") || decodlCode === 400024
 ) {
 setAssetError({ type: "not-supported", message: "Sorry, this type of asset cannot be downloaded. It may be an editorial image (news use only) or a format we don't currently support. Try a different image or video."});
 } else if (msg.includes("no-package") || msg.includes("no package")) {
 setAssetError({ type: "no-package", message: "Our download service is temporarily busy. Please wait a few minutes and try again. If this keeps happening, contact us on WhatsApp."});
 } else {
 setAssetError({ type: "error", message: "Could not verify this asset. Please check the URL and try again, or contact support if the problem continues."});
 }
 } finally {
 setLiveInfoLoading(false);
 }
 }, 600);

 return () => clearTimeout(delayDebounceFn);
 }, [url, detectedSlug, selectedFormat]);

 const matchedPricing = detectedSlug && pricingData
 ? (pricingData as ProviderPricing[]).find(
 (p) => p.slug === detectedSlug && p.variant === (selectedVariant ||"normal")
 ) || (pricingData as ProviderPricing[]).find((p) => p.slug === detectedSlug)
 : null;

 const assetCostForCheck = liveInfo?.calculatedCost ?? matchedPricing?.creditCost;
 const decodlBal = decodlBalanceData?.balance ?? -1;
 const decodlShortfall = decodlBal !== -1 && assetCostForCheck != null && decodlBal < assetCostForCheck;

 const creditBalance = balanceData?.available ?? balanceData?.credits ?? (user?.credits ?? 0) - (user?.reservedCredits ?? 0);
 const reservedAmount = balanceData?.reservedCredits ?? user?.reservedCredits ?? 0;
 const rawDownloads = downloadsData?.downloads ?? [];
 const recentDownloads = groupDownloads(rawDownloads).slice(0, 5);

 const getDisplayName = (slug: string) => {
 if (!pricingData) return slug;
 const found = (pricingData as ProviderPricing[]).find(p => p.slug === slug);
 return found?.displayName?.replace(/ \(.*\)$/,"").replace(/ HD$| 4K$| VIP.*$/,"") ?? slug;
 };

 const handleBulkSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!bulkUrls.trim()) return;

 const lines = bulkUrls.split("\n").map(l => l.trim()).filter(Boolean);
 if (lines.length > 5) {
 toast({
 title: "Limit Exceeded",
 description: "You can only submit up to 5 links at a time in bulk download.",
 variant: "destructive",
 });
 return;
 }

 const validLines = lines.map(line => {
 const isUrl = line.includes(".") || line.includes("/") || line.startsWith("http");
 if (isUrl) {
 const slug = detectProvider(line);
 const matched = pricingData?.find((p: any) => p.slug === slug);
 return { line, slug, isUrl, cost: matched?.creditCost || 0 };
 } else {
 const slug = bulkSelectedProvider || null;
 const matched = slug ? pricingData?.find((p: any) => p.slug === slug) : null;
 return { line, slug, isUrl, cost: matched?.creditCost || 0 };
 }
 }).filter(item => !!item.slug);

 if (validLines.length === 0) {
 toast({
 title: "No supported links found",
 description: "Please check your links. Paste full URLs from Shutterstock, Freepik, Adobe Stock, or other supported sites.",
 variant: "destructive",
 });
 return;
 }

 const totalCost = validLines.reduce((sum, item) => sum + item.cost, 0);
 if (creditBalance < totalCost) {
 toast({
 title: "Insufficient credits",
 description: `Your balance is ${creditBalance.toFixed(1)} credits, but this bulk batch requires ${totalCost.toFixed(1)} credits.`,
 variant: "destructive",
 });
 return;
 }

 setBulkSubmitting(true);
 let successCount = 0;
 let failCount = 0;
 const batchId = `bulk-batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

 for (let i = 0; i < validLines.length; i++) {
 const item = validLines[i];
 try {
 if (item.isUrl) {
 await submitDownload({
 link: item.line,
 providerSlug: item.slug!,
 options: [
 { name: "isBulk", value: "true"},
 { name: "batchId", value: batchId },
 { name: "batchIndex", value: String(i) },
 { name: "batchTotal", value: String(validLines.length) }
 ]
 });
 } else {
 await submitDownload({
 code: item.line,
 providerSlug: item.slug!,
 options: [
 { name: "isBulk", value: "true"},
 { name: "batchId", value: batchId },
 { name: "batchIndex", value: String(i) },
 { name: "batchTotal", value: String(validLines.length) }
 ]
 });
 }
 successCount++;
 } catch (err: any) {
 console.error(`Failed to submit bulk download for: ${item.line}`, err);
 failCount++;
 }
 }

 setBulkUrls("");
 setBulkSubmitting(false);
 setPollInterval(2000);
 refetchDownloads();
 refetchBalance();
 setTimeout(() => downloadsRef.current?.scrollIntoView({ behavior: "smooth", block: "start"}), 300);

 toast({
 title: "✅ Batch submitted!",
 description: `${successCount} file${successCount !== 1 ? 's' : ''} queued — usually ready in 1–3 minutes. Scroll down to 'Recent Downloads' to track progress and save your files.${
 failCount > 0 ? ` (${failCount} could not be submitted.)` : ""
 }`,
 });
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!url.trim()) return;
 if (!detectedSlug) {
 toast({
 title: isUrlMode ?"Unsupported URL": "No Provider Selected",
 description: isUrlMode
 ?"Could not detect a supported provider from this URL."
 : "Please select a provider from the dropdown menu to submit this code.",
 variant: "destructive",
 });
 return;
 }

 // Check for duplicate URL in recent downloads
 const trimmedUrl = url.trim();
 const isDuplicate = recentDownloads.some((d: any) => d.link === trimmedUrl || d.code === trimmedUrl);
 if (isDuplicate && !duplicateWarning) {
 setDuplicateWarning(true);
 return;
 }
 setDuplicateWarning(false);
 setIsSubmitting(true);
 try {
 if (isUrlMode) {
 await submitDownload({
 link: url.trim(),
 providerSlug: detectedSlug,
 variant: selectedFormat ? selectedFormat : undefined,
 options: selectedFormat ? [{ name: "format", value: selectedFormat }] : undefined,
 });
 } else {
 await submitDownload({
 code: url.trim(),
 providerSlug: detectedSlug,
 variant: selectedFormat ? selectedFormat : undefined,
 options: selectedFormat ? [{ name: "format", value: selectedFormat }] : undefined,
 });
 }
 setUrl("");
 setManuallySelectedProvider("");
 setSelectedVariant("normal");
 setSelectedFormat("");
 setPollInterval(2000);
 refetchDownloads();
 refetchBalance();
 setTimeout(() => downloadsRef.current?.scrollIntoView({ behavior: "smooth", block: "start"}), 300);
 toast({
 title: "✅ Download submitted!",
 description: "Preparing your file — usually 30–90 seconds. Scrolling down so you can see it when it's ready.",
 });
 } catch (err: any) {
 toast({
 title: "Download failed",
 description: err?.message ||"Something went wrong. Please try again.",
 variant: "destructive",
 });
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleClaimBonus = async () => {
 setIsClaimingBonus(true);
 try {
 await claimSignupBonus();
 refetchBalance();
 toast({
 title: "2 free credits claimed!",
 description: "Welcome to StockMart. Enjoy your free downloads.",
 });
 toast({
 title: "🎁 2 free credits added!",
 description: "Paste a stock URL in the box above to try your first download!",
 });
 setTimeout(() => {
 urlInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center"});
 urlInputRef.current?.focus();
 }, 400);
 } catch (err: any) {
 toast({
 title: "Error",
 description: err?.message ||"Could not claim bonus.",
 variant: "destructive",
 });
 } finally {
 setIsClaimingBonus(false);
 }
 };

 return (
 <div className= "min-h-screen bg-background text-foreground">
 {/* Dashboard Hero Header */}
 <div className= "relative overflow-hidden border-b border-border bg-card/50">
 <div className= "pointer-events-none absolute inset-0 -z-10">
 <div className= "absolute -top-16 left-0 h-64 w-64 rounded-full bg-primary/10 blur-[80px]"/>
 <div className= "absolute top-0 right-0 h-48 w-48 rounded-full bg-secondary/10 blur-[70px]"/>
 </div>
 <div className= "max-w-4xl mx-auto px-4 pt-10 pb-8">
 <div className= "flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
 <div>
 <div className= "flex items-center gap-2 mb-2">
 <span className= "text-xs font-bold uppercase tracking-widest text-muted-foreground">Dashboard</span>
 </div>
 <h1 className= "text-3xl sm:text-4xl font-black tracking-tight text-foreground">
 Welcome back
 {user?.email ? (
 <span className= "text-primary">, {user.email.split("@")[0]}</span>
 ) : ""}
 </h1>
 <p className= "text-sm text-muted-foreground mt-1.5">
 Download premium images, videos &amp; icons from 20+ sites · Pay in LKR
 </p>
 </div>
 <div className= "flex items-center gap-3 shrink-0">
 {/* Notification bell */}
 <div className= "relative">
 <button
 onClick={() => { setNotifOpen(o => !o); setNotifications(n => n.map(x => ({ ...x, read: true }))); }}
 className= "relative p-2 rounded-xl hover:bg-white/10 transition-colors"
 aria-label= "Notifications"
 >
 <svg className= "w-5 h-5 text-white/80"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2} d= "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
 </svg>
 {unreadCount > 0 && (
 <span className= "absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-secondary text-[10px] font-black text-white flex items-center justify-center duration-200">
 {unreadCount > 9 ?"9+": unreadCount}
 </span>
 )}
 </button>

 {/* Dropdown */}
 {notifOpen && (
 <div className= "absolute right-0 top-12 w-80 bg-card border border-border rounded-2xl shadow-2xl shadow-black/20 z-50 overflow-hidden duration-200">
 <div className= "flex items-center justify-between px-4 py-3 border-b border-border">
 <span className= "text-sm font-bold text-foreground">Notifications</span>
 {notifications.length > 0 && (
 <button onClick={() => setNotifications([])} className= "text-xs text-muted-foreground hover:text-foreground transition-colors">
 Clear all
 </button>
 )}
 </div>
 <div className= "max-h-72 overflow-y-auto">
 {notifications.length === 0 ? (
 <div className= "py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
 ) : (
 notifications.map(n => (
 <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 ${n.read ?"opacity-60": ""}`}>
 <span className= "text-lg mt-0.5 shrink-0">{n.type === "success"?"✅": "❌"}</span>
 <div className= "flex-1 min-w-0">
 <p className= "text-sm font-bold text-foreground">{n.title}</p>
 <p className= "text-xs text-muted-foreground mt-0.5">{n.body}</p>
 <p className= "text-[10px] text-muted-foreground/60 mt-1">
 {new Date(n.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit"})}
 </p>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 )}
 </div>

 </div>
 </div>
 </div>
 </div>

 <div className= "py-8 px-4">
 <div className= "max-w-4xl mx-auto">

 {/* Stats Row */}
 <div className= "grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
 {/* Credit balance card */}
 <Card className= "border-border shadow-md"variant= "bento">
 <CardHeader className= "pb-2">
 <span className= "text-xs uppercase font-bold tracking-wider text-muted-foreground">
 Credit Balance
 </span>
 </CardHeader>
 <CardContent>
 {balanceLoading ? (
 <div className= "animate-pulse h-12 w-24 bg-muted rounded mb-3"></div>
 ) : (
 <div className= "text-5xl font-black text-foreground mb-1.5 tabular-nums">
 {typeof creditBalance === "number"? creditBalance.toFixed(1) : "—"}
 </div>
 )}
 {typeof creditBalance === "number"&& creditBalance > 0 && (
 <p className= "text-xs text-muted-foreground mt-1">≈ Rs. {Math.round(creditBalance * 180).toLocaleString()} value</p>
 )}
 <p className= "text-xs text-muted-foreground mb-1">credits available · <span className= "text-green-500 font-semibold">Never expire</span></p>
 <p className= "text-[10px] text-muted-foreground/60 mb-1">1 credit ≈ Rs. 180 · Used to download images, videos &amp; icons</p>
 {reservedAmount > 0 && (
 <p className= "text-xs text-amber-500 font-semibold mb-2">
 ⏳ {reservedAmount.toFixed(1)} credits temporarily held while your downloads process — automatically returned if anything fails
 </p>
 )}
 <Link
 to={routes.PricingPageRoute.to}
 className= "inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-1"
 >
 <svg className= "w-3 h-3"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M12 4v16m8-8H4"/>
 </svg>
 Top up credits
 </Link>
 </CardContent>
 </Card>

 {/* Signup bonus / quick stats */}
 <Card className= "border-border shadow-md flex flex-col justify-between"variant= "bento">
 <CardContent className= "pt-6 flex flex-col h-full justify-between">
 {user && !(user as any).freeCreditsClaimed ? (
 <div>
 <div className= "flex items-center gap-2 mb-2">
 <span className= "text-2xl">🎁</span>
 <CardTitle className= "text-base font-bold">Claim 2 Free Credits</CardTitle>
 </div>
 <CardDescription className= "text-xs mb-5">
 Welcome bonus for new members. Try downloading a premium vector or photo for free!
 </CardDescription>
 <Button
 onClick={handleClaimBonus}
 disabled={isClaimingBonus}
 variant= "secondary"
 className= "w-full sm:w-auto font-bold rounded-xl border border-border"
 >
 {isClaimingBonus ?"Claiming...": "Claim Free Credits"}
 </Button>
 </div>
 ) : (
 <div className= "flex flex-col justify-between h-full">
 <div>
 <span className= "text-xs uppercase font-bold tracking-wider text-muted-foreground block mb-4">
 Quick Navigation
 </span>
 <div className= "space-y-3">
 <Link
 to={routes.DownloadHistoryRoute?.to ||"/history"}
 className= "flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors font-medium"
 >
 <svg className= "w-4.5 h-4.5 text-muted-foreground"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2} d= "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
 </svg>
 Download History
 </Link>
 <Link
 to={routes.AccountRoute?.to ||"/account"}
 className= "flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors font-medium"
 >
 <svg className= "w-4.5 h-4.5 text-muted-foreground"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2} d= "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
 </svg>
 Account Settings
 </Link>
 <Link
 to={routes.PricingPageRoute.to}
 className= "flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors font-medium"
 >
 <svg className= "w-4.5 h-4.5 text-muted-foreground"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2} d= "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
 </svg>
 LKR Pricing Packages
 </Link>
 </div>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* URL Download Box */}
 <Card className= "border-border shadow-md p-6 mb-8 bg-card"variant= "bento">
 <CardHeader className= "p-0 mb-4">
 <CardTitle className= "text-lg font-bold">New Download</CardTitle>
 </CardHeader>
 <CardContent className= "p-0">
 {/* Tabs Selector */}
 <div className= "flex gap-4 mb-6 border-b border-border pb-3">
 <button
 type= "button"
 onClick={() => setActiveTab("single")}
 className={`pb-2 px-1 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
 activeTab === "single"
 ?"border-primary text-foreground"
 : "border-transparent text-muted-foreground hover:text-foreground"
 }`}
 >
 One File
 </button>
 <button
 type= "button"
 onClick={() => setActiveTab("bulk")}
 className={`pb-2 px-1 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
 activeTab === "bulk"
 ?"border-primary text-foreground"
 : "border-transparent text-muted-foreground hover:text-foreground"
 }`}
 >
 Multiple Files
 <span className= "ml-1.5 normal-case text-[9px] font-semibold text-muted-foreground">(up to 5 at once)</span>
 </button>
 </div>

 {activeTab === "single"? (
 <>
 {/* Low balance warning */}
 {!balanceLoading && typeof creditBalance === "number"&& creditBalance < 2 && creditBalance >= 0 && (
 <div className= "mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
 <div className= "flex items-center gap-2.5">
 <svg className= "w-4 h-4 text-amber-500 shrink-0"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
 </svg>
 <p className= "text-sm font-bold text-amber-600 dark:text-amber-400">
 {creditBalance === 0 ?"You have no credits left": `Only ${creditBalance.toFixed(1)} credit${creditBalance === 1 ?"": "s"} remaining`} — buy more to continue downloading
 </p>
 </div>
 <Link to={routes.PricingPageRoute.to} className= "text-xs font-bold text-primary hover:underline shrink-0 whitespace-nowrap">
 Buy Credits →
 </Link>
 </div>
 )}

 <form onSubmit={handleSubmit}>
 <div className= "mb-5">
 <div className= "flex items-center justify-between mb-2">
 <label className= "block text-xs font-bold uppercase tracking-widest text-muted-foreground">
 Paste Premium Stock URL or Code/ID
 </label>
 <details className= "relative group">
 <summary className= "cursor-pointer text-[10px] font-bold text-primary hover:underline list-none select-none">
 How to get the URL?
 </summary>
 <div className= "absolute right-0 sm:right-0 left-0 sm:left-auto top-5 z-30 w-72 bg-card border border-border rounded-xl shadow-xl p-3.5 text-xs text-muted-foreground leading-relaxed">
 <p className= "font-bold text-foreground mb-2">📋 3 simple steps:</p>
 <ol className= "space-y-1.5 list-decimal list-inside">
 <li>Go to <strong>Shutterstock.com</strong>, <strong>Freepik.com</strong>, or any supported site</li>
 <li>Find the image or video you want to download</li>
 <li><strong>Copy the URL</strong> from your browser's address bar and paste it here</li>
 </ol>
 <p className= "mt-2.5 text-[10px] text-primary font-semibold">✅ Works with Shutterstock, Freepik, Adobe Stock, Envato Elements and 20+ more</p>
 </div>
 </details>
 </div>
 <div className= "relative">
 <input
 ref={urlInputRef}
 type= "text"
 value={url}
 onChange={(e) => {
 setUrl(e.target.value);
 setSelectedVariant("normal");
 setDuplicateWarning(false);
 }}
 placeholder= "https://www.shutterstock.com/... OR Shutterstock code e.g. 1883031073"
 className= "w-full border border-border bg-background text-foreground rounded-xl px-4 py-3.5 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
 />
 {!url && (
 <button
 type= "button"
 onClick={async () => {
 try {
 const text = await navigator.clipboard.readText();
 if (text) { setUrl(text); setSelectedVariant("normal"); setDuplicateWarning(false); }
 } catch {
 toast({ title: "Clipboard access denied", description: "Please paste manually.", variant: "destructive"});
 }
 }}
 className= "absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-colors"
 >
 Paste
 </button>
 )}
 {url && (
 <button
 type= "button"
 onClick={() => { setUrl(""); setSelectedVariant("normal"); setDuplicateWarning(false); setLiveInfo(null); setAssetError(null); setSelectedFormat(""); }}
 className= "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
 >
 <svg className= "w-4 h-4"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M6 18L18 6M6 6l12 12"/>
 </svg>
 </button>
 )}
 </div>
 </div>

 {/* Duplicate URL warning */}
 {duplicateWarning && (
 <div className= "mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 duration-200">
 <svg className= "w-4 h-4 text-amber-500 shrink-0 mt-0.5"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
 </svg>
 <div className= "flex-1 min-w-0">
 <p className= "text-sm font-bold text-amber-600 dark:text-amber-400">You already downloaded this recently</p>
 <p className= "text-xs text-muted-foreground mt-0.5">Downloading again will charge credits. Are you sure?</p>
 </div>
 <button type= "button"onClick={() => setDuplicateWarning(false)} className= "text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0">
 Download again
 </button>
 </div>
 )}

 {/* Manual Provider Selector for Raw Codes */}
 {url.trim().length > 0 && !isUrlMode && (
 <div className= "mb-5 duration-200">
 <label className= "block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
 Which site are you downloading from?
 </label>
 <select
 value={manuallySelectedProvider}
 onChange={(e) => setManuallySelectedProvider(e.target.value)}
 className= "w-full border border-border bg-background text-foreground rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
 >
 <option value= "">-- Select a website --</option>
 <option value= "lorempicsum">LoremPicsum (Free Test Images)</option>
 <option value= "shutterstock">Shutterstock Image</option>
 <option value= "shutterstock_video">Shutterstock Video</option>
 <option value= "freepik">Freepik Vector/Image</option>
 <option value= "freepik_video">Freepik Video</option>
 <option value= "adobestock">Adobe Stock Image</option>
 <option value= "adobestock_video">Adobe Stock Video</option>
 <option value= "envato_elements">Envato Elements</option>
 <option value= "flaticon">Flaticon Icon</option>
 <option value= "alamy">Alamy Image</option>
 <option value= "depositphotos">Depositphotos</option>
 <option value= "dreamstime">Dreamstime</option>
 <option value= "istockphoto">iStockphoto Image</option>
 <option value= "istockphoto_video">iStockphoto Video</option>
 <option value= "123rf">123RF</option>
 <option value= "vecteezy">Vecteezy</option>
 <option value= "vectorstock">VectorStock</option>
 <option value= "yellowimages">Yellow Images</option>
 <option value= "motionarray">Motion Array</option>
 <option value= "iconscout">Iconscout</option>
 </select>
 </div>
 )}

 {/* ── 3-Step Asset Verification Panel ── */}
 {url.trim().length > 0 && (() => {
 const s1 = detectedSlug ?"success": url.trim().length > 5 ?"warning": "idle";
 const s2 = s1 !== "success"?"idle"
 : liveInfoLoading ?"loading"
 : assetError ? (assetError.type === "not-supported"?"editorial": assetError.type === "no-package"?"warning": "error")
 : liveInfo ?"success"
 : "idle";
 const assetCost = liveInfo?.calculatedCost ?? matchedPricing?.creditCost;
 const s3 = s2 !== "success"|| assetCost == null ?"idle"
 : decodlShortfall ?"error"
 : creditBalance >= assetCost ?"success": "warning";

 const providerLabel = (pricingData as any[])?.find((p: any) => p.slug === detectedSlug)?.displayName || detectedSlug ||"";

 const Dot = ({ s }: { s: string }) => {
 if (s === "loading") return (
 <div className= "w-8 h-8 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center shrink-0">
 <svg className= "animate-spin w-3.5 h-3.5 text-primary"fill= "none"viewBox= "0 0 24 24">
 <circle className= "opacity-25"cx= "12"cy= "12"r= "10"stroke= "currentColor"strokeWidth= "4"/>
 <path className= "opacity-75"fill= "currentColor"d= "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
 </svg>
 </div>
 );
 if (s === "success") return (
 <div className= "w-8 h-8 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center shrink-0">
 <svg className= "w-3.5 h-3.5 text-green-500"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M5 13l4 4L19 7"/>
 </svg>
 </div>
 );
 if (s === "warning"|| s === "editorial") return (
 <div className= "w-8 h-8 rounded-full bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center shrink-0">
 <svg className= "w-3.5 h-3.5 text-amber-500"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2} d= "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
 </svg>
 </div>
 );
 if (s === "error"|| s === "not-found") return (
 <div className= "w-8 h-8 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center shrink-0">
 <svg className= "w-3.5 h-3.5 text-red-500"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M6 18L18 6M6 6l12 12"/>
 </svg>
 </div>
 );
 return (
 <div className= "w-8 h-8 rounded-full bg-muted border-2 border-border flex items-center justify-center shrink-0">
 <div className= "w-1.5 h-1.5 rounded-full bg-muted-foreground/30"/>
 </div>
 );
 };

 const Badge = ({ label, color }: { label: string; color: string }) => (
 <span className={`hidden sm:inline-block shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${color}`}>
 {label}
 </span>
 );

 return (
 <div className= "mb-5 rounded-2xl border border-border bg-card shadow-md overflow-hidden duration-300">

 {/* Step 1 — Provider Detection */}
 <div className= "flex items-center gap-3 px-4 py-3.5 border-b border-border">
 <Dot s={s1} />
 <div className= "flex-1 min-w-0">
 <p className= "text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Provider</p>
 {s1 === "success"&& (
 <div className= "flex items-center gap-2 min-w-0">
 <img src={`/provider-logos/${detectedSlug}.svg`} alt= ""className= "h-4 w-auto shrink-0 object-contain"
 onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
 <span className= "text-sm font-bold text-foreground truncate">{providerLabel}</span>
 </div>
 )}
 {s1 === "warning"&& (
 <div>
 <p className= "text-xs font-semibold text-amber-600 dark:text-amber-400">Provider not recognised</p>
 <p className= "text-[10px] text-muted-foreground mt-0.5">Supported: shutterstock.com · freepik.com · stock.adobe.com · elements.envato.com · istockphoto.com · magnific.com · alamy.com · flaticon.com + more</p>
 </div>
 )}
 {s1 === "idle"&& <p className= "text-xs text-muted-foreground/50">Detecting...</p>}
 </div>
 {s1 === "success"&& <Badge label= "Detected"color= "text-green-600 dark:text-green-400 bg-green-500/10"/>}
 {s1 === "warning"&& <Badge label= "Unknown"color= "text-amber-600 dark:text-amber-400 bg-amber-500/10"/>}
 </div>

 {/* Step 2 — Asset Verification */}
 <div className= "flex items-start gap-3 px-4 py-3.5 border-b border-border">
 <Dot s={s2} />
 <div className= "flex-1 min-w-0">
 <p className= "text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">File Check</p>
 {s2 === "idle"&& <p className= "text-xs text-muted-foreground/50">Waiting...</p>}
 {s2 === "loading"&& <p className= "text-sm font-semibold text-primary animate-pulse">Checking file... <span className= "text-xs font-normal text-muted-foreground">(nothing charged yet)</span></p>}
 {s2 === "success"&& assetCost != null && (
 <p className= "text-sm font-bold text-foreground">
 Available · <span className= "text-primary">{assetCost} cr</span>
 </p>
 )}
 {s2 === "editorial"&& (
 <div>
 <p className= "text-sm font-bold text-amber-600 dark:text-amber-400">Editorial — Cannot Download</p>
 <p className= "text-xs text-muted-foreground mt-0.5">Licensed for news use only, not commercial download.</p>
 </div>
 )}
 {s2 === "warning"&& assetError?.type === "no-package"&& (
 <p className= "text-sm font-bold text-amber-600 dark:text-amber-400">Temporarily Busy — Try Again Later</p>
 )}
 {s2 === "error"&& assetError && (
 <p className= "text-sm font-bold text-red-600 dark:text-red-400">
 {assetError.type === "not-found"?"File Not Found": "Could Not Check File"}
 </p>
 )}
 </div>
 {s2 === "success"&& assetCost != null && <Badge label={`${assetCost} cr`} color= "text-green-600 dark:text-green-400 bg-green-500/10"/>}
 {s2 === "editorial"&& <Badge label= "Editorial"color= "text-amber-600 dark:text-amber-400 bg-amber-500/10"/>}
 {(s2 === "warning"&& assetError?.type === "no-package") && <Badge label= "Unavailable"color= "text-amber-600 dark:text-amber-400 bg-amber-500/10"/>}
 {s2 === "error"&& <Badge label={assetError?.type === "not-found"?"Not Found": "Check Failed"} color= "text-red-600 dark:text-red-400 bg-red-500/10"/>}
 </div>

 {/* Step 3 — Credit Check */}
 <div className= "flex items-start gap-3 px-4 py-3.5">
 <Dot s={s3} />
 <div className= "flex-1 min-w-0">
 <p className= "text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Credits</p>
 {s3 === "idle"&& <p className= "text-xs text-muted-foreground/50">Waiting...</p>}
 {s3 === "success"&& assetCost != null && (
 <p className= "text-sm font-bold text-foreground">
 <span className= "text-green-600 dark:text-green-400">{(creditBalance - assetCost).toFixed(1)} cr</span> left after download
 </p>
 )}
 {s3 === "error"&& decodlShortfall && assetCost != null && (
 <div>
 <p className= "text-sm font-bold text-red-600 dark:text-red-400 mb-1">
 Service temporarily unavailable for this file
 </p>
 <p className= "text-xs text-muted-foreground mb-2">
 Our download service is temporarily low on capacity for this file. Please contact support and we will help you download it manually.
 </p>
 <a
 href= "https://wa.me/94772503124"
 target= "_blank"
 rel= "noopener noreferrer"
 className= "inline-flex items-center gap-2 text-xs font-bold bg-[#25D366] text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
 >
 <svg viewBox= "0 0 24 24"className= "w-3.5 h-3.5 fill-white shrink-0">
 <path d= "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
 </svg>
 Contact Support on WhatsApp
 </a>
 </div>
 )}
 {s3 === "warning"&& assetCost != null && (
 <div className= "flex flex-wrap items-center gap-2">
 <p className= "text-sm font-bold text-amber-600 dark:text-amber-400">
 Need {assetCost} cr · Have {creditBalance.toFixed(1)} cr
 </p>
 <Link
 to={routes.PricingPageRoute.to}
 className= "inline-flex items-center gap-1 text-xs font-bold bg-primary text-primary-foreground px-2.5 py-1 rounded-lg hover:opacity-90 transition-opacity"
 >
 <svg className= "w-3 h-3"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M12 4v16m8-8H4"/>
 </svg>
 Buy Credits
 </Link>
 </div>
 )}
 </div>
 {s3 === "success"&& <Badge label= "OK"color= "text-green-600 dark:text-green-400 bg-green-500/10"/>}
 {s3 === "warning"&& <Badge label= "Top Up"color= "text-amber-600 dark:text-amber-400 bg-amber-500/10"/>}
 </div>

 </div>
 );
 })()}

 {/* Dynamic Format Selector — visual cards with per-format credit cost */}
 {detectedSlug && liveInfo?.options && liveInfo.options.length > 0 && (
 <div className= "mb-5 space-y-3 duration-200">
 {liveInfo.options
 .filter((opt: any) => Array.isArray(opt.values) && opt.values.length > 0)
 .map((opt: any) => {
 const label = opt.name.charAt(0).toUpperCase() + opt.name.slice(1);
 return (
 <div key={opt.name}>
 <p className= "text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
 Select {label} Quality
 </p>
 <div className= "flex flex-wrap gap-2">
 {opt.values.map((val: string) => {
 const variantPricing = (pricingData as any[])?.find(
 (p: any) => p.slug === detectedSlug && p.variant.toUpperCase() === val.toUpperCase()
 );
 const variantCost = variantPricing?.creditCost;
 const isSelected = selectedFormat === val;
 const isDefault = !selectedFormat && val === (opt.defaultValue || opt.values[0]);
 const active = isSelected || (!selectedFormat && isDefault);
 return (
 <button
 key={val}
 type= "button"
 onClick={() => setSelectedFormat(val)}
 className={`flex flex-col items-center px-5 py-3 rounded-xl border-2 font-bold transition-all duration-200 min-w-[90px] ${
 active
 ?"border-primary bg-primary/10 text-primary shadow-sm"
 : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent/50"
 }`}
 >
 <span className= "text-base font-extrabold tracking-wide">{val.toUpperCase()}</span>
 {variantCost != null ? (
 <span className={`text-xs font-bold mt-0.5 ${active ?"text-primary": "text-muted-foreground"}`}>
 {variantCost} cr
 </span>
 ) : liveInfoLoading && active ? (
 <span className= "text-xs text-muted-foreground mt-0.5">...</span>
 ) : null}
 </button>
 );
 })}
 </div>
 {opt.name.toLowerCase() === "quality"&& (
 <p className= "text-[11px] text-muted-foreground mt-1.5">
 HD = 1080p · 4K = 2160p ultra resolution
 </p>
 )}
 </div>
 );
 })}
 </div>
 )}

 <div className= "flex flex-col sm:flex-row gap-4 items-start sm:items-center">
 <Button
 type= "submit"
 disabled={isSubmitting || liveInfoLoading || !detectedSlug || !url.trim() || decodlShortfall}
 className= "w-full sm:w-auto px-8 py-6 rounded-xl font-bold tracking-wide transition-all shadow-md disabled:cursor-not-allowed"
 >
 {isSubmitting ? (
 <>
 <svg className= "animate-spin w-4 h-4 mr-2"fill= "none"viewBox= "0 0 24 24">
 <circle className= "opacity-25"cx= "12"cy= "12"r= "10"stroke= "currentColor"strokeWidth= "4"></circle>
 <path className= "opacity-75"fill= "currentColor"d= "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
 </svg>
 Submitting...
 </>
 ) : liveInfoLoading ? (
 <>
 <svg className= "animate-spin w-4 h-4 mr-2"fill= "none"viewBox= "0 0 24 24">
 <circle className= "opacity-25"cx= "12"cy= "12"r= "10"stroke= "currentColor"strokeWidth= "4"></circle>
 <path className= "opacity-75"fill= "currentColor"d= "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
 </svg>
 Calculating Cost...
 </>
 ) : (
 <>
 <svg className= "w-4 h-4 mr-2"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2} d= "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
 </svg>
 Download File
 </>
 )}
 </Button>
 {(liveInfo || matchedPricing) && (
 <p className= "text-xs text-muted-foreground mt-1 sm:mt-0">
 This will deduct <strong className= "text-foreground">
 {liveInfo ? liveInfo.calculatedCost : matchedPricing?.creditCost} credit
 {(liveInfo ? liveInfo.calculatedCost : matchedPricing?.creditCost) !== 1 ?"s": ""}
 </strong> from your balance
 </p>
 )}
 </div>
 </form>
 </>
 ) : (
 <form onSubmit={handleBulkSubmit}>
 <div className= "mb-5">
 <label className= "block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
 Paste Premium URLs or Raw Codes/IDs (Max 5 Per Batch)
 </label>
 <textarea
 value={bulkUrls}
 onChange={(e) => setBulkUrls(e.target.value)}
 placeholder= "https://www.shutterstock.com/image-photo/beautiful-nature-12345&#10;OR paste raw Codes/IDs (e.g. 1883031073)"
 className= "w-full h-36 border border-border bg-background text-foreground rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner font-mono text-xs placeholder:font-sans"
 />
 </div>

 {/* Manual Provider Selector for Raw Codes in Bulk */}
 <div className= "mb-5 duration-200">
 <label className= "block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
 Default Provider for Raw Codes/IDs (If Pasted)
 </label>
 <select
 value={bulkSelectedProvider}
 onChange={(e) => setBulkSelectedProvider(e.target.value)}
 className= "w-full border border-border bg-background text-foreground rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner font-bold"
 >
 <option value= "">-- Select a website --</option>
 <option value= "lorempicsum">LoremPicsum (Free Test Images)</option>
 <option value= "shutterstock">Shutterstock Image</option>
 <option value= "shutterstock_video">Shutterstock Video</option>
 <option value= "freepik">Freepik Vector/Image</option>
 <option value= "freepik_video">Freepik Video</option>
 <option value= "adobestock">Adobe Stock Image</option>
 <option value= "adobestock_video">Adobe Stock Video</option>
 <option value= "envato_elements">Envato Elements</option>
 <option value= "flaticon">Flaticon Icon</option>
 <option value= "alamy">Alamy Image</option>
 <option value= "depositphotos">Depositphotos</option>
 <option value= "dreamstime">Dreamstime</option>
 <option value= "istockphoto">iStockphoto Image</option>
 <option value= "istockphoto_video">iStockphoto Video</option>
 <option value= "123rf">123RF</option>
 <option value= "vecteezy">Vecteezy</option>
 <option value= "vectorstock">VectorStock</option>
 <option value= "yellowimages">Yellow Images</option>
 <option value= "motionarray">Motion Array</option>
 <option value= "iconscout">Iconscout</option>
 </select>
 </div>

 {bulkUrls.split("\n").map(l => l.trim()).filter(Boolean).length > 0 && (() => {
 const bulkLines = bulkUrls.split("\n").map(l => l.trim()).filter(Boolean);
 const validBulkLines = bulkLines.map(line => {
 const isUrl = line.includes(".") || line.includes("/") || line.startsWith("http");
 if (isUrl) {
 const slug = detectProvider(line);
 const matched = pricingData?.find((p: any) => p.slug === slug);
 return { line, slug, isUrl, cost: matched?.creditCost || 0 };
 } else {
 const slug = bulkSelectedProvider || null;
 const matched = slug ? pricingData?.find((p: any) => p.slug === slug) : null;
 return { line, slug, isUrl, cost: matched?.creditCost || 0 };
 }
 }).filter(item => !!item.slug);

 const totalBulkCount = bulkLines.length;
 const validBulkCount = validBulkLines.length;
 const rawCodeCount = bulkLines.filter(line => !(line.includes(".") || line.includes("/") || line.startsWith("http"))).length;
 const invalidBulkCount = totalBulkCount - validBulkCount;
 const totalBulkEstimatedCost = validBulkLines.reduce((sum, item) => sum + item.cost, 0);

 return (
 <div className= "bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl p-4 mb-5 text-sm space-y-2.5 duration-200">
 <div className= "flex justify-between font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5">
 <span>Bulk Batch Analysis</span>
 <span>Stats</span>
 </div>
 <div className= "flex justify-between font-medium">
 <span className= "text-muted-foreground">Total lines pasted:</span>
 <span className= "font-extrabold">{totalBulkCount}</span>
 </div>
 <div className= "flex justify-between font-medium">
 <span className= "text-muted-foreground">Recognized valid assets:</span>
 <span className= "font-extrabold text-green-500">{validBulkCount}</span>
 </div>
 {rawCodeCount > 0 && !bulkSelectedProvider && (
 <div className= "flex justify-between font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3 rounded-xl text-xs leading-normal">
 <span>⚠️ {rawCodeCount} raw codes detected. Select a default provider below to activate them.</span>
 </div>
 )}
 {invalidBulkCount > 0 && (
 <div className= "flex justify-between font-medium">
 <span className= "text-muted-foreground">Unrecognized links:</span>
 <span className= "font-extrabold text-amber-500">{invalidBulkCount}</span>
 </div>
 )}
 <div className= "border-t border-border pt-2.5 flex justify-between font-extrabold text-base text-foreground">
 <span>Total Estimated Cost:</span>
 <span className= "text-primary font-black">{totalBulkEstimatedCost.toFixed(1)} credits</span>
 </div>
 </div>
 );
 })()}

 <div className= "flex flex-col sm:flex-row gap-4 items-start sm:items-center">
 <Button
 type= "submit"
 disabled={bulkSubmitting || (() => {
 const bulkLines = bulkUrls.split("\n").map(l => l.trim()).filter(Boolean);
 const validBulkLines = bulkLines.map(line => {
 const isUrl = line.includes(".") || line.includes("/") || line.startsWith("http");
 if (isUrl) {
 const slug = detectProvider(line);
 return slug;
 } else {
 return bulkSelectedProvider || null;
 }
 }).filter(Boolean);
 return validBulkLines.length === 0;
 })()}
 className= "w-full sm:w-auto px-8 py-6 rounded-xl font-bold tracking-wide transition-all shadow-md disabled:cursor-not-allowed"
 >
 {bulkSubmitting ? (
 <>
 <svg className= "animate-spin w-4 h-4 mr-2"fill= "none"viewBox= "0 0 24 24">
 <circle className= "opacity-25"cx= "12"cy= "12"r= "10"stroke= "currentColor"strokeWidth= "4"></circle>
 <path className= "opacity-75"fill= "currentColor"d= "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
 </svg>
 Queuing Batch...
 </>
 ) : (
 <>
 <svg className= "w-4 h-4 mr-2"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2} d= "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
 </svg>
 Download Batch
 </>
 )}
 </Button>
 {(() => {
 const bulkLines = bulkUrls.split("\n").map(l => l.trim()).filter(Boolean);
 const validBulkLines = bulkLines.map(line => {
 const isUrl = line.includes(".") || line.includes("/") || line.startsWith("http");
 if (isUrl) {
 const slug = detectProvider(line);
 const matched = pricingData?.find((p: any) => p.slug === slug);
 return { slug, cost: matched?.creditCost || 0 };
 } else {
 const slug = bulkSelectedProvider || null;
 const matched = slug ? pricingData?.find((p: any) => p.slug === slug) : null;
 return { slug, cost: matched?.creditCost || 0 };
 }
 }).filter(item => !!item.slug);
 const totalCost = validBulkLines.reduce((sum, item) => sum + item.cost, 0);

 return validBulkLines.length > 0 ? (
 <p className= "text-xs text-muted-foreground mt-1 sm:mt-0">
 This will deduct <strong className= "text-foreground">{totalCost.toFixed(1)} credits</strong> from your balance
 </p>
 ) : null;
 })()}
 </div>
 </form>
 )}
 </CardContent>
 </Card>

 {/* 🛠️ Developer Sandbox Tool — admin only */}
 {(user as any)?.isAdmin && (
 <Card className= "border-border shadow-md p-6 mb-8 bg-card"variant= "bento">
 <CardHeader className= "p-0">
 <button
 type= "button"
 onClick={() => setSandboxOpen((v) => !v)}
 className= "flex items-center justify-between w-full text-left"
 >
 <CardTitle className= "text-lg font-bold flex items-center gap-2">
 <span className= "text-primary">🛠️</span> Developer Sandbox Tool
 </CardTitle>
 <svg
 className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${sandboxOpen ?"rotate-180": ""}`}
 fill= "none"stroke= "currentColor"viewBox= "0 0 24 24"
 >
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M19 9l-7 7-7-7"/>
 </svg>
 </button>
 {!sandboxOpen && (
 <CardDescription className= "text-xs mt-1">
 Test your integration using free sandbox test codes with LoremPicsum.
 </CardDescription>
 )}
 </CardHeader>
 {sandboxOpen && (
 <CardContent className= "p-0 mt-4">
 <div className= "space-y-4">
 <p className= "text-[11px] text-muted-foreground leading-normal">
 To test different response states without active packages, click a test code below to auto-load it with the <strong>LoremPicsum</strong> provider:
 </p>
 <div className= "space-y-2.5">
 {[
 {
 code: "1080319028",
 label: "Simulate Success",
 desc: "Ends in 6,7,8,9 — Completes download successfully",
 badge: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
 },
 {
 code: "1080319021",
 label: "Simulate 'No Package'",
 desc: "Ends in 1 — Returns no-package error (Code 400015)",
 badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
 },
 {
 code: "1080319022",
 label: "Simulate 'Not Found'",
 desc: "Ends in 2 — Returns asset not found error (Code 404022)",
 badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
 },
 {
 code: "1080319023",
 label: "Simulate 'Not Supported'",
 desc: "Ends in 3 — Returns provider not supported error (Code 400011)",
 badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
 },
 {
 code: "1080319024",
 label: "Simulate 'Timeout'",
 desc: "Ends in 4 or 5 — Triggers API processing timeout simulation",
 badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
 },
 ].map((item, idx) => (
 <div
 key={idx}
 className= "flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-border/80 bg-background/25 hover:bg-background/50 transition-colors gap-3"
 >
 <div className= "flex items-start sm:items-center gap-3">
 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border shrink-0 ${item.badge}`}>
 {item.label}
 </span>
 <div>
 <p className= "text-xs font-semibold text-foreground">Code: <span className= "font-mono text-primary font-bold">{item.code}</span></p>
 <p className= "text-[11px] text-muted-foreground mt-0.5">
 {item.desc}
 </p>
 </div>
 </div>
 <Button
 type= "button"
 onClick={() => {
 setUrl(item.code);
 setManuallySelectedProvider("lorempicsum");
 setSelectedVariant("normal");
 toast({
 title: "Free Sandbox Loaded!",
 description: `Code ${item.code} loaded with LoremPicsum provider. Click download below to test.`,
 });
 }}
 variant= "outline"
 size= "sm"
 className= "rounded-lg h-8 px-2.5 text-xs font-bold border-border shadow-sm flex items-center gap-1.5 self-end sm:self-center bg-card hover:bg-accent"
 >
 <svg className= "w-3.5 h-3.5 text-primary"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
 </svg>
 Load Test Code
 </Button>
 </div>
 ))}
 </div>
 </div>
 </CardContent>
 )}
 </Card>
 )}

 {/* Recent Downloads */}
 <div ref={downloadsRef} className= "scroll-mt-24">
 <Card className= "border-border shadow-md p-6 bg-card"variant= "bento">
 <CardHeader className= "p-0 flex flex-row items-center justify-between mb-1">
 <CardTitle className= "text-lg font-bold">Recent Downloads</CardTitle>
 <Button size= "sm"variant= "outline"asChild className= "rounded-xl border-border text-xs font-semibold">
 <Link to={routes.DownloadHistoryRoute?.to ||"/history"}>
 View All →
 </Link>
 </Button>
 </CardHeader>
 <CardContent className= "p-0">
 {downloadsLoading ? (
 <div className= "space-y-4">
 {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
 </div>
 ) : recentDownloads.length === 0 ? (
 <div className= "text-center py-12 border border-dashed border-border rounded-2xl bg-accent/20">
 <div className= "w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
 <svg className= "w-6 h-6 text-muted-foreground"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2} d= "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
 </svg>
 </div>
 <p className= "text-muted-foreground text-sm font-medium">No downloads yet</p>
 <p className= "text-xs text-muted-foreground mt-1 mb-4">Paste a stock URL above and download your first asset.</p>
 <a
 href= "#download-form"
 onClick={(e) => { e.preventDefault(); document.querySelector("input[type='url']")?.scrollIntoView({ behavior: "smooth", block: "center"}); (document.querySelector("input[type='url']") as HTMLElement)?.focus(); }}
 className= "inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
 >
 Download your first file →
 </a>
 </div>
 ) : (
 <div className= "divide-y divide-border">
 {recentDownloads.map((download: any) => {
 const statusInfo = download.isBulk
 ? getBatchStatusText(download.items)
 : {
 text: DOWNLOAD_STATUS_LABELS[download.status] || download.status,
 colorClass: DOWNLOAD_STATUS_COLORS[download.status] ||"bg-muted text-foreground",
 isProcessing: download.status === "processing"|| download.status === "pending"
 };

 const isJustCompleted = justCompletedIds.has(download.id);
 const isCompleted = !download.isBulk && download.status === "completed"&& download.downloadUrl;
 const isBulkAllDone = download.isBulk && download.items?.length > 0 &&
 download.items.every((i: any) => i.status === "completed"|| i.status === "failed"|| i.status === "refunded");
 const bulkReadyCount = download.isBulk ? (download.items?.filter((i: any) => i.status === "completed")?.length ?? 0) : 0;

 // Completed rows get a fully different layout — prominent download button
 if (isCompleted) {
 return (
 <div
 key={download.id}
 className={`py-4 px-4 -mx-4 rounded-2xl transition-all duration-500 ${
 isJustCompleted
 ?"bg-green-500/10 border border-green-500/30 duration-500"
 : "border border-transparent hover:border-border"
 }`}
 >
 <div className= "flex items-center justify-between gap-3 mb-3">
 <div className= "flex items-center gap-2.5 min-w-0">
 <span className= "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
 <svg className= "w-3.5 h-3.5"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M5 13l4 4L19 7"/>
 </svg>
 </span>
 <div className= "min-w-0">
 <p className= "text-sm font-bold text-foreground truncate">{getDisplayName(download.providerSlug)}</p>
 <p className= "text-xs text-muted-foreground">{new Date(download.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"})}</p>
 </div>
 </div>
 <Button size= "sm"variant= "outline"asChild className= "h-7 rounded-lg text-xs px-2.5 border-border shrink-0 opacity-60 hover:opacity-100">
 <Link to={routes.DownloadDetailRoute.build({ params: { id: download.id } }) as any}>Details</Link>
 </Button>
 </div>
 <a
 href={`https://stockmart-dl.dilshantharakagunasekara.workers.dev/file/${download.id}?token=${download.downloadToken}`}
 target= "_blank"
 rel= "noopener noreferrer"
 className= "flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white font-extrabold text-sm transition-all shadow-md shadow-green-500/20"
 >
 <svg className= "w-4 h-4"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
 </svg>
 Save File to Computer
 </a>
 </div>
 );
 }

 // Bulk batch all done → prominent"files ready"UI
 if (isBulkAllDone && bulkReadyCount > 0) {
 return (
 <div
 key={download.id}
 className={`py-4 px-4 -mx-4 rounded-2xl transition-all duration-500 ${
 isJustCompleted
 ?"bg-green-500/10 border border-green-500/30 duration-500"
 : "border border-transparent hover:border-border"
 }`}
 >
 <div className= "flex items-center gap-2.5 mb-3 min-w-0">
 <span className= "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
 <svg className= "w-3.5 h-3.5"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M5 13l4 4L19 7"/>
 </svg>
 </span>
 <div className= "min-w-0 flex-1">
 <p className= "text-sm font-bold text-foreground">
 Bulk Batch — {bulkReadyCount} of {download.items.length} files ready
 </p>
 <p className= "text-xs text-muted-foreground">{new Date(download.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"})}</p>
 </div>
 </div>
 <Link
 to={routes.DownloadDetailRoute.build({ params: { id: download.id } }) as any}
 className= "flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white font-extrabold text-sm transition-all shadow-md shadow-green-500/20"
 >
 <svg className= "w-4 h-4"fill= "none"stroke= "currentColor"viewBox= "0 0 24 24">
 <path strokeLinecap= "round"strokeLinejoin= "round"strokeWidth={2.5} d= "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
 </svg>
 Open Batch — Save All Files
 </Link>
 </div>
 );
 }

 return (
 <div
 key={download.id}
 className= "flex items-center gap-4 py-4 group"
 >
 <div className= "flex-1 min-w-0">
 <p className= "text-sm font-bold text-foreground truncate">
 {download.isBulk ?"Bulk Batch": getDisplayName(download.providerSlug)}
 {download.isBulk && (
 <span className= "ml-2 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
 {download.items.length} files
 </span>
 )}
 </p>
 <p className= "text-xs text-muted-foreground mt-0.5">
 {new Date(download.createdAt).toLocaleDateString("en-GB", {
 day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
 })}
 </p>
 </div>
 <span
 key={statusInfo.text}
 className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full transition-all duration-300 ${statusInfo.colorClass}`}
 >
 {statusInfo.isProcessing && (
 <svg className= "animate-spin -ml-0.5 mr-1 h-3 w-3"fill= "none"viewBox= "0 0 24 24">
 <circle className= "opacity-25"cx= "12"cy= "12"r= "10"stroke= "currentColor"strokeWidth= "4"></circle>
 <path className= "opacity-75"fill= "currentColor"d= "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
 </svg>
 )}
 {statusInfo.text}
 </span>
 <span className= "text-xs text-muted-foreground font-bold tabular-nums text-right shrink-0 whitespace-nowrap">
 {download.creditsCharged ? `${download.creditsCharged.toFixed(1)} credits` : "—"}
 </span>
 <div className= "flex gap-2 shrink-0">
 <Button size= "sm"variant= "outline"asChild className= "h-8 rounded-lg text-xs font-semibold px-3 border-border opacity-50 hover:opacity-100 transition-opacity">
 <Link to={routes.DownloadDetailRoute.build({ params: { id: download.id } }) as any}>
 Details
 </Link>
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </div>

 </div>
 </div>
 );
}
