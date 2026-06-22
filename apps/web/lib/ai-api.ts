import { apiRequest } from "./api-client";
import type { BudgetItem } from "./budget-api";
import type { OutreachTemplate } from "./outreach-api";
import type { CampaignTask } from "./tasks-api";

export type AIOutputType =
  | "EVENT_PLAN"
  | "STRATEGY"
  | "BUDGET"
  | "TASKS"
  | "OUTREACH"
  | "CONTENT_CALENDAR"
  | "RISK_CHECKLIST"
  | "REPORT";

export type AIOutput = {
  id: string;
  eventId: string;
  outputType: AIOutputType;
  title: string;
  responseJson: unknown;
  isAccepted: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    email: string;
    id: string;
    name: string;
  };
};

export type AIWorkflowRun = {
  id: string;
  organizationId: string;
  eventId: string | null;
  workflowType: string;
  inputJson: unknown;
  retrievedContextJson: unknown;
  outputJson: unknown;
  status: string;
  modelUsed: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type GenerateEventPlanResponse = {
  output: AIOutput;
  workflowRun: AIWorkflowRun;
};

export type ConvertAIOutputToTasksResponse = {
  convertedCount: number;
  tasks: CampaignTask[];
};

export type ConvertAIOutputToBudgetResponse = {
  budgetItems: BudgetItem[];
  convertedCount: number;
};

export type ConvertAIOutputToOutreachResponse = {
  convertedCount: number;
  templates: OutreachTemplate[];
};

export function listAIOutputs(eventId: string, accessToken: string) {
  return apiRequest<AIOutput[]>(`/events/${eventId}/ai-outputs`, {
    accessToken
  });
}

export function generateEventPlan(eventId: string, accessToken: string) {
  return apiRequest<GenerateEventPlanResponse>(`/events/${eventId}/ai/event-plan`, {
    accessToken,
    method: "POST"
  });
}

export function updateAIOutput(
  eventId: string,
  outputId: string,
  input: { responseJson?: unknown; title?: string },
  accessToken: string
) {
  return apiRequest<AIOutput>(`/events/${eventId}/ai-outputs/${outputId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH"
  });
}

export function acceptAIOutput(eventId: string, outputId: string, accessToken: string) {
  return apiRequest<AIOutput>(`/events/${eventId}/ai-outputs/${outputId}/accept`, {
    accessToken,
    method: "PATCH"
  });
}

export function convertAIOutputToTasks(eventId: string, outputId: string, accessToken: string) {
  return apiRequest<ConvertAIOutputToTasksResponse>(`/events/${eventId}/ai-outputs/${outputId}/convert/tasks`, {
    accessToken,
    method: "POST"
  });
}

export function convertAIOutputToBudget(eventId: string, outputId: string, accessToken: string) {
  return apiRequest<ConvertAIOutputToBudgetResponse>(`/events/${eventId}/ai-outputs/${outputId}/convert/budget`, {
    accessToken,
    method: "POST"
  });
}

export function convertAIOutputToOutreach(eventId: string, outputId: string, accessToken: string) {
  return apiRequest<ConvertAIOutputToOutreachResponse>(`/events/${eventId}/ai-outputs/${outputId}/convert/outreach`, {
    accessToken,
    method: "POST"
  });
}
