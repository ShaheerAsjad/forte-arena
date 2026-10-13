"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { SignOutButton } from "@/app/(student)/dashboard/SignOutButton";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Trophy,
  Megaphone,
} from "lucide-react";

const ADMIN_TABS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/events/registrations", label: "Registrations", icon: Users },
  { href: "/admin/results", label: "Results", icon: Trophy },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
];

export function AdminTopNav() {
  const pathname = usePathname();

  return (
    <div className="w-full bg-white border-b border-navy-100 shadow-xs sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Upper Top Bar: Logo & User Control */}
        <div className="flex items-center justify-between py-3.5 border-b border-navy-50">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-navy-100 text-navy-900 font-bold uppercase tracking-wider">
              Organizer Console
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-mist hover:text-navy-900 transition hidden sm:inline"
            >
              Public Site →
            </Link>
            <SignOutButton />
          </div>
        </div>

        {/* Lower Pill Tab Bar (Horizontal Scroll on Mobile, NO Sidebar) */}
        <nav className="flex items-center gap-2 py-2.5 overflow-x-auto no-scrollbar">
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              tab.href === "/admin"
                ? pathname === "/admin"
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 shrink-0 select-none",
                  isActive
                    ? "bg-navy-900 text-ivory shadow-xs"
                    : "text-mist hover:text-navy-900 hover:bg-navy-50"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isActive ? "text-gold-400" : "text-mist"
                  )}
                />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
