import { AuthShell } from "../../features/auth/auth-shell";
import { ResetPasswordForm } from "../../features/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      footerHref="/login"
      footerLabel="Sign in"
      footerText="Already updated?"
      subtitle="Choose a new password for your CampaignOps account."
      title="Create new password"
    >
      <ResetPasswordForm token={params.token} />
    </AuthShell>
  );
}
