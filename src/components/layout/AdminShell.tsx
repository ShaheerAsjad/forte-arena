"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import { Logo } from "@/components/shared/Logo";
import { SignOutButton } from "@/app/(student)/dashboard/SignOutButton";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Trophy,
  Megaphone,
  Menu,
  X,
  PlusCircle,
  ListFilter,
  ShieldCheck,
  MessageSquareQuote,
  Home,
} from "lucide-react";

interface AdminNavTab {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const ADMIN_PRIMARY_TABS: AdminNavTab[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/registrations", label: "Registrations", icon: Users },
  { href: "/admin/results", label: "Results", icon: Trophy },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquareQuote },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Determine secondary tabs depending on active section
  const getSecondaryTabs = () => {
    if (pathname.startsWith("/admin/events")) {
      const isCreate = pathname === "/admin/events/new";
      const isEdit = pathname.includes("/edit");
      const isEventRegs = pathname.includes("/registrations");
      const isAll = pathname === "/admin/events";

      return [
        {
          href: "/admin/events",
          label: "All Competitions",
          icon: ListFilter,
          isActive: isAll,
        },
        {
          href: "/admin/events/new",
          label: "Create Event",
          icon: PlusCircle,
          isActive: isCreate,
        },
        ...(isEdit
          ? [
              {
                href: pathname,
                label: "Edit Event",
                icon: CalendarDays,
                isActive: true,
              },
            ]
          : []),
        ...(isEventRegs
          ? [
              {
                href: pathname,
                label: "Event Applications",
                icon: Users,
                isActive: true,
              },
            ]
          : []),
      ];
    }

    if (pathname.startsWith("/admin/registrations")) {
      return [
        {
          href: "/admin/registrations",
          label: "All Applications",
          icon: Users,
          isActive: true,
        },
      ];
    }

    if (pathname.startsWith("/admin/results")) {
      return [
        {
          href: "/admin/results",
          label: "Results & Certificates",
          icon: Trophy,
          isActive: true,
        },
      ];
    }

    if (pathname.startsWith("/admin/announcements")) {
      return [
        {
          href: "/admin/announcements",
          label: "Campus Bulletins",
          icon: Megaphone,
          isActive: true,
        },
      ];
    }

    return null;
  };

  const secondaryTabs = getSecondaryTabs();

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col font-sans">
      {/* 1. Slim Top Bar */}
      <header className="sticky top-0 z-40 w-full h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-navy-100 shadow-2xs">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left: Mobile hamburger + Logo + Organizer Badge */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="p-1.5 -ml-1.5 rounded-xl text-mist hover:text-navy-950 hover:bg-navy-50 md:hidden transition cursor-pointer"
              aria-label="Open navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Logo size="sm" href="/" />

            <div className="hidden sm:flex items-center gap-1.5 ml-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-navy-950 bg-navy-100/90 border border-navy-200/80 px-2.5 py-0.5 rounded-full">
                ORGANIZER CONSOLE
              </span>
            </div>
          </div>

          {/* Right: Public Site Link + Sign Out */}
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="sm:hidden text-[9px] font-extrabold uppercase tracking-wider text-navy-900 bg-navy-100 px-2 py-0.5 rounded-full">
              ORGANIZER
            </span>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-navy-950 px-2.5 py-1.5 rounded-xl hover:bg-navy-50 transition"
            >
              <Home className="w-3.5 h-3.5 text-gold-600" />
              <span>Back to Home</span>
            </Link>

            <div className="h-4 w-px bg-navy-200/60 hidden sm:block" />

            <SignOutButton />
          </div>
        </div>
      </header>

      {/* 2. Main Flex Container: Sidebar + Content */}
      <div className="flex flex-1 min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
        {/* Desktop Sticky Left Sidebar */}
        <aside className="w-64 border-r border-navy-100 bg-white sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex-col justify-between p-4 hidden md:flex shrink-0">
          <div className="space-y-1">
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-mist">
              Console Navigation
            </p>

            <nav className="space-y-1">
              {ADMIN_PRIMARY_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.exact
                  ? pathname === tab.href
                  : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-150 select-none",
                      isActive
                        ? "text-ivory"
                        : "text-mist hover:text-navy-950 hover:bg-navy-50/70"
                    )}
                  >
                    {/* Animated Active Pill */}
                    {isActive && (
                      <motion.div
                        layoutId={shouldReduceMotion ? undefined : "adminActivePill"}
                        className="absolute inset-0 bg-navy-900 rounded-xl shadow-xs -z-0"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 32,
                        }}
                      />
                    )}

                    <Icon
                      className={cn(
                        "w-4 h-4 z-10 transition-colors",
                        isActive ? "text-gold-400" : "text-mist"
                      )}
                    />
                    <span className="z-10">{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer info */}
          <div className="space-y-2">
            <Link
              href="/"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-navy-700 hover:text-navy-950 hover:bg-navy-50/80 transition-colors"
            >
              <Home className="w-4 h-4 text-gold-600" />
              <span>Back to Home</span>
            </Link>

            <div className="p-3 rounded-2xl bg-navy-50/70 border border-navy-100 text-xs space-y-1">
              <div className="flex items-center gap-2 text-navy-950 font-bold text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Organizer Session</span>
              </div>
              <p className="text-[10px] text-mist leading-relaxed">
                Administrative permissions active. Changes affect live events.
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Slide-in Drawer with Backdrop */}
        <AnimatePresence>
          {isDrawerOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setIsDrawerOpen(false)}
                className="fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-xs md:hidden"
                aria-hidden="true"
              />

              {/* Drawer Panel */}
              <motion.div
                initial={{ x: shouldReduceMotion ? 0 : "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: shouldReduceMotion ? 0 : "-100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 32 }}
                className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl p-5 flex flex-col justify-between md:hidden border-r border-navy-100"
              >
                <div className="space-y-6">
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-navy-100">
                    <div className="flex items-center gap-2">
                      <Logo size="sm" href="/" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-navy-950 bg-navy-100 px-2 py-0.5 rounded-full">
                        ORGANIZER
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-1.5 rounded-xl text-mist hover:text-navy-950 hover:bg-navy-50 transition cursor-pointer"
                      aria-label="Close navigation drawer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Drawer Navigation */}
                  <nav className="space-y-1.5">
                    {ADMIN_PRIMARY_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = tab.exact
                        ? pathname === tab.href
                        : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

                      return (
                        <Link
                          key={tab.href}
                          href={tab.href}
                          onClick={() => setIsDrawerOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors duration-150 select-none",
                            isActive
                              ? "bg-navy-900 text-ivory shadow-xs"
                              : "text-mist hover:text-navy-950 hover:bg-navy-50"
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

                {/* Drawer Footer */}
                <div className="pt-4 border-t border-navy-100 space-y-3">
                  <Link
                    href="/"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-navy-700 hover:text-navy-950 hover:bg-navy-50 transition"
                  >
                    <Home className="w-4 h-4 text-gold-600" />
                    <span>Back to Home</span>
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 3. Selected Section Content Area on the Right */}
        <main className="flex-1 min-w-0 bg-ivory flex flex-col">
          <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Secondary Tab Row (shown if active section has sub-pages) */}
            {secondaryTabs && secondaryTabs.length > 0 && (
              <div className="mb-6 flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur-xs border border-navy-100/90 rounded-2xl shadow-2xs overflow-x-auto no-scrollbar w-fit max-w-full">
                {secondaryTabs.map((subTab) => {
                  const SubIcon = subTab.icon;
                  return (
                    <Link
                      key={subTab.href}
                      href={subTab.href}
                      className={cn(
                        "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-150 whitespace-nowrap shrink-0",
                        subTab.isActive
                          ? "bg-navy-900 text-ivory shadow-2xs"
                          : "text-mist hover:text-navy-950 hover:bg-navy-50/80"
                      )}
                    >
                      <SubIcon
                        className={cn(
                          "w-3.5 h-3.5",
                          subTab.isActive ? "text-gold-400" : "text-mist"
                        )}
                      />
                      <span>{subTab.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
