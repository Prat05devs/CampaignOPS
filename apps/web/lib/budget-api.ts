import { apiRequest } from "./api-client";

export type BudgetCategory =
  | "VENUE"
  | "FOOD"
  | "PRINTING"
  | "BRANDING"
  | "STAGE"
  | "SOUND"
  | "LIGHTING"
  | "TRAVEL"
  | "PHOTOGRAPHY"
  | "VIDEOGRAPHY"
  | "ADS"
  | "TEAM"
  | "GUEST_HOSPITALITY"
  | "VENDOR_PAYMENTS"
  | "MISCELLANEOUS";

export type PaymentStatus = "NOT_STARTED" | "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

export type BudgetVendor = {
  id: string;
  name: string;
  category: string;
  paymentStatus: PaymentStatus;
};

export type BudgetItem = {
  id: string;
  eventId: string;
  vendorId: string | null;
  category: BudgetCategory;
  title: string;
  estimatedAmount: string;
  actualAmount: string;
  paymentStatus: PaymentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  vendor: BudgetVendor | null;
};

export type CreateBudgetItemInput = {
  category: BudgetCategory;
  title: string;
  estimatedAmount?: number;
  actualAmount?: number;
  paymentStatus?: PaymentStatus;
  notes?: string;
  vendorId?: string;
};

export type UpdateBudgetItemInput = Partial<CreateBudgetItemInput>;

export function listBudgetItems(eventId: string, accessToken: string) {
  return apiRequest<BudgetItem[]>(`/events/${eventId}/budget-items`, {
    accessToken
  });
}

export function createBudgetItem(eventId: string, input: CreateBudgetItemInput, accessToken: string) {
  return apiRequest<BudgetItem>(`/events/${eventId}/budget-items`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function updateBudgetItem(
  eventId: string,
  budgetItemId: string,
  input: UpdateBudgetItemInput,
  accessToken: string
) {
  return apiRequest<BudgetItem>(`/events/${eventId}/budget-items/${budgetItemId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH"
  });
}
