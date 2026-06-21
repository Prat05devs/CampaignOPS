"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  UsersRound,
  WalletCards,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { logout, refreshSession } from "../../lib/auth-api";
import { ApiError } from "../../lib/api-client";
import { listEvents, type CampaignEvent, type EventCategory, type EventScaleTier } from "../../lib/events-api";
import { useAuthStore } from "../../stores/auth-store";

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

const sidebarItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/events", icon: CalendarDays, label: "Events" },
  { href: "/tasks", icon: ClipboardList, label: "Tasks" },
  { href: "/vendors", icon: WalletCards, label: "Vendors" },
  { href: "/contacts", icon: UsersRound, label: "Contacts" },
  { href: "/budget", icon: IndianRupee, label: "Budget" }
];

type WorkspaceSectionShellProps = {
  section: "events" | "tasks" | "vendors" | "contacts" | "budget";
};

const sectionTitles: Record<WorkspaceSectionShellProps["section"], string> = {
  budget: "Budget",
  contacts: "Contacts",
  events: "Events",
  tasks: "Tasks",
  vendors: "Vendors"
};

const sectionMeta: Record<
  WorkspaceSectionShellProps["section"],
  {
    description: string;
    eyebrow: string;
    icon: LucideIcon;
  }
> = {
  budget: {
    description: "Open an event budget workspace to review estimates, actuals, and variance where execution context lives.",
    eyebrow: "Event-scoped finance",
    icon: IndianRupee
  },
  contacts: {
    description: "Open an event contact workspace to manage stakeholders, relationship context, and outreach-ready records.",
    eyebrow: "Event-scoped relationships",
    icon: UsersRound
  },
  events: {
    description: "Open the command centre for any event, scan current readiness, and keep operations visible.",
    eyebrow: "Event workspace index",
    icon: CalendarDays
  },
  tasks: {
    description: "Review task execution by event workspace and continue work in the relevant command centre.",
    eyebrow: "Event-scoped execution",
    icon: ClipboardList
  },
  vendors: {
    description: "Open an event vendor workspace to manage assignments, payment status, notes, and performance context.",
    eyebrow: "Event-scoped partners",
    icon: WalletCards
  }
};

export function WorkspaceSectionShell({ section }: WorkspaceSectionShellProps) {
  const router = useRouter();
  const { clearSession, hasHydrated, organization, role, setTokens, tokens, user } = useAuthStore();
  const meta = sectionMeta[section];
  const SectionIcon = meta.icon;

  const eventsQuery = useQuery({
    enabled: Boolean(tokens?.accessToken),
    queryFn: () => listEvents(tokens?.accessToken ?? ""),
    queryKey: ["events", tokens?.accessToken]
  });
  const events = eventsQuery.data ?? [];
  const summary = useMemo(
    () => ({
      active: events.filter((event) => !["CANCELLED", "COMPLETED"].includes(event.status)).length,
      completed: events.filter((event) => event.status === "COMPLETED").length,
      total: events.length,
      withBudget: events.filter((event) => Boolean(event.estimatedBudgetAmount)).length
    }),
    [events]
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
                const isActive = item.label.toLowerCase() === section;

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
                  <h1 className="text-2xl font-semibold md:text-3xl">{sectionTitles[section]}</h1>
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
                    <SectionIcon className="h-3.5 w-3.5" />
                    {meta.eyebrow}
                  </div>
                  <h2 className="text-3xl font-semibold md:text-4xl">{sectionTitles[section]} by event workspace</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#10141A]/60">{meta.description}</p>
                </div>
                <div className="grid min-w-[260px] grid-cols-2 gap-2 rounded-md border border-white/70 bg-white/55 p-2">
                  <MiniMetric label="Total events" value={String(summary.total)} />
                  <MiniMetric label="Active" value={String(summary.active)} />
                  <MiniMetric label="Completed" value={String(summary.completed)} />
                  <MiniMetric label="Budgeted" value={String(summary.withBudget)} />
                </div>
              </div>
            </section>

            {eventsQuery.isError ? (
              <div className="rounded-md border border-[#CE6969]/25 bg-[#CE6969]/10 px-3 py-2 text-sm text-[#B34B4B]">
                {eventsQuery.error.message}
              </div>
            ) : null}

            {section === "events" ? (
              <EventsSection events={events} isFetching={eventsQuery.isFetching} />
            ) : (
              <EventScopedSection events={events} isFetching={eventsQuery.isFetching} section={section} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function EventsSection({ events, isFetching }: { events: CampaignEvent[]; isFetching: boolean }) {
  return (
    <section className="rounded-md border border-white/70 bg-white/45 p-4 shadow-[0_18px_60px_rgba(16,20,26,0.08)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">All Events</h2>
          <p className="text-xs text-[#10141A]/55">{isFetching ? "Syncing" : "Live"}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#10141A]/55">{events.length}</span>
      </div>
      {events.length ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventSummaryCard event={event} key={event.id} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-white/80 bg-white/45 px-4 py-10 text-center text-sm text-[#10141A]/55">
          No events created yet.
        </div>
      )}
    </section>
  );
}

function EventScopedSection({
  events,
  isFetching,
  section
}: {
  events: CampaignEvent[];
  isFetching: boolean;
  section: Exclude<WorkspaceSectionShellProps["section"], "events">;
}) {
  return (
    <section className="rounded-md border border-white/70 bg-white/45 p-4 shadow-[0_18px_60px_rgba(16,20,26,0.08)] backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{sectionTitles[section]} Workspaces</h2>
          <p className="text-xs text-[#10141A]/55">{isFetching ? "Syncing event list" : "Choose an event to continue"}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#10141A]/55">
          {events.length} events
        </span>
      </div>
      {events.length ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventSectionLink event={event} key={event.id} section={section} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-white/80 bg-white/45 px-4 py-10 text-center text-sm text-[#10141A]/55">
          No events created yet.
        </div>
      )}
    </section>
  );
}

function EventSectionLink({
  event,
  section
}: {
  event: CampaignEvent;
  section: Exclude<WorkspaceSectionShellProps["section"], "events">;
}) {
  return (
    <Link
      className="block rounded-md border border-white/70 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_45px_rgba(16,20,26,0.10)] focus:outline-none focus:ring-2 focus:ring-[#10141A]/10"
      href={`/events/${event.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{event.title}</h3>
          <p className="mt-1 text-xs text-[#10141A]/55">
            {categoryLabels[event.category]} · {event.subtype}
          </p>
        </div>
        <span className="rounded-full bg-[#10141A] px-2 py-1 text-[11px] font-medium text-white">
          {sectionTitles[section]}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <MetricLine label="Scale" value={scaleLabels[event.scaleTier]} />
        <MetricLine label="Pax" value={event.expectedPax === null ? "-" : String(event.expectedPax)} />
        <MetricLine label="Budget" value={event.estimatedBudgetAmount ? formatCurrency(Number(event.estimatedBudgetAmount)) : "-"} />
        <MetricLine label="Status" value={event.status.replace("_", " ")} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#10141A]/10 pt-3 text-xs font-medium text-[#10141A]">
        <span>Open command centre</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

function EventSummaryCard({ event }: { event: CampaignEvent }) {
  return (
    <Link
      className="block rounded-md border border-white/70 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_45px_rgba(16,20,26,0.10)] focus:outline-none focus:ring-2 focus:ring-[#10141A]/10"
      href={`/events/${event.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{event.title}</h3>
          <p className="mt-1 text-xs text-[#10141A]/55">
            {categoryLabels[event.category]} · {event.subtype}
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-[#10141A]/60">
          {event.status.replace("_", " ")}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <MetricLine label="Scale" value={scaleLabels[event.scaleTier]} />
        <MetricLine label="Pax" value={event.expectedPax === null ? "-" : String(event.expectedPax)} />
        <MetricLine label="Budget" value={event.estimatedBudgetAmount ? formatCurrency(Number(event.estimatedBudgetAmount)) : "-"} />
        <MetricLine label="City" value={event.city ?? "-"} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#10141A]/10 pt-3 text-xs font-medium text-[#10141A]">
        <span>Open command centre</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/70 px-3 py-2">
      <p className="text-[11px] uppercase text-[#10141A]/45">{label}</p>
      <p className="mt-0.5 truncate font-medium text-[#10141A]">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/80 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <p className="text-[11px] uppercase text-[#10141A]/45">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
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
