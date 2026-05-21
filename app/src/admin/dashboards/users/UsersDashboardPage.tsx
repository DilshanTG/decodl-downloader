import { useState } from "react";
import { useAuth } from "wasp/client/auth";
import {
  getPaginatedUsers,
  updateIsUserAdminById,
  adminAdjustUserCredits,
  adminSendPasswordReset,
  useQuery,
} from "wasp/client/operations";
import { type User } from "wasp/entities";
import { type AuthUser } from "wasp/auth";
import DefaultLayout from "../../layout/DefaultLayout";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../client/components/ui/select";
import { Switch } from "../../../client/components/ui/switch";
import useDebounce from "../../../client/hooks/useDebounce";
import { useToast } from "../../../client/hooks/use-toast";

function AdminSwitch({ id, isAdmin }: Pick<User, "id" | "isAdmin">) {
  const { data: currentUser } = useAuth();
  const isCurrentUser = currentUser?.id === id;
  return (
    <Switch
      checked={isAdmin}
      onCheckedChange={(value) => updateIsUserAdminById({ id, isAdmin: value })}
      disabled={isCurrentUser}
    />
  );
}

function CreditModal({
  user,
  onClose,
  onDone,
}: {
  user: { id: string; email?: string | null; credits: number };
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed === 0) {
      toast({ title: "Invalid amount", description: "Enter a non-zero number (negative to deduct).", variant: "destructive" });
      return;
    }
    if (!reason.trim()) {
      toast({ title: "Reason required", description: "Please enter a reason for this adjustment.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await adminAdjustUserCredits({ userId: user.id, amount: parsed, reason: reason.trim() });
      toast({ title: "Credits adjusted", description: `New balance: ${result.newBalance.toFixed(2)} credits` });
      onDone();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message ?? "Failed to adjust credits.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-foreground mb-1">Adjust Credits</h2>
        <p className="text-xs text-muted-foreground mb-5">User: <span className="font-bold text-foreground">{user.email}</span> · Current: <span className="font-bold text-primary">{user.credits.toFixed(2)} cr</span></p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Amount (use negative to deduct)
            </Label>
            <Input
              type="number"
              step="0.1"
              placeholder="e.g. 10 or -5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Reason</Label>
            <Input
              type="text"
              placeholder="e.g. Customer support refund"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-xl"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1 rounded-xl font-bold">
              {loading ? "Saving..." : "Apply Adjustment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const UsersAdminPage = ({ user }: { user: AuthUser }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [emailFilter, setEmailFilter] = useState<string | undefined>(undefined);
  const [isAdminFilter, setIsAdminFilter] = useState<boolean | undefined>(undefined);
  const [hasPaidFilter, setHasPaidFilter] = useState<boolean | undefined>(undefined);
  const [creditModalUser, setCreditModalUser] = useState<any | null>(null);

  const debouncedEmailFilter = useDebounce(emailFilter, 300);
  const skipPages = currentPage - 1;

  const { data, isLoading, refetch } = useQuery(getPaginatedUsers, {
    skipPages,
    filter: {
      ...(debouncedEmailFilter && { emailContains: debouncedEmailFilter }),
      ...(isAdminFilter !== undefined && { isAdmin: isAdminFilter }),
      ...(hasPaidFilter !== undefined && { hasPaid: hasPaidFilter }),
    },
  });

  return (
    <DefaultLayout user={user}>
      {creditModalUser && (
        <CreditModal
          user={creditModalUser}
          onClose={() => setCreditModalUser(null)}
          onDone={() => { setCreditModalUser(null); refetch(); }}
        />
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage accounts, credits, and admin access</p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Filters</p>
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              type="text"
              placeholder="Search by email..."
              className="rounded-xl max-w-xs"
              onChange={(e) => {
                setCurrentPage(1);
                const v = e.currentTarget.value;
                setEmailFilter(v === "" ? undefined : v);
              }}
            />
            <Select onValueChange={(v) => { setCurrentPage(1); setHasPaidFilter(v === "all" ? undefined : v === "true"); }}>
              <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Has Paid" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="true">Has Paid</SelectItem>
                <SelectItem value="false">Free Only</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={(v) => { setCurrentPage(1); setIsAdminFilter(v === "both" ? undefined : v === "true"); }}>
              <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="both">All Roles</SelectItem>
                <SelectItem value="true">Admins</SelectItem>
                <SelectItem value="false">Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">User</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Credits</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Spent (LKR)</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Admin</th>
                  <th className="text-left py-3.5 px-5 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5].map((j) => (
                        <td key={j} className="py-4 px-5"><div className="h-5 bg-muted rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : !data?.users?.length ? (
                  <tr><td colSpan={5} className="py-16 text-center text-muted-foreground text-sm font-medium">No users found.</td></tr>
                ) : (
                  data.users.map((u) => (
                    <tr key={u.id} className="hover:bg-accent/20 transition-colors group">
                      <td className="py-4 px-5">
                        <p className="text-sm font-bold text-foreground">{u.email ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.username ?? "no username"}</p>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-sm font-extrabold text-primary tabular-nums">{(u.credits ?? 0).toFixed(2)}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-sm font-bold text-muted-foreground tabular-nums">Rs. {((u.lifetimeSpentLKR ?? 0) / 100).toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-5">
                        <AdminSwitch {...u} />
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs font-bold px-3 border-border"
                            onClick={() => setCreditModalUser(u)}
                          >
                            Adjust Credits
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs font-bold px-3 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                            onClick={async () => {
                              try {
                                await adminSendPasswordReset({ userId: u.id });
                                alert(`Password reset email sent to ${u.email}`);
                              } catch (e: any) {
                                alert(`Failed: ${e.message}`);
                              }
                            }}
                          >
                            Reset Password
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 rounded-lg text-xs font-semibold px-3"
                            asChild
                          >
                            <a href={`/admin/downloads?userEmail=${encodeURIComponent(u.email ?? "")}`}>Downloads</a>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(data?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-accent/10">
              <p className="text-xs text-muted-foreground font-semibold">Page {currentPage} of {data?.totalPages}</p>
              <div className="flex gap-2">
                <Button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} variant="outline" size="sm" className="rounded-xl text-xs h-8 border-border">← Prev</Button>
                <Button onClick={() => setCurrentPage((p) => Math.min(data?.totalPages ?? 1, p + 1))} disabled={currentPage >= (data?.totalPages ?? 1)} variant="outline" size="sm" className="rounded-xl text-xs h-8 border-border">Next →</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default UsersAdminPage;
