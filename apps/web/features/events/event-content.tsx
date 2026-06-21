"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, FileText, LayoutList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ApiError } from "../../lib/api-client";
import { refreshSession } from "../../lib/auth-api";
import {
  createContentItem,
  listContentItems,
  updateContentItem,
  type ContentApprovalStatus,
  type ContentItem,
  type ContentPlatform
} from "../../lib/content-api";

type EventContentProps = {
  accessToken: string;
  canManageOperations: boolean;
  eventId: string;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  refreshToken: string;
};

const platforms: ContentPlatform[] = [
  "INSTAGRAM",
  "LINKEDIN",
  "FACEBOOK",
  "X_TWITTER",
  "WHATSAPP",
  "YOUTUBE",
  "PRESS",
  "OFFLINE_POSTERS",
  "STANDEE_BANNER"
];

const approvalStatuses: ContentApprovalStatus[] = ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED"];

const platformLabels: Record<ContentPlatform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  OFFLINE_POSTERS: "Offline Posters",
  PRESS: "Press",
  STANDEE_BANNER: "Standee / Banner",
  WHATSAPP: "WhatsApp",
  X_TWITTER: "X / Twitter",
  YOUTUBE: "YouTube"
};

const approvalStatusLabels: Record<ContentApprovalStatus, string> = {
  APPROVED: "Approved",
  DRAFT: "Draft",
  IN_REVIEW: "In Review",
  PUBLISHED: "Published"
};

const fieldClass =
  "h-10 rounded-md border border-campaign-mist bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15";
const textAreaClass =
  "min-h-28 rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15";

export function EventContent({
  accessToken,
  canManageOperations,
  eventId,
  onSessionExpired,
  onTokensRefreshed,
  refreshToken
}: EventContentProps) {
  const queryClient = useQueryClient();
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ContentApprovalStatus>("DRAFT");
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>("INSTAGRAM");
  const [scheduledFor, setScheduledFor] = useState("");
  const [title, setTitle] = useState("");

  const contentQuery = useQuery({
    queryFn: () => listContentItems(eventId, accessToken),
    queryKey: ["events", eventId, "content-items", accessToken]
  });

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(contentQuery.error instanceof ApiError) || contentQuery.error.status !== 401) {
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
  }, [contentQuery.error, onSessionExpired, onTokensRefreshed, refreshToken]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = {
        approvalStatus,
        caption: cleanString(caption),
        platform,
        scheduledFor: cleanString(scheduledFor),
        title: title.trim()
      };

      try {
        if (activeItemId) {
          return await updateContentItem(eventId, activeItemId, input, accessToken);
        }

        return await createContentItem(eventId, input, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);

        if (activeItemId) {
          return updateContentItem(eventId, activeItemId, input, refreshedSession.tokens.accessToken);
        }

        return createContentItem(eventId, input, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "content-items"] });
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "activity-logs"] });
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: ContentApprovalStatus }) => {
      try {
        return await updateContentItem(eventId, itemId, { approvalStatus: status }, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return updateContentItem(eventId, itemId, { approvalStatus: status }, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "content-items"] });
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "activity-logs"] });
    }
  });

  const items = contentQuery.data ?? [];
  const summary = useMemo(
    () => ({
      approved: items.filter((item) => item.approvalStatus === "APPROVED" || item.approvalStatus === "PUBLISHED").length,
      platforms: new Set(items.map((item) => item.platform)).size,
      scheduled: items.filter((item) => item.scheduledFor).length,
      total: items.length
    }),
    [items]
  );

  function saveItem() {
    if (!title.trim()) {
      return;
    }

    saveMutation.mutate();
  }

  function loadItem(item: ContentItem) {
    setActiveItemId(item.id);
    setApprovalStatus(item.approvalStatus);
    setCaption(item.caption ?? "");
    setPlatform(item.platform);
    setScheduledFor(toDateTimeInputValue(item.scheduledFor));
    setTitle(item.title);
  }

  function resetForm() {
    setActiveItemId(null);
    setApprovalStatus("DRAFT");
    setCaption("");
    setPlatform("INSTAGRAM");
    setScheduledFor("");
    setTitle("");
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <ContentMetric icon={LayoutList} label="Content items" value={String(summary.total)} />
        <ContentMetric icon={CalendarDays} label="Scheduled" value={String(summary.scheduled)} />
        <ContentMetric icon={CheckCircle2} label="Approved / Published" value={String(summary.approved)} />
        <ContentMetric icon={FileText} label="Platforms" value={String(summary.platforms)} />
      </div>

      {canManageOperations ? (
        <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{activeItemId ? "Edit Content Item" : "New Content Item"}</h2>
              <p className="text-xs text-muted-foreground">{contentQuery.isFetching ? "Syncing" : "Live"}</p>
            </div>
            {activeItemId ? (
              <Button onClick={resetForm} type="button" variant="outline">
                New Item
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 xl:grid-cols-[1fr_220px_200px_220px]">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-campaign-ink/70">Post title</span>
              <input className={fieldClass} onChange={(event) => setTitle(event.target.value)} value={title} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-campaign-ink/70">Platform</span>
              <select className={fieldClass} onChange={(event) => setPlatform(event.target.value as ContentPlatform)} value={platform}>
                {platforms.map((item) => (
                  <option key={item} value={item}>
                    {platformLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-campaign-ink/70">Status</span>
              <select
                className={fieldClass}
                onChange={(event) => setApprovalStatus(event.target.value as ContentApprovalStatus)}
                value={approvalStatus}
              >
                {approvalStatuses.map((item) => (
                  <option key={item} value={item}>
                    {approvalStatusLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-campaign-ink/70">Schedule</span>
              <input
                className={fieldClass}
                onChange={(event) => setScheduledFor(event.target.value)}
                type="datetime-local"
                value={scheduledFor}
              />
            </label>
          </div>

          <label className="mt-3 grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Caption / copy</span>
            <textarea className={textAreaClass} onChange={(event) => setCaption(event.target.value)} value={caption} />
          </label>

          {saveMutation.isError ? (
            <p className="mt-3 rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
              {saveMutation.error.message}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <Button disabled={!title.trim() || saveMutation.isPending} onClick={saveItem} type="button">
              {saveMutation.isPending ? "Saving..." : activeItemId ? "Save Changes" : "Create Content Item"}
            </Button>
          </div>
        </div>
      ) : (
        <ReadOnlyNotice />
      )}

      {contentQuery.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {contentQuery.error.message}
        </div>
      ) : null}

      {statusMutation.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {statusMutation.error.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Content Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {items.map((item) => (
                <ContentCard
                  canManageOperations={canManageOperations}
                  isUpdating={statusMutation.isPending}
                  item={item}
                  key={item.id}
                  onEdit={() => loadItem(item)}
                  onStatusChange={(status) => statusMutation.mutate({ itemId: item.id, status })}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-campaign-mist bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              No content items planned yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ContentCard({
  canManageOperations,
  isUpdating,
  item,
  onEdit,
  onStatusChange
}: {
  canManageOperations: boolean;
  isUpdating: boolean;
  item: ContentItem;
  onEdit: () => void;
  onStatusChange: (status: ContentApprovalStatus) => void;
}) {
  return (
    <article className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{item.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {platformLabels[item.platform]} · {formatDateTime(item.scheduledFor)}
          </p>
        </div>
        <span className="rounded-md bg-campaign-orange/10 px-2 py-1 text-[11px] font-medium text-campaign-orange">
          {approvalStatusLabels[item.approvalStatus]}
        </span>
      </div>

      {item.caption ? <p className="mt-3 line-clamp-4 text-xs leading-5 text-campaign-ink/75">{item.caption}</p> : null}

      <div className="mt-4 grid gap-2 text-xs md:grid-cols-2">
        <MetricLine label="Owner" value={item.owner?.name ?? "-"} />
        <MetricLine label="Asset" value={item.assetFile?.fileName ?? "-"} />
      </div>

      {canManageOperations ? (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button onClick={onEdit} size="sm" type="button" variant="outline">
            Edit
          </Button>
          <select
            className="h-9 rounded-md border border-campaign-mist bg-white px-2 text-xs outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
            disabled={isUpdating}
            onChange={(event) => onStatusChange(event.target.value as ContentApprovalStatus)}
            value={item.approvalStatus}
          >
            {approvalStatuses.map((status) => (
              <option key={status} value={status}>
                {approvalStatusLabels[status]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </article>
  );
}

function ContentMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof LayoutList;
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

function ReadOnlyNotice() {
  return (
    <div className="rounded-md border border-campaign-mist bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
      Your role has read-only access for this workspace area.
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-medium">{value}</p>
    </div>
  );
}

function cleanString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toDateTimeInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Unscheduled";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
