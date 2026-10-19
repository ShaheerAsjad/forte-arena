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
  Home,
  QrCode,
  UserCheck,
} from "lucide-react";

const ADMIN_TABS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/scan", label: "Scan Entry", icon: QrCode },
  { href: "/admin/attendance", label: "Attendance", icon: UserCheck },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/registrations", label: "Registrations", icon: Users },
  { href: "/admin/results", label: "Results", icon: Trophy },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
];

export function AdminTopNav() {
  const pathname = usePathname();

  return (
    <div className="w-full bg-white border-b border-navy-100 shadow-xs sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Upper Top Bar: Logo & User Control */}
        <div className="flex items-center justify-between py-3 border-b border-navy-50 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Logo size="sm" href="/" className="shrink-0" />
            <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-navy-100 text-navy-900 font-bold uppercase tracking-wider shrink-0">
              Organizer Console
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link
              href="/"
              aria-label="Back to Home"
              className="text-xs font-semibold text-navy-700 hover:text-navy-950 transition inline-flex items-center justify-center p-2 sm:px-2.5 sm:py-1 rounded-lg hover:bg-navy-50"
            >
              <Home className="w-4 h-4 text-gold-600 shrink-0" />
              <span className="hidden sm:inline ml-1.5">Back to Home</span>
            </Link>
            <SignOutButton className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm whitespace-nowrap" />
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
