import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Compass, Calendar, Trophy, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-lg w-full text-center space-y-7 p-8 sm:p-10 rounded-3xl bg-white border border-navy-100 shadow-xl shadow-navy-950/5 relative overflow-hidden">
        {/* Subtle Ambient Accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-gold-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-navy-900/5 rounded-full blur-2xl pointer-events-none" />

        {/* Icon Emblem */}
        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-navy-950 to-navy-900 border border-navy-800 text-gold-400 flex items-center justify-center shadow-lg shadow-navy-950/20">
          <Compass className="w-10 h-10 animate-pulse text-gold-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gold-500 rounded-full" />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest text-gold-600 bg-gold-100 border border-gold-300">
            404 • Destination Not Found
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-navy-950">
            Off the Festival Map
          </h1>
          <p className="text-sm text-mist leading-relaxed max-w-sm mx-auto">
            The competition, result sheet, or page you were looking for doesn&apos;t exist, was renamed, or has moved to another arena.
          </p>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
          <Link href="/events" className="group p-3 rounded-2xl border border-navy-100 hover:border-gold-300 hover:bg-gold-50/40 transition">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-navy-100 text-navy-900 flex items-center justify-center group-hover:bg-gold-400 group-hover:text-navy-950 transition">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-navy-950">Active Events</p>
                <p className="text-[10px] text-mist">Browse all festivals</p>
              </div>
            </div>
          </Link>

          <Link href="/results" className="group p-3 rounded-2xl border border-navy-100 hover:border-gold-300 hover:bg-gold-50/40 transition">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-navy-100 text-navy-900 flex items-center justify-center group-hover:bg-gold-400 group-hover:text-navy-950 transition">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-navy-950">Leaderboard</p>
                <p className="text-[10px] text-mist">Podium results</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Return Home CTA */}
        <Link href="/" className="block">
          <Button variant="primary" size="md" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2 text-gold-400" />
            <span>Return to Home Arena</span>
          </Button>
        </Link>
      </Card>
    </div>
  );
}
