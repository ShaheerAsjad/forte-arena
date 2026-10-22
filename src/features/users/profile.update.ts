export interface ProfileUpdateData {
  rollNumber: string;
  phone: string;
  department?: string | null;
  academicYear?: string | null;
}

export function buildProfileUpdateData(parsed: {
  rollNumber: string;
  phone: string;
  department?: string | null;
  academicYear?: string | null;
}): ProfileUpdateData {
  const data: ProfileUpdateData = {
    rollNumber: parsed.rollNumber,
    phone: parsed.phone,
  };

  if (parsed.department !== undefined) {
    data.department =
      parsed.department === "" || parsed.department === null
        ? null
        : parsed.department;
  }

  if (parsed.academicYear !== undefined) {
    data.academicYear =
      parsed.academicYear === "" || parsed.academicYear === null
        ? null
        : parsed.academicYear;
  }

  return data;
}
