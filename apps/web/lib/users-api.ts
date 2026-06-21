import { type AuthUser } from "./auth-api";
import { apiRequest } from "./api-client";

export type UpdateUserProfileInput = {
  avatarUrl?: string | null;
  designation?: string;
  name?: string;
  phone?: string;
};

export type UserProfile = AuthUser & {
  createdAt?: string;
  updatedAt: string;
};

export function getUserProfile(userId: string, accessToken: string) {
  return apiRequest<UserProfile>(`/users/${userId}`, {
    accessToken
  });
}

export function updateUserProfile(userId: string, input: UpdateUserProfileInput, accessToken: string) {
  return apiRequest<UserProfile>(`/users/${userId}/profile`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH"
  });
}
