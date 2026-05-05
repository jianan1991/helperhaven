/** Format an ISO date string (YYYY-MM-DD) as "1 Jan 2025" */
export function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format an ISO datetime string as "9:41 AM" */
export function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Relative time label: "just now", "5m ago", "3h ago", "2d ago" */
export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = 60_000, hr = 60 * min, day = 24 * hr;
  if (diff < min) return 'just now';
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}

/** Convert a month count (e.g. 14) to "1 year 2 months" */
export function durationLabel(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [
    y > 0 && `${y} year${y > 1 ? 's' : ''}`,
    m > 0 && `${m} month${m > 1 ? 's' : ''}`,
  ]
    .filter(Boolean)
    .join(' ');
}
