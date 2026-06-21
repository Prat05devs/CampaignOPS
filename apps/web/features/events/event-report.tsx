"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckSquare, FileText, IndianRupee, UsersRound } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { getEventAnalytics } from "../../lib/analytics-api";
import { ApiError } from "../../lib/api-client";
import { refreshSession } from "../../lib/auth-api";
import { listBudgetItems } from "../../lib/budget-api";
import { listContentItems } from "../../lib/content-api";
import { type CampaignEvent, type EventCategory, type EventScaleTier } from "../../lib/events-api";
import { listTasks, type TaskStatus } from "../../lib/tasks-api";

type EventReportProps = {
  accessToken: string;
  event: CampaignEvent;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  refreshToken: string;
};

const categoryLabels: Record<EventCategory, string> = {
  GOVERNMENT_CSR: "Government / CSR",
  HOLY_SIN_CAFE: "Holy Sin Cafe",
  PRIME_CIRCLE: "Prime Circle",
  PRIVATE_CLIENT: "Private Client"
};

const scaleLabels: Record<EventScaleTier, string> = {
  LARGE: "Large",
  MASS: "Mass",
  MEDIUM: "Medium",
  MICRO: "Micro",
  SMALL: "Small"
};

const taskStatusLabels: Record<TaskStatus, string> = {
  BLOCKED: "Blocked",
  DONE: "Done",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  TODO: "Todo"
};

const taskStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"];

export function EventReport({
  accessToken,
  event,
  onSessionExpired,
  onTokensRefreshed,
  refreshToken
}: EventReportProps) {
  const analyticsQuery = useQuery({
    queryFn: () => getEventAnalytics(event.id, accessToken),
    queryKey: ["events", event.id, "analytics", accessToken]
  });

  const tasksQuery = useQuery({
    queryFn: () => listTasks(event.id, accessToken),
    queryKey: ["events", event.id, "tasks", accessToken]
  });

  const budgetQuery = useQuery({
    queryFn: () => listBudgetItems(event.id, accessToken),
    queryKey: ["events", event.id, "budget-items", accessToken]
  });

  const contentQuery = useQuery({
    queryFn: () => listContentItems(event.id, accessToken),
    queryKey: ["events", event.id, "content-items", accessToken]
  });

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      const errors = [analyticsQuery.error, tasksQuery.error, budgetQuery.error, contentQuery.error];
      const hasUnauthorized = errors.some((error) => error instanceof ApiError && error.status === 401);

      if (!hasUnauthorized) {
        return;
      }

      try {
        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
      } catch {
        onSessionExpired();
      }
    }

    void refreshExpiredAccessToken();
  }, [
    analyticsQuery.error,
    budgetQuery.error,
    contentQuery.error,
    onSessionExpired,
    onTokensRefreshed,
    refreshToken,
    tasksQuery.error
  ]);

  const analytics = analyticsQuery.data;
  const tasks = tasksQuery.data ?? [];
  const budgetItems = budgetQuery.data ?? [];
  const contentItems = contentQuery.data ?? [];

  const taskCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      BLOCKED: 0,
      DONE: 0,
      IN_PROGRESS: 0,
      REVIEW: 0,
      TODO: 0
    };

    for (const task of tasks) {
      counts[task.status] += 1;
    }

    return counts;
  }, [tasks]);

  const contentSummary = useMemo(
    () => ({
      approved: contentItems.filter((item) => item.approvalStatus === "APPROVED").length,
      published: contentItems.filter((item) => item.approvalStatus === "PUBLISHED").length,
      scheduled: contentItems.filter((item) => item.scheduledFor).length,
      total: contentItems.length
    }),
    [contentItems]
  );

  const topBudgetItems = [...budgetItems]
    .sort((first, second) => Number(second.estimatedAmount) - Number(first.estimatedAmount))
    .slice(0, 5);

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ReportMetric icon={FileText} label="Event status" value={event.status.replace("_", " ")} />
        <ReportMetric icon={CheckSquare} label="Task completion" value={`${analytics?.tasks.completionPercent ?? 0}%`} />
        <ReportMetric icon={IndianRupee} label="Budget variance" value={formatCurrency(analytics?.budget.variance ?? 0)} />
        <ReportMetric icon={UsersRound} label="Stakeholders" value={`${analytics?.contacts ?? 0} / ${analytics?.vendors ?? 0}`} />
        <ReportMetric icon={BarChart3} label="Content items" value={String(contentSummary.total)} />
      </div>

      {analyticsQuery.isError || tasksQuery.isError || budgetQuery.isError || contentQuery.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          Unable to load one or more report sections.
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Event Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <ReportLine label="Title" value={event.title} />
            <ReportLine label="Type" value={categoryLabels[event.category]} />
            <ReportLine label="Subtype" value={event.subtype} />
            <ReportLine label="Scale" value={scaleLabels[event.scaleTier]} />
            <ReportLine label="Expected pax" value={event.expectedPax === null ? "-" : String(event.expectedPax)} />
            <ReportLine label="City / venue" value={`${event.city ?? "-"} / ${event.venue ?? "-"}`} />
            <ReportLine label="Starts" value={formatDateTime(event.startsAt)} />
            <ReportLine label="Ends" value={formatDateTime(event.endsAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Post-event Report Draft Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "Event objective and final execution summary",
              "Attendance, stakeholders, contacts, and vendor participation",
              "Task completion, blockers, and operational issues",
              "Estimated vs actual budget and payment status",
              "Content, files, outreach, and media coverage summary",
              "Learnings, vendor notes, and reusable playbook entries"
            ].map((item) => (
              <div className="rounded-md border border-campaign-mist bg-white px-3 py-2 text-xs leading-5 text-campaign-ink/75" key={item}>
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Task Completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {taskStatuses.map((status) => (
              <ReportBar
                key={status}
                label={taskStatusLabels[status]}
                total={tasks.length}
                value={taskCounts[status]}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ReportLine label="Estimated" value={formatCurrency(analytics?.budget.estimated ?? 0)} />
            <ReportLine label="Actual" value={formatCurrency(analytics?.budget.actual ?? 0)} />
            <ReportLine label="Remaining" value={formatCurrency(analytics?.budget.remaining ?? 0)} />
            <ReportLine label="Overdue payments" value={String(analytics?.budget.overduePayments ?? 0)} />
            <ReportLine label="Budget alerts" value={String(analytics?.budget.alerts ?? 0)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ReportLine label="Contacts" value={String(analytics?.contacts ?? 0)} />
            <ReportLine label="Vendors" value={String(analytics?.vendors ?? 0)} />
            <ReportLine label="Files" value={String(analytics?.files ?? 0)} />
            <ReportLine label="Outreach drafts" value={String(analytics?.outreachDrafts ?? 0)} />
            <ReportLine label="Scheduled content" value={String(contentSummary.scheduled)} />
            <ReportLine label="Approved / published content" value={`${contentSummary.approved} / ${contentSummary.published}`} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Top Budget Lines</CardTitle>
        </CardHeader>
        <CardContent>
          {topBudgetItems.length ? (
            <div className="space-y-2">
              {topBudgetItems.map((item) => (
                <div
                  className="grid gap-2 rounded-md border border-campaign-mist bg-white px-3 py-2 text-xs md:grid-cols-[1fr_130px_130px_120px]"
                  key={item.id}
                >
                  <span className="font-semibold">{item.title}</span>
                  <span>{formatCurrency(Number(item.estimatedAmount))}</span>
                  <span>{formatCurrency(Number(item.actualAmount))}</span>
                  <span className="text-muted-foreground">{item.paymentStatus.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No budget lines added yet.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ReportMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-campaign-orange/10 text-campaign-orange">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}

function ReportLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-campaign-mist bg-white px-3 py-2">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function ReportBar({ label, total, value }: { label: string; total: number; value: number }) {
  const percent = total ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-campaign-mist">
        <div className="h-full rounded-full bg-campaign-orange" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  if (!value) {
    return "0";
  }

  return new Intl.NumberFormat("en-IN", {
    compactDisplay: "short",
    currency: "INR",
    maximumFractionDigits: 1,
    notation: "compact",
    style: "currency"
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
