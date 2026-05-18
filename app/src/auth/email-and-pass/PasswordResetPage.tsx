import { ResetPasswordForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "../AuthPageLayout";

export function PasswordResetPage() {
  return (
    <AuthPageLayout
      heading="Reset your password"
      subheading="Enter your new password below"
    >
      <ResetPasswordForm
        appearance={{
          colors: {
            brand: "hsl(261, 91%, 55%)",
            brandAccent: "hsl(261, 91%, 42%)",
            submitButtonText: "#ffffff",
          },
        }}
      />
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground text-center">
          Password reset?{" "}
          <WaspRouterLink to={routes.LoginRoute.to} className="font-bold text-primary hover:underline">
            Go to login
          </WaspRouterLink>
        </p>
      </div>
    </AuthPageLayout>
  );
}
