import { SignupForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export function Signup() {
  useRedirectIfLoggedIn();

  return (
    <AuthPageLayout
      heading="Create your account"
      subheading="Start with 2 free credits — no card required"
    >
      <SignupForm
        appearance={{
          colors: {
            brand: "hsl(261, 91%, 55%)",
            brandAccent: "hsl(261, 91%, 42%)",
            submitButtonText: "#ffffff",
          },
        }}
      />
      <div className="mt-6 border-t border-border pt-5">
        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <WaspRouterLink
            to={routes.LoginRoute.to}
            className="font-bold text-primary hover:underline"
          >
            Sign in
          </WaspRouterLink>
        </p>
      </div>
    </AuthPageLayout>
  );
}
