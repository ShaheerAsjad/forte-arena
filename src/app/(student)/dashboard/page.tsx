import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { RegistrationsRepository } from "@/features/registrations/repositories/registrations.repository";
import { DashboardTabs } from "@/features/registrations/DashboardTabs";
import { SignOutButton } from "./SignOutButton";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Trophy, UserCircle } from "lucide-react";

async function DashboardContent() {
  const user = await requireUser("/login?next=/dashboard");

  const registrations = await RegistrationsRepository.getUserRegistrations(
    user.id
  );

  const approvedCount = registrations.filter(
    (r) => r.status === "APPROVED"
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-navy-100">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-950 font-heading tracking-tight">
            My Dashboard
          </h1>
          <p className="text-mist mt-1 text-sm">
            Welcome back,{" "}
            <span className="font-semibold text-navy-900">{user.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-950 transition"
          >
            <UserCircle className="w-4 h-4" />
            Profile
          </Link>
          <SignOutButton />
        </div>
      </header>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Registered",
            value: registrations.length,
            color: "navy",
          },
          {
            label: "Pending",
            value: registrations.filter((r) => r.status === "PENDING").length,
            color: "warning",
          },
          {
            label: "Approved",
            value: approvedCount,
            color: "success",
          },
          {
            label: "Rejected",
            value: registrations.filter((r) => r.status === "REJECTED").length,
            color: "danger",
          },
        ].map(({ label, value, color }) => (
          <Card
            key={label}
            className={`p-4 bg-white border border-navy-100 text-center`}
          >
            <p
              className={`text-2xl font-extrabold font-heading ${
                color === "warning"
                  ? "text-warning"
                  : color === "success"
                  ? "text-success"
                  : color === "danger"
                  ? "text-danger"
                  : "text-navy-950"
              }`}
            >
              {value}
            </p>
            <p className="text-xs font-medium text-mist mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Quick Action */}
      {registrations.length === 0 && (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-gradient-to-r from-navy-950 to-navy-800 text-ivory">
          <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-gold-400" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-base">No registrations yet</p>
            <p className="text-ivory/70 text-sm mt-0.5">
              Browse upcoming events and register to compete.
            </p>
          </div>
          <Link href="/events" className="shrink-0 self-center">
            <Button variant="gold" size="sm" withArrow>
              Explore Events
            </Button>
          </Link>
        </div>
      )}

      {/* Registration Tabs */}
      <DashboardTabs registrations={registrations} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen px-4 py-10 sm:px-8 bg-ivory overflow-hidden">
      {/* Ambient Navy/Gold Mesh Backdrop */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(245,185,1,0.2),rgba(0,25,105,0.12),transparent_70%)] blur-3xl" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[350px] bg-[radial-gradient(circle_at_center,rgba(98,136,237,0.14),transparent_65%)] blur-3xl" />
      </div>

      {/* Blueprint Grid Texture */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,15,64,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,15,64,0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_20%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto">
        <Suspense
          fallback={
            <div className="space-y-4 animate-pulse">
              <div className="h-12 bg-navy-100 rounded-2xl w-1/2" />
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-white rounded-xl border border-navy-100" />
                ))}
              </div>
              <div className="h-64 bg-white rounded-xl border border-navy-100" />
            </div>
          }
        >
          <DashboardContent />
        </Suspense>
      </div>
    </div>
  );
}
