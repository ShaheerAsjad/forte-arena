import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { EventsRepository } from "@/features/events/repositories/events.repository";
import { RegistrationsRepository } from "@/features/registrations/repositories/registrations.repository";
import { prisma } from "@/lib/prisma";
import { RegisterStepper } from "@/features/registrations/RegisterStepper";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface RegisterPageProps {
  params: Promise<{ slug: string }>;
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { slug } = await params;

  return (
    <div className="min-h-screen px-4 py-10 sm:px-8 bg-navy-50/40">
      <div className="max-w-lg mx-auto">
        <Link
          href={`/events/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-mist hover:text-navy-950 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Event
        </Link>

        <Card className="p-6 sm:p-8 bg-white border border-navy-100 shadow-sm">
          <Suspense
            fallback={
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-navy-100 rounded w-3/4" />
                <div className="h-40 bg-navy-50 rounded-xl" />
              </div>
            }
          >
            <RegisterContent slug={slug} />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}

async function RegisterContent({ slug }: { slug: string }) {
  const user = await requireUser(`/login?next=/events/${slug}/register`);

  const event = await EventsRepository.getEventBySlug(slug);
  if (!event) notFound();

  // Must be PUBLISHED
  if (event.status !== "PUBLISHED") {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-bg border border-danger/20">
        <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-danger">Registration Unavailable</p>
          <p className="text-sm text-danger/80 mt-0.5">
            This event is not currently accepting registrations.
          </p>
        </div>
      </div>
    );
  }

  // Must be before deadline
  if (new Date() > event.registrationDeadline) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-bg border border-danger/20">
        <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-danger">Registration Closed</p>
          <p className="text-sm text-danger/80 mt-0.5">
            The registration deadline for this event has passed.
          </p>
        </div>
      </div>
    );
  }

  // Already registered?
  const existing = await RegistrationsRepository.findExistingRegistration(event.id, user.id);
  if (existing) {
    redirect(`/dashboard/${existing.id}`);
  }

  // Profile completeness
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      rollNumber: true,
      department: true,
      phone: true,
    },
  });

  if (!dbUser?.rollNumber || !dbUser.department || !dbUser.phone) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-warning-bg border border-warning/30">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-warning">Profile Incomplete</p>
            <p className="text-sm text-warning/80 mt-0.5">
              You must complete your profile before registering for events.
            </p>
          </div>
        </div>
        <Link
          href={`/profile?next=/events/${slug}/register`}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-900 text-ivory text-sm font-semibold hover:bg-navy-800 transition"
        >
          Complete Profile
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-mist mb-1">
          Registering for
        </p>
        <h1 className="text-xl font-bold text-navy-950 font-heading">
          {event.title}
        </h1>
      </div>

      <RegisterStepper
        event={{
          id: event.id,
          slug: event.slug,
          title: event.title,
          participationType: event.participationType,
          minTeamSize: event.minTeamSize,
          maxTeamSize: event.maxTeamSize,
          venue: event.venue,
          registrationDeadline: event.registrationDeadline,
        }}
        profile={{
          name: dbUser.name ?? user.name ?? "",
          email: dbUser.email ?? user.email ?? "",
          rollNumber: dbUser.rollNumber,
          department: dbUser.department,
          phone: dbUser.phone,
        }}
      />
    </div>
  );
}
