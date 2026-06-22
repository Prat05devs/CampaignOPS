"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Camera, Copy, LinkIcon, LogOut, MailPlus, Save, Trash2, UsersRound, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api-client";
import { fileToAvatarDataUrl } from "../../lib/avatar-utils";
import { logout, refreshSession } from "../../lib/auth-api";
import {
  createOrganizationInvitation,
  getOrganization,
  listOrganizationInvitations,
  listOrganizationMembers,
  revokeOrganizationInvitation,
  updateOrganization,
  type OrganizationInvitation,
  type OrganizationProfile
} from "../../lib/organizations-api";
import { updateUserProfile } from "../../lib/users-api";
import { useAuthStore } from "../../stores/auth-store";

export function ProfileShell() {
  const router = useRouter();
  const {
    activeOrganizationId,
    clearSession,
    hasHydrated,
    organization,
    role,
    setOrganization,
    setTokens,
    setUser,
    tokens,
    user
  } = useAuthStore();
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [designation, setDesignation] = useState(user?.designation ?? "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MANAGER" | "MEMBER">("MEMBER");
  const [name, setName] = useState(user?.name ?? "");
  const [orgCurrency, setOrgCurrency] = useState(organization?.defaultCurrency ?? "INR");
  const [orgImageError, setOrgImageError] = useState<string | null>(null);
  const [orgImageUrl, setOrgImageUrl] = useState<string | null>(organization?.profileImageUrl ?? null);
  const [orgName, setOrgName] = useState(organization?.name ?? "");
  const [orgTimezone, setOrgTimezone] = useState(organization?.timezone ?? "Asia/Kolkata");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasHydrated && !tokens?.accessToken) {
      router.replace("/login");
    }
  }, [hasHydrated, router, tokens?.accessToken]);

  useEffect(() => {
    setAvatarUrl(user?.avatarUrl ?? null);
    setDesignation(user?.designation ?? "");
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.avatarUrl, user?.designation, user?.name, user?.phone]);

  async function withSessionRefresh<TResponse>(request: (accessToken: string) => Promise<TResponse>) {
    if (!tokens?.accessToken) {
      throw new Error("Profile session is not available.");
    }

    try {
      return await request(tokens.accessToken);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || !tokens.refreshToken) {
        throw error;
      }

      const refreshedSession = await refreshSession(tokens.refreshToken);
      setTokens(refreshedSession.tokens);
      return request(refreshedSession.tokens.accessToken);
    }
  }

  const organizationQuery = useQuery({
    enabled: Boolean(activeOrganizationId && tokens?.accessToken),
    queryKey: ["organization", activeOrganizationId],
    queryFn: () => withSessionRefresh((accessToken) => getOrganization(activeOrganizationId!, accessToken))
  });

  const membersQuery = useQuery({
    enabled: Boolean(activeOrganizationId && tokens?.accessToken && role !== "MEMBER"),
    queryKey: ["organization-members", activeOrganizationId],
    queryFn: () => withSessionRefresh((accessToken) => listOrganizationMembers(activeOrganizationId!, accessToken))
  });

  const invitationsQuery = useQuery({
    enabled: Boolean(activeOrganizationId && tokens?.accessToken && role === "ADMIN"),
    queryKey: ["organization-invitations", activeOrganizationId],
    queryFn: () => withSessionRefresh((accessToken) => listOrganizationInvitations(activeOrganizationId!, accessToken))
  });

  useEffect(() => {
    const currentOrganization = organizationQuery.data ?? organization;

    if (!currentOrganization) {
      return;
    }

    setOrgCurrency(currentOrganization.defaultCurrency);
    setOrgImageUrl(currentOrganization.profileImageUrl ?? null);
    setOrgName(currentOrganization.name);
    setOrgTimezone(currentOrganization.timezone);
  }, [organization, organizationQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Profile session is not available.");
      }

      return withSessionRefresh((accessToken) =>
        updateUserProfile(
          user.id,
          {
            avatarUrl,
            designation: designation.trim(),
            name: name.trim(),
            phone: phone.trim()
          },
          accessToken
        )
      );
    },
    onSuccess: (updatedUser) => {
      setSuccessMessage("Profile updated.");
      setUser({
        avatarUrl: updatedUser.avatarUrl,
        designation: updatedUser.designation,
        email: updatedUser.email,
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone
      });
    }
  });

  const organizationMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrganizationId) {
        throw new Error("Organization session is not available.");
      }

      return withSessionRefresh((accessToken) =>
        updateOrganization(
          activeOrganizationId,
          {
            defaultCurrency: orgCurrency.trim(),
            name: orgName.trim(),
            profileImageUrl: orgImageUrl,
            timezone: orgTimezone.trim()
          },
          accessToken
        )
      );
    },
    onSuccess: (updatedOrganization: OrganizationProfile) => {
      setSuccessMessage("Organization updated.");
      setOrganization({
        defaultCurrency: updatedOrganization.defaultCurrency,
        id: updatedOrganization.id,
        name: updatedOrganization.name,
        profileImageUrl: updatedOrganization.profileImageUrl,
        timezone: updatedOrganization.timezone
      });
    }
  });

  const invitationMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrganizationId) {
        throw new Error("Organization session is not available.");
      }

      return withSessionRefresh((accessToken) =>
        createOrganizationInvitation(
          activeOrganizationId,
          {
            email: inviteEmail.trim(),
            role: inviteRole
          },
          accessToken
        )
      );
    },
    onSuccess: async (invitation) => {
      const link = `${window.location.origin}/invite/${invitation.inviteToken}`;
      setInviteLink(link);
      setInviteEmail("");
      setSuccessMessage("Invitation created.");
      await navigator.clipboard?.writeText(link).catch(() => null);
      await invitationsQuery.refetch();
    }
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!activeOrganizationId) {
        throw new Error("Organization session is not available.");
      }

      return withSessionRefresh((accessToken) =>
        revokeOrganizationInvitation(activeOrganizationId, invitationId, accessToken)
      );
    },
    onSuccess: async () => {
      setSuccessMessage("Invitation revoked.");
      await invitationsQuery.refetch();
    }
  });

  async function handleAvatarChange(file?: File) {
    setAvatarError(null);
    setSuccessMessage(null);

    if (!file) {
      return;
    }

    try {
      setAvatarUrl(await fileToAvatarDataUrl(file));
    } catch (caughtError) {
      setAvatarError(caughtError instanceof Error ? caughtError.message : "Unable to use this image.");
    }
  }

  async function handleOrganizationImageChange(file?: File) {
    setOrgImageError(null);
    setSuccessMessage(null);

    if (!file) {
      return;
    }

    try {
      setOrgImageUrl(await fileToAvatarDataUrl(file));
    } catch (caughtError) {
      setOrgImageError(caughtError instanceof Error ? caughtError.message : "Unable to use this image.");
    }
  }

  async function handleLogout() {
    if (tokens?.accessToken) {
      await logout(tokens.accessToken).catch(() => null);
    }

    clearSession();
    router.replace("/login");
  }

  if (!hasHydrated || !tokens?.accessToken || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#E4E4E4] text-[#10141A]">
        <div className="rounded-md border border-white/70 bg-white/65 px-4 py-3 text-sm text-[#10141A]/60 shadow-[0_18px_60px_rgba(16,20,26,0.12)] backdrop-blur-xl">
          Loading profile...
        </div>
      </main>
    );
  }

  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];
  const canManageOrganization = role === "ADMIN";
  const currentOrganization = organizationQuery.data ?? organization;

  return (
    <main className="min-h-screen bg-[#E4E4E4] p-4 text-[#10141A] md:p-6">
      <section className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-md border border-white/70 bg-white/55 p-4 shadow-[0_24px_80px_rgba(16,20,26,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Link className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-[#10141A]/55" href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <h1 className="text-2xl font-semibold md:text-3xl">Workspace Profile</h1>
              <p className="text-sm text-[#10141A]/55">
                {currentOrganization?.name ?? "CampaignOps"} / {role}
              </p>
            </div>
            <button
              aria-label="Log out"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/60 text-[#10141A]/70 transition hover:bg-white hover:text-[#10141A]"
              onClick={handleLogout}
              type="button"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <section className="rounded-md border border-white/70 bg-white/45 p-5 shadow-[0_24px_80px_rgba(16,20,26,0.09)] backdrop-blur-xl">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-[#E4E4E4] bg-white text-3xl font-semibold shadow-[0_20px_45px_rgba(16,20,26,0.14)]">
                  {avatarUrl ? (
                    <img alt="" className="h-full w-full object-cover" src={avatarUrl} />
                  ) : (
                    <span>{getInitials(name || user.name)}</span>
                  )}
                </div>
                <label className="absolute bottom-2 right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#10141A] text-white shadow-[0_14px_32px_rgba(16,20,26,0.25)]">
                  <Camera className="h-4 w-4" />
                  <input
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => void handleAvatarChange(event.target.files?.[0])}
                    type="file"
                  />
                </label>
              </div>
              <h2 className="mt-4 text-lg font-semibold">{name || user.name}</h2>
              <p className="text-sm text-[#10141A]/55">{designation || "CampaignOps member"}</p>
              <button
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-medium text-[#10141A]/70 transition hover:bg-white hover:text-[#10141A]"
                onClick={() => {
                  setAvatarError(null);
                  setAvatarUrl(null);
                }}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                Remove image
              </button>
              {avatarError ? <p className="mt-3 text-xs text-[#9E3F3F]">{avatarError}</p> : null}
            </div>
          </section>

          <section className="rounded-md border border-white/70 bg-white/45 p-5 shadow-[0_24px_80px_rgba(16,20,26,0.09)] backdrop-blur-xl">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setSuccessMessage(null);
                updateMutation.mutate();
              }}
            >
              <div className="flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-[#10141A]/55" />
                <h2 className="text-lg font-semibold">Personal Details</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Name</span>
                  <input
                    className="h-11 w-full rounded-md border border-white/70 bg-white/70 px-3 text-sm outline-none transition focus:border-[#83A2DB] focus:ring-2 focus:ring-[#83A2DB]/25"
                    onChange={(event) => setName(event.target.value)}
                    required
                    value={name}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Email</span>
                  <input
                    className="h-11 w-full rounded-md border border-white/70 bg-white/45 px-3 text-sm text-[#10141A]/55"
                    disabled
                    value={user.email}
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Phone</span>
                  <input
                    className="h-11 w-full rounded-md border border-white/70 bg-white/70 px-3 text-sm outline-none transition focus:border-[#83A2DB] focus:ring-2 focus:ring-[#83A2DB]/25"
                    onChange={(event) => setPhone(event.target.value)}
                    value={phone}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Designation</span>
                  <input
                    className="h-11 w-full rounded-md border border-white/70 bg-white/70 px-3 text-sm outline-none transition focus:border-[#83A2DB] focus:ring-2 focus:ring-[#83A2DB]/25"
                    onChange={(event) => setDesignation(event.target.value)}
                    value={designation}
                  />
                </label>
              </div>

              {updateMutation.isError ? (
                <p className="rounded-md border border-[#CE6969]/30 bg-[#CE6969]/10 px-3 py-2 text-sm text-[#9E3F3F]">
                  {updateMutation.error.message}
                </p>
              ) : null}

              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#10141A] px-5 text-sm font-medium text-white shadow-[0_16px_36px_rgba(16,20,26,0.25)] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                disabled={updateMutation.isPending}
                type="submit"
              >
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? "Saving..." : "Save profile"}
              </button>
            </form>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-md border border-white/70 bg-white/45 p-5 shadow-[0_24px_80px_rgba(16,20,26,0.09)] backdrop-blur-xl">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setSuccessMessage(null);
                organizationMutation.mutate();
              }}
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#10141A]/55" />
                <h2 className="text-lg font-semibold">Organization</h2>
              </div>

              <div className="flex items-center gap-4 rounded-md border border-white/70 bg-white/40 p-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#10141A] text-sm font-semibold text-white">
                  {orgImageUrl ? (
                    <img alt="" className="h-full w-full object-cover" src={orgImageUrl} />
                  ) : (
                    <span>{getInitials(orgName || currentOrganization?.name || "CO")}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium transition hover:bg-white">
                    <Camera className="h-4 w-4" />
                    Upload logo
                    <input
                      accept="image/*"
                      className="sr-only"
                      disabled={!canManageOrganization}
                      onChange={(event) => void handleOrganizationImageChange(event.target.files?.[0])}
                      type="file"
                    />
                  </label>
                  {orgImageError ? <p className="mt-2 text-xs text-[#9E3F3F]">{orgImageError}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Organization name</span>
                  <input
                    className="h-11 w-full rounded-md border border-white/70 bg-white/70 px-3 text-sm outline-none transition focus:border-[#83A2DB] focus:ring-2 focus:ring-[#83A2DB]/25 disabled:bg-white/35 disabled:text-[#10141A]/50"
                    disabled={!canManageOrganization}
                    onChange={(event) => setOrgName(event.target.value)}
                    required
                    value={orgName}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Default currency</span>
                  <input
                    className="h-11 w-full rounded-md border border-white/70 bg-white/70 px-3 text-sm outline-none transition focus:border-[#83A2DB] focus:ring-2 focus:ring-[#83A2DB]/25 disabled:bg-white/35 disabled:text-[#10141A]/50"
                    disabled={!canManageOrganization}
                    onChange={(event) => setOrgCurrency(event.target.value)}
                    value={orgCurrency}
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Timezone</span>
                <input
                  className="h-11 w-full rounded-md border border-white/70 bg-white/70 px-3 text-sm outline-none transition focus:border-[#83A2DB] focus:ring-2 focus:ring-[#83A2DB]/25 disabled:bg-white/35 disabled:text-[#10141A]/50"
                  disabled={!canManageOrganization}
                  onChange={(event) => setOrgTimezone(event.target.value)}
                  value={orgTimezone}
                />
              </label>

              {organizationMutation.isError ? (
                <p className="rounded-md border border-[#CE6969]/30 bg-[#CE6969]/10 px-3 py-2 text-sm text-[#9E3F3F]">
                  {organizationMutation.error.message}
                </p>
              ) : null}

              {successMessage ? (
                <p className="rounded-md border border-[#83A2DB]/30 bg-[#83A2DB]/15 px-3 py-2 text-sm text-[#496AA0]">
                  {successMessage}
                </p>
              ) : null}

              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#10141A] px-5 text-sm font-medium text-white shadow-[0_16px_36px_rgba(16,20,26,0.25)] transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canManageOrganization || organizationMutation.isPending || organizationQuery.isLoading}
                type="submit"
              >
                <Save className="h-4 w-4" />
                {organizationMutation.isPending ? "Saving..." : "Save organization"}
              </button>
            </form>
          </section>

          <section className="rounded-md border border-white/70 bg-white/45 p-5 shadow-[0_24px_80px_rgba(16,20,26,0.09)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-[#10141A]/55" />
                <h2 className="text-lg font-semibold">Team Members</h2>
              </div>
              <span className="rounded-full bg-white/65 px-3 py-1 text-xs font-medium text-[#10141A]/55">
                {role === "MEMBER" ? "Restricted" : `${members.length} total`}
              </span>
            </div>

            {role === "MEMBER" ? (
              <div className="rounded-md border border-white/70 bg-white/45 p-4 text-sm text-[#10141A]/55">
                Managers and admins can view the workspace roster.
              </div>
            ) : membersQuery.isLoading ? (
              <div className="rounded-md border border-white/70 bg-white/45 p-4 text-sm text-[#10141A]/55">
                Loading team...
              </div>
            ) : membersQuery.isError ? (
              <div className="rounded-md border border-[#CE6969]/30 bg-[#CE6969]/10 p-4 text-sm text-[#9E3F3F]">
                {membersQuery.error.message}
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    className="flex items-center gap-3 rounded-md border border-white/70 bg-white/55 p-3"
                    key={member.id}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#10141A] text-sm font-semibold text-white">
                      {member.user.avatarUrl ? (
                        <img alt="" className="h-full w-full object-cover" src={member.user.avatarUrl} />
                      ) : (
                        <span>{getInitials(member.user.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{member.user.name}</p>
                        <span className="rounded-full bg-[#10141A] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                          {formatRole(member.role)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-[#10141A]/55">{member.user.email}</p>
                      <p className="text-xs text-[#10141A]/45">
                        Joined {member.joinedAt ? formatDate(member.joinedAt) : "pending"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {role === "ADMIN" ? (
              <div className="mt-5 space-y-4 border-t border-white/60 pt-5">
                <form
                  className="space-y-3 rounded-md border border-white/70 bg-white/45 p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setInviteLink(null);
                    setSuccessMessage(null);
                    invitationMutation.mutate();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MailPlus className="h-4 w-4 text-[#10141A]/55" />
                    <h3 className="text-sm font-semibold">Invite to workspace</h3>
                  </div>
                  <label className="block space-y-2">
                    <span className="text-xs font-medium text-[#10141A]/60">Email</span>
                    <input
                      className="h-10 w-full rounded-md border border-white/70 bg-white/75 px-3 text-sm outline-none transition focus:border-[#83A2DB] focus:ring-2 focus:ring-[#83A2DB]/25"
                      onChange={(event) => setInviteEmail(event.target.value)}
                      required
                      type="email"
                      value={inviteEmail}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-xs font-medium text-[#10141A]/60">Role</span>
                    <select
                      className="h-10 w-full rounded-md border border-white/70 bg-white/75 px-3 text-sm outline-none transition focus:border-[#83A2DB] focus:ring-2 focus:ring-[#83A2DB]/25"
                      onChange={(event) => setInviteRole(event.target.value as "ADMIN" | "MANAGER" | "MEMBER")}
                      value={inviteRole}
                    >
                      <option value="MEMBER">Team Member</option>
                      <option value="MANAGER">Operations Manager</option>
                      <option value="ADMIN">Workspace Admin</option>
                    </select>
                  </label>

                  {invitationMutation.isError ? (
                    <p className="rounded-md border border-[#CE6969]/30 bg-[#CE6969]/10 px-3 py-2 text-sm text-[#9E3F3F]">
                      {invitationMutation.error.message}
                    </p>
                  ) : null}

                  <button
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#10141A] px-4 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={invitationMutation.isPending}
                    type="submit"
                  >
                    <MailPlus className="h-4 w-4" />
                    {invitationMutation.isPending ? "Creating invite..." : "Create invite link"}
                  </button>
                </form>

                {inviteLink ? (
                  <div className="rounded-md border border-[#83A2DB]/30 bg-[#83A2DB]/15 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#496AA0]">
                      <LinkIcon className="h-4 w-4" />
                      Invite link ready
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="h-10 min-w-0 flex-1 rounded-md border border-white/70 bg-white/80 px-3 text-xs text-[#10141A]/70"
                        readOnly
                        value={inviteLink}
                      />
                      <button
                        aria-label="Copy invite link"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#10141A] text-white transition hover:bg-black"
                        onClick={() => void navigator.clipboard?.writeText(inviteLink)}
                        type="button"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Invite history</h3>
                  {invitationsQuery.isLoading ? (
                    <p className="rounded-md border border-white/70 bg-white/45 p-3 text-sm text-[#10141A]/55">
                      Loading invites...
                    </p>
                  ) : invitationsQuery.isError ? (
                    <p className="rounded-md border border-[#CE6969]/30 bg-[#CE6969]/10 p-3 text-sm text-[#9E3F3F]">
                      {invitationsQuery.error.message}
                    </p>
                  ) : invitations.length ? (
                    <div className="space-y-2">
                      {invitations.slice(0, 6).map((invitation) => (
                        <div
                          className="flex items-center gap-3 rounded-md border border-white/70 bg-white/55 p-3"
                          key={invitation.id}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{invitation.email}</p>
                            <p className="text-xs text-[#10141A]/50">
                              {roleLabel(invitation.role)} / {invitationStatusLabel(invitation)}
                            </p>
                          </div>
                          {!invitation.acceptedAt && !invitation.revokedAt && new Date(invitation.expiresAt).getTime() > Date.now() ? (
                            <button
                              aria-label="Revoke invitation"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#CE6969]/30 bg-[#CE6969]/10 text-[#9E3F3F] transition hover:bg-[#CE6969]/15"
                              disabled={revokeInvitationMutation.isPending}
                              onClick={() => revokeInvitationMutation.mutate(invitation.id)}
                              type="button"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-md border border-white/70 bg-white/45 p-3 text-sm text-[#10141A]/55">
                      No invitations yet.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatRole(value: "ADMIN" | "MANAGER" | "MEMBER") {
  return roleLabel(value);
}

function invitationStatusLabel(invitation: OrganizationInvitation) {
  if (invitation.acceptedAt) {
    return "Accepted";
  }

  if (invitation.revokedAt) {
    return "Revoked";
  }

  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    return "Expired";
  }

  return `Pending until ${formatDate(invitation.expiresAt)}`;
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

function getInitials(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
