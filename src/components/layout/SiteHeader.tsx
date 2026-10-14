"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/shared/Logo";
import { Menu, X, ArrowRight, Calendar, Trophy, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/results", label: "Results", icon: Trophy },
  { href: "/about", label: "About", icon: Info },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-2.5">
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
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
