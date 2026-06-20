"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, Circle, Clock3 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { refreshSession } from "../../lib/auth-api";
import { ApiError } from "../../lib/api-client";
import { type CampaignEvent } from "../../lib/events-api";
import { listTasks, type CampaignTask } from "../../lib/tasks-api";

type EventTimelineProps = {
  accessToken: string;
  event: CampaignEvent;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  refreshToken: string;
};

export function EventTimeline({
  accessToken,
  event,
  onSessionExpired,
  onTokensRefreshed,
  refreshToken
}: EventTimelineProps) {
  const tasksQuery = useQuery({
    queryFn: () => listTasks(event.id, accessToken),
    queryKey: ["events", event.id, "tasks", accessToken]
  });

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(tasksQuery.error instanceof ApiError) || tasksQuery.error.status !== 401) {
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
  }, [onSessionExpired, onTokensRefreshed, refreshToken, tasksQuery.error]);

  const tasks = tasksQuery.data ?? [];
  const datedTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.dueAt)
        .sort((first, second) => new Date(first.dueAt ?? 0).getTime() - new Date(second.dueAt ?? 0).getTime()),
    [tasks]
  );
  const unscheduledTasks = tasks.filter((task) => !task.dueAt);
  const checklistItems = tasks.flatMap((task) =>
    Array.isArray(task.checklistJson)
      ? task.checklistJson.map((item) => ({
          item,
          task
        }))
      : []
  );
  const overdueTasks = datedTasks.filter((task) => isOverdue(task));

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <TimelineMetric icon={CalendarClock} label="Event starts" value={formatDateTime(event.startsAt)} />
        <TimelineMetric icon={Clock3} label="Event ends" value={formatDateTime(event.endsAt)} />
        <TimelineMetric icon={AlertTriangle} label="Overdue tasks" value={String(overdueTasks.length)} />
        <TimelineMetric icon={CheckCircle2} label="Checklist items" value={String(checklistItems.length)} />
      </div>

      {tasksQuery.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {tasksQuery.error.message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Timeline</CardTitle>
            <span className="text-xs text-muted-foreground">{tasksQuery.isFetching ? "Syncing" : "Live"}</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {datedTasks.map((task) => (
                <TimelineTask key={task.id} task={task} />
              ))}
              {!datedTasks.length ? (
                <div className="rounded-md border border-dashed border-campaign-mist bg-white px-4 py-8 text-center text-sm text-muted-foreground">
                  No dated tasks yet.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event-Day Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            {checklistItems.length ? (
              <div className="space-y-2">
                {checklistItems.map(({ item, task }) => (
                  <div className="rounded-md border border-campaign-mist bg-white px-3 py-2" key={`${task.id}-${item}`}>
                    <div className="flex items-start gap-2">
                      <Circle className="mt-0.5 h-3.5 w-3.5 text-campaign-orange" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No checklist items added to tasks yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {unscheduledTasks.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Unscheduled Tasks</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {unscheduledTasks.map((task) => (
              <div className="rounded-md border border-campaign-mist bg-white p-3" key={task.id}>
                <p className="text-sm font-semibold">{task.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{task.status.replace("_", " ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function TimelineMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof CalendarClock;
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

function TimelineTask({ task }: { task: CampaignTask }) {
  const overdue = isOverdue(task);

  return (
    <article className="rounded-md border border-campaign-mist bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{task.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(task.dueAt)}</p>
        </div>
        <span
          className={
            overdue
              ? "rounded-md bg-campaign-orange/10 px-2 py-1 text-[11px] font-medium text-campaign-orange"
              : "rounded-md bg-campaign-mist px-2 py-1 text-[11px] font-medium text-campaign-ink/70"
          }
        >
          {overdue ? "Overdue" : task.status.replace("_", " ")}
        </span>
      </div>
      {task.notes ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{task.notes}</p> : null}
    </article>
  );
}

function isOverdue(task: CampaignTask) {
  return Boolean(task.dueAt && !["DONE", "BLOCKED"].includes(task.status) && new Date(task.dueAt).getTime() < Date.now());
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
