"use client";

import { EVENT_CATEGORIES, SCALE_TIERS } from "@campaignops/shared";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CalendarDays, ClipboardList, History, IndianRupee, LogOut, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { getDashboardAnalytics } from "../../lib/analytics-api";
import { logout, refreshSession } from "../../lib/auth-api";
import { ApiError } from "../../lib/api-client";
import { listEvents, type CampaignEvent, type EventCategory, type EventScaleTier } from "../../lib/events-api";
import { useAuthStore } from "../../stores/auth-store";
import { NewEventForm } from "./new-event-form";

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

export function DashboardShell() {
  const router = useRouter();
  const { clearSession, hasHydrated, organization, role, setTokens, tokens, user } = useAuthStore();
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
  const totalBudget = events.reduce((sum, event) => {
    return sum + Number(event.estimatedBudgetAmount ?? 0);
  }, 0);
  const analytics = analyticsQuery.data;
  const metrics = useMemo(
    () => [
      { label: "Active events", value: String(analytics?.activeEvents ?? activeEvents.length), icon: CalendarDays },
      { label: "Open tasks", value: String(analytics?.openTasks ?? 0), icon: ClipboardList },
      { label: "Budget tracked", value: formatCurrency(analytics?.totalBudgetTracked ?? totalBudget), icon: IndianRupee },
      { label: "Contacts", value: String(analytics?.contacts ?? 0), icon: UsersRound }
    ],
    [activeEvents.length, analytics?.activeEvents, analytics?.contacts, analytics?.openTasks, analytics?.totalBudgetTracked, totalBudget]
  );

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
      <main className="flex min-h-screen items-center justify-center bg-campaign-cream text-campaign-ink">
        <div className="rounded-md border border-campaign-mist bg-white px-4 py-3 text-sm text-muted-foreground">
          Loading workspace...
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
            {["Dashboard", "Events", "Tasks", "Vendors", "Contacts", "Budget"].map((item) => (
              <a
                className="block rounded-md px-3 py-2 font-medium text-campaign-ink/70 hover:bg-campaign-mist hover:text-campaign-ink"
                href="#"
                key={item}
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-campaign-mist bg-white/75 px-5">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Main Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                {user?.name} · {role}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canManageOperations ? (
                <Button onClick={() => setIsNewEventOpen((current) => !current)} type="button">
                  New Event
                </Button>
              ) : null}
              <Button aria-label="Log out" onClick={handleLogout} size="icon" type="button" variant="outline">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="flex-1 space-y-6 p-5">
            {isNewEventOpen && canManageOperations ? (
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
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <Card key={metric.label}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                        <p className="mt-1 text-2xl font-semibold">{metric.value}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-campaign-orange/10 text-campaign-orange">
                        <Icon className="h-5 w-5" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Operational Signals</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                  <SignalLine icon={CalendarClock} label="Upcoming deadlines" value={String(analytics?.upcomingDeadlines ?? 0)} />
                  <SignalLine icon={AlertTriangle} label="Overdue tasks" value={String(analytics?.overdueTasks ?? 0)} />
                  <SignalLine icon={IndianRupee} label="Budget alerts" value={String(analytics?.budgetAlerts ?? 0)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsQuery.isError ? (
                    <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
                      {analyticsQuery.error.message}
                    </div>
                  ) : analytics?.recentActivity.length ? (
                    <div className="space-y-2">
                      {analytics.recentActivity.map((item) => (
                        <div className="rounded-md border border-campaign-mist bg-white px-3 py-2" key={item.id}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-medium">{formatAction(item.action)}</p>
                            <span className="text-[11px] text-muted-foreground">{formatDateTime(item.createdAt)}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{item.user?.name ?? "System"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activity yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-tight">Active Events</h2>
                <span className="text-xs text-muted-foreground">{eventsQuery.isFetching ? "Syncing" : "Live"}</span>
              </div>
              {eventsQuery.isError ? (
                <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
                  {eventsQuery.error.message}
                </div>
              ) : events.length ? (
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {events.map((event) => (
                    <EventSummaryCard event={event} key={event.id} />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-campaign-mist bg-white px-4 py-8 text-center text-sm text-muted-foreground">
                  No events created yet.
                </div>
              )}
            </section>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Event Categories</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {EVENT_CATEGORIES.map((category) => (
                    <div className="rounded-md border border-campaign-mist bg-white p-3" key={category.id}>
                      <p className="text-sm font-semibold">{category.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {category.subtypes.slice(0, 3).join(", ")}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scale Tiers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SCALE_TIERS.map((tier) => (
                    <div
                      className="flex items-center justify-between rounded-md border border-campaign-mist bg-white px-3 py-2"
                      key={tier.id}
                    >
                      <span className="text-sm font-medium">{tier.label}</span>
                      <span className="text-xs text-muted-foreground">{tier.description}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function EventSummaryCard({ event }: { event: CampaignEvent }) {
  return (
    <Link
      className="block rounded-md border border-campaign-mist bg-white p-4 shadow-sm transition hover:border-campaign-orange/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-campaign-orange/20"
      href={`/events/${event.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{event.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {categoryLabels[event.category]} · {event.subtype}
          </p>
        </div>
        <span className="rounded-md bg-campaign-mist px-2 py-1 text-[11px] font-medium text-campaign-ink/70">
          {event.status.replace("_", " ")}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <MetricLine label="Scale" value={scaleLabels[event.scaleTier]} />
        <MetricLine label="Pax" value={event.expectedPax === null ? "-" : String(event.expectedPax)} />
        <MetricLine label="Budget" value={event.estimatedBudgetAmount ? formatCurrency(Number(event.estimatedBudgetAmount)) : "-"} />
        <MetricLine label="City" value={event.city ?? "-"} />
      </div>
      {event.departmentOrClient ? (
        <p className="mt-3 truncate text-xs text-muted-foreground">{event.departmentOrClient}</p>
      ) : null}
    </Link>
  );
}

function SignalLine({
  icon: Icon,
  label,
  value
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-campaign-mist bg-white px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-campaign-orange" />
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
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
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
