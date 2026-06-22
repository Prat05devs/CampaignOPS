"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plus,
  Route,
  UsersRound,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { BrandLogo } from "../../components/brand-logo";
import { MobileBottomNav } from "../../components/mobile-bottom-nav";
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

export function EventsShell() {
  const router = useRouter();
  const { clearSession, hasHydrated, organization, role, setTokens, tokens, user } = useAuthStore();

  const eventsQuery = useQuery({
    enabled: Boolean(tokens?.accessToken),
    queryFn: () => listEvents(tokens?.accessToken ?? ""),
    queryKey: ["events", tokens?.accessToken]
  });

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

  const events = eventsQuery.data ?? [];
  const summary = useMemo(
    () => ({
      active: events.filter((event) => !["CANCELLED", "COMPLETED"].includes(event.status)).length,
      completed: events.filter((event) => event.status === "COMPLETED").length,
      draft: events.filter((event) => event.status === "DRAFT").length,
      total: events.length
    }),
    [events]
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
          Loading events...
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
                const isActive = item.href === "/events";

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
                  <h1 className="text-2xl font-semibold md:text-3xl">Events</h1>
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
                <Link
                  className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#10141A] px-4 text-sm font-medium text-white shadow-[0_16px_36px_rgba(16,20,26,0.25)] transition hover:bg-black sm:col-span-1"
                  href="/dashboard"
                >
                  <Plus className="h-4 w-4" />
                  New Event
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

          <div className="space-y-3 sm:space-y-4">
            <section className="rounded-md border border-white/70 bg-white/45 p-3 shadow-[0_24px_80px_rgba(16,20,26,0.09)] backdrop-blur-xl sm:p-4 md:p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 py-1 text-xs font-medium text-[#10141A]/65">
                    <Route className="h-3.5 w-3.5" />
                    Event workspace index
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">All campaign and event workspaces</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#10141A]/60">
                    Open the command centre for any event, scan current readiness, and keep the whole operations portfolio visible.
                  </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:w-auto lg:min-w-[420px]">
                  <EventMetric icon={CalendarDays} label="Total events" tone="blue" value={String(summary.total)} />
                  <EventMetric icon={UsersRound} label="Active events" tone="black" value={String(summary.active)} />
                  <EventMetric icon={MapPin} label="Draft" tone="white" value={String(summary.draft)} />
                  <EventMetric icon={IndianRupee} label="Completed" tone="red" value={String(summary.completed)} />
                </div>
              </div>
            </section>

            <section className="rounded-md border border-white/70 bg-white/45 p-3 shadow-[0_24px_80px_rgba(16,20,26,0.08)] backdrop-blur-xl sm:p-4">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold">Event command centres</h2>
                  <p className="text-xs text-[#10141A]/55">{eventsQuery.isFetching ? "Syncing events" : "Live from workspace events"}</p>
                </div>
                <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-[#10141A]/55">
                  {events.length} visible
                </span>
              </div>

              {eventsQuery.isError ? (
                <div className="mb-4 rounded-md border border-[#CE6969]/30 bg-[#CE6969]/10 px-3 py-2 text-sm text-[#9E3F3F]">
                  {eventsQuery.error.message}
                </div>
              ) : null}

              {events.length ? (
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {events.map((event) => (
                    <EventSummaryCard event={event} key={event.id} />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-white/80 bg-white/35 px-4 py-10 text-center text-sm text-[#10141A]/55">
                  No events created yet.
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
      <MobileBottomNav activeHref="/events" />
    </main>
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

function EventMetric({
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

function AvatarCircle({
  avatarUrl,
  name,
  size
}: {
  avatarUrl: string | null;
  name: string;
  size: "sm";
}) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#E4E4E4] bg-white text-[11px] font-semibold text-[#10141A]"
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
