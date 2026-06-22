"use client";

import { EVENT_CATEGORIES, SCALE_TIERS, type EventCategoryId } from "@campaignops/shared";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  History,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Plus,
  Route,
  UsersRound,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "../../components/brand-logo";
import { MobileBottomNav } from "../../components/mobile-bottom-nav";
import { getDashboardAnalytics } from "../../lib/analytics-api";
import { logout, refreshSession } from "../../lib/auth-api";
import { ApiError } from "../../lib/api-client";
import { listEvents, type CampaignEvent, type EventCategory, type EventScaleTier, type EventStatus } from "../../lib/events-api";
import { useAuthStore } from "../../stores/auth-store";
import { NewEventForm } from "./new-event-form";

const categoryLabels: Record<EventCategory, string> = {
  GOVERNMENT_CSR: "Government / CSR",
  HOLY_SIN_CAFE: "Holy Sin Cafe",
  PRIME_CIRCLE: "Prime Circle",
  PRIVATE_CLIENT: "Private Client"
};

const categoryApiValues: Record<EventCategoryId, EventCategory> = {
  government_csr: "GOVERNMENT_CSR",
  holy_sin_cafe: "HOLY_SIN_CAFE",
  prime_circle: "PRIME_CIRCLE",
  private_client: "PRIVATE_CLIENT"
};

const scaleLabels: Record<EventScaleTier, string> = {
  LARGE: "Large",
  MASS: "Mass",
  MEDIUM: "Medium",
  MICRO: "Micro",
  SMALL: "Small"
};

const sidebarItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/events", icon: CalendarDays, label: "Events" },
  { href: "/tasks", icon: ClipboardList, label: "Tasks" },
  { href: "/vendors", icon: WalletCards, label: "Vendors" },
  { href: "/contacts", icon: UsersRound, label: "Contacts" },
  { href: "/budget", icon: IndianRupee, label: "Budget" }
];

const metricTone = {
  black: {
    icon: "bg-[#10141A] text-white",
    line: "bg-[#10141A]"
  },
  blue: {
    icon: "bg-[#83A2DB] text-white",
    line: "bg-[#83A2DB]"
  },
  red: {
    icon: "bg-[#CE6969] text-white",
    line: "bg-[#CE6969]"
  },
  white: {
    icon: "bg-white text-[#10141A]",
    line: "bg-white"
  }
};

type MetricTone = keyof typeof metricTone;

export function DashboardShell() {
  const router = useRouter();
  const { clearSession, hasHydrated, organization, role, setTokens, tokens, user } = useAuthStore();
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | "ALL">("ALL");
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const canManageOperations = role === "ADMIN" || role === "MANAGER";

  const eventsQuery = useQuery({
    enabled: Boolean(tokens?.accessToken),
    queryFn: () => listEvents(tokens?.accessToken ?? ""),
    queryKey: ["events", tokens?.accessToken]
  });

  const analyticsQuery = useQuery({
    enabled: Boolean(tokens?.accessToken),
    queryFn: () => getDashboardAnalytics(tokens?.accessToken ?? ""),
    queryKey: ["analytics", "dashboard", tokens?.accessToken]
  });

  const events = eventsQuery.data ?? [];
  const activeEvents = events.filter((event) => !["CANCELLED", "COMPLETED"].includes(event.status));
  const filteredEvents = categoryFilter === "ALL" ? events : events.filter((event) => event.category === categoryFilter);
  const totalBudget = events.reduce((sum, event) => sum + Number(event.estimatedBudgetAmount ?? 0), 0);
  const analytics = analyticsQuery.data;

  const metrics = useMemo(
    () => [
      {
        icon: CalendarDays,
        label: "Active events",
        tone: "blue" as const,
        value: String(analytics?.activeEvents ?? activeEvents.length)
      },
      {
        icon: ClipboardList,
        label: "Open tasks",
        tone: "black" as const,
        value: String(analytics?.openTasks ?? 0)
      },
      {
        icon: IndianRupee,
        label: "Budget tracked",
        tone: "red" as const,
        value: formatCurrency(analytics?.totalBudgetTracked ?? totalBudget)
      },
      {
        icon: UsersRound,
        label: "Contacts",
        tone: "white" as const,
        value: String(analytics?.contacts ?? 0)
      }
    ],
    [activeEvents.length, analytics?.activeEvents, analytics?.contacts, analytics?.openTasks, analytics?.totalBudgetTracked, totalBudget]
  );

  const flowStages = useMemo(
    () => [
      { label: "Draft", tone: "white" as const, value: countStatus(events, "DRAFT") },
      { label: "Planning", tone: "blue" as const, value: countStatus(events, "PLANNING") },
      { label: "Active", tone: "red" as const, value: countStatus(events, "ACTIVE") },
      { label: "Completed", tone: "black" as const, value: countStatus(events, "COMPLETED") }
    ],
    [events]
  );

  const activityUsers = useMemo(() => {
    const users = new Map<string, { avatarUrl: string | null; id: string; name: string }>();

    for (const item of analytics?.recentActivity ?? []) {
      if (item.user) {
        users.set(item.user.id, { avatarUrl: item.user.avatarUrl, id: item.user.id, name: item.user.name });
      }
    }

    return Array.from(users.values()).slice(0, 7);
  }, [analytics?.recentActivity]);

  useEffect(() => {
    if (hasHydrated && !tokens?.accessToken) {
      router.replace("/login");
    }
  }, [hasHydrated, router, tokens?.accessToken]);

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(eventsQuery.error instanceof ApiError) || eventsQuery.error.status !== 401 || !tokens?.refreshToken) {
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
  }, [clearSession, eventsQuery.error, router, setTokens, tokens?.refreshToken]);

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(analyticsQuery.error instanceof ApiError) || analyticsQuery.error.status !== 401 || !tokens?.refreshToken) {
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
  }, [analyticsQuery.error, clearSession, router, setTokens, tokens?.refreshToken]);

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
          Loading workspace...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E4E4E4] text-[#10141A]">
      <div className="flex min-h-screen gap-2 p-2 pb-24 sm:gap-3 sm:p-3 sm:pb-24 lg:gap-5 lg:p-5">
        <aside className="group/sidebar hidden w-16 shrink-0 flex-col justify-between overflow-hidden rounded-md border border-white/70 bg-white/45 p-2 shadow-[0_24px_80px_rgba(16,20,26,0.10)] backdrop-blur-xl transition-all duration-300 ease-out hover:w-56 lg:flex">
          <div className="flex w-full flex-col gap-4">
            <div className="flex h-11 w-full items-center gap-3 overflow-hidden">
              <BrandLogo className="h-11 w-11" />
              <div className="min-w-0 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
                <p className="truncate text-sm font-semibold">CampaignOps</p>
                <p className="truncate text-xs text-[#10141A]/55">{organization?.name ?? "Command centre"}</p>
              </div>
            </div>
            <nav className="flex w-full flex-col gap-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/dashboard";

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
          <header className="mb-3 rounded-md border border-white/70 bg-white/55 p-3 shadow-[0_24px_80px_rgba(16,20,26,0.08)] backdrop-blur-xl sm:mb-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <BrandLogo className="h-11 w-11 lg:hidden" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#10141A]/55">{organization?.name ?? "Command centre"}</p>
                  <h1 className="text-2xl font-semibold md:text-3xl">Main Dashboard</h1>
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:items-center sm:justify-between xl:justify-end">
                <Link
                  className="flex min-w-0 items-center gap-2 rounded-full border border-white/70 bg-white/50 px-2 py-1.5 pr-3 transition hover:bg-white"
                  href="/profile"
                >
                  <AvatarCircle avatarUrl={user?.avatarUrl ?? null} name={user?.name ?? "User"} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">{user?.name}</span>
                    <span className="block text-[11px] text-[#10141A]/55">{role}</span>
                  </span>
                </Link>
                {canManageOperations ? (
                  <button
                    className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#10141A] px-4 text-sm font-medium text-white shadow-[0_16px_36px_rgba(16,20,26,0.25)] transition hover:bg-black sm:col-span-1"
                    onClick={() => setIsNewEventOpen((current) => !current)}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    New Event
                  </button>
                ) : null}
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

          <div className="space-y-3 sm:space-y-4">
            <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-md border border-white/70 bg-white/45 p-3 shadow-[0_24px_80px_rgba(16,20,26,0.09)] backdrop-blur-xl sm:p-4 md:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 py-1 text-xs font-medium text-[#10141A]/65">
                      <Route className="h-3.5 w-3.5" />
                      CampaignOps workspace
                    </div>
                    <h2 className="text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">Event operations command centre</h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-[#10141A]/60">
                      Track event readiness, task pressure, budget movement, and recent decisions from one live workspace.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {activityUsers.length ? (
                      <div className="flex -space-x-2">
                        {activityUsers.map((activityUser, index) => (
                          <AvatarCircle
                            avatarUrl={activityUser.avatarUrl}
                            key={activityUser.id}
                            name={activityUser.name}
                            size="md"
                            tone={index % 3 === 0 ? "blue" : index % 3 === 1 ? "red" : "white"}
                          />
                        ))}
                      </div>
                    ) : (
                      <AvatarCircle avatarUrl={user?.avatarUrl ?? null} name={user?.name ?? "User"} size="md" />
                    )}
                    <Link
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#10141A]/15 bg-white/55 text-[#10141A] transition hover:bg-white"
                      href="/events"
                      title="Open events"
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Link>
                    <Link
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#10141A]/15 bg-white/55 text-[#10141A] transition hover:bg-white"
                      href="/tasks"
                      title="Open tasks"
                    >
                      <ClipboardList className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                  {metrics.map((metric) => (
                    <MetricCard icon={metric.icon} key={metric.label} label={metric.label} tone={metric.tone} value={metric.value} />
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-white/70 bg-white/45 p-3 shadow-[0_24px_80px_rgba(16,20,26,0.09)] backdrop-blur-xl sm:p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Workspace Flow</h2>
                    <p className="text-xs text-[#10141A]/55">Events by current status</p>
                  </div>
                  <Link
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[#10141A]/15 bg-white/55 text-[#10141A] transition hover:bg-white"
                    href="/events"
                    title="View events"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {flowStages.map((stage) => (
                    <div
                      className={
                        stage.tone === "black"
                          ? "min-h-24 rounded-md bg-[#10141A] p-3 text-white shadow-[0_18px_40px_rgba(16,20,26,0.22)] sm:min-h-28 sm:p-4"
                          : "min-h-24 rounded-md border border-white/70 bg-white/55 p-3 text-[#10141A] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:min-h-28 sm:p-4"
                      }
                      key={stage.label}
                    >
                      <p className={stage.tone === "black" ? "text-xs text-white/65" : "text-xs text-[#10141A]/55"}>{stage.label}</p>
                      <p className="mt-4 text-2xl font-semibold sm:text-3xl">{stage.value}</p>
                      <div className={`mt-3 h-1 rounded-full ${metricTone[stage.tone].line}`} />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {isNewEventOpen && canManageOperations ? (
              <section className="rounded-md border border-white/70 bg-white/55 p-4 shadow-[0_24px_80px_rgba(16,20,26,0.09)] backdrop-blur-xl">
                <NewEventForm
                  accessToken={tokens.accessToken}
                  refreshToken={tokens.refreshToken}
                  onCreated={() => setIsNewEventOpen(false)}
                  onSessionExpired={() => {
                    clearSession();
                    router.replace("/login");
                  }}
                  onTokensRefreshed={setTokens}
                />
              </section>
            ) : null}

            <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-md border border-white/70 bg-white/45 p-4 shadow-[0_24px_80px_rgba(16,20,26,0.08)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Operational Signals</h2>
                    <p className="text-xs text-[#10141A]/55">Deadline, task, and budget pressure</p>
                  </div>
                  <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-[#10141A]/55">
                    {analyticsQuery.isFetching ? "Syncing" : "Live"}
                  </span>
                </div>

                <div className="space-y-3">
                  <SignalLine icon={CalendarClock} label="Upcoming deadlines" tone="blue" value={String(analytics?.upcomingDeadlines ?? 0)} />
                  <SignalLine icon={AlertTriangle} label="Overdue tasks" tone="red" value={String(analytics?.overdueTasks ?? 0)} />
                  <SignalLine icon={IndianRupee} label="Budget alerts" tone="black" value={String(analytics?.budgetAlerts ?? 0)} />
                </div>
              </div>

              <div className="rounded-md border border-white/70 bg-white/45 p-4 shadow-[0_24px_80px_rgba(16,20,26,0.08)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Recent Activity</h2>
                    <p className="text-xs text-[#10141A]/55">Latest workspace updates</p>
                  </div>
                  <History className="h-4 w-4 text-[#10141A]/45" />
                </div>

                {analyticsQuery.isError ? (
                  <div className="rounded-md border border-[#CE6969]/30 bg-[#CE6969]/10 px-3 py-2 text-xs text-[#9E3F3F]">
                    {analyticsQuery.error.message}
                  </div>
                ) : analytics?.recentActivity.length ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    {analytics.recentActivity.slice(0, 6).map((item) => (
                      <div className="flex gap-3 rounded-md border border-white/70 bg-white/55 p-3" key={item.id}>
                        <AvatarCircle avatarUrl={item.user?.avatarUrl ?? null} name={item.user?.name ?? "System"} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-medium">{formatAction(item.action)}</p>
                            <span className="shrink-0 text-[11px] text-[#10141A]/50">{formatDateTime(item.createdAt)}</span>
                          </div>
                          <p className="mt-1 truncate text-xs text-[#10141A]/55">{item.user?.name ?? "System"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#10141A]/55">No recent activity yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-md border border-white/70 bg-white/45 p-4 shadow-[0_24px_80px_rgba(16,20,26,0.08)] backdrop-blur-xl">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold">Active Events</h2>
                  <p className="text-xs text-[#10141A]/55">{eventsQuery.isFetching ? "Syncing events" : "Live event workspace"}</p>
                </div>
                <div className="-mx-1 flex gap-2 overflow-x-auto rounded-md bg-white/45 p-1 text-sm sm:mx-0">
                  <button
                    className={
                      categoryFilter === "ALL"
                        ? "shrink-0 rounded-full bg-[#10141A] px-3 py-2 font-medium text-white"
                        : "shrink-0 rounded-full px-3 py-2 font-medium text-[#10141A]/60 transition hover:bg-white hover:text-[#10141A]"
                    }
                    onClick={() => setCategoryFilter("ALL")}
                    type="button"
                  >
                    All
                  </button>
                  {EVENT_CATEGORIES.map((category) => (
                    <button
                      className={
                        categoryFilter === categoryApiValues[category.id]
                          ? "shrink-0 rounded-full bg-[#10141A] px-3 py-2 font-medium text-white"
                          : "shrink-0 rounded-full px-3 py-2 font-medium text-[#10141A]/60 transition hover:bg-white hover:text-[#10141A]"
                      }
                      key={category.id}
                      onClick={() => setCategoryFilter(categoryApiValues[category.id])}
                      type="button"
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              {eventsQuery.isError ? (
                <div className="rounded-md border border-[#CE6969]/30 bg-[#CE6969]/10 px-3 py-2 text-xs text-[#9E3F3F]">
                  {eventsQuery.error.message}
                </div>
              ) : filteredEvents.length ? (
                <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                  {filteredEvents.map((event) => (
                    <EventSummaryCard event={event} key={event.id} />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-white/80 bg-white/35 px-4 py-8 text-center text-sm text-[#10141A]/55">
                  No events match this category.
                </div>
              )}
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-md border border-white/70 bg-white/45 p-4 shadow-[0_24px_80px_rgba(16,20,26,0.08)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Event Categories</h2>
                    <p className="text-xs text-[#10141A]/55">Locked CampaignOPS taxonomy</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {EVENT_CATEGORIES.map((category, index) => (
                    <div className="rounded-md border border-white/70 bg-white/55 p-3" key={category.id}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold">{category.label}</p>
                        <span
                          className={
                            index % 2 === 0
                              ? "rounded-full bg-[#83A2DB]/20 px-2 py-1 text-[11px] font-medium text-[#496AA0]"
                              : "rounded-full bg-[#CE6969]/20 px-2 py-1 text-[11px] font-medium text-[#9E3F3F]"
                          }
                        >
                          {category.subtypes.length}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#10141A]/55">{category.subtypes.slice(0, 4).join(", ")}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-white/70 bg-white/45 p-4 shadow-[0_24px_80px_rgba(16,20,26,0.08)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Scale Tiers</h2>
                    <p className="text-xs text-[#10141A]/55">Pax planning bands</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {SCALE_TIERS.map((tier) => (
                    <div className="flex flex-col gap-1 rounded-md border border-white/70 bg-white/55 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3" key={tier.id}>
                      <span className="text-sm font-medium">{tier.label}</span>
                      <span className="text-xs text-[#10141A]/55 sm:text-right">{tier.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
      <MobileBottomNav activeHref="/dashboard" />
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  tone,
  value
}: {
  icon: typeof CalendarDays;
  label: string;
  tone: MetricTone;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/70 bg-white/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[#10141A]/55">{label}</p>
          <p className="mt-2 text-xl font-semibold sm:text-2xl">{value}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11 ${metricTone[tone].icon}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className={`mt-3 h-1 rounded-full sm:mt-4 ${metricTone[tone].line}`} />
    </div>
  );
}

function EventSummaryCard({ event }: { event: CampaignEvent }) {
  return (
    <Link
      className="group block rounded-md border border-white/70 bg-white/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition hover:bg-white hover:shadow-[0_18px_42px_rgba(16,20,26,0.10)] focus:outline-none focus:ring-2 focus:ring-[#83A2DB]/35"
      href={`/events/${event.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{event.title}</h3>
          <p className="mt-1 truncate text-xs text-[#10141A]/55">
            {categoryLabels[event.category]} · {event.subtype}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#10141A] px-3 py-1 text-[11px] font-medium text-white">
          {event.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <MetricLine label="Scale" value={scaleLabels[event.scaleTier]} />
        <MetricLine label="Pax" value={event.expectedPax === null ? "-" : String(event.expectedPax)} />
        <MetricLine label="Budget" value={event.estimatedBudgetAmount ? formatCurrency(Number(event.estimatedBudgetAmount)) : "-"} />
        <MetricLine label="City" value={event.city ?? "-"} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#10141A]/10 pt-3">
        <p className="truncate text-xs text-[#10141A]/55">{event.departmentOrClient ?? getEventLocation(event)}</p>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#10141A]/35 transition group-hover:text-[#10141A]" />
      </div>
    </Link>
  );
}

function SignalLine({
  icon: Icon,
  label,
  tone,
  value
}: {
  icon: typeof CalendarClock;
  label: string;
  tone: MetricTone;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/70 bg-white/55 px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${metricTone[tone].icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

function AvatarCircle({
  avatarUrl,
  name,
  size,
  tone = "white"
}: {
  avatarUrl: string | null;
  name: string;
  size: "md" | "sm";
  tone?: "blue" | "red" | "white";
}) {
  const sizeClass = size === "sm" ? "h-9 w-9 text-[11px]" : "h-10 w-10 text-xs";
  const toneClass =
    tone === "blue"
      ? "bg-[#83A2DB] text-white"
      : tone === "red"
        ? "bg-[#CE6969] text-white"
        : "bg-white text-[#10141A]";

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#E4E4E4] font-semibold ${sizeClass} ${toneClass}`}
      title={name}
    >
      {avatarUrl ? <img alt="" className="h-full w-full object-cover" src={avatarUrl} /> : getInitials(name)}
    </span>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase text-[#10141A]/45">{label}</p>
      <p className="mt-0.5 truncate font-medium">{value}</p>
    </div>
  );
}

function countStatus(events: CampaignEvent[], status: EventStatus) {
  return events.filter((event) => event.status === status).length;
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

function formatAction(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function getEventLocation(event: CampaignEvent) {
  if (event.city && event.venue) {
    return `${event.city} · ${event.venue}`;
  }

  return event.city ?? event.venue ?? "Workspace event";
}

function getInitials(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
