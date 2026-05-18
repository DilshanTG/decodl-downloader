import { ForgotPasswordForm } from "wasp/client/auth";
import { AuthPageLayout } from "../AuthPageLayout";

export function RequestPasswordResetPage() {
  return (
    <AuthPageLayout
      heading="Forgot your password?"
      subheading="Enter your email and we'll send a reset link"
    >
      <ForgotPasswordForm
        appearance={{
          colors: {
            brand: "hsl(261, 91%, 55%)",
            brandAccent: "hsl(261, 91%, 42%)",
            submitButtonText: "#ffffff",
          },
        }}
      />
    </AuthPageLayout>
  );
}
