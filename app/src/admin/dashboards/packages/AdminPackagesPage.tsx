import { useState } from "react";
import {
  useQuery,
  adminGetCreditPackages,
  adminCreateCreditPackage,
  adminUpdateCreditPackage,
  adminDeleteCreditPackage,
} from "wasp/client/operations";
import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../layout/DefaultLayout";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Switch } from "../../../client/components/ui/switch";
import { useToast } from "../../../client/hooks/use-toast";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function perCredit(pkg: any) {
  return pkg.credits > 0 ? Math.round(pkg.priceLKR / pkg.credits) : 0;
}

// ─── Package Form Modal ───────────────────────────────────────────────────────

function PackageModal({
  pkg,
  onClose,
  onDone,
}: {
  pkg: any | null; // null = create mode
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const isEdit = pkg !== null;

  const [packageId,   setPackageId]   = useState(pkg?.packageId   ?? "");
  const [name,        setName]        = useState(pkg?.name        ?? "");
  const [credits,     setCredits]     = useState(String(pkg?.credits  ?? ""));
  const [priceLKR,    setPriceLKR]    = useState(String(pkg?.priceLKR ?? ""));
  const [badge,       setBadge]       = useState(pkg?.badge       ?? "");
  const [description, setDescription] = useState(pkg?.description ?? "");
  const [isPopular,   setIsPopular]   = useState(pkg?.isPopular   ?? false);
  const [isActive,    setIsActive]    = useState(pkg?.isActive    ?? true);
  const [sortOrder,   setSortOrder]   = useState(String(pkg?.sortOrder ?? "0"));
  const [loading,     setLoading]     = useState(false);

  const parsedCredits  = parseFloat(credits);
  const parsedPrice    = parseInt(priceLKR, 10);
  const computedPerCr  = !isNaN(parsedCredits) && parsedCredits > 0 && !isNaN(parsedPrice)
    ? Math.round(parsedPrice / parsedCredits)
    : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(parsedCredits) || parsedCredits <= 0) {
      toast({ title: "Invalid credits", description: "Credits must be a positive number.", variant: "destructive" });
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast({ title: "Invalid price", description: "Price must be a positive integer.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await adminUpdateCreditPackage({
          id: pkg.id,
          name,
          credits: parsedCredits,
          priceLKR: parsedPrice,
          badge: badge || null,
          description: description || null,
          isPopular,
          isActive,
          sortOrder: parseInt(sortOrder) || 0,
        });
        toast({ title: "Package updated", description: `"${name}" saved.` });
      } else {
        await adminCreateCreditPackage({
          packageId,
          name,
          credits: parsedCredits,
          priceLKR: parsedPrice,
          badge: badge || undefined,
          description: description || undefined,
          isPopular,
          isActive,
          sortOrder: parseInt(sortOrder) || 0,
        });
        toast({ title: "Package created", description: `"${name}" added to the pricing page.` });
      }
      onDone();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to save.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-extrabold text-foreground mb-1">
          {isEdit ? "Edit Package" : "New Package"}
        </h2>
        <p className="text-xs text-muted-foreground mb-5">
          {isEdit ? `Editing "${pkg.packageId}"` : "Changes appear on the pricing page immediately."}
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Package ID — only on create */}
          {!isEdit && (
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Package ID <span className="text-muted-foreground/60 normal-case font-normal">(slug, e.g. "enterprise")</span>
              </Label>
              <Input
                value={packageId}
                onChange={e => setPackageId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="enterprise"
                className="rounded-xl font-mono"
                required
              />
            </div>
          )}

          {/* Name */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Display Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enterprise" className="rounded-xl" required />
          </div>

          {/* Credits + Price (side by side) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Credits</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={credits}
                onChange={e => setCredits(e.target.value)}
                placeholder="100"
                className="rounded-xl"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Price (LKR)</Label>
              <Input
                type="number"
                step="1"
                min="1"
                value={priceLKR}
                onChange={e => setPriceLKR(e.target.value)}
                placeholder="16000"
                className="rounded-xl"
                required
              />
            </div>
          </div>

          {/* Live computed preview */}
          {computedPerCr !== null && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Per-credit price</span>
              <span className="font-extrabold text-primary">Rs. {computedPerCr.toLocaleString()} / credit</span>
            </div>
          )}

          {/* Badge */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Badge <span className="text-muted-foreground/60 normal-case font-normal">(optional, e.g. "🔥 Best Value")</span>
            </Label>
            <Input value={badge} onChange={e => setBadge(e.target.value)} placeholder="🔥 Best Value" className="rounded-xl" />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Description <span className="text-muted-foreground/60 normal-case font-normal">(subtitle on card)</span>
            </Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Good for freelancers" className="rounded-xl" />
          </div>

          {/* Sort Order */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Sort Order</Label>
            <Input type="number" min="0" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="rounded-xl w-28" />
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2.5 border border-border rounded-xl px-4">
              <div>
                <span className="text-sm font-bold text-foreground">Active</span>
                <p className="text-[11px] text-muted-foreground">Visible on the pricing page</p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between py-2.5 border border-border rounded-xl px-4">
              <div>
                <span className="text-sm font-bold text-foreground">Popular / Featured</span>
                <p className="text-[11px] text-muted-foreground">Highlighted border + top bar on pricing card</p>
              </div>
              <Switch checked={isPopular} onCheckedChange={setIsPopular} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 rounded-xl font-bold">
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Package"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

function DeleteConfirmModal({
  pkg,
  onClose,
  onDone,
}: {
  pkg: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await adminDeleteCreditPackage({ id: pkg.id });
      toast({ title: "Package deleted", description: `"${pkg.name}" removed from pricing.` });
      onDone();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to delete.", variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-foreground mb-1">Delete Package?</h2>
        <p className="text-sm text-muted-foreground mb-5">
          This will permanently remove <strong className="text-foreground">"{pkg.name}"</strong> from the pricing page.
          Existing payments with this packageId are unaffected.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white border-0"
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Package Card ─────────────────────────────────────────────────────────────

function PackageCard({
  pkg,
  baseRate,
  onEdit,
  onDelete,
}: {
  pkg: any;
  baseRate: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pc = perCredit(pkg);
  const savings = Math.round(baseRate * pkg.credits - pkg.priceLKR);

  return (
    <div className={`bg-card border rounded-2xl p-5 shadow-sm transition-all hover:shadow-md flex flex-col gap-4 ${pkg.isActive ? "border-border" : "border-border/40 opacity-60"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-extrabold text-foreground">{pkg.name}</h3>
            {pkg.badge && (
              <span className="text-[10px] font-bold bg-gradient-to-r from-primary to-secondary text-primary-foreground px-2 py-0.5 rounded-full">{pkg.badge}</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{pkg.packageId}</p>
          {pkg.description && <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${pkg.isActive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
            {pkg.isActive ? "Active" : "Inactive"}
          </span>
          {pkg.isPopular && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">Popular</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center bg-muted/50 rounded-xl py-2.5">
          <p className="text-base font-black text-foreground tabular-nums">{pkg.credits % 1 === 0 ? pkg.credits : pkg.credits.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Credits</p>
        </div>
        <div className="text-center bg-muted/50 rounded-xl py-2.5">
          <p className="text-base font-black text-foreground tabular-nums">Rs.{Math.round(pkg.priceLKR / 1000)}k</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Price</p>
        </div>
        <div className="text-center bg-muted/50 rounded-xl py-2.5">
          <p className="text-base font-black text-foreground tabular-nums">{pc}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">/ Credit</p>
        </div>
      </div>

      {/* Margin hint */}
      <div className="text-xs text-muted-foreground space-y-0.5">
        <div className="flex justify-between">
          <span>Full price (Rs. {pkg.priceLKR.toLocaleString()})</span>
          {savings > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Save Rs. {savings.toLocaleString()}</span>}
        </div>
        <div className="flex justify-between">
          <span>Sort order</span>
          <span className="font-mono font-bold text-foreground">{pkg.sortOrder}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <Button onClick={onEdit} variant="outline" size="sm" className="flex-1 rounded-xl text-xs font-bold h-8">
          Edit
        </Button>
        <Button
          onClick={onDelete}
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-bold h-8 px-3 border-red-500/30 text-red-500 hover:bg-red-500/10"
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPackagesPage({ user }: { user: AuthUser }) {
  const { data: packages = [], isLoading, refetch } = useQuery(adminGetCreditPackages, undefined, { refetchInterval: 0 });
  const [editingPkg,  setEditingPkg]  = useState<any | null>(null); // non-null = edit, sentinel = new
  const [creatingPkg, setCreatingPkg] = useState(false);
  const [deletingPkg, setDeletingPkg] = useState<any | null>(null);

  const pkgList: any[] = packages as any[];
  const baseRate = pkgList.length > 0
    ? Math.max(...pkgList.map(perCredit))
    : 200;

  const activeCount   = pkgList.filter(p => p.isActive).length;
  const totalPackages = pkgList.length;

  const handleDone = () => {
    setEditingPkg(null);
    setCreatingPkg(false);
    setDeletingPkg(null);
    refetch();
  };

  return (
    <DefaultLayout user={user}>
      {(creatingPkg) && (
        <PackageModal pkg={null} onClose={() => setCreatingPkg(false)} onDone={handleDone} />
      )}
      {editingPkg && (
        <PackageModal pkg={editingPkg} onClose={() => setEditingPkg(null)} onDone={handleDone} />
      )}
      {deletingPkg && (
        <DeleteConfirmModal pkg={deletingPkg} onClose={() => setDeletingPkg(null)} onDone={handleDone} />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-foreground">Credit Packages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage pricing tiers shown on the public pricing page
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-card border border-border rounded-xl px-4 py-2 text-center shadow-sm">
              <p className="text-xl font-black text-foreground">{activeCount}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Active</p>
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-2 text-center shadow-sm">
              <p className="text-xl font-black text-foreground">{totalPackages}</p>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">Total</p>
            </div>
            <Button onClick={() => setCreatingPkg(true)} className="rounded-xl font-bold h-10 px-5 shadow-sm">
              + Add Package
            </Button>
          </div>
        </div>

        {/* Info strip */}
        <div className="rounded-xl bg-muted/40 border border-border p-3.5 text-xs text-muted-foreground flex items-start gap-3">
          <span className="text-base mt-0.5">💡</span>
          <span>
            Changes are live immediately — the pricing page caches packages for 5 minutes.
            <strong className="text-foreground"> "Popular"</strong> adds the highlighted border.
            <strong className="text-foreground"> Sort order</strong> controls left-to-right display order.
            Deleting a package does <strong className="text-foreground">not</strong> affect existing payments.
          </span>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : pkgList.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-muted-foreground font-medium">No packages yet.</p>
            <Button onClick={() => setCreatingPkg(true)} variant="outline" className="rounded-xl">
              Create your first package
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {pkgList.map((pkg: any) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                baseRate={baseRate}
                onEdit={() => setEditingPkg(pkg)}
                onDelete={() => setDeletingPkg(pkg)}
              />
            ))}
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}
