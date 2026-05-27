import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";

// @ts-ignore — signup is public API, types update after wasp build
import { signup } from "wasp/client/auth";

type FormValues = {
  name: string;
  localPhone: string;
  email: string;
  password: string;
};

export function Signup() {
  useRedirectIfLoggedIn();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const local = values.localPhone.replace(/\s|-/g, "");
      const phone = `+94${local}`;
      await (signup as any)({
        email: values.email,
        password: values.password,
        name: values.name,
        phone,
      });
      setDone(true);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthPageLayout heading="Check your inbox" subheading="We sent you a verification email">
        <div className="rounded-xl bg-primary/10 border border-primary/20 px-5 py-4 text-sm text-foreground text-center leading-relaxed">
          Click the link in the email to verify your account, then{" "}
          <WaspRouterLink to={routes.LoginRoute.to} className="font-bold text-primary hover:underline">
            sign in
          </WaspRouterLink>
          .
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      heading="Create your account"
      subheading="Verify your mobile to claim 2 free credits"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Dilshan Gunasekara"
            autoComplete="name"
            className="rounded-xl h-11"
            {...register("name", {
              required: "Full name is required",
              minLength: { value: 2, message: "Name must be at least 2 characters" },
            })}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Phone Number — Sri Lanka only */}
        <div className="space-y-1.5">
          <Label htmlFor="localPhone" className="text-sm font-medium text-foreground">
            Mobile Number
          </Label>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 h-11 px-3 rounded-xl border border-input bg-muted/40 text-sm text-muted-foreground flex-shrink-0 select-none">
              <span className="text-base">🇱🇰</span>
              <span>+94</span>
            </div>
            <Input
              id="localPhone"
              type="tel"
              placeholder="77 123 4567"
              autoComplete="tel"
              className="rounded-xl h-11 flex-1 min-w-0"
              {...register("localPhone", {
                required: "Mobile number is required",
                pattern: {
                  value: /^[0-9]{9}$/,
                  message: "Enter 9 digits after +94 (e.g. 771234567)",
                },
              })}
            />
          </div>
          <p className="text-xs text-muted-foreground">Sri Lanka numbers only. Used to verify and claim 2 free credits.</p>
          {errors.localPhone && <p className="text-xs text-destructive">{errors.localPhone.message}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className="rounded-xl h-11"
            {...register("email", {
              required: "Email is required",
              pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" },
            })}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            className="rounded-xl h-11"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "Password must be at least 8 characters" },
            })}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl font-bold text-base"
          style={{ background: "hsl(261, 91%, 55%)", color: "#fff" }}
        >
          {loading ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <WaspRouterLink to={routes.LoginRoute.to} className="font-bold text-primary hover:underline">
            Sign in
          </WaspRouterLink>
        </p>
      </div>
    </AuthPageLayout>
  );
}
