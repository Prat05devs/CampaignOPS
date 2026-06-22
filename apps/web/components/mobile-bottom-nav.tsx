"use client";

import { CalendarDays, ClipboardList, IndianRupee, LayoutDashboard, UsersRound, WalletCards } from "lucide-react";
import Link from "next/link";

const mobileNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/events", icon: CalendarDays, label: "Events" },
  { href: "/tasks", icon: ClipboardList, label: "Tasks" },
  { href: "/vendors", icon: WalletCards, label: "Vendors" },
  { href: "/contacts", icon: UsersRound, label: "Contacts" },
  { href: "/budget", icon: IndianRupee, label: "Budget" }
];

export function MobileBottomNav({ activeHref }: { activeHref: string }) {
  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-2 bottom-2 z-50 grid grid-cols-6 rounded-md border border-white/75 bg-white/80 p-1 shadow-[0_18px_55px_rgba(16,20,26,0.18)] backdrop-blur-xl lg:hidden"
    >
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === activeHref;

        return (
          <Link
            aria-label={item.label}
            className={
              isActive
                ? "flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md bg-[#10141A] text-white"
                : "flex h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-md text-[#10141A]/58 transition hover:bg-white hover:text-[#10141A]"
            }
            href={item.href}
            key={item.href}
            title={item.label}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="max-w-full truncate text-[10px] font-medium leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
