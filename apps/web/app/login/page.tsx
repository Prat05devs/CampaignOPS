import { AuthShell } from "../../features/auth/auth-shell";
import { LoginForm } from "../../features/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      footerHref="/signup"
      footerLabel="Create account"
      footerText="New workspace?"
      subtitle="Sign in to your CampaignOps workspace."
      title="Sign in"
    >
      <LoginForm />
    </AuthShell>
  );
}

