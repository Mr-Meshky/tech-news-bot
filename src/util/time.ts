export interface TehranTime {
  /** en-US short weekday: "Sat" | "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" */
  weekday: string;
  /** 0–23 */
  hour: number;
  /** YYYY-MM-DD in Tehran time — used as an "already ran today" key */
  dateKey: string;
}

export function tehranNow(date: Date = new Date()): TehranTime {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    weekday: "short",
    hourCycle: "h23",
    hour: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  return {
    weekday: parts.weekday,
    hour: Number(parts.hour),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

/** True when `hour` falls inside [start, end) — the channel's sleep window */
export function isQuietHour(hour: number, start: number, end: number): boolean {
  if (start <= end) return hour >= start && hour < end;
  // window wraps past midnight, e.g. 23 → 7
  return hour >= start || hour < end;
}
