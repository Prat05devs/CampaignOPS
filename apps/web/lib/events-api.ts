import { apiRequest } from "./api-client";

export type EventCategory = "GOVERNMENT_CSR" | "PRIME_CIRCLE" | "HOLY_SIN_CAFE" | "PRIVATE_CLIENT";
export type EventScaleTier = "MICRO" | "SMALL" | "MEDIUM" | "LARGE" | "MASS";
export type EventStatus = "DRAFT" | "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export type CampaignEvent = {
  id: string;
  title: string;
  objective: string | null;
  category: EventCategory;
  subtype: string;
  scaleTier: EventScaleTier;
  city: string | null;
  venue: string | null;
  expectedPax: number | null;
  estimatedBudgetAmount: string | null;
  startsAt: string | null;
  endsAt: string | null;
  departmentOrClient: string | null;
  stakeholdersJson: string[] | null;
  brandContext: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateEventInput = {
  title: string;
  objective?: string;
  category: EventCategory;
  subtype: string;
  scaleTier: EventScaleTier;
  city?: string;
  venue?: string;
  expectedPax?: number;
  estimatedBudgetAmount?: number;
  startsAt?: string;
  endsAt?: string;
  departmentOrClient?: string;
  stakeholders?: string[];
  brandContext?: string;
  status?: EventStatus;
};

export function listEvents(accessToken: string) {
  return apiRequest<CampaignEvent[]>("/events", {
    accessToken
  });
}

export function getEvent(id: string, accessToken: string) {
  return apiRequest<CampaignEvent>(`/events/${id}`, {
    accessToken
  });
}

export function createEvent(input: CreateEventInput, accessToken: string) {
  return apiRequest<CampaignEvent>("/events", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST"
  });
}
