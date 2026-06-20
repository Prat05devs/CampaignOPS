"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, CircleDot, Clock, UserRound } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { listActivityLogs, type ActivityLog } from "../../lib/activity-api";
import { ApiError } from "../../lib/api-client";
import { refreshSession } from "../../lib/auth-api";

type EventActivityLogProps = {
  accessToken: string;
  eventId: string;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  refreshToken: string;
};

const actionLabels: Record<string, string> = {
  BUDGET_ITEM_CREATED: "Budget item created",
  BUDGET_ITEM_UPDATED: "Budget item updated",
  BUDGET_PAYMENT_STATUS_CHANGED: "Budget payment status changed",
  CONTACT_ADDED: "Contact added",
  CONTACT_STATUS_CHANGED: "Contact status changed",
  CONTACT_UPDATED: "Contact updated",
  EVENT_CREATED: "Event created",
  EVENT_STATUS_CHANGED: "Event status changed",
  EVENT_UPDATED: "Event updated",
  FILE_DELETED: "File deleted",
  FILE_UPLOADED: "File uploaded",
  OUTREACH_DRAFT_CREATED: "Outreach draft created",
  OUTREACH_DRAFT_UPDATED: "Outreach draft updated",
  TASK_CREATED: "Task created",
  TASK_STATUS_CHANGED: "Task status changed",
  TASK_UPDATED: "Task updated",
  VENDOR_ASSIGNED: "Vendor assigned",
  VENDOR_PAYMENT_STATUS_CHANGED: "Vendor payment status changed",
  VENDOR_UPDATED: "Vendor updated"
};

export function EventActivityLog({
  accessToken,
  eventId,
  onSessionExpired,
  onTokensRefreshed,
  refreshToken
}: EventActivityLogProps) {
  const activityQuery = useQuery({
    queryFn: () => listActivityLogs(eventId, accessToken),
    queryKey: ["events", eventId, "activity-logs", accessToken]
  });

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(activityQuery.error instanceof ApiError) || activityQuery.error.status !== 401) {
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
  }, [activityQuery.error, onSessionExpired, onTokensRefreshed, refreshToken]);

  const logs = activityQuery.data ?? [];
  const summary = useMemo(
    () => ({
      actors: new Set(logs.map((log) => log.user?.id).filter(Boolean)).size,
      today: logs.filter((log) => isToday(log.createdAt)).length,
      total: logs.length
    }),
    [logs]
  );

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <ActivityMetric icon={Activity} label="Recent actions" value={String(summary.total)} />
        <ActivityMetric icon={UserRound} label="Actors" value={String(summary.actors)} />
        <ActivityMetric icon={Clock} label="Today" value={String(summary.today)} />
      </div>

      {activityQuery.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {activityQuery.error.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <ActivityRow key={log.id} log={log} />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-campaign-mist bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              No activity recorded for this event yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ActivityMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-campaign-orange/10 text-campaign-orange">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ActivityRow({ log }: { log: ActivityLog }) {
  const metadata = toMetadata(log.metadataJson);

  return (
    <article className="grid gap-3 rounded-md border border-campaign-mist bg-white p-3 md:grid-cols-[32px_1fr_170px] md:items-start">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-campaign-mist text-campaign-ink/70">
        <CircleDot className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{actionLabels[log.action] ?? log.action.replaceAll("_", " ")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {log.user?.name ?? "System"} · {log.entityType}
        </p>
        {metadata ? <p className="mt-2 truncate text-xs text-campaign-ink/70">{metadata}</p> : null}
      </div>
      <p className="text-xs text-muted-foreground md:text-right">{formatDateTime(log.createdAt)}</p>
    </article>
  );
}

function toMetadata(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const metadata = value as Record<string, unknown>;
  const title = typeof metadata.title === "string" ? metadata.title : "";
  const name = typeof metadata.name === "string" ? metadata.name : "";
  const fileName = typeof metadata.fileName === "string" ? metadata.fileName : "";
  const status = typeof metadata.status === "string" ? metadata.status.replaceAll("_", " ") : "";
  const paymentStatus = typeof metadata.paymentStatus === "string" ? metadata.paymentStatus.replaceAll("_", " ") : "";
  const category = typeof metadata.category === "string" ? metadata.category.replaceAll("_", " ") : "";
  const channel = typeof metadata.channel === "string" ? metadata.channel.replaceAll("_", " ") : "";

  return [title || name || fileName, status || paymentStatus || category || channel].filter(Boolean).join(" · ");
}

function isToday(value: string) {
  const date = new Date(value);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
