"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BrandLogo } from "../../components/brand-logo";
import { Button } from "../../components/ui/button";
import { fileToAvatarDataUrl } from "../../lib/avatar-utils";
import { acceptInvitation, acceptInvitationWithCurrentUser, getInvitationPreview } from "../../lib/auth-api";
import { useAuthStore } from "../../stores/auth-store";

const inviteSignupSchema = z.object({
  name: z.string().min(2),
  password: z.string().min(8),
  phone: z.string().optional()
});

type InviteSignupInput = z.infer<typeof inviteSignupSchema>;

const authInputClass =
  "h-12 w-full rounded-full border border-[#D8D3C2] bg-white px-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15 disabled:bg-[#F5F2E8] disabled:text-muted-foreground";
const authButtonClass = "h-12 w-full rounded-full bg-[#0F3D28] text-sm font-semibold text-white hover:bg-[#0B2F1F]";

export function InviteAcceptanceForm({ inviteToken }: { inviteToken: string }) {
  const router = useRouter();
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAcceptingCurrentUser, setIsAcceptingCurrentUser] = useState(false);
  const { hasHydrated, setSession, tokens, user } = useAuthStore();
  const invitationQuery = useQuery({
    queryKey: ["invitation-preview", inviteToken],
    queryFn: () => getInvitationPreview(inviteToken)
  });
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<InviteSignupInput>({
    resolver: zodResolver(inviteSignupSchema),
    defaultValues: {
      name: "",
      password: "",
      phone: ""
    }
  });

  async function onSubmit(values: InviteSignupInput) {
    setError(null);

    try {
      const response = await acceptInvitation(inviteToken, {
        ...values,
        avatarUrl: avatarUrl ?? undefined,
        phone: values.phone || undefined
      });
      setSession({
        user: response.user,
        organization: response.organization,
        activeOrganizationId: response.activeOrganizationId,
        memberships: response.memberships,
        role: response.role,
        tokens: response.tokens
      });
      router.replace("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to accept invitation.");
    }
  }

  async function acceptWithCurrentAccount() {
    if (!tokens?.accessToken) {
      setError("Sign in before accepting this invite.");
      return;
    }

    setError(null);
    setIsAcceptingCurrentUser(true);

    try {
      const response = await acceptInvitationWithCurrentUser(inviteToken, tokens.accessToken);
      setSession({
        user: response.user,
        organization: response.organization,
        activeOrganizationId: response.activeOrganizationId,
        memberships: response.memberships,
        role: response.role,
        tokens: response.tokens
      });
      router.replace("/dashboard");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to accept invitation.");
    } finally {
      setIsAcceptingCurrentUser(false);
    }
  }

  async function handleAvatarChange(file?: File) {
    setAvatarError(null);

    if (!file) {
      return;
    }

    try {
      setAvatarUrl(await fileToAvatarDataUrl(file));
    } catch (caughtError) {
      setAvatarError(caughtError instanceof Error ? caughtError.message : "Unable to use this image.");
    }
  }

  if (invitationQuery.isLoading) {
    return <p className="rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm text-muted-foreground">Loading invitation...</p>;
  }

  if (invitationQuery.isError) {
    return (
      <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {invitationQuery.error.message}
      </p>
    );
  }

  const invitation = invitationQuery.data;

  if (!invitation) {
    return <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">Invitation not found.</p>;
  }

  const isPending = invitation.status === "PENDING";
  const isSignedIn = hasHydrated && Boolean(tokens?.accessToken && user);
  const inviteMatchesSession = user?.email.toLowerCase() === invitation.email.toLowerCase();

  if (isSignedIn) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-campaign-mist bg-campaign-cream/60 p-3">
          <p className="text-sm font-semibold">{invitation.organization.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Invited as {roleLabel(invitation.role)} by {invitation.invitedBy.name}
          </p>
        </div>

        {!isPending ? (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            This invitation is {invitation.status.toLowerCase()}.
          </p>
        ) : null}

        {!inviteMatchesSession ? (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            This invite is for {invitation.email}. You are signed in as {user?.email}.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          className={authButtonClass}
          disabled={!isPending || !inviteMatchesSession || isAcceptingCurrentUser}
          onClick={() => void acceptWithCurrentAccount()}
          type="button"
        >
          {isAcceptingCurrentUser ? "Joining workspace..." : "Accept with current account"}
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-[24px] border border-[#D8D3C2] bg-white/70 p-4">
        <p className="text-sm font-semibold">{invitation.organization.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Invited as {roleLabel(invitation.role)} by {invitation.invitedBy.name}
        </p>
      </div>

      {!isPending ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          This invitation is {invitation.status.toLowerCase()}.
        </p>
      ) : null}

      <div className="flex items-center gap-4 rounded-[24px] border border-[#D8D3C2] bg-white/85 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-campaign-mist text-sm font-semibold text-campaign-ink">
          {avatarUrl ? <img alt="" className="h-full w-full object-cover" src={avatarUrl} /> : <BrandLogo className="h-16 w-16 rounded-full" />}
        </div>
        <div className="min-w-0 flex-1">
          <label className="inline-flex cursor-pointer items-center rounded-full border border-[#D8D3C2] bg-white px-4 py-2 text-sm font-semibold transition hover:bg-[#F5F2E8]">
            Upload profile image
            <input
              accept="image/*"
              className="sr-only"
              disabled={!isPending}
              onChange={(event) => void handleAvatarChange(event.target.files?.[0])}
              type="file"
            />
          </label>
          <p className="mt-1 text-xs text-muted-foreground">Optional. Square profile images look best.</p>
          {avatarError ? <p className="mt-1 text-xs text-destructive">{avatarError}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="invite-email">
          Email
        </label>
        <input
          className={authInputClass}
          disabled
          id="invite-email"
          value={invitation.email}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="name">
          Name
        </label>
        <input
          className={authInputClass}
          disabled={!isPending}
          id="name"
          {...register("name")}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="phone">
          Phone
        </label>
        <input
          className={authInputClass}
          disabled={!isPending}
          id="phone"
          {...register("phone")}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          className={authInputClass}
          disabled={!isPending}
          id="password"
          type="password"
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      {error && <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Button className={authButtonClass} disabled={isSubmitting || !isPending} type="submit">
        {isSubmitting ? "Joining workspace..." : "Join workspace"}
      </Button>
    </form>
  );
}

function roleLabel(value: "ADMIN" | "MANAGER" | "MEMBER") {
  if (value === "ADMIN") {
    return "Workspace Admin";
  }

  if (value === "MANAGER") {
    return "Operations Manager";
  }

  return "Team Member";
}
