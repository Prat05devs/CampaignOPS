import { apiRequest } from "./api-client";

export type ContactCategory =
  | "SPONSOR"
  | "GOVERNMENT_OFFICER"
  | "COLLEGE"
  | "VENDOR"
  | "VOLUNTEER"
  | "MEDIA"
  | "INFLUENCER"
  | "GUEST"
  | "CLIENT"
  | "SPEAKER"
  | "PERFORMER"
  | "PARTNER"
  | "SUPPORTER";

export type ContactStatus =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "FOLLOW_UP"
  | "CONVERTED"
  | "NOT_INTERESTED"
  | "CLOSED";

export type Contact = {
  id: string;
  organizationId: string;
  name: string;
  phone: string | null;
  email: string | null;
  organizationName: string | null;
  designation: string | null;
  category: ContactCategory;
  source: string | null;
  status: ContactStatus;
  notes: string | null;
  followUpAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventContact = {
  id: string;
  eventId: string;
  contactId: string;
  notes: string | null;
  createdAt: string;
  contact: Contact;
};

export type CreateEventContactInput = {
  name: string;
  phone?: string;
  email?: string;
  organizationName?: string;
  designation?: string;
  category: ContactCategory;
  source?: string;
  status?: ContactStatus;
  notes?: string;
  followUpAt?: string;
  eventNotes?: string;
};

export type UpdateEventContactInput = Partial<CreateEventContactInput>;

export function listEventContacts(eventId: string, accessToken: string) {
  return apiRequest<EventContact[]>(`/events/${eventId}/contacts`, {
    accessToken
  });
}

export function createEventContact(eventId: string, input: CreateEventContactInput, accessToken: string) {
  return apiRequest<EventContact>(`/events/${eventId}/contacts`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function updateEventContact(
  eventId: string,
  eventContactId: string,
  input: UpdateEventContactInput,
  accessToken: string
) {
  return apiRequest<EventContact>(`/events/${eventId}/contacts/${eventContactId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH"
  });
}
