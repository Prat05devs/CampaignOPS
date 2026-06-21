import { apiRequest } from "./api-client";

export type ContentPlatform =
  | "INSTAGRAM"
  | "LINKEDIN"
  | "FACEBOOK"
  | "X_TWITTER"
  | "WHATSAPP"
  | "YOUTUBE"
  | "PRESS"
  | "OFFLINE_POSTERS"
  | "STANDEE_BANNER";

export type ContentApprovalStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED";

export type ContentItem = {
  id: string;
  eventId: string;
  ownerId: string | null;
  platform: ContentPlatform;
  title: string;
  caption: string | null;
  scheduledFor: string | null;
  approvalStatus: ContentApprovalStatus;
  assetFileId: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    email: string;
    id: string;
    name: string;
  } | null;
  assetFile: {
    fileName: string;
    id: string;
    mimeType: string | null;
  } | null;
};

export type CreateContentItemInput = {
  platform: ContentPlatform;
  title: string;
  caption?: string;
  scheduledFor?: string;
  approvalStatus?: ContentApprovalStatus;
  ownerId?: string;
  assetFileId?: string;
};

export type UpdateContentItemInput = Partial<CreateContentItemInput>;

export function listContentItems(eventId: string, accessToken: string) {
  return apiRequest<ContentItem[]>(`/events/${eventId}/content-items`, {
    accessToken
  });
}

export function createContentItem(eventId: string, input: CreateContentItemInput, accessToken: string) {
  return apiRequest<ContentItem>(`/events/${eventId}/content-items`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function updateContentItem(
  eventId: string,
  contentItemId: string,
  input: UpdateContentItemInput,
  accessToken: string
) {
  return apiRequest<ContentItem>(`/events/${eventId}/content-items/${contentItemId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH"
  });
}
