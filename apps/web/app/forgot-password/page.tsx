import { AuthShell } from "../../features/auth/auth-shell";
import { ForgotPasswordForm } from "../../features/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      footerHref="/login"
      footerLabel="Sign in"
      footerText="Remembered your password?"
      subtitle="Request a password reset link for your CampaignOps account."
      title="Reset access"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
