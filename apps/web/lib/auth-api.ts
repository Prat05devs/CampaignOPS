import { apiRequest } from "./api-client";

export type AuthUser = {
  avatarUrl: string | null;
  id: string;
  email: string;
  name: string;
  phone: string | null;
  designation: string | null;
};

export type AuthOrganization = {
  id: string;
  name: string;
  profileImageUrl?: string | null;
  defaultCurrency: string;
  timezone: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthMembership = {
  activeOrganizationId: string;
  organization: AuthOrganization;
  role: "ADMIN" | "MANAGER" | "MEMBER";
};

export type LoginResponse = {
  user: AuthUser;
  activeOrganizationId: string;
  memberships?: AuthMembership[];
  organization: AuthOrganization;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  tokens: AuthTokens;
};

export type SignupResponse = {
  user: AuthUser;
  activeOrganizationId: string;
  memberships?: AuthMembership[];
  organization: AuthOrganization;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  tokens: AuthTokens;
};

export type InvitationPreview = {
  acceptedAt: string | null;
  email: string;
  expiresAt: string;
  invitedBy: Pick<AuthUser, "avatarUrl" | "email" | "id" | "name">;
  organization: AuthOrganization;
  revokedAt: string | null;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
};

export function login(input: { email: string; password: string; organizationId?: string }) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function requestPasswordReset(input: { email: string }) {
  return apiRequest<{ devResetUrl?: string; success: boolean }>("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function resetPassword(input: { password: string; token: string }) {
  return apiRequest<{ success: boolean }>("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function listWorkspaces(accessToken: string) {
  return apiRequest<AuthMembership[]>("/auth/workspaces", {
    accessToken
  });
}

export function switchWorkspace(organizationId: string, accessToken: string) {
  return apiRequest<LoginResponse>("/auth/switch-workspace", {
    accessToken,
    body: JSON.stringify({ organizationId }),
    method: "POST"
  });
}

export function signup(input: {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  avatarUrl?: string;
  phone?: string;
}) {
  return apiRequest<SignupResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getInvitationPreview(inviteToken: string) {
  return apiRequest<InvitationPreview>(`/auth/invitations/${inviteToken}`);
}

export function acceptInvitation(
  inviteToken: string,
  input: {
    name: string;
    password: string;
    avatarUrl?: string;
    phone?: string;
  }
) {
  return apiRequest<LoginResponse>(`/auth/invitations/${inviteToken}/accept`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function acceptInvitationWithCurrentUser(inviteToken: string, accessToken: string) {
  return apiRequest<LoginResponse>(`/auth/invitations/${inviteToken}/accept-existing`, {
    accessToken,
    method: "POST"
  });
}

export function logout(accessToken: string) {
  return apiRequest<{ success: boolean }>("/auth/logout", {
    method: "POST",
    accessToken
  });
}

export function refreshSession(refreshToken: string) {
  return apiRequest<{ tokens: AuthTokens }>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken })
  });
}
