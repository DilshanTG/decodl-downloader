import { LoginForm } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";

export default function Login() {
  useRedirectIfLoggedIn();

  return (
    <AuthPageLayout
      heading="Welcome back"
      subheading="Sign in to your StockMart account"
    >
      <LoginForm
        appearance={{
          colors: {
            brand: "hsl(261, 91%, 55%)",
            brandAccent: "hsl(261, 91%, 42%)",
            submitButtonText: "#ffffff",
          },
        }}
      />
      <div className="mt-6 space-y-3 border-t border-border pt-5">
        <p className="text-sm text-muted-foreground text-center">
          Don't have an account?{" "}
          <WaspRouterLink
            to={routes.SignupRoute.to}
            className="font-bold text-primary hover:underline"
          >
            Sign up free
          </WaspRouterLink>
        </p>
        <p className="text-sm text-muted-foreground text-center">
          Forgot your password?{" "}
          <WaspRouterLink
            to={routes.RequestPasswordResetRoute.to}
            className="font-bold text-primary hover:underline"
          >
            Reset it
          </WaspRouterLink>
        </p>
      </div>
    </AuthPageLayout>
  );
}
