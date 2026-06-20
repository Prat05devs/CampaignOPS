import { apiRequest } from "./api-client";

export type OutreachRecipientType =
  | "SPONSOR"
  | "COLLEGE"
  | "GOVERNMENT_DEPARTMENT"
  | "PSU"
  | "VOLUNTEER"
  | "SPEAKER"
  | "INFLUENCER"
  | "MEDIA"
  | "VENDOR"
  | "CLIENT";

export type OutreachDraftType =
  | "EMAIL"
  | "WHATSAPP"
  | "CALL_SCRIPT"
  | "FOLLOW_UP"
  | "SPONSORSHIP_REQUEST"
  | "GOVERNMENT_PSU_LETTER"
  | "COLLEGE_OUTREACH"
  | "INVITATION_LETTER"
  | "PRESS_RELEASE"
  | "THANK_YOU_NOTE";

export type OutreachTemplate = {
  id: string;
  organizationId: string;
  eventId: string | null;
  createdById: string;
  recipientType: OutreachRecipientType;
  title: string;
  channel: OutreachDraftType | string;
  body: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    email: string;
    id: string;
    name: string;
  };
};

export type CreateOutreachTemplateInput = {
  recipientType: OutreachRecipientType;
  title: string;
  channel: OutreachDraftType;
  body: string;
};

export type UpdateOutreachTemplateInput = Partial<CreateOutreachTemplateInput>;

export function listOutreachTemplates(eventId: string, accessToken: string) {
  return apiRequest<OutreachTemplate[]>(`/events/${eventId}/outreach-templates`, {
    accessToken
  });
}

export function createOutreachTemplate(eventId: string, input: CreateOutreachTemplateInput, accessToken: string) {
  return apiRequest<OutreachTemplate>(`/events/${eventId}/outreach-templates`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function updateOutreachTemplate(
  eventId: string,
  templateId: string,
  input: UpdateOutreachTemplateInput,
  accessToken: string
) {
  return apiRequest<OutreachTemplate>(`/events/${eventId}/outreach-templates/${templateId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH"
  });
}
