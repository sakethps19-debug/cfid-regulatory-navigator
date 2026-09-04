/** Minimal, safe SQL literal builders for generating static import SQL from trusted local workbook data. */

export function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

export function sqlBool(value: boolean): string {
  return value ? "true" : "false";
}

export function sqlDate(value: string | null | undefined): string {
  if (!value) return "NULL";
  return `'${value}'::date`;
}

export function sqlTextArray(values: string[] | null | undefined): string {
  if (!values || values.length === 0) return "'{}'::text[]";
  const escaped = values
    .map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "''")}"`)
    .join(",");
  return `'{${escaped}}'::text[]`;
}

export function sqlEnum(value: string): string {
  return `'${value}'`;
}
