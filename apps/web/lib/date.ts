export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Two-letter weekday labels, indexed by `Date#getUTCDay()` (Sun=0 … Sat=6). */
export const DAY_LETTERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const MS_PER_DAY = 864e5;

export const toDays = (isoStr: string): number => {
  const [y, m, d] = isoStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export const fromDays = (n: number): Date => new Date(n * MS_PER_DAY);

export const iso = (dt: Date): string => dt.toISOString().slice(0, 10);

export const fmt = (isoStr: string): string => {
  const [, m, d] = isoStr.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export const todayIso = (): string => iso(new Date());

export const uid = (): string => "x" + Math.random().toString(36).slice(2, 9);
