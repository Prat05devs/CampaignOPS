"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthOrganization, AuthTokens, AuthUser } from "../lib/auth-api";

type AuthRole = "ADMIN" | "MANAGER" | "MEMBER";

type AuthState = {
  hasHydrated: boolean;
  user: AuthUser | null;
  organization: AuthOrganization | null;
  activeOrganizationId: string | null;
  role: AuthRole | null;
  tokens: AuthTokens | null;
  setHasHydrated: (hasHydrated: boolean) => void;
  setTokens: (tokens: AuthTokens) => void;
  setSession: (session: {
    user: AuthUser;
    organization?: AuthOrganization | null;
    activeOrganizationId: string;
    role: AuthRole;
    tokens: AuthTokens;
  }) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      user: null,
      organization: null,
      activeOrganizationId: null,
      role: null,
      tokens: null,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setTokens: (tokens) => set({ tokens }),
      setSession: (session) =>
        set({
          user: session.user,
          organization: session.organization ?? null,
          activeOrganizationId: session.activeOrganizationId,
          role: session.role,
          tokens: session.tokens
        }),
      clearSession: () =>
        set({
          user: null,
          organization: null,
          activeOrganizationId: null,
          role: null,
          tokens: null
        })
    }),
    {
      name: "campaignops-auth",
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        activeOrganizationId: state.activeOrganizationId,
        role: state.role,
        tokens: state.tokens
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
