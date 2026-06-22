import { type AuthOrganization, type AuthUser } from "./auth-api";
import { apiRequest } from "./api-client";

export type OrganizationProfile = AuthOrganization & {
  createdAt?: string;
  updatedAt?: string;
};

export type OrganizationMember = {
  id: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  invitedAt: string | null;
  joinedAt: string | null;
  createdAt: string;
  user: Pick<AuthUser, "avatarUrl" | "designation" | "email" | "id" | "name" | "phone">;
};

export type OrganizationRole = "ADMIN" | "MANAGER" | "MEMBER";

export type OrganizationInvitation = {
  id: string;
  email: string;
  role: OrganizationRole;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  invitedBy?: Pick<AuthUser, "avatarUrl" | "email" | "id" | "name">;
  acceptedBy?: Pick<AuthUser, "avatarUrl" | "email" | "id" | "name"> | null;
};

export type CreatedOrganizationInvitation = OrganizationInvitation & {
  inviteToken: string;
};

export type UpdateOrganizationInput = {
  defaultCurrency?: string;
  name?: string;
  profileImageUrl?: string | null;
  timezone?: string;
};

export function getOrganization(organizationId: string, accessToken: string) {
  return apiRequest<OrganizationProfile>(`/organizations/${organizationId}`, {
    accessToken
  });
}

export function listOrganizationMembers(organizationId: string, accessToken: string) {
  return apiRequest<OrganizationMember[]>(`/organizations/${organizationId}/members`, {
    accessToken
  });
}

export function listOrganizationInvitations(organizationId: string, accessToken: string) {
  return apiRequest<OrganizationInvitation[]>(`/organizations/${organizationId}/invitations`, {
    accessToken
  });
}

export function createOrganizationInvitation(
  organizationId: string,
  input: { email: string; role: OrganizationRole },
  accessToken: string
) {
  return apiRequest<CreatedOrganizationInvitation>(`/organizations/${organizationId}/invitations`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function revokeOrganizationInvitation(
  organizationId: string,
  invitationId: string,
  accessToken: string
) {
  return apiRequest<OrganizationInvitation>(`/organizations/${organizationId}/invitations/${invitationId}/revoke`, {
    accessToken,
    method: "PATCH"
  });
}

export function updateOrganization(
  organizationId: string,
  input: UpdateOrganizationInput,
  accessToken: string
) {
  return apiRequest<OrganizationProfile>(`/organizations/${organizationId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH"
  });
}
