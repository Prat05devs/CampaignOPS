import { AuthShell } from "../../features/auth/auth-shell";
import { SignupForm } from "../../features/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      footerHref="/login"
      footerLabel="Sign in"
      footerText="Already have an account?"
      subtitle="Create the first admin account and workspace."
      title="Create account"
    >
      <SignupForm />
    </AuthShell>
  );
}

