import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { AuthPageLayout } from "./AuthPageLayout";
import { useRedirectIfLoggedIn } from "./hooks/useRedirectIfLoggedIn";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/components/ui/select";

// @ts-ignore — signup is public API, types update after wasp build
import { signup } from "wasp/client/auth";

const COUNTRIES = [
  { code: "LK", dial: "+94",  flag: "🇱🇰", name: "Sri Lanka" },
  { code: "IN", dial: "+91",  flag: "🇮🇳", name: "India" },
  { code: "US", dial: "+1",   flag: "🇺🇸", name: "United States" },
  { code: "GB", dial: "+44",  flag: "🇬🇧", name: "United Kingdom" },
  { code: "AU", dial: "+61",  flag: "🇦🇺", name: "Australia" },
  { code: "CA", dial: "+1",   flag: "🇨🇦", name: "Canada" },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "SG", dial: "+65",  flag: "🇸🇬", name: "Singapore" },
  { code: "MY", dial: "+60",  flag: "🇲🇾", name: "Malaysia" },
  { code: "BD", dial: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "PK", dial: "+92",  flag: "🇵🇰", name: "Pakistan" },
  { code: "NP", dial: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "MV", dial: "+960", flag: "🇲🇻", name: "Maldives" },
  { code: "DE", dial: "+49",  flag: "🇩🇪", name: "Germany" },
  { code: "FR", dial: "+33",  flag: "🇫🇷", name: "France" },
  { code: "IT", dial: "+39",  flag: "🇮🇹", name: "Italy" },
  { code: "NL", dial: "+31",  flag: "🇳🇱", name: "Netherlands" },
  { code: "SE", dial: "+46",  flag: "🇸🇪", name: "Sweden" },
  { code: "NO", dial: "+47",  flag: "🇳🇴", name: "Norway" },
  { code: "CH", dial: "+41",  flag: "🇨🇭", name: "Switzerland" },
  { code: "JP", dial: "+81",  flag: "🇯🇵", name: "Japan" },
  { code: "KR", dial: "+82",  flag: "🇰🇷", name: "South Korea" },
  { code: "CN", dial: "+86",  flag: "🇨🇳", name: "China" },
  { code: "SA", dial: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "QA", dial: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "KW", dial: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "BH", dial: "+973", flag: "🇧🇭", name: "Bahrain" },
  { code: "OM", dial: "+968", flag: "🇴🇲", name: "Oman" },
  { code: "ZA", dial: "+27",  flag: "🇿🇦", name: "South Africa" },
  { code: "NG", dial: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "NZ", dial: "+64",  flag: "🇳🇿", name: "New Zealand" },
  { code: "BR", dial: "+55",  flag: "🇧🇷", name: "Brazil" },
  { code: "MX", dial: "+52",  flag: "🇲🇽", name: "Mexico" },
  { code: "PH", dial: "+63",  flag: "🇵🇭", name: "Philippines" },
  { code: "ID", dial: "+62",  flag: "🇮🇩", name: "Indonesia" },
  { code: "TH", dial: "+66",  flag: "🇹🇭", name: "Thailand" },
  { code: "VN", dial: "+84",  flag: "🇻🇳", name: "Vietnam" },
];

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

  const [dialCode, setDialCode] = useState("+94");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const selectedCountry = COUNTRIES.find((c) => c.dial === dialCode) ?? COUNTRIES[0];

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const phone = values.localPhone.trim()
        ? `${dialCode}${values.localPhone.replace(/\s/g, "")}`
        : null;
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
      subheading="Create your account — 2 free credits after approval"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium text-foreground">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Dilshan Gunasakera"
            autoComplete="name"
            className="rounded-xl h-11"
            {...register("name", {
              required: "Full name is required",
              minLength: { value: 2, message: "Name must be at least 2 characters" },
            })}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Phone Number */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">
            Phone Number{" "}
            <span className="text-muted-foreground font-normal text-xs">(optional)</span>
          </Label>
          <div className="flex gap-2">
            <Select value={dialCode} onValueChange={setDialCode}>
              <SelectTrigger className="w-[112px] rounded-xl h-11 flex-shrink-0">
                <SelectValue>
                  <span className="text-base leading-none">{selectedCountry.flag}</span>
                  <span className="text-sm text-muted-foreground ml-1">{dialCode}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {COUNTRIES.map((c) => (
                  <SelectItem key={`${c.code}-${c.dial}`} value={c.dial}>
                    <span className="text-base mr-2">{c.flag}</span>
                    <span className="text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground ml-1">{c.dial}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="tel"
              placeholder="771 234 567"
              autoComplete="tel"
              className="rounded-xl h-11 flex-1 min-w-0"
              {...register("localPhone")}
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            E-mail
          </Label>
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
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </Label>
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
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
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
          {loading ? "Creating account…" : "Sign up"}
        </Button>
      </form>

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
