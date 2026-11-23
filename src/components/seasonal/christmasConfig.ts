/**
 * Christmas config — controls the festive Santa hat on the app logo.
 *
 * Set VITE_CHRISTMAS_MODE in the env to:
 *   "on"   – always show the hat
 *   "off"  – never show the hat
 *   "auto" – (default) show it from 23 November to 6 January
 */
export type ChristmasMode = "on" | "off" | "auto";

export const CHRISTMAS_CONFIG = {
  mode: ((import.meta.env.VITE_CHRISTMAS_MODE as string | undefined)?.toLowerCase() ?? "auto") as ChristmasMode,
  // Inclusive season window used by "auto" (months are 1-based).
  start: { month: 11, day: 23 },
  end: { month: 1, day: 6 },
};

export const isChristmasSeason = (date: Date = new Date()): boolean => {
  const { mode, start, end } = CHRISTMAS_CONFIG;
  if (mode === "on") return true;
  if (mode === "off") return false;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const afterStart = month > start.month || (month === start.month && day >= start.day);
  const beforeEnd = month < end.month || (month === end.month && day <= end.day);
  // The window wraps over New Year, so either side of it counts.
  return afterStart || beforeEnd;
};
