import { formatTime24 } from "@/lib/dates";
import { buildCsv } from "@/features/admin/admin.utils";
import type { AttendanceParticipantItem } from "./repositories/attendance.repository";

export const ATTENDANCE_CSV_HEADERS = [
  "Name",
  "Roll Number",
  "Department",
  "Team",
  "Present",
  "Time",
  "Method",
];

export function buildAttendanceCsvRows(
  participants: AttendanceParticipantItem[]
): Array<Array<unknown>> {
  return participants.map((p) => {
    const present = p.attendedAt ? "Yes" : "No";
    const timeStr = p.attendedAt ? formatTime24(p.attendedAt) : "";
    let methodStr = "";
    if (p.attendedAt) {
      if (p.attendanceMethod === "QR") {
        methodStr = "QR";
      } else if (p.attendanceMethod === "MANUAL") {
        methodStr = "Manual";
      } else {
        methodStr = "Earlier / Unknown";
      }
    }

    return [
      p.name,
      p.rollNumber || "",
      p.department || "",
      p.teamName || "",
      present,
      timeStr,
      methodStr,
    ];
  });
}

export function generateAttendanceCsv(
  participants: AttendanceParticipantItem[]
): string {
  const rows = buildAttendanceCsvRows(participants);
  return buildCsv(ATTENDANCE_CSV_HEADERS, rows);
}
