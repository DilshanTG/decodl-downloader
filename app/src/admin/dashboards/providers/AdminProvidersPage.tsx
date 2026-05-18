import { useState } from "react";
import { useQuery, adminGetProviderStats, adminUpdateProviderPricing } from "wasp/client/operations";
import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../layout/DefaultLayout";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Switch } from "../../../client/components/ui/switch";
import { useToast } from "../../../client/hooks/use-toast";

function EditModal({
  provider,
  onClose,
  onDone,
}: {
  provider: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [creditCost, setCreditCost] = useState(String(provider.creditCost));
  const [displayName, setDisplayName] = useState(provider.displayName);
  const [isActive, setIsActive] = useState(provider.isActive);
  const [sortOrder, setSortOrder] = useState(String(provider.sortOrder));
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCost = parseFloat(creditCost);
    if (isNaN(parsedCost) || parsedCost < 0) {
      toast({ title: "Invalid cost", description: "Enter a valid positive number.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await adminUpdateProviderPricing({
        id: provider.id,
        creditCost: parsedCost,
        displayName,
        isActive,
        sortOrder: parseInt(sortOrder) || 0,
      });
      toast({ title: "Provider updated", description: `${displayName} saved successfully.` });
      onDone();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to update.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-foreground mb-1">Edit Provider</h2>
        <p className="text-xs text-muted-foreground mb-5 font-mono">{provider.slug} · {provider.variant}</p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Display Name</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="rounded-xl" required />
          </div>
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Credit Cost</Label>
            <Input type="number" step="0.1" min="0" value={creditCost} onChange={e => setCreditCost(e.target.value)} className="rounded-xl" required />
          </div>
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Sort Order</Label>
            <Input type="number" min="0" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="rounded-xl" />
          </div>
          <div className="flex items-center justify-between py-2 border border-border rounded-xl px-4">
            <span className="text-sm font-bold text-foreground">Active</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 rounded-xl font-bold">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProviderCard({ provider, onEdit }: { provider: any; onEdit: () => void }) {
  const failRate = provider.stats.total > 0
    ? ((provider.stats.failed / provider.stats.total) * 100).toFixed(1)
    : "0.0";

  return (
    <div className={`bg-card border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md ${provider.isActive ? "border-border" : "border-border/40 opacity-60"}`}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-extrabold text-foreground truncate">{provider.displayName}</h3>
            {provider.variant !== "normal" && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase">{provider.variant}</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{provider.slug}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${provider.isActive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
            {provider.isActive ? "Active" : "Inactive"}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-full capitalize">{provider.category}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center bg-muted/50 rounded-xl py-2.5">
          <p className="text-lg font-black text-foreground tabular-nums">{provider.creditCost.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Credits</p>
        </div>
        <div className="text-center bg-muted/50 rounded-xl py-2.5">
          <p className="text-lg font-black text-foreground tabular-nums">{provider.stats.total}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Downloads</p>
        </div>
        <div className="text-center bg-muted/50 rounded-xl py-2.5">
          <p className={`text-lg font-black tabular-nums ${parseFloat(failRate) > 10 ? "text-red-500" : "text-foreground"}`}>{failRate}%</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Fail Rate</p>
        </div>
      </div>

      {/* Credits consumed */}
      <p className="text-xs text-muted-foreground mb-4">
        <span className="font-bold text-foreground">{provider.stats.credits.toFixed(1)}</span> total credits consumed
      </p>

      <Button onClick={onEdit} variant="outline" size="sm" className="w-full rounded-xl text-xs font-bold h-8 border-border">
        Edit Provider
      </Button>
    </div>
  );
}

export default function AdminProvidersPage({ user }: { user: AuthUser }) {
  const { data: providers, isLoading, refetch } = useQuery(adminGetProviderStats, undefined, { refetchInterval: 30000 });
  const [editingProvider, setEditingProvider] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  const filtered = (providers ?? []).filter((p: any) =>
    p.displayName.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = (providers ?? []).filter((p: any) => p.isActive).length;
  const totalDownloads = (providers ?? []).reduce((acc: number, p: any) => acc + p.stats.total, 0);

  return (
    <DefaultLayout user={user}>
      {editingProvider && (
        <EditModal
          provider={editingProvider}
          onClose={() => setEditingProvider(null)}
          onDone={() => { setEditingProvider(null); refetch(); }}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground">Provider Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage pricing, status, and stats per provider</p>
          </div>
          <div className="flex gap-3 text-right">
            <div className="bg-card border border-border rounded-xl px-4 py-2 text-center shadow-sm">
              <p className="text-xl font-black text-foreground">{activeCount}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Active</p>
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-2 text-center shadow-sm">
              <p className="text-xl font-black text-foreground">{totalDownloads.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Total DLs</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Search providers..."
          className="rounded-xl max-w-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-52 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm font-medium">No providers found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filtered.map((p: any) => (
              <ProviderCard key={p.id} provider={p} onEdit={() => setEditingProvider(p)} />
            ))}
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}
