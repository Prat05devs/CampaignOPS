import { apiRequest } from "./api-client";

export type ActivityLog = {
  id: string;
  organizationId: string;
  eventId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadataJson: unknown;
  createdAt: string;
  user: {
    email: string;
    id: string;
    name: string;
  } | null;
};

export function listActivityLogs(eventId: string, accessToken: string) {
  return apiRequest<ActivityLog[]>(`/events/${eventId}/activity-logs`, {
    accessToken
  });
}
