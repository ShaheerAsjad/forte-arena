import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/features/users/ProfileForm";
import { ChangePasswordForm } from "@/features/users/ChangePasswordForm";
import { Card } from "@/components/ui/Card";
import { UserCircle, Home } from "lucide-react";

async function ProfileContent() {
  const user = await requireUser("/login?next=/profile");

  const [dbUser, credentialAccount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        rollNumber: true,
        department: true,
        phone: true,
      },
    }),
    prisma.account.findFirst({
      where: {
        userId: user.id,
        password: { not: null },
      },
      select: { id: true },
    }),
  ]);

  const hasPassword = !!credentialAccount;

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-navy-100 flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-navy-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-950 font-heading">
              My Profile
            </h1>
            <p className="text-sm text-mist">
              This information is shown to event organisers.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-950 transition"
          >
            <Home className="w-4 h-4 text-gold-600" />
            Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-950 transition"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <Card className="p-6 sm:p-8 bg-white border border-navy-100 shadow-sm">
        <ProfileForm
          initialValues={{
            name: dbUser?.name ?? user.name ?? "",
            email: dbUser?.email ?? user.email ?? "",
            rollNumber: dbUser?.rollNumber ?? null,
            department: dbUser?.department ?? null,
            phone: dbUser?.phone ?? null,
          }}
        />
      </Card>

      {hasPassword && (
        <Card className="p-6 sm:p-8 bg-white border border-navy-100 shadow-sm">
          <ChangePasswordForm />
        </Card>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="min-h-screen px-4 py-10 sm:px-8 bg-navy-50/40">
      <Suspense
        fallback={
          <div className="max-w-xl mx-auto">
            <Card className="p-8 h-96 animate-pulse bg-navy-50" />
          </div>
        }
      >
        <ProfileContent />
      </Suspense>
    </div>
  );
}
