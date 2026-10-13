import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "./SignOutButton";

async function DashboardContent() {
  const user = await requireUser("/login?next=/dashboard");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Welcome back, {user.name} ({user.email})
          </p>
        </div>
        <SignOutButton />
      </header>

      <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="inline-block px-3 py-1 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
          Role: {(user as { role?: string }).role || "STUDENT"}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          This is the student dashboard placeholder. Auth gating passed successfully!
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <Suspense fallback={<div className="p-8 text-center text-zinc-500">Loading dashboard...</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
