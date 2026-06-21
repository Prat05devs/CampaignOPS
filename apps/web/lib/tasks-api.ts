import { apiRequest } from "./api-client";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskUser = {
  avatarUrl: string | null;
  id: string;
  name: string;
  email: string;
};

export type CampaignTask = {
  id: string;
  eventId: string;
  createdById: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  notes: string | null;
  checklistJson: string[] | null;
  attachmentsJson: unknown | null;
  createdAt: string;
  updatedAt: string;
  assignee: TaskUser | null;
  createdBy: TaskUser;
};

export type GlobalCampaignTask = CampaignTask & {
  event: {
    id: string;
    title: string;
    category: string;
    scaleTier: string;
    status: string;
  };
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string;
  notes?: string;
  checklist?: string[];
  assigneeId?: string;
};

export type UpdateTaskInput = Partial<CreateTaskInput>;

export function listTasks(eventId: string, accessToken: string) {
  return apiRequest<CampaignTask[]>(`/events/${eventId}/tasks`, {
    accessToken
  });
}

export function listGlobalTasks(accessToken: string, status?: TaskStatus) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";

  return apiRequest<GlobalCampaignTask[]>(`/tasks${query}`, {
    accessToken
  });
}

export function createTask(eventId: string, input: CreateTaskInput, accessToken: string) {
  return apiRequest<CampaignTask>(`/events/${eventId}/tasks`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST"
  });
}

export function updateTask(eventId: string, taskId: string, input: UpdateTaskInput, accessToken: string) {
  return apiRequest<CampaignTask>(`/events/${eventId}/tasks/${taskId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH"
  });
}
