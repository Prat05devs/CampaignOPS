import { type PaymentStatus } from "./budget-api";
import { apiRequest } from "./api-client";

export type VendorCategory =
  | "VENUE"
  | "CATERING"
  | "SOUND"
  | "LIGHT"
  | "STAGE"
  | "PRINTING"
  | "DECOR"
  | "PHOTOGRAPHY"
  | "VIDEOGRAPHY"
  | "TRANSPORT"
  | "SECURITY"
  | "REGISTRATION"
  | "ARTISTS"
  | "ANCHORS"
  | "FABRICATION";

export type Vendor = {
  id: string;
  organizationId: string;
  name: string;
  category: VendorCategory;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  serviceType: string | null;
  rateCardJson: string[] | null;
  pastEventsServed: number | null;
  rating: number | null;
  notes: string | null;
  paymentStatus: PaymentStatus;
  quotationFileId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventVendor = {
  id: string;
  eventId: string;
  vendorId: string;
  performanceNotes: string | null;
  createdAt: string;
  vendor: Vendor;
};

export type CreateEventVendorInput = {
  name: string;
  category: VendorCategory;
  contactName?: string;
  phone?: string;
  email?: string;
  city?: string;
  serviceType?: string;
  rateCard?: string[];
  pastEventsServed?: number;
  rating?: number;
  notes?: string;
  paymentStatus?: PaymentStatus;
  quotationFileId?: string;
  performanceNotes?: string;
};

export type UpdateEventVendorInput = Partial<CreateEventVendorInput>;

export function listEventVendors(eventId: string, accessToken: string) {
  return apiRequest<EventVendor[]>(`/events/${eventId}/vendors`, {
    accessToken
  });
}

export function createEventVendor(eventId: string, input: CreateEventVendorInput, accessToken: string) {
  return apiRequest<EventVendor>(`/events/${eventId}/vendors`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function updateEventVendor(
  eventId: string,
  eventVendorId: string,
  input: UpdateEventVendorInput,
  accessToken: string
) {
  return apiRequest<EventVendor>(`/events/${eventId}/vendors/${eventVendorId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH"
  });
}
