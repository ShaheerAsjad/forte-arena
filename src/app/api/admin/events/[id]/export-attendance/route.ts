import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { AttendanceRepository } from "@/features/attendance/repositories/attendance.repository";

import { generateAttendanceCsv } from "@/features/attendance/attendance.csv";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Role verification: ORGANIZER or ADMIN only
    await requireRole(["ORGANIZER", "ADMIN"]);

    // 2. Resolve dynamic route params
    const { id } = await params;

    // 3. Fetch event
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // 4. Fetch all approved participants (solo and team members)
    const participants = await AttendanceRepository.getEventAttendanceParticipants(id);

    // 5. Build CSV structure
    const csvContent = generateAttendanceCsv(participants);

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${event.slug}-attendance.csv"`,
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
      { error: "Failed to export attendance" },
      { status: 500 }
    );
  }
}
