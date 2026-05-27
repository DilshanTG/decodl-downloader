import { Link } from "wasp/client/router";
import { routes } from "wasp/client/router";
import { useQuery } from "wasp/client/operations";
import { getMyCreditBalance } from "wasp/client/operations";
import type { User } from "wasp/entities";
import { Separator } from "../client/components/ui/separator";
import { Button } from "../client/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../client/components/ui/card";

export default function AccountPage({ user }: { user: User }) {
  const { data: balanceData, isLoading: balanceLoading } = useQuery(
    getMyCreditBalance,
    undefined,
    { refetchInterval: 15000 }
  );

  const credits = balanceData?.credits ?? (user as any).credits ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-extrabold tracking-tight mb-8 pt-6">Account Settings</h1>

        {/* Credit balance card */}
        <Card className="border-border shadow-md p-6 mb-6 bg-card" variant="bento">
          <CardContent className="p-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Credit Balance
              </span>
              {balanceLoading ? (
                <div className="animate-pulse h-12 w-24 bg-muted rounded mt-2"></div>
              ) : (
                <div className="text-5xl font-black text-foreground mt-1 tabular-nums">
                  {typeof credits === "number" ? credits.toFixed(1) : "—"}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">credits available</p>
            </div>
            <Button size="default" variant="default" asChild className="rounded-xl font-bold shadow-sm self-start sm:self-auto">
              <Link to={routes.PricingPageRoute.to}>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Buy More Credits
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Account info */}
        <Card className="border-border shadow-md overflow-hidden mb-6 bg-card" variant="bento">
          <CardHeader className="px-6 py-4">
            <CardTitle className="text-base font-bold">Account Information</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-0 divide-y divide-border">
            {!!(user as any).name && (
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground font-semibold">Full Name</dt>
                  <dd className="text-sm text-foreground font-bold sm:col-span-2">{(user as any).name}</dd>
                </div>
              </div>
            )}
            {!!user.email && (
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground font-semibold">Email address</dt>
                  <dd className="text-sm text-foreground font-bold sm:col-span-2">{user.email}</dd>
                </div>
              </div>
            )}
            {!!(user as any).phone && (
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground font-semibold">Phone Number</dt>
                  <dd className="text-sm text-foreground font-bold sm:col-span-2">{(user as any).phone}</dd>
                </div>
              </div>
            )}
            {(user as any).lifetimeCreditsSpent !== undefined && (
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground font-semibold">Credits used (all time)</dt>
                  <dd className="text-sm text-foreground font-bold sm:col-span-2">
                    {typeof (user as any).lifetimeCreditsSpent === "number"
                      ? (user as any).lifetimeCreditsSpent.toFixed(1)
                      : "—"}
                  </dd>
                </div>
              </div>
            )}
            {(user as any).lifetimeSpentLKR !== undefined && (
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                  <dt className="text-sm text-muted-foreground font-semibold">Total spent (LKR)</dt>
                  <dd className="text-sm text-foreground font-bold sm:col-span-2">
                    Rs. {((user as any).lifetimeSpentLKR / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </dd>
                </div>
              </div>
            )}
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
                <dt className="text-sm text-muted-foreground font-semibold">Welcome bonus</dt>
                <dd className="text-sm sm:col-span-2 font-bold">
                  {(user as any).freeCreditsClaimed ? (
                    <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      2 credits granted
                    </span>
                  ) : (
                    <span className="text-amber-500 font-semibold">Pending admin approval</span>
                  )}
                </dd>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit History link */}
        <Card className="border-border shadow-md overflow-hidden bg-card" variant="bento">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold mb-1">Credit History</CardTitle>
              <p className="text-sm text-muted-foreground">View all top-ups, downloads, refunds and adjustments.</p>
            </div>
            <Button variant="outline" asChild className="rounded-xl font-semibold border-border shrink-0">
              <Link to={routes.CreditsRoute.to}>
                View Credit History →
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
