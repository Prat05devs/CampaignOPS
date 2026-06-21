"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Clock,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Search,
  UsersRound,
  WalletCards,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { logout, refreshSession } from "../../lib/auth-api";
import { ApiError } from "../../lib/api-client";
import {
  listGlobalTasks,
  updateTask,
  type GlobalCampaignTask,
  type TaskPriority,
  type TaskStatus
} from "../../lib/tasks-api";
import { useAuthStore } from "../../stores/auth-store";

const sidebarItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/events", icon: CalendarDays, label: "Events" },
  { href: "/tasks", icon: ClipboardList, label: "Tasks" },
  { href: "/vendors", icon: WalletCards, label: "Vendors" },
  { href: "/contacts", icon: UsersRound, label: "Contacts" },
  { href: "/budget", icon: IndianRupee, label: "Budget" }
];

const taskStatuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"];

type MetricTone = "black" | "blue" | "green" | "red";

const metricToneStyles: Record<MetricTone, { icon: string; line: string }> = {
  black: {
    icon: "bg-[#10141A] text-white",
    line: "bg-[#10141A]"
  },
  blue: {
    icon: "bg-[#83A2DB] text-white",
    line: "bg-[#83A2DB]"
  },
  green: {
    icon: "bg-[#9AC653] text-white",
    line: "bg-[#9AC653]"
  },
  red: {
    icon: "bg-[#CE6969] text-white",
    line: "bg-[#CE6969]"
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

export function GlobalTasksShell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { clearSession, hasHydrated, organization, role, setTokens, tokens, user } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "ALL">("ALL");
  const canManageOperations = role === "ADMIN" || role === "MANAGER";

  const tasksQuery = useQuery({
    enabled: Boolean(tokens?.accessToken),
    queryFn: () => listGlobalTasks(tokens?.accessToken ?? "", statusFilter === "ALL" ? undefined : statusFilter),
    queryKey: ["tasks", "global", statusFilter, tokens?.accessToken]
  });

  useEffect(() => {
    if (hasHydrated && !tokens?.accessToken) {
      router.replace("/login");
    }
  }, [hasHydrated, router, tokens?.accessToken]);

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(tasksQuery.error instanceof ApiError) || tasksQuery.error.status !== 401 || !tokens?.refreshToken) {
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
  }, [clearSession, router, setTokens, tasksQuery.error, tokens?.refreshToken]);

  const updateMutation = useMutation({
    mutationFn: async ({ eventId, status, taskId }: { eventId: string; status: TaskStatus; taskId: string }) => {
      try {
        return await updateTask(eventId, taskId, { status }, tokens?.accessToken ?? "");
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401 || !tokens?.refreshToken) {
          throw error;
        }

        const refreshedSession = await refreshSession(tokens.refreshToken);
        setTokens(refreshedSession.tokens);
        return updateTask(eventId, taskId, { status }, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", "global"] });
    }
  });

  const tasks = tasksQuery.data ?? [];
  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, GlobalCampaignTask[]> = {
      BLOCKED: [],
      DONE: [],
      IN_PROGRESS: [],
      REVIEW: [],
      TODO: []
    };

    for (const task of tasks) {
      groups[task.status].push(task);
    }

    return groups;
  }, [tasks]);

  const summary = useMemo(
    () => ({
      dueSoon: tasks.filter((task) => isUpcoming(task.dueAt)).length,
      open: tasks.filter((task) => task.status !== "DONE").length,
      overdue: tasks.filter((task) => isOverdue(task.dueAt, task.status)).length,
      total: tasks.length
    }),
    [tasks]
  );

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
        <div className="rounded-md border border-white/70 bg-white/65 px-4 py-3 text-sm text-[#10141A]/60 shadow-[0_18px_60px_rgba(16,20,26,0.12)] backdrop-blur-xl">
          Loading tasks...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E4E4E4] text-[#10141A]">
      <div className="flex min-h-screen gap-3 p-3 lg:gap-5 lg:p-5">
        <aside className="group/sidebar hidden w-16 shrink-0 flex-col justify-between overflow-hidden rounded-md border border-white/70 bg-white/45 p-2 shadow-[0_24px_80px_rgba(16,20,26,0.10)] backdrop-blur-xl transition-all duration-300 ease-out hover:w-56 lg:flex">
          <div className="flex w-full flex-col gap-4">
            <div className="flex h-11 w-full items-center gap-3 overflow-hidden">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#10141A] text-sm font-semibold text-white">
                CO
              </div>
              <div className="min-w-0 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                <p className="truncate text-sm font-semibold">CampaignOps</p>
                <p className="truncate text-xs text-[#10141A]/55">{organization?.name ?? "Command centre"}</p>
              </div>
            </div>
            <nav className="flex w-full flex-col gap-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/tasks";

                return (
                  <Link
                    className={
                      isActive
                        ? "flex h-11 w-11 items-center gap-3 overflow-hidden rounded-full bg-[#10141A] text-white shadow-[0_14px_32px_rgba(16,20,26,0.25)] transition-all duration-300 group-hover/sidebar:w-full group-hover/sidebar:px-3"
                        : "flex h-11 w-11 items-center gap-3 overflow-hidden rounded-full border border-white/70 bg-white/55 text-[#10141A]/70 transition-all duration-300 hover:bg-white hover:text-[#10141A] group-hover/sidebar:w-full group-hover/sidebar:px-3"
                    }
                    href={item.href}
                    key={item.href}
                    title={item.label}
                  >
                    <Icon className="h-4 w-4 shrink-0 translate-x-[13px] transition-transform duration-300 group-hover/sidebar:translate-x-0" />
                    <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-200 group-hover/sidebar:max-w-32 group-hover/sidebar:opacity-100">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <button
            aria-label="Log out"
            className="flex h-11 w-11 items-center gap-3 overflow-hidden rounded-full border border-white/70 bg-white/55 text-[#10141A]/70 transition-all duration-300 hover:bg-white hover:text-[#10141A] group-hover/sidebar:w-full group-hover/sidebar:px-3"
            onClick={handleLogout}
            type="button"
          >
            <LogOut className="h-4 w-4 shrink-0 translate-x-[13px] transition-transform duration-300 group-hover/sidebar:translate-x-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-200 group-hover/sidebar:max-w-32 group-hover/sidebar:opacity-100">
              Logout
            </span>
          </button>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="mb-4 rounded-md border border-white/70 bg-white/55 p-3 shadow-[0_24px_80px_rgba(16,20,26,0.08)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#10141A] text-sm font-semibold text-white lg:hidden">
                  CO
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#10141A]/55">{organization?.name ?? "Command centre"}</p>
                  <h1 className="text-2xl font-semibold md:text-3xl">Tasks</h1>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 xl:justify-end">
                <Link
                  className="flex min-w-0 items-center gap-2 rounded-full border border-white/70 bg-white/50 px-2 py-1.5 pr-3 transition hover:bg-white"
                  href="/profile"
                >
                  <AvatarCircle avatarUrl={user?.avatarUrl ?? null} name={user?.name ?? "CO"} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{user?.name}</span>
                    <span className="block text-[11px] text-[#10141A]/55">{role}</span>
                  </span>
                </Link>
                <button
                  aria-label="Log out"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/60 text-[#10141A]/70 transition hover:bg-white hover:text-[#10141A] lg:hidden"
                  onClick={handleLogout}
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-4">
            <section className="rounded-md border border-white/70 bg-white/45 p-4 shadow-[0_24px_80px_rgba(16,20,26,0.09)] backdrop-blur-xl md:p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 py-1 text-xs font-medium text-[#10141A]/65">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Cross-event task board
                  </div>
                  <h2 className="text-3xl font-semibold md:text-4xl">Operational tasks across all events</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#10141A]/60">
                    Track ownership, due dates, and status movement without leaving the main operations workspace.
                  </p>
                </div>
                <label className="grid min-w-[220px] gap-1">
                  <span className="text-xs font-medium text-[#10141A]/55">Status filter</span>
                  <select
                    className="h-11 rounded-md border border-white/70 bg-white/70 px-3 text-sm outline-none transition focus:border-[#10141A]/30 focus:ring-2 focus:ring-[#10141A]/10"
                    onChange={(event) => setStatusFilter(event.target.value as TaskStatus | "ALL")}
                    value={statusFilter}
                  >
                    <option value="ALL">All statuses</option>
                    {taskStatuses.map((status) => (
                      <option key={status} value={status}>
                        {taskStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <TaskMetric icon={CheckSquare} label="Total tasks" tone="black" value={String(summary.total)} />
              <TaskMetric icon={Clock} label="Open" tone="blue" value={String(summary.open)} />
              <TaskMetric icon={Clock} label="Due soon" tone="green" value={String(summary.dueSoon)} />
              <TaskMetric icon={Search} label="Overdue" tone="red" value={String(summary.overdue)} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/70 bg-white/55 p-3 shadow-[0_18px_60px_rgba(16,20,26,0.08)] backdrop-blur-xl">
              <div>
                <h2 className="text-sm font-semibold">Task lanes</h2>
                <p className="text-xs text-[#10141A]/55">{tasksQuery.isFetching ? "Syncing" : "Live"}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#10141A]/55">
                {canManageOperations ? "Editable" : "Read-only"}
              </span>
            </div>

            {tasksQuery.isError ? (
              <div className="rounded-md border border-[#CE6969]/25 bg-[#CE6969]/10 px-3 py-2 text-sm text-[#B34B4B]">
                {tasksQuery.error.message}
              </div>
            ) : null}

            {updateMutation.isError ? (
              <div className="rounded-md border border-[#CE6969]/25 bg-[#CE6969]/10 px-3 py-2 text-sm text-[#B34B4B]">
                {updateMutation.error.message}
              </div>
            ) : null}

            <div className="grid gap-3 xl:grid-cols-5">
              {taskStatuses.map((status) => (
                <div className="rounded-md border border-white/70 bg-white/45 p-3 shadow-[0_18px_60px_rgba(16,20,26,0.07)] backdrop-blur-xl" key={status}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{taskStatusLabels[status]}</h3>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-[#10141A]/60">
                      {groupedTasks[status].length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {groupedTasks[status].map((task) => (
                      <GlobalTaskCard
                        canManageOperations={canManageOperations}
                        isUpdating={updateMutation.isPending}
                        key={task.id}
                        onStatusChange={(nextStatus) =>
                          updateMutation.mutate({ eventId: task.eventId, status: nextStatus, taskId: task.id })
                        }
                        task={task}
                      />
                    ))}
                    {!groupedTasks[status].length ? (
                      <div className="rounded-md border border-dashed border-white/80 bg-white/45 px-3 py-8 text-center text-xs text-[#10141A]/45">
                        No tasks
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function GlobalTaskCard({
  canManageOperations,
  isUpdating,
  onStatusChange,
  task
}: {
  canManageOperations: boolean;
  isUpdating: boolean;
  onStatusChange: (status: TaskStatus) => void;
  task: GlobalCampaignTask;
}) {
  return (
    <article className="rounded-md border border-white/70 bg-white/75 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:bg-white">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-5">{task.title}</h4>
        <span className={getPriorityClassName(task.priority)}>
          {taskPriorityLabels[task.priority]}
        </span>
      </div>
      {task.notes ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#10141A]/55">{task.notes}</p> : null}
      <div className="mt-3 space-y-1.5 text-xs text-[#10141A]/60">
        <p className="truncate">
          <span className="font-medium text-[#10141A]">Event:</span> {task.event.title}
        </p>
        <p>
          <span className="font-medium text-[#10141A]">Due:</span> {formatDateTime(task.dueAt)}
        </p>
        <div className="flex items-center gap-2 pt-1">
          <AvatarCircle avatarUrl={task.assignee?.avatarUrl ?? task.createdBy.avatarUrl ?? null} name={task.assignee?.name ?? task.createdBy.name} />
          <span className="truncate">{task.assignee?.name ?? task.createdBy.name}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <Link className="inline-flex items-center gap-1 text-xs font-medium text-[#10141A] hover:underline" href={`/events/${task.eventId}`}>
          Open event
          <ChevronRight className="h-3 w-3" />
        </Link>
        <select
          className="h-9 rounded-md border border-white/70 bg-white px-2 text-xs outline-none transition focus:border-[#10141A]/30 focus:ring-2 focus:ring-[#10141A]/10"
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
      </div>
    </article>
  );
}

function TaskMetric({
  icon: Icon,
  label,
  tone,
  value
}: {
  icon: LucideIcon;
  label: string;
  tone: MetricTone;
  value: string;
}) {
  const toneStyle = metricToneStyles[tone];

  return (
    <div className="relative overflow-hidden rounded-md border border-white/70 bg-white/60 p-4 shadow-[0_18px_55px_rgba(16,20,26,0.07)] backdrop-blur-xl">
      <div className={`absolute inset-x-0 top-0 h-1 ${toneStyle.line}`} />
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-md ${toneStyle.icon}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-medium text-[#10141A]/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getPriorityClassName(priority: TaskPriority) {
  const base = "rounded-full px-2 py-1 text-[11px] font-medium";
  if (priority === "URGENT") {
    return `${base} bg-[#CE6969]/15 text-[#B34B4B]`;
  }

  if (priority === "HIGH") {
    return `${base} bg-[#CE6969]/10 text-[#B34B4B]`;
  }

  if (priority === "MEDIUM") {
    return `${base} bg-[#83A2DB]/20 text-[#4E6FAE]`;
  }

  return `${base} bg-white text-[#10141A]/55`;
}

function isOverdue(value: string | null, status: TaskStatus) {
  return status !== "DONE" && Boolean(value) && new Date(value as string) < new Date();
}

function isUpcoming(value: string | null) {
  if (!value) {
    return false;
  }

  const dueAt = new Date(value);
  const now = new Date();
  const sevenDays = new Date(now);
  sevenDays.setDate(now.getDate() + 7);
  return dueAt >= now && dueAt <= sevenDays;
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
