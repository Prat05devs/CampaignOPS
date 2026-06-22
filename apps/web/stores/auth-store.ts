"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthMembership, AuthOrganization, AuthTokens, AuthUser } from "../lib/auth-api";

type AuthRole = "ADMIN" | "MANAGER" | "MEMBER";

type AuthState = {
  hasHydrated: boolean;
  user: AuthUser | null;
  organization: AuthOrganization | null;
  activeOrganizationId: string | null;
  memberships: AuthMembership[];
  role: AuthRole | null;
  tokens: AuthTokens | null;
  setHasHydrated: (hasHydrated: boolean) => void;
  setOrganization: (organization: AuthOrganization) => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: AuthUser) => void;
  setSession: (session: {
    user: AuthUser;
    organization?: AuthOrganization | null;
    activeOrganizationId: string;
    memberships?: AuthMembership[];
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
      memberships: [],
      role: null,
      tokens: null,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setOrganization: (organization) => set({ organization }),
      setTokens: (tokens) => set({ tokens }),
      setUser: (user) => set({ user }),
      setSession: (session) =>
        set({
          user: session.user,
          organization: session.organization ?? null,
          activeOrganizationId: session.activeOrganizationId,
          memberships: session.memberships ?? [],
          role: session.role,
          tokens: session.tokens
        }),
      clearSession: () =>
        set({
          user: null,
          organization: null,
          activeOrganizationId: null,
          memberships: [],
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
        memberships: state.memberships,
        role: state.role,
        tokens: state.tokens
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
