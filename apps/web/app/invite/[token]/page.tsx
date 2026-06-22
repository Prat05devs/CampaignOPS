import { AuthShell } from "../../../features/auth/auth-shell";
import { InviteAcceptanceForm } from "../../../features/auth/invite-acceptance-form";

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  return (
    <AuthShell
      footerHref="/login"
      footerLabel="Sign in"
      footerText="Already joined?"
      subtitle="Create your account inside the workspace you were invited to."
      title="Accept invitation"
    >
      <InviteAcceptanceForm inviteToken={token} />
    </AuthShell>
  );
}
