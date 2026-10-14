"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import {
  Menu,
  X,
  ArrowRight,
  Calendar,
  Trophy,
  Info,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
  Shield,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useSession, signOut } from "@/lib/auth-client";
import { toast } from "sonner";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/results", label: "Results", icon: Trophy },
  { href: "/about", label: "About", icon: Info },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;

  const handleSignOut = async () => {
    setProfileMenuOpen(false);
    await signOut();
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  };

  const userInitial = (
    user?.name?.trim()?.[0] ||
    user?.email?.trim()?.[0] ||
    "U"
  ).toUpperCase();

  return (
    <header className="sticky top-4 z-40 w-full px-4 sm:px-6 max-w-6xl mx-auto">
      {/* Floating Translucent Pill Bar */}
      <div className="flex items-center justify-between px-5 py-3 rounded-full bg-white/85 backdrop-blur-md border border-navy-100/70 shadow-lg shadow-navy-950/5 transition-all">
        {/* Logo */}
        <Logo size="md" />

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 bg-navy-50/70 p-1 rounded-full border border-navy-100/40 relative">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative group px-4 py-1.5 rounded-full text-sm font-medium transition-colors select-none",
                  isActive
                    ? "text-ivory font-semibold"
                    : "text-ink/80 hover:text-navy-900"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    className="absolute inset-0 bg-navy-900 rounded-full shadow-xs -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 inline-block">
                  {link.label}
                  {!isActive && (
                    <span className="absolute -bottom-0.5 left-2 right-2 h-[2px] bg-gold-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-center rounded-full" />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Right Action / Profile Menu */}
        <div className="hidden sm:flex items-center gap-2.5">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                aria-label="User profile menu"
                aria-expanded={profileMenuOpen}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-navy-50/80 hover:bg-navy-100/90 border border-navy-200/60 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-900 to-navy-800 text-gold-400 border border-gold-400/50 flex items-center justify-center text-xs font-bold shadow-xs group-hover:border-gold-400 transition-colors overflow-hidden">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || "Avatar"}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <span className="text-xs font-semibold text-navy-950 max-w-[110px] truncate">
                  {user.name?.split(" ")[0] || "Student"}
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-mist transition-transform duration-200",
                    profileMenuOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Profile Dropdown */}
              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-navy-100 shadow-xl shadow-navy-950/10 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-navy-50 mb-1">
                      <p className="text-xs font-bold text-navy-950 truncate">
                        {user.name || "Student"}
                      </p>
                      <p className="text-[11px] text-mist truncate">
                        {user.email}
                      </p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-navy-950 hover:bg-navy-50 transition"
                    >
                      <LayoutDashboard className="w-4 h-4 text-gold-600" />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-navy-950 hover:bg-navy-50 transition"
                    >
                      <UserIcon className="w-4 h-4 text-navy-600" />
                      <span>Edit Profile</span>
                    </Link>
                    {(user as { role?: string })?.role === "ORGANIZER" && (
                      <Link
                        href="/admin"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-900 hover:bg-purple-50 transition"
                      >
                        <Shield className="w-4 h-4 text-purple-600" />
                        <span>Admin Console</span>
                      </Link>
                    )}
                    <div className="my-1 border-t border-navy-50" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-danger hover:bg-danger-bg transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-navy-950 hover:text-navy-700 transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-gold-500 hover:bg-gold-400 text-navy-950 shadow-sm shadow-gold-500/20 active:scale-95 transition-all"
              >
                <span>Register</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation"
          className="md:hidden p-2 rounded-full text-navy-950 hover:bg-navy-100 transition cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Full-Screen / Bottom Sheet Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[72px] z-50 p-4 bg-navy-950/20 backdrop-blur-md md:hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-navy-100 space-y-6 max-w-sm mx-auto animate-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col space-y-2">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-semibold transition-colors",
                      isActive
                        ? "bg-navy-900 text-ivory"
                        : "text-ink hover:bg-navy-50"
                    )}
                  >
                    {Icon && <Icon className="w-5 h-5 text-gold-500" />}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-navy-100 flex flex-col gap-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-navy-50/80 border border-navy-100">
                    <div className="w-9 h-9 rounded-full bg-navy-900 text-gold-400 border border-gold-400/50 flex items-center justify-center text-xs font-bold">
                      {userInitial}
                    </div>
                    <div className="truncate flex-1">
                      <p className="text-xs font-bold text-navy-950 truncate">
                        {user.name || "Student"}
                      </p>
                      <p className="text-[11px] text-mist truncate">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-navy-900 text-ivory text-sm font-semibold hover:bg-navy-800 transition"
                  >
                    <LayoutDashboard className="w-4 h-4 text-gold-400" />
                    <span>Go to Dashboard</span>
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-navy-200 text-mist text-xs font-semibold hover:text-danger hover:border-danger/30 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 rounded-xl border border-navy-200 text-navy-900 font-semibold"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 font-bold shadow-md shadow-gold-500/20"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
