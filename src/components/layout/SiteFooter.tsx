"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { APP_NAME } from "@/config/app";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-navy-950 text-ivory/80 pt-16 pb-12 border-t border-navy-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-navy-900">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-2 pr-4">
            <div className="[&_span]:text-ivory">
              <Logo size="lg" />
            </div>
            <p className="text-sm text-ivory/60 max-w-sm leading-relaxed">
              The premier festival and competition management portal. Discover, register, compete, and celebrate campus talent across technical, gaming, academic, and cultural arenas.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-gold-400">
              Platform
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/events" className="hover:text-gold-400 transition-colors">
                  Explore Events
                </Link>
              </li>
              <li>
                <Link href="/results" className="hover:text-gold-400 transition-colors">
                  Results & Winners
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-gold-400 transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-gold-400 transition-colors">
                  About the Fest
                </Link>
              </li>
              <li>
                <Link href="/design" className="hover:text-gold-400 transition-colors">
                  Design Showcase
                </Link>
              </li>
            </ul>
          </div>

          {/* Account / Support */}
          <div className="space-y-3">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-gold-400">
              Portals
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-gold-400 transition-colors">
                  Student Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-gold-400 transition-colors">
                  Organizer Console
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-gold-400 transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-gold-400 transition-colors">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-ivory/50 gap-4">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
