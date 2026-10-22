/**
 * Helper to determine if a student is enabled based on system rollout settings.
 * Supports:
 * - Array format: [1, 2, 3, 4]
 * - Map format: { "1": ["ALL"], "2": ["deptId"], "3": [] }
 * - Stringified JSON
 */
export function isStudentRolloutEnabled(
  enabledYearsRaw: string | object | number[] | null | undefined,
  studentYear: number | null | undefined,
  studentDeptId?: string | null
): boolean {
  if (!studentYear) return true; // If student has no year assigned, do not block
  if (!enabledYearsRaw) return true;

  let parsed: any = enabledYearsRaw;
  if (typeof enabledYearsRaw === 'string') {
    try {
      parsed = JSON.parse(enabledYearsRaw);
    } catch {
      return true;
    }
  }

  // 1. Array of numbers or strings: e.g. [1, 2, 3] or ["1", "2"]
  if (Array.isArray(parsed)) {
    return parsed.map(Number).includes(Number(studentYear));
  }

  // 2. Object map: { "1": ["ALL"], "2": ["dept-1", "dept-2"], "3": [] }
  if (parsed && typeof parsed === 'object') {
    const yearKey = studentYear.toString();
    const yearConfig = parsed[yearKey] ?? parsed[Number(studentYear)];
    if (!yearConfig) return false;

    if (Array.isArray(yearConfig)) {
      if (yearConfig.length === 0) return false;
      if (yearConfig.includes('ALL')) return true;
      if (studentDeptId && yearConfig.includes(studentDeptId)) return true;
      // If student has no department specified but the year has enabled departments:
      if (!studentDeptId && yearConfig.length > 0) return true;
      return false;
    }

    return Boolean(yearConfig);
  }

  return true;
}
