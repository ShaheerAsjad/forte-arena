"use client";

import { useState, useEffect, useRef } from "react";
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
  Award,
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
  { href: "/leaderboard", label: "Leaderboard", icon: Award },
  { href: "/about", label: "About", icon: Info },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setProfileMenuOpen(false);
  }

  // Close profile menu on outside click or Escape key
  useEffect(() => {
    if (!profileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        profileMenuRef.current &&
        event.target instanceof Node &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        profileTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 400);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isDarkHero = pathname === "/" && !isScrolled;

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
      <div
        className={cn(
          "flex items-center justify-between px-5 py-3 rounded-full backdrop-blur-md transition-all duration-300",
          isDarkHero
            ? "bg-navy-950/80 border border-white/15 shadow-xl shadow-navy-950/30 text-ivory"
            : "bg-white/90 border border-navy-100/70 shadow-lg shadow-navy-950/5 text-navy-950"
        )}
      >
        {/* Logo */}
        <Logo
          size="md"
          className={cn(isDarkHero && "[&_span]:text-ivory [&_span]:group-hover:text-white")}
        />

        {/* Desktop Nav Links */}
        <nav
          className={cn(
            "hidden md:flex items-center gap-0.5 lg:gap-1 p-1 rounded-full border relative transition-colors",
            isDarkHero
              ? "bg-white/10 border-white/15"
              : "bg-navy-50/70 border-navy-100/40"
          )}
        >
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
                  "relative group px-2.5 lg:px-4 py-1.5 rounded-full text-xs lg:text-sm font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 motion-reduce:transition-none",
                  isActive
                    ? isDarkHero
                      ? "text-navy-950 font-bold"
                      : "text-ivory font-semibold"
                    : isDarkHero
                    ? "text-ivory/80 hover:text-white"
                    : "text-ink/80 hover:text-navy-900"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    className={cn(
                      "absolute inset-0 rounded-full shadow-xs -z-10",
                      isDarkHero ? "bg-gold-400" : "bg-navy-900"
                    )}
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
            <div className="relative" ref={profileMenuRef}>
              <button
                ref={profileTriggerRef}
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-label="User profile menu"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                className={cn(
                  "flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-gold-400",
                  isDarkHero
                    ? "bg-white/10 hover:bg-white/15 border-white/20 text-ivory"
                    : "bg-navy-50/80 hover:bg-navy-100/90 border-navy-200/60 text-navy-950"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-navy-900 to-navy-800 text-gold-400 border border-gold-400/50 flex items-center justify-center text-xs font-bold shadow-xs group-hover:border-gold-400 transition-colors overflow-hidden">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || "User avatar"}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <span className="text-xs font-semibold max-w-[100px] truncate">
                  {user.name?.split(" ")[0] || "Account"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-mist group-hover:text-gold-500 transition-colors" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  aria-label="User profile options"
                  className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-navy-100 shadow-xl py-2 z-50 text-[#001969]"
                >
                  <div className="px-4 py-2 border-b border-navy-50">
                    <p className="text-xs font-bold text-[#001969] truncate">
                      {user.name || "Student"}
                    </p>
                    <p className="text-[11px] text-mist truncate">
                      {user.email}
                    </p>
                  </div>

                  <Link
                    href="/dashboard"
                    role="menuitem"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#001969] hover:bg-[#FFF3C9] hover:text-[#001969] focus-visible:bg-[#FFF3C9] focus-visible:text-[#001969] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-gold-600 shrink-0" />
                    <span className="text-[#001969]">My Registrations</span>
                  </Link>

                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#001969] hover:bg-[#FFF3C9] hover:text-[#001969] focus-visible:bg-[#FFF3C9] focus-visible:text-[#001969] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-gold-600 shrink-0" />
                    <span className="text-[#001969]">Edit Profile</span>
                  </Link>

                  {((user as unknown as { role?: string }).role === "ORGANIZER" ||
                    (user as unknown as { role?: string }).role === "ADMIN") && (
                    <Link
                      href="/admin"
                      role="menuitem"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#001969] hover:bg-[#FFF3C9] hover:text-[#001969] focus-visible:bg-[#FFF3C9] focus-visible:text-[#001969] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 transition-colors"
                    >
                      <Shield className="w-4 h-4 text-gold-600 shrink-0" />
                      <span className="text-[#001969]">Organizer Console</span>
                    </Link>
                  )}

                  <button
                    onClick={handleSignOut}
                    role="menuitem"
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#B42318] hover:bg-[#FEE4E2] hover:text-[#912018] focus-visible:bg-[#FEE4E2] focus-visible:text-[#912018] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B42318] transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-[#B42318] shrink-0" />
                    <span className="text-[#B42318]">Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  "px-4 py-2 text-sm font-medium transition",
                  isDarkHero ? "text-ivory/90 hover:text-white" : "text-navy-950 hover:text-navy-700"
                )}
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
          className={cn(
            "md:hidden p-2 rounded-full transition cursor-pointer",
            isDarkHero ? "text-ivory hover:bg-white/10" : "text-navy-950 hover:bg-navy-100"
          )}
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
                  {((user as { role?: string })?.role === "ORGANIZER" ||
                    (user as { role?: string })?.role === "ADMIN") && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-900 text-ivory text-sm font-semibold hover:bg-purple-800 transition shadow-sm"
                    >
                      <Shield className="w-4 h-4 text-gold-400" />
                      <span>Admin Console</span>
                    </Link>
                  )}
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
