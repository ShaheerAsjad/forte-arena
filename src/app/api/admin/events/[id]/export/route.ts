import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { buildCsv } from "@/features/admin/admin.utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Role verification: ORGANIZER or ADMIN only
    await requireRole(["ORGANIZER", "ADMIN"]);

    // 2. Resolve dynamic route params (Next.js 16 async params)
    const { id } = await params;

    // 3. Fetch event
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
        participationType: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // 4. Fetch registrations with student profile and team details
    const registrations = await prisma.registration.findMany({
      where: { eventId: id },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            rollNumber: true,
            department: true,
            phone: true,
          },
        },
        team: {
          include: {
            members: {
              select: {
                fullName: true,
                rollNumber: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    // 5. Build CSV structure
    const headers = [
      "Registration ID",
      "Event Title",
      "Participation Type",
      "Participant / Team Name",
      "Leader Roll Number",
      "Department",
      "Email",
      "Phone",
      "Team Members (Name [Roll])",
      "Status",
      "Attempt Count",
      "Submitted Date",
      "Notes / Rejection Reason",
    ];

    const rows = registrations.map((reg) => {
      const isTeam = reg.team !== null;
      const participantName = isTeam ? reg.team!.name : reg.user.name;
      const leaderRollNumber = reg.user.rollNumber || "";
      const department = reg.user.department || "";
      const email = reg.user.email;
      const phone = reg.user.phone || "";

      const membersList = isTeam
        ? reg.team!.members
            .map((m) => `${m.fullName} [${m.rollNumber}]`)
            .join("; ")
        : "";

      const submittedAt = new Date(reg.createdAt).toISOString();
      const notes = reg.notes || reg.rejectionReason || "";

      return [
        reg.id,
        event.title,
        reg.team ? "TEAM" : "INDIVIDUAL",
        participantName,
        leaderRollNumber,
        department,
        email,
        phone,
        membersList,
        reg.status,
        reg.attemptCount,
        submittedAt,
        notes,
      ];
    });

    const csvContent = buildCsv(headers, rows);

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${event.slug}-registrations.csv"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("Access denied") || err.message.includes("logged in"))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to export registrations" },
      { status: 500 }
    );
  }
}
