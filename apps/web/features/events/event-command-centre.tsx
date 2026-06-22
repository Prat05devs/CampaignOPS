"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  BadgeIndianRupee,
  Bot,
  CalendarClock,
  ChevronRight,
  CheckSquare,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  MessageSquareText,
  Route,
  Target,
  type LucideIcon,
  UsersRound,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "../../components/brand-logo";
import { MobileBottomNav } from "../../components/mobile-bottom-nav";
import { Button } from "../../components/ui/button";
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
import { EventAIPlan } from "./event-ai-plan";
import { EventBudget } from "./event-budget";
import { EventContacts } from "./event-contacts";
import { EventContent } from "./event-content";
import { EventFiles } from "./event-files";
import { EventOutreach } from "./event-outreach";
import { EventReport } from "./event-report";
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
type CommandIcon = LucideIcon;
type MetricTone = "black" | "blue" | "green" | "red" | "white";

const metricToneStyles: Record<
  MetricTone,
  {
    accent: string;
    icon: string;
    line: string;
  }
> = {
  black: {
    accent: "bg-[#10141A] text-white",
    icon: "text-white",
    line: "bg-[#10141A]"
  },
  blue: {
    accent: "bg-[#83A2DB]/20 text-[#4E6FAE]",
    icon: "text-[#4E6FAE]",
    line: "bg-[#83A2DB]"
  },
  green: {
    accent: "bg-[#9AC653]/20 text-[#6C9634]",
    icon: "text-[#6C9634]",
    line: "bg-[#9AC653]"
  },
  red: {
    accent: "bg-[#CE6969]/15 text-[#B34B4B]",
    icon: "text-[#B34B4B]",
    line: "bg-[#CE6969]"
  },
  white: {
    accent: "bg-white text-[#10141A]",
    icon: "text-[#10141A]",
    line: "bg-white"
  }
};

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
      <main className="flex min-h-screen items-center justify-center bg-[#E4E4E4] text-[#10141A]">
        <div className="rounded-md border border-white/70 bg-white/65 px-4 py-3 text-sm text-[#10141A]/60 shadow-[0_18px_55px_rgba(16,20,26,0.08)] backdrop-blur-xl">
          Loading event workspace...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E4E4E4] text-[#10141A]">
      <div className="flex min-h-screen gap-2 p-2 pb-24 sm:gap-3 sm:p-3 sm:pb-24 lg:gap-5 lg:p-5">
        <aside className="group/sidebar hidden w-16 shrink-0 flex-col justify-between overflow-hidden rounded-md border border-white/70 bg-white/55 px-3 py-4 shadow-[0_18px_70px_rgba(16,20,26,0.08)] backdrop-blur-xl transition-[width] duration-300 hover:w-64 lg:flex">
          <div className="min-w-0">
            <div className="mb-6 flex h-11 items-center gap-3">
              <BrandLogo className="h-11 w-11" />
              <div className="min-w-0 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                <p className="truncate text-sm font-semibold">CampaignOps</p>
                <p className="truncate text-xs text-[#10141A]/55">{organization?.name ?? "Command centre"}</p>
              </div>
            </div>

            <nav className="space-y-1.5 text-sm">
              <Link
                className="group/item flex h-11 items-center rounded-md px-0 font-medium text-[#10141A]/65 transition hover:bg-white hover:text-[#10141A]"
                href="/dashboard"
                title="Dashboard"
              >
                <span className="flex h-11 w-11 shrink-0 translate-x-[1px] items-center justify-center rounded-md transition-transform duration-300 group-hover/sidebar:translate-x-0">
                  <ArrowLeft className="h-4 w-4" />
                </span>
                <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                  Dashboard
                </span>
              </Link>
              {commandTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.label;
                return (
                  <button
                    className={
                      isActive
                        ? "group/item flex h-11 w-full items-center rounded-md bg-[#10141A] px-0 text-left font-medium text-white shadow-[0_14px_35px_rgba(16,20,26,0.16)]"
                        : "group/item flex h-11 w-full items-center rounded-md px-0 text-left font-medium text-[#10141A]/65 transition hover:bg-white hover:text-[#10141A]"
                    }
                    key={tab.label}
                    onClick={() => setActiveTab(tab.label)}
                    title={tab.label}
                    type="button"
                  >
                    <span className="flex h-11 w-11 shrink-0 translate-x-[1px] items-center justify-center rounded-md transition-transform duration-300 group-hover/sidebar:translate-x-0">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-3">
            <Link
              className="flex h-11 items-center rounded-md bg-white/70 text-[#10141A] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
              href="/profile"
              title={user?.name ?? "Profile"}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                <AvatarCircle avatarUrl={user?.avatarUrl ?? null} name={user?.name ?? "User"} />
              </span>
              <span className="min-w-0 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                <span className="block truncate text-xs font-semibold">{user?.name ?? "CampaignOps"}</span>
                <span className="block truncate text-[11px] uppercase text-[#10141A]/45">{role}</span>
              </span>
            </Link>
            <button
              className="flex h-11 w-full items-center rounded-md text-[#10141A]/65 transition hover:bg-white hover:text-[#10141A]"
              onClick={handleLogout}
              title="Log out"
              type="button"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                Log out
              </span>
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="mb-3 rounded-md border border-white/70 bg-white/55 p-3 shadow-[0_18px_70px_rgba(16,20,26,0.08)] backdrop-blur-xl sm:mb-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#10141A]/55">
                  <Link className="inline-flex items-center gap-1.5 transition hover:text-[#10141A]" href="/events">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Events
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="truncate">{activeTab}</span>
                </div>
                <div className="flex items-start gap-3">
                  <BrandLogo className="h-11 w-11 lg:hidden" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase text-[#10141A]/45">
                      {categoryLabels[eventQuery.data?.category ?? "PRIME_CIRCLE"] ?? "Event workspace"}
                    </p>
                    <h1 className="line-clamp-2 text-2xl font-semibold leading-tight sm:truncate">
                      {eventQuery.data?.title ?? "Event Command Centre"}
                    </h1>
                    <p className="mt-1 truncate text-sm text-[#10141A]/55">
                      {eventQuery.data ? `${scaleLabels[eventQuery.data.scaleTier]} scale · ${getEventLocation(eventQuery.data)}` : "Loading event context"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Link
                  className="hidden h-11 items-center gap-3 rounded-md border border-white/70 bg-white/70 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:bg-white md:flex"
                  href="/profile"
                >
                  <AvatarCircle avatarUrl={user?.avatarUrl ?? null} name={user?.name ?? "User"} />
                  <span className="min-w-0 text-left">
                    <span className="block truncate text-xs font-semibold">{user?.name ?? "CampaignOps"}</span>
                    <span className="block truncate text-[11px] uppercase text-[#10141A]/45">{role}</span>
                  </span>
                </Link>
                <button
                  aria-label="Log out"
                  className="flex h-11 w-11 items-center justify-center rounded-md border border-white/70 bg-white/70 text-[#10141A] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:bg-white"
                  onClick={handleLogout}
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            {eventQuery.data ? (
              <div className="mt-4 flex gap-2 overflow-x-auto rounded-md border border-white/70 bg-white/45 p-2 lg:hidden">
                {commandTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.label;
                  return (
                    <button
                      className={
                        isActive
                          ? "flex shrink-0 items-center gap-2 rounded-md bg-[#10141A] px-3 py-2 text-xs font-medium text-white"
                          : "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-[#10141A]/60 hover:bg-white hover:text-[#10141A]"
                      }
                      key={tab.label}
                      onClick={() => setActiveTab(tab.label)}
                      type="button"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </header>

          <div className="space-y-3 sm:space-y-4">
            {eventQuery.isError ? (
              <div className="rounded-md border border-[#CE6969]/25 bg-[#CE6969]/10 px-3 py-2 text-sm text-[#B34B4B]">
                {eventQuery.error.message}
              </div>
            ) : null}

            {eventQuery.isLoading ? (
              <div className="rounded-md border border-white/70 bg-white/65 px-4 py-10 text-center text-sm text-[#10141A]/60 shadow-[0_18px_55px_rgba(16,20,26,0.08)] backdrop-blur-xl">
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
            ) : eventQuery.data && activeTab === "Content" ? (
              <EventContent
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
            ) : eventQuery.data && activeTab === "AI Plan" ? (
              <EventAIPlan
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
            ) : eventQuery.data && activeTab === "Report" ? (
              <EventReport
                accessToken={tokens.accessToken}
                event={eventQuery.data}
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
      <MobileBottomNav activeHref="/events" />
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

  const completionPercent = analytics?.tasks.completionPercent ?? 0;
  const budgetVariance = analytics?.budget.variance ?? 0;

  return (
    <section className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="rounded-md border border-white/70 bg-white/60 p-5 shadow-[0_18px_70px_rgba(16,20,26,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-md bg-[#10141A] px-3 py-1 text-xs font-medium text-white">
                  {event.status.replace("_", " ")}
                </span>
                <span className="rounded-md bg-[#83A2DB]/20 px-3 py-1 text-xs font-medium text-[#4E6FAE]">
                  {categoryLabels[event.category]}
                </span>
                <span className="rounded-md bg-white px-3 py-1 text-xs font-medium text-[#10141A]/65">
                  {scaleLabels[event.scaleTier]} scale
                </span>
              </div>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight">{event.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#10141A]/62">
                {event.objective ?? "No objective added yet."}
              </p>
            </div>
            <div className="grid min-w-[220px] gap-2 rounded-md border border-white/70 bg-white/60 p-3">
              <MiniStat label="Expected pax" value={event.expectedPax === null ? "-" : String(event.expectedPax)} />
              <MiniStat
                label="Estimated budget"
                value={event.estimatedBudgetAmount ? formatCurrency(Number(event.estimatedBudgetAmount)) : "-"}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <DetailChip icon={MapPin} label="Location" value={getEventLocation(event)} />
            <DetailChip icon={CalendarClock} label="Starts" value={formatDateTime(event.startsAt)} />
            <DetailChip icon={Route} label="Subtype" value={event.subtype} />
          </div>
        </div>

        <div className="rounded-md border border-white/70 bg-white/60 p-5 shadow-[0_18px_70px_rgba(16,20,26,0.08)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase text-[#10141A]/45">Execution health</p>
              <p className="mt-1 text-3xl font-semibold">{completionPercent}%</p>
              <p className="mt-1 text-sm text-[#10141A]/55">Task completion</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#9AC653]/20 text-[#6C9634]">
              <Target className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5">
            <div className="h-3 overflow-hidden rounded-md bg-white">
              <div
                className="h-full rounded-md bg-[#9AC653]"
                style={{ width: `${Math.min(100, Math.max(0, completionPercent))}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Open" value={String(analytics?.tasks.open ?? 0)} />
              <MiniStat label="Overdue" value={String(analytics?.tasks.overdue ?? 0)} />
              <MiniStat label="Upcoming" value={String(analytics?.tasks.upcoming ?? 0)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric icon={WalletCards} label="Budget variance" tone={budgetVariance < 0 ? "red" : "green"} value={formatCurrency(budgetVariance)} />
        <OverviewMetric icon={CheckSquare} label="Open tasks" tone="black" value={String(analytics?.tasks.open ?? 0)} />
        <OverviewMetric icon={UsersRound} label="Contacts / vendors" tone="blue" value={`${analytics?.contacts ?? 0} / ${analytics?.vendors ?? 0}`} />
        <OverviewMetric icon={FolderOpen} label="Files" tone="white" value={String(analytics?.files ?? 0)} />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric icon={CalendarClock} label="Upcoming deadlines" tone="green" value={String(analytics?.tasks.upcoming ?? 0)} />
        <OverviewMetric icon={Activity} label="Overdue tasks" tone="red" value={String(analytics?.tasks.overdue ?? 0)} />
        <OverviewMetric icon={Megaphone} label="Outreach drafts" tone="blue" value={String(analytics?.outreachDrafts ?? 0)} />
        <OverviewMetric icon={BadgeIndianRupee} label="Estimated budget" tone="black" value={event.estimatedBudgetAmount ? formatCurrency(Number(event.estimatedBudgetAmount)) : "-"} />
      </section>

      {analyticsQuery.isError ? (
        <div className="rounded-md border border-[#CE6969]/25 bg-[#CE6969]/10 px-3 py-2 text-sm text-[#B34B4B]">
          {analyticsQuery.error.message}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_0.78fr]">
        <div className="rounded-md border border-white/70 bg-white/60 p-5 shadow-[0_18px_70px_rgba(16,20,26,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Event Details</h2>
              <p className="text-sm text-[#10141A]/55">Core planning facts for this event workspace.</p>
            </div>
            <span className="rounded-md bg-white px-3 py-1 text-xs font-medium text-[#10141A]/55">
              Overview
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DetailLine label="Subtype" value={event.subtype} />
            <DetailLine label="Expected pax" value={event.expectedPax === null ? "-" : String(event.expectedPax)} />
            <DetailLine label="City" value={event.city ?? "-"} />
            <DetailLine label="Venue" value={event.venue ?? "-"} />
            <DetailLine label="Starts" value={formatDateTime(event.startsAt)} />
            <DetailLine label="Ends" value={formatDateTime(event.endsAt)} />
            <DetailLine label="Department / client / org" value={event.departmentOrClient ?? "-"} />
            <DetailLine label="Brand context" value={event.brandContext ?? "-"} />
          </div>
        </div>

        <div className="rounded-md border border-white/70 bg-white/60 p-5 shadow-[0_18px_70px_rgba(16,20,26,0.08)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Stakeholders</h2>
              <p className="text-sm text-[#10141A]/55">People and groups that matter for execution.</p>
            </div>
            <span className="rounded-md bg-[#83A2DB]/20 px-3 py-1 text-xs font-medium text-[#4E6FAE]">
              {stakeholders.length}
            </span>
          </div>
            {stakeholders.length ? (
              <div className="space-y-2">
                {stakeholders.map((stakeholder) => (
                  <div
                    className="flex items-center gap-3 rounded-md border border-white/70 bg-white/70 px-3 py-2 text-sm"
                    key={stakeholder}
                  >
                    <AvatarCircle avatarUrl={null} name={stakeholder} />
                    <span className="font-medium">{stakeholder}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-white bg-white/50 px-4 py-10 text-center text-sm text-[#10141A]/55">
                No stakeholders added yet.
              </div>
            )}
        </div>
      </section>
    </section>
  );
}

function LockedTabPlaceholder({ activeTab }: { activeTab: CommandTab }) {
  return (
    <div className="rounded-md border border-dashed border-white/70 bg-white/60 px-4 py-10 text-center shadow-[0_18px_70px_rgba(16,20,26,0.08)] backdrop-blur-xl">
      <h2 className="text-base font-semibold">{activeTab}</h2>
      <p className="mt-1 text-sm text-[#10141A]/55">This workspace tab is locked for its build-order slice.</p>
    </div>
  );
}

function OverviewMetric({
  icon: Icon,
  label,
  tone,
  value
}: {
  icon: CommandIcon;
  label: string;
  tone: MetricTone;
  value: string;
}) {
  const toneStyle = metricToneStyles[tone];

  return (
    <div className="relative overflow-hidden rounded-md border border-white/70 bg-white/60 p-4 shadow-[0_18px_55px_rgba(16,20,26,0.07)] backdrop-blur-xl">
      <div className={`absolute inset-x-0 top-0 h-1 ${toneStyle.line}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#10141A]/50">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${toneStyle.accent}`}>
          <Icon className={`h-5 w-5 ${toneStyle.icon}`} />
        </div>
      </div>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/70 bg-white/70 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <p className="text-[11px] uppercase text-[#10141A]/45">{label}</p>
      <p className="mt-1 min-h-5 text-sm font-medium text-[#10141A]">{value}</p>
    </div>
  );
}

function DetailChip({ icon: Icon, label, value }: { icon: CommandIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border border-white/70 bg-white/55 px-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-[#10141A]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase text-[#10141A]/45">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/75 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <p className="text-[11px] uppercase text-[#10141A]/45">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function AvatarCircle({ avatarUrl, name }: { avatarUrl: null | string; name: string }) {
  if (avatarUrl) {
    return (
      <img
        alt=""
        className="h-8 w-8 rounded-full border border-white object-cover shadow-[0_8px_18px_rgba(16,20,26,0.12)]"
        src={avatarUrl}
      />
    );
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-[#10141A] text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(16,20,26,0.12)]">
      {getInitials(name)}
    </span>
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getEventLocation(event: CampaignEvent) {
  return [event.city, event.venue].filter(Boolean).join(" · ") || "Location pending";
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
