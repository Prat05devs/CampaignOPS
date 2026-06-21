"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Camera, LogOut, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api-client";
import { fileToAvatarDataUrl } from "../../lib/avatar-utils";
import { logout, refreshSession } from "../../lib/auth-api";
import { updateUserProfile } from "../../lib/users-api";
import { useAuthStore } from "../../stores/auth-store";

export function ProfileShell() {
  const router = useRouter();
  const { clearSession, hasHydrated, role, setTokens, setUser, tokens, user } = useAuthStore();
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [designation, setDesignation] = useState(user?.designation ?? "");
  const [name, setName] = useState(user?.name ?? "");
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

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user || !tokens?.accessToken) {
        throw new Error("Profile session is not available.");
      }

      const input = {
        avatarUrl,
        designation: designation.trim(),
        name: name.trim(),
        phone: phone.trim()
      };

      try {
        return await updateUserProfile(user.id, input, tokens.accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401 || !tokens.refreshToken) {
          throw error;
        }

        const refreshedSession = await refreshSession(tokens.refreshToken);
        setTokens(refreshedSession.tokens);
        return updateUserProfile(user.id, input, refreshedSession.tokens.accessToken);
      }
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

  return (
    <main className="min-h-screen bg-[#E4E4E4] p-4 text-[#10141A] md:p-6">
      <section className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-md border border-white/70 bg-white/55 p-4 shadow-[0_24px_80px_rgba(16,20,26,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Link className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-[#10141A]/55" href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <h1 className="text-2xl font-semibold md:text-3xl">Profile</h1>
              <p className="text-sm text-[#10141A]/55">{role} workspace identity</p>
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

        <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
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
              <p className="mt-3 max-w-xs text-xs leading-5 text-[#10141A]/50">
                This image appears in profile chips and activity logs so the team can instantly see who did what.
              </p>
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

              {successMessage ? (
                <p className="rounded-md border border-[#83A2DB]/30 bg-[#83A2DB]/15 px-3 py-2 text-sm text-[#496AA0]">
                  {successMessage}
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
      </section>
    </main>
  );
}

function getInitials(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
