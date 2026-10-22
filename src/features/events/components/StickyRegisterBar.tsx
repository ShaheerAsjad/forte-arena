"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { EventShareActions } from "@/features/events/components/EventShareActions";
import { formatEventDate } from "@/lib/dates";
import { Calendar, Users, User, ArrowRight } from "lucide-react";

interface StickyRegisterBarProps {
  event: {
    id: string;
    slug: string;
    title: string;
    venue: string;
    startsAt: Date | string;
    category: string;
    participationType: string;
    registrationDeadline: Date | string;
    maxParticipants?: number | null;
  };
  derivedStatus: string;
  remainingSeats: number | null;
  isLoggedIn: boolean;
  existingRegistration?: { id: string; status: string } | null;
}

export function StickyRegisterBar({
  event,
  derivedStatus,
  remainingSeats,
  isLoggedIn,
  existingRegistration,
}: StickyRegisterBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const target = document.getElementById("event-register-card");
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the card is NOT intersecting and its top is above the viewport (scrolled past)
        const isPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setIsVisible(isPast);
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const isRegistrationOpen =
    derivedStatus === "Registration Open" || derivedStatus === "Closing Soon";
  const registerHref = `/events/${event.slug}/register`;
  const loginHref = `/login?next=${encodeURIComponent(registerHref)}`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { y: 100, opacity: 0 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { y: 100, opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-navy-950/92 backdrop-blur-xl border-t border-gold-500/25 shadow-[0_-10px_35px_rgba(0,12,45,0.6)] py-3 px-4 sm:px-8 text-ivory"
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            {/* Left: Event Title & Details */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="hidden sm:flex flex-col min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gold-400">
                  {event.category} Arena
                </span>
                <p className="font-heading font-extrabold text-sm sm:text-base text-ivory truncate max-w-xs md:max-w-md">
                  {event.title}
                </p>
              </div>

              <div className="hidden md:flex items-center gap-3 text-xs text-ivory/70 border-l border-white/10 pl-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gold-400" />
                  {formatEventDate(event.startsAt)}
                </span>
                <span className="flex items-center gap-1">
                  {event.participationType === "TEAM" ? (
                    <Users className="w-3.5 h-3.5 text-gold-400" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-gold-400" />
                  )}
                  {event.participationType === "TEAM" ? "Team" : "Solo"}
                </span>
              </div>

              {/* Mobile-only short title */}
              <div className="sm:hidden flex flex-col min-w-0">
                <p className="font-heading font-bold text-xs text-ivory truncate max-w-[170px]">
                  {event.title}
                </p>
                <span className="text-[10px] text-gold-400 font-medium">
                  {remainingSeats !== null ? `${remainingSeats} spots left` : event.venue}
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <EventShareActions
                event={event}
                variant="compact"
                className="hidden sm:flex"
              />

              {existingRegistration && existingRegistration.status !== "WITHDRAWN" ? (
                <Link href={`/dashboard/${existingRegistration.id}`}>
                  <Button variant="primary" size="sm" className="whitespace-nowrap">
                    View Registration
                  </Button>
                </Link>
              ) : !isRegistrationOpen ? (
                <Button disabled variant="outline" size="sm" className="whitespace-nowrap border-white/20 text-ivory/60">
                  {derivedStatus === "Completed" ? "Event Completed" : "Registration Closed"}
                </Button>
              ) : remainingSeats === 0 ? (
                <Button disabled variant="outline" size="sm" className="whitespace-nowrap border-white/20 text-ivory/60">
                  Capacity Reached
                </Button>
              ) : isLoggedIn ? (
                <Link href={registerHref}>
                  <Button
                    variant="gold"
                    size="sm"
                    className="whitespace-nowrap shadow-md shadow-gold-500/20 font-bold"
                  >
                    <span>Register Now</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              ) : (
                <Link href={loginHref}>
                  <Button
                    variant="gold"
                    size="sm"
                    className="whitespace-nowrap font-bold"
                  >
                    <span>Sign In to Register</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
