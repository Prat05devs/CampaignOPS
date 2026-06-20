"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  BadgeIndianRupee,
  Bot,
  CalendarClock,
  CheckSquare,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquareText,
  UsersRound,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { getEventAnalytics } from "../../lib/analytics-api";
import { logout, refreshSession } from "../../lib/auth-api";
import { ApiError } from "../../lib/api-client";
import { getEvent, type CampaignEvent, type EventCategory, type EventScaleTier } from "../../lib/events-api";
import {
  createTask,
  listTasks,
  updateTask,
  type CampaignTask,
  type TaskPriority,
  type TaskStatus
} from "../../lib/tasks-api";
import { useAuthStore } from "../../stores/auth-store";
import { EventActivityLog } from "./event-activity-log";
import { EventBudget } from "./event-budget";
import { EventContacts } from "./event-contacts";
import { EventFiles } from "./event-files";
import { EventOutreach } from "./event-outreach";
import { EventTimeline } from "./event-timeline";
import { EventVendors } from "./event-vendors";

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

const commandTabs = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Tasks", icon: CheckSquare },
  { label: "Timeline", icon: CalendarClock },
  { label: "Budget", icon: WalletCards },
  { label: "Vendors", icon: BadgeIndianRupee },
  { label: "Contacts", icon: UsersRound },
  { label: "Outreach", icon: Megaphone },
  { label: "Content", icon: MessageSquareText },
  { label: "Files", icon: FolderOpen },
  { label: "AI Plan", icon: Bot },
  { label: "Activity Log", icon: Activity },
  { label: "Report", icon: FileText }
] as const;

type CommandTab = (typeof commandTabs)[number]["label"];

const taskStatusLabels: Record<TaskStatus, string> = {
  BLOCKED: "Blocked",
  DONE: "Done",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  TODO: "Todo"
};

const taskPriorityLabels: Record<TaskPriority, string> = {
  HIGH: "High",
  LOW: "Low",
  MEDIUM: "Medium",
  URGENT: "Urgent"
};

const taskStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"];
const taskPriorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type EventCommandCentreProps = {
  eventId: string;
};

export function EventCommandCentre({ eventId }: EventCommandCentreProps) {
  const router = useRouter();
  const { clearSession, hasHydrated, organization, role, setTokens, tokens, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<CommandTab>("Overview");
  const canManageOperations = role === "ADMIN" || role === "MANAGER";

  const eventQuery = useQuery({
    enabled: Boolean(tokens?.accessToken && eventId),
    queryFn: () => getEvent(eventId, tokens?.accessToken ?? ""),
    queryKey: ["events", eventId, tokens?.accessToken]
  });

  useEffect(() => {
    if (hasHydrated && !tokens?.accessToken) {
      router.replace("/login");
    }
  }, [hasHydrated, router, tokens?.accessToken]);

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(eventQuery.error instanceof ApiError) || eventQuery.error.status !== 401 || !tokens?.refreshToken) {
        return;
      }

      try {
        const refreshedSession = await refreshSession(tokens.refreshToken);
        setTokens(refreshedSession.tokens);
      } catch {
        clearSession();
        router.replace("/login");
      }
    }

    void refreshExpiredAccessToken();
  }, [clearSession, eventQuery.error, router, setTokens, tokens?.refreshToken]);

  async function handleLogout() {
    if (tokens?.accessToken) {
      await logout(tokens.accessToken).catch(() => null);
    }

    clearSession();
    router.replace("/login");
  }

  if (!hasHydrated || !tokens?.accessToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-campaign-cream text-campaign-ink">
        <div className="rounded-md border border-campaign-mist bg-white px-4 py-3 text-sm text-muted-foreground">
          Loading event workspace...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-campaign-cream text-campaign-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-campaign-mist bg-white/70 px-4 py-5 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-campaign-ink text-sm font-semibold text-campaign-cream">
              CO
            </div>
            <div>
              <p className="text-sm font-semibold">CampaignOps</p>
              <p className="text-xs text-muted-foreground">{organization?.name ?? "Command centre"}</p>
            </div>
          </div>
          <nav className="space-y-1 text-sm">
            <Link
              className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-campaign-ink/70 hover:bg-campaign-mist hover:text-campaign-ink"
              href="/dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            {commandTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  className={
                    activeTab === tab.label
                      ? "flex w-full items-center gap-2 rounded-md bg-campaign-ink px-3 py-2 text-left font-medium text-campaign-cream"
                      : "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-medium text-campaign-ink/70 hover:bg-campaign-mist hover:text-campaign-ink"
                  }
                  key={tab.label}
                  onClick={() => setActiveTab(tab.label)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center justify-between gap-3 border-b border-campaign-mist bg-white/75 px-5 py-3">
            <div className="min-w-0">
              <Link className="mb-1 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground" href="/dashboard">
                <ArrowLeft className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <h1 className="truncate text-lg font-semibold tracking-tight">
                {eventQuery.data?.title ?? "Event Command Centre"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {user?.name} · {role}
              </p>
            </div>
            <Button aria-label="Log out" onClick={handleLogout} size="icon" type="button" variant="outline">
              <LogOut className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-6 p-5">
            {eventQuery.isError ? (
              <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
                {eventQuery.error.message}
              </div>
            ) : null}

            {eventQuery.isLoading ? (
              <div className="rounded-md border border-campaign-mist bg-white px-4 py-8 text-center text-sm text-muted-foreground">
                Loading event details...
              </div>
            ) : eventQuery.data && activeTab === "Overview" ? (
              <EventOverview
                accessToken={tokens.accessToken}
                event={eventQuery.data}
                onSessionExpired={() => {
                  clearSession();
                  router.replace("/login");
                }}
                onTokensRefreshed={setTokens}
                refreshToken={tokens.refreshToken}
              />
            ) : eventQuery.data && activeTab === "Tasks" ? (
              <EventTasksBoard
                accessToken={tokens.accessToken}
                canManageOperations={canManageOperations}
                eventId={eventId}
                onSessionExpired={() => {
                  clearSession();
                  router.replace("/login");
                }}
                onTokensRefreshed={setTokens}
                refreshToken={tokens.refreshToken}
              />
            ) : eventQuery.data && activeTab === "Timeline" ? (
              <EventTimeline
                accessToken={tokens.accessToken}
                event={eventQuery.data}
                onSessionExpired={() => {
                  clearSession();
                  router.replace("/login");
                }}
                onTokensRefreshed={setTokens}
                refreshToken={tokens.refreshToken}
              />
            ) : eventQuery.data && activeTab === "Budget" ? (
              <EventBudget
                accessToken={tokens.accessToken}
                canManageOperations={canManageOperations}
                event={eventQuery.data}
                onSessionExpired={() => {
                  clearSession();
                  router.replace("/login");
                }}
                onTokensRefreshed={setTokens}
                refreshToken={tokens.refreshToken}
              />
            ) : eventQuery.data && activeTab === "Vendors" ? (
              <EventVendors
                accessToken={tokens.accessToken}
                canManageOperations={canManageOperations}
                eventId={eventId}
                onSessionExpired={() => {
                  clearSession();
                  router.replace("/login");
                }}
                onTokensRefreshed={setTokens}
                refreshToken={tokens.refreshToken}
              />
            ) : eventQuery.data && activeTab === "Contacts" ? (
              <EventContacts
                accessToken={tokens.accessToken}
                canManageOperations={canManageOperations}
                eventId={eventId}
                onSessionExpired={() => {
                  clearSession();
                  router.replace("/login");
                }}
                onTokensRefreshed={setTokens}
                refreshToken={tokens.refreshToken}
              />
            ) : eventQuery.data && activeTab === "Outreach" ? (
              <EventOutreach
                accessToken={tokens.accessToken}
                canManageOperations={canManageOperations}
                eventId={eventId}
                eventTitle={eventQuery.data.title}
                onSessionExpired={() => {
                  clearSession();
                  router.replace("/login");
                }}
                onTokensRefreshed={setTokens}
                refreshToken={tokens.refreshToken}
              />
            ) : eventQuery.data && activeTab === "Files" ? (
              <EventFiles
                accessToken={tokens.accessToken}
                canManageOperations={canManageOperations}
                eventId={eventId}
                onSessionExpired={() => {
                  clearSession();
                  router.replace("/login");
                }}
                onTokensRefreshed={setTokens}
                refreshToken={tokens.refreshToken}
              />
            ) : eventQuery.data && activeTab === "Activity Log" ? (
              <EventActivityLog
                accessToken={tokens.accessToken}
                eventId={eventId}
                onSessionExpired={() => {
                  clearSession();
                  router.replace("/login");
                }}
                onTokensRefreshed={setTokens}
                refreshToken={tokens.refreshToken}
              />
            ) : eventQuery.data ? (
              <LockedTabPlaceholder activeTab={activeTab} />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function EventTasksBoard({
  accessToken,
  canManageOperations,
  eventId,
  onSessionExpired,
  onTokensRefreshed,
  refreshToken
}: {
  accessToken: string;
  canManageOperations: boolean;
  eventId: string;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  refreshToken: string;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState("");

  const tasksQuery = useQuery({
    queryFn: () => listTasks(eventId, accessToken),
    queryKey: ["events", eventId, "tasks", accessToken]
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

  const createMutation = useMutation({
    mutationFn: async () => {
      const input = {
        checklist: parseChecklist(checklist),
        dueAt: cleanString(dueAt),
        notes: cleanString(notes),
        priority,
        title: title.trim()
      };

      try {
        return await createTask(eventId, input, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return createTask(eventId, input, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      setTitle("");
      setPriority("MEDIUM");
      setDueAt("");
      setNotes("");
      setChecklist("");
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "tasks"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ status, taskId }: { status: TaskStatus; taskId: string }) => {
      try {
        return await updateTask(eventId, taskId, { status }, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return updateTask(eventId, taskId, { status }, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "tasks"] });
    }
  });

  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, CampaignTask[]> = {
      BLOCKED: [],
      DONE: [],
      IN_PROGRESS: [],
      REVIEW: [],
      TODO: []
    };

    for (const task of tasksQuery.data ?? []) {
      groups[task.status].push(task);
    }

    return groups;
  }, [tasksQuery.data]);

  function handleCreateTask() {
    if (!title.trim()) {
      return;
    }

    createMutation.mutate();
  }

  return (
    <section className="space-y-5">
      {canManageOperations ? (
        <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Task Board</h2>
            <p className="text-xs text-muted-foreground">Event-wise tasks by status and priority.</p>
          </div>
          <span className="text-xs text-muted-foreground">{tasksQuery.isFetching ? "Syncing" : "Live"}</span>
        </div>
        <div className="grid gap-3 xl:grid-cols-[1fr_160px_200px]">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Task title</span>
            <input
              className="h-10 rounded-md border border-campaign-mist bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Priority</span>
            <select
              className="h-10 rounded-md border border-campaign-mist bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
              value={priority}
            >
              {taskPriorities.map((item) => (
                <option key={item} value={item}>
                  {taskPriorityLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Due date</span>
            <input
              className="h-10 rounded-md border border-campaign-mist bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
              onChange={(event) => setDueAt(event.target.value)}
              type="datetime-local"
              value={dueAt}
            />
          </label>
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Notes</span>
            <textarea
              className="min-h-20 rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-campaign-ink/70">Checklist</span>
            <textarea
              className="min-h-20 rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
              onChange={(event) => setChecklist(event.target.value)}
              value={checklist}
            />
          </label>
        </div>
        {createMutation.isError ? (
          <p className="mt-3 rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
            {createMutation.error.message}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <Button disabled={!title.trim() || createMutation.isPending} onClick={handleCreateTask} type="button">
            {createMutation.isPending ? "Creating..." : "Create Task"}
          </Button>
        </div>
        </div>
      ) : (
        <ReadOnlyNotice />
      )}

      {tasksQuery.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {tasksQuery.error.message}
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-5">
        {taskStatuses.map((status) => (
          <div className="rounded-md border border-campaign-mist bg-white/70 p-3" key={status}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{taskStatusLabels[status]}</h3>
              <span className="rounded-md bg-campaign-mist px-2 py-1 text-[11px] text-campaign-ink/70">
                {groupedTasks[status].length}
              </span>
            </div>
            <div className="space-y-3">
              {groupedTasks[status].map((task) => (
                <TaskCard
                  isUpdating={updateMutation.isPending}
                  canManageOperations={canManageOperations}
                  key={task.id}
                  onStatusChange={(nextStatus) => updateMutation.mutate({ status: nextStatus, taskId: task.id })}
                  task={task}
                />
              ))}
              {!groupedTasks[status].length ? (
                <div className="rounded-md border border-dashed border-campaign-mist bg-white px-3 py-6 text-center text-xs text-muted-foreground">
                  No tasks
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TaskCard({
  canManageOperations,
  isUpdating,
  onStatusChange,
  task
}: {
  canManageOperations: boolean;
  isUpdating: boolean;
  onStatusChange: (status: TaskStatus) => void;
  task: CampaignTask;
}) {
  const checklist = Array.isArray(task.checklistJson) ? task.checklistJson : [];

  return (
    <article className="rounded-md border border-campaign-mist bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-5">{task.title}</h4>
        <span className="rounded-md bg-campaign-orange/10 px-2 py-1 text-[11px] font-medium text-campaign-orange">
          {taskPriorityLabels[task.priority]}
        </span>
      </div>
      {task.notes ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{task.notes}</p> : null}
      <div className="mt-3 space-y-1 text-xs text-campaign-ink/70">
        <p>Due: {formatDateTime(task.dueAt)}</p>
        <p>Owner: {task.assignee?.name ?? task.createdBy.name}</p>
      </div>
      {checklist.length ? (
        <div className="mt-3 space-y-1">
          {checklist.slice(0, 3).map((item) => (
            <p className="truncate text-xs text-muted-foreground" key={item}>
              {item}
            </p>
          ))}
        </div>
      ) : null}
      <label className="mt-3 grid gap-1">
        <span className="text-[11px] uppercase text-muted-foreground">Status</span>
        <select
          className="h-9 rounded-md border border-campaign-mist bg-white px-2 text-xs outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
          disabled={isUpdating || !canManageOperations}
          onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
          value={task.status}
        >
          {taskStatuses.map((status) => (
            <option key={status} value={status}>
              {taskStatusLabels[status]}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}

function ReadOnlyNotice() {
  return (
    <div className="rounded-md border border-campaign-mist bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
      Your role has read-only access for this workspace area.
    </div>
  );
}

function EventOverview({
  accessToken,
  event,
  onSessionExpired,
  onTokensRefreshed,
  refreshToken
}: {
  accessToken: string;
  event: CampaignEvent;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  refreshToken: string;
}) {
  const stakeholders = Array.isArray(event.stakeholdersJson) ? event.stakeholdersJson : [];
  const analyticsQuery = useQuery({
    queryFn: () => getEventAnalytics(event.id, accessToken),
    queryKey: ["events", event.id, "analytics", accessToken]
  });
  const analytics = analyticsQuery.data;

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(analyticsQuery.error instanceof ApiError) || analyticsQuery.error.status !== 401) {
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
  }, [analyticsQuery.error, onSessionExpired, onTokensRefreshed, refreshToken]);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric label="Status" value={event.status.replace("_", " ")} />
        <OverviewMetric label="Type" value={categoryLabels[event.category]} />
        <OverviewMetric label="Scale" value={scaleLabels[event.scaleTier]} />
        <OverviewMetric
          label="Budget"
          value={event.estimatedBudgetAmount ? formatCurrency(Number(event.estimatedBudgetAmount)) : "-"}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric label="Task completion" value={`${analytics?.tasks.completionPercent ?? 0}%`} />
        <OverviewMetric label="Open tasks" value={String(analytics?.tasks.open ?? 0)} />
        <OverviewMetric label="Budget variance" value={formatCurrency(analytics?.budget.variance ?? 0)} />
        <OverviewMetric label="Contacts / vendors" value={`${analytics?.contacts ?? 0} / ${analytics?.vendors ?? 0}`} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric label="Upcoming deadlines" value={String(analytics?.tasks.upcoming ?? 0)} />
        <OverviewMetric label="Overdue tasks" value={String(analytics?.tasks.overdue ?? 0)} />
        <OverviewMetric label="Files" value={String(analytics?.files ?? 0)} />
        <OverviewMetric label="Outreach drafts" value={String(analytics?.outreachDrafts ?? 0)} />
      </section>

      {analyticsQuery.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {analyticsQuery.error.message}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Event Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <DetailLine label="Subtype" value={event.subtype} />
            <DetailLine label="Expected pax" value={event.expectedPax === null ? "-" : String(event.expectedPax)} />
            <DetailLine label="City" value={event.city ?? "-"} />
            <DetailLine label="Venue" value={event.venue ?? "-"} />
            <DetailLine label="Starts" value={formatDateTime(event.startsAt)} />
            <DetailLine label="Ends" value={formatDateTime(event.endsAt)} />
            <DetailLine label="Department / client / org" value={event.departmentOrClient ?? "-"} />
            <DetailLine label="Brand context" value={event.brandContext ?? "-"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stakeholders</CardTitle>
          </CardHeader>
          <CardContent>
            {stakeholders.length ? (
              <div className="space-y-2">
                {stakeholders.map((stakeholder) => (
                  <div
                    className="rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm"
                    key={stakeholder}
                  >
                    {stakeholder}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No stakeholders added yet.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Objective</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-campaign-ink/75">{event.objective ?? "No objective added yet."}</p>
        </CardContent>
      </Card>
    </>
  );
}

function LockedTabPlaceholder({ activeTab }: { activeTab: CommandTab }) {
  return (
    <div className="rounded-md border border-dashed border-campaign-mist bg-white px-4 py-10 text-center">
      <h2 className="text-base font-semibold">{activeTab}</h2>
      <p className="mt-1 text-sm text-muted-foreground">This workspace tab is locked for its build-order slice.</p>
    </div>
  );
}

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-campaign-mist bg-white px-3 py-2">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function cleanString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseChecklist(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
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
