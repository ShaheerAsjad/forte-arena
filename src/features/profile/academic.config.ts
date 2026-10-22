/**
 * Academic Configuration for College Profile, Departments & Years
 */

export const DEPARTMENTS = [
  { value: "ICS", label: "ICS" },
  { value: "FSC_PRE_ENGINEERING", label: "FSc Pre-Engineering" },
  { value: "FSC_PRE_MEDICAL", label: "FSc Pre-Medical" },
  { value: "ARTS", label: "Arts" },
] as const;

export type DepartmentValue = (typeof DEPARTMENTS)[number]["value"];
export type DepartmentLabel = (typeof DEPARTMENTS)[number]["label"];

export const YEARS = [
  { value: "FIRST_YEAR", label: "First Year" },
  { value: "SECOND_YEAR", label: "Second Year" },
] as const;

export type YearValue = (typeof YEARS)[number]["value"];
export type YearLabel = (typeof YEARS)[number]["label"];

// Derived from DEPARTMENTS (no duplicate hand-written lists)
export const DEPARTMENT_VALUES = DEPARTMENTS.map(
  (d) => d.value
) as [DepartmentValue, ...DepartmentValue[]];

export const DEPARTMENT_LABELS: Record<DepartmentValue, DepartmentLabel> = Object.freeze(
  Object.fromEntries(DEPARTMENTS.map((d) => [d.value, d.label])) as Record<
    DepartmentValue,
    DepartmentLabel
  >
);

export const VALID_DEPARTMENT_CODES: ReadonlySet<string> = new Set(DEPARTMENT_VALUES);
export const VALID_DEPARTMENT_LABELS: ReadonlySet<string> = new Set(
  DEPARTMENTS.map((d) => d.label)
);

// Derived from YEARS (no duplicate hand-written lists)
export const YEAR_VALUES = YEARS.map(
  (y) => y.value
) as [YearValue, ...YearValue[]];

export const YEAR_LABELS: Record<YearValue, YearLabel> = Object.freeze(
  Object.fromEntries(YEARS.map((y) => [y.value, y.label])) as Record<
    YearValue,
    YearLabel
  >
);

export const VALID_YEAR_CODES: ReadonlySet<string> = new Set(YEAR_VALUES);
export const VALID_YEAR_LABELS: ReadonlySet<string> = new Set(
  YEARS.map((y) => y.label)
);

/**
 * Checks if a value matches a valid department code or label in DEPARTMENTS.
 */
export function isValidDepartment(dept: unknown): dept is DepartmentValue | DepartmentLabel {
  if (typeof dept !== "string") return false;
  const trimmed = dept.trim();
  return (
    VALID_DEPARTMENT_CODES.has(trimmed) ||
    VALID_DEPARTMENT_LABELS.has(trimmed)
  );
}

/**
 * Checks if a value is a valid department code (e.g. "ICS", "FSC_PRE_MEDICAL").
 */
export function isValidDepartmentCode(code: unknown): code is DepartmentValue {
  if (typeof code !== "string") return false;
  return VALID_DEPARTMENT_CODES.has(code.trim());
}

/**
 * Checks if a value matches a valid academic year code or label in YEARS.
 */
export function isValidYear(year: unknown): year is YearValue | YearLabel {
  if (typeof year !== "string") return false;
  const trimmed = year.trim();
  return (
    VALID_YEAR_CODES.has(trimmed) ||
    VALID_YEAR_LABELS.has(trimmed)
  );
}

/**
 * Checks if a value is a valid academic year code (e.g. "FIRST_YEAR", "SECOND_YEAR").
 */
export function isValidYearCode(code: unknown): code is YearValue {
  if (typeof code !== "string") return false;
  return VALID_YEAR_CODES.has(code.trim());
}

/**
 * Returns the label for a department code (e.g. "FSC_PRE_MEDICAL" -> "FSc Pre-Medical").
 * Returns null if the code is unknown.
 */
export function getDepartmentLabel(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const trimmed = code.trim() as DepartmentValue;
  return DEPARTMENT_LABELS[trimmed] ?? null;
}

/**
 * Returns the label for an academic year code (e.g. "FIRST_YEAR" -> "First Year").
 * Returns null if the code is unknown.
 */
export function getYearLabel(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const trimmed = code.trim() as YearValue;
  return YEAR_LABELS[trimmed] ?? null;
}

/**
 * Resolves a stored department string (accepts code or label) to its canonical display label.
 * Returns null if the value is not in DEPARTMENTS.
 */
export function resolveDepartmentLabel(dept: unknown): string | null {
  if (typeof dept !== "string") return null;
  const trimmed = dept.trim();
  const matched = DEPARTMENTS.find(
    (d) => d.value === trimmed || d.label === trimmed
  );
  return matched ? matched.label : null;
}

/**
 * Sanitizes academic department and year inputs.
 * Returns the code if valid, otherwise null.
 */
export function sanitizeAcademicFields(input?: {
  department?: unknown;
  academicYear?: unknown;
} | null): {
  department: DepartmentValue | null;
  academicYear: YearValue | null;
} {
  const dept = input?.department;
  const year = input?.academicYear;
  return {
    department: isValidDepartmentCode(dept)
      ? (dept.trim() as DepartmentValue)
      : null,
    academicYear: isValidYearCode(year)
      ? (year.trim() as YearValue)
      : null,
  };
}
