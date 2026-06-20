import { type ActivityLog } from "./activity-api";
import { apiRequest } from "./api-client";

export type DashboardAnalytics = {
  activeEvents: number;
  budgetAlerts: number;
  contacts: number;
  openTasks: number;
  overdueTasks: number;
  recentActivity: ActivityLog[];
  totalBudgetTracked: number;
  upcomingDeadlines: number;
  vendors: number;
};

export type EventAnalytics = {
  budget: {
    actual: number;
    alerts: number;
    estimated: number;
    overduePayments: number;
    remaining: number;
    variance: number;
  };
  contacts: number;
  files: number;
  outreachDrafts: number;
  recentActivity: ActivityLog[];
  tasks: {
    blocked: number;
    completionPercent: number;
    done: number;
    open: number;
    overdue: number;
    total: number;
    upcoming: number;
  };
  vendors: number;
};

export function getDashboardAnalytics(accessToken: string) {
  return apiRequest<DashboardAnalytics>("/analytics/dashboard", {
    accessToken
  });
}

export function getEventAnalytics(eventId: string, accessToken: string) {
  return apiRequest<EventAnalytics>(`/events/${eventId}/analytics`, {
    accessToken
  });
}
