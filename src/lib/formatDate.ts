/**
 * Renders an ISO calendar date (YYYY-MM-DD, as stored by Postgres `date`
 * columns and returned by Supabase) as DD/MM/YYYY for display. Pure string
 * manipulation rather than `new Date(iso)`/`toLocaleDateString` — these are
 * timezone-less calendar dates (SEBI order dates), and parsing through a
 * Date object risks an off-by-one-day shift depending on server/client
 * timezone.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Renders the CURRENT moment (e.g. an export's "Generated:" timestamp) as
 * DD/MM/YYYY, HH:mm — deterministic and consistent with formatDate(), unlike
 * `toLocaleString()` which is locale/runtime-dependent. Genuinely needs the
 * time-of-day component (unlike formatDate's calendar-only dates), so this
 * reads the local wall-clock time directly rather than reusing formatDate.
 */
export function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}
