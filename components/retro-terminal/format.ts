import { format, parseISO } from 'date-fns';

export function formatIsoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export function formatLongDate(iso: string): string {
  const d = parseISO(iso);
  return Number.isNaN(d.getTime()) ? iso : format(d, 'MMMM dd, yyyy');
}
