/**
 * Renders an ISO calendar date (YYYY-MM-DD, as stored by Postgres `date`
 * columns and returned by Supabase) as MM/DD/YYYY for display. Pure string
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
  return `${month}/${day}/${year}`;
}
