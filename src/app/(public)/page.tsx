import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/motion/Reveal";
import { CountUp } from "@/components/motion/CountUp";
import { FloatingShapes } from "@/components/motion/FloatingShapes";
import { ArrowRight, Sparkles, Trophy, Users, Calendar } from "lucide-react";
import { APP_NAME } from "@/config/app";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <FloatingShapes />

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 px-4 sm:px-6 max-w-6xl mx-auto text-center space-y-8">
        <Reveal>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-navy-100/80 border border-gold-400/30 text-navy-900 text-xs sm:text-sm font-semibold shadow-xs">
            <Sparkles className="w-4 h-4 text-gold-500" />
            <span>Welcome to the Campus Arena Festival 2026</span>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-navy-950 max-w-4xl mx-auto leading-[1.1]">
            Unleash Your Talent at{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-navy-900 via-navy-700 to-gold-500">
              {APP_NAME}
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="text-base sm:text-xl text-mist max-w-2xl mx-auto leading-relaxed">
            The premier campus competition hub. Discover technical hackathons, esports tournaments, cultural arts, and athletic showdowns — all with instant registrations and live results.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/design">
              <Button size="lg" variant="gold" className="text-base font-bold shadow-lg shadow-gold-500/25">
                <span>View Design System</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="primary">
                Student Portal
              </Button>
            </Link>
          </div>
        </Reveal>

        {/* Stats Strip */}
        <Reveal delay={0.4}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-16 max-w-4xl mx-auto">
            <Card hoverable className="text-center p-6 bg-white/80 backdrop-blur-xs">
              <div className="text-3xl sm:text-4xl font-extrabold font-heading text-navy-900">
                <CountUp to={24} suffix="+" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-mist mt-1">
                Events
              </p>
            </Card>

            <Card hoverable className="text-center p-6 bg-white/80 backdrop-blur-xs">
              <div className="text-3xl sm:text-4xl font-extrabold font-heading text-navy-900">
                <CountUp to={1800} suffix="+" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-mist mt-1">
                Participants
              </p>
            </Card>

            <Card hoverable className="text-center p-6 bg-white/80 backdrop-blur-xs">
              <div className="text-3xl sm:text-4xl font-extrabold font-heading text-navy-900">
                <CountUp to={6} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-mist mt-1">
                Fest Categories
              </p>
            </Card>

            <Card hoverable className="text-center p-6 bg-white/80 backdrop-blur-xs">
              <div className="text-3xl sm:text-4xl font-extrabold font-heading text-gold-500">
                <CountUp to={50} prefix="$" suffix="k" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-mist mt-1">
                Prize Pool
              </p>
            </Card>
          </div>
        </Reveal>
      </section>

      {/* Feature Highlights */}
      <section className="py-20 bg-white/70 border-y border-navy-100/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <h2 className="font-heading text-3xl font-extrabold text-navy-950">
              Built for Fast, Seamless Competition
            </h2>
            <p className="text-sm text-mist">
              Everything from team formation to live organizer approvals and official certificates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card hoverable className="space-y-4 p-8">
              <div className="w-12 h-12 rounded-2xl bg-navy-100 text-navy-900 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-navy-800" />
              </div>
              <h3 className="font-heading font-bold text-xl text-navy-950">
                Live Event Catalog
              </h3>
              <p className="text-sm text-mist leading-relaxed">
                Filter by category, check deadline countdowns, and inspect team sizes and prizes.
              </p>
            </Card>

            <Card hoverable className="space-y-4 p-8">
              <div className="w-12 h-12 rounded-2xl bg-gold-100 text-warning flex items-center justify-center">
                <Users className="w-6 h-6 text-gold-600" />
              </div>
              <h3 className="font-heading font-bold text-xl text-navy-950">
                Solo & Team Rosters
              </h3>
              <p className="text-sm text-mist leading-relaxed">
                Register individually or lead a team with automatic member verification and roll numbers.
              </p>
            </Card>

            <Card hoverable className="space-y-4 p-8">
              <div className="w-12 h-12 rounded-2xl bg-success-bg text-success flex items-center justify-center">
                <Trophy className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-heading font-bold text-xl text-navy-950">
                Verified Winners Podium
              </h3>
              <p className="text-sm text-mist leading-relaxed">
                Official results published directly by organizers with positions, awards, and credentials.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
