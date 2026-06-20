import { apiRequest } from "./api-client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  designation: string | null;
};

export type AuthOrganization = {
  id: string;
  name: string;
  defaultCurrency: string;
  timezone: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = {
  user: AuthUser;
  activeOrganizationId: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  tokens: AuthTokens;
};

export type SignupResponse = {
  user: AuthUser;
  organization: AuthOrganization;
  tokens: AuthTokens;
};

export function login(input: { email: string; password: string }) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function signup(input: {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  phone?: string;
}) {
  return apiRequest<SignupResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input)
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
