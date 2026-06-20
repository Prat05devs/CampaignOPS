import { API_BASE_URL, ApiError, apiRequest } from "./api-client";

export type FileCategory =
  | "PROPOSAL"
  | "BUDGET"
  | "POSTER"
  | "CREATIVE"
  | "AGREEMENT"
  | "PERMISSION"
  | "QUOTATION"
  | "REPORT"
  | "PHOTO"
  | "VIDEO"
  | "PR_DOCUMENT"
  | "TEMPLATE";

export type FileAsset = {
  id: string;
  organizationId: string;
  eventId: string | null;
  uploadedById: string;
  category: FileCategory;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy: {
    email: string;
    id: string;
    name: string;
  };
};

export function listFileAssets(eventId: string, accessToken: string) {
  return apiRequest<FileAsset[]>(`/events/${eventId}/files`, {
    accessToken
  });
}

export function uploadFileAsset(eventId: string, input: { category: FileCategory; file: File }, accessToken: string) {
  const formData = new FormData();
  formData.append("category", input.category);
  formData.append("file", input.file);

  return apiRequest<FileAsset>(`/events/${eventId}/files`, {
    accessToken,
    body: formData,
    method: "POST"
  });
}

export function deleteFileAsset(eventId: string, fileId: string, accessToken: string) {
  return apiRequest<{ success: boolean }>(`/events/${eventId}/files/${fileId}`, {
    accessToken,
    method: "DELETE"
  });
}

export async function downloadFileAsset(eventId: string, fileId: string, accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/files/${fileId}/download`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    const message = Array.isArray(data?.message)
      ? data.message.join(" ")
      : typeof data?.message === "string"
        ? data.message
        : "Download failed.";

    throw new ApiError(message, response.status);
  }

  return response.blob();
}
