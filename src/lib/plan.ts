// Plan calculations. Pure functions; every number shown in a plan comes from here.

/** Calendar month, 1–12. */
export interface YearMonth {
  year: number;
  month: number;
}

export type PlanStatus = 'fits' | 'tight' | 'doesntFit';

export const PAYDAY = 25;
/** Prototype "today": 4 Nov 2026. */
export const TODAY = new Date(2026, 10, 4);
export const FREE_MARGIN = 220;
/** Kept free every month; comfortable cap = free margin − buffer. */
export const MIN_BUFFER = 70;
export const ALLOWANCES = {
  holiday: { month: 6, amount: 1500 },
  christmas: { month: 11, amount: 1500 },
} as const;

/** Safety stop for projections that would never reach the goal. */
const MAX_TRANSFERS = 240;

export interface PlanInput {
  goal: number;
  /** Last month with a transfer (inclusive). */
  target: YearMonth;
  /** First transfer month. Defaults to the next payday after TODAY. */
  start?: YearMonth;
  freeMargin?: number;
  /** Euros from the June holiday allowance. Omit to let the default proposal fill the gap. */
  holidayShare?: number;
  /** Euros from the November Christmas allowance. Defaults to 0. */
  christmasShare?: number;
  /** Fixed monthly amount set in chat ("I can only do 120 a month"). The reach date moves instead. */
  monthly?: number;
}

export interface ProjectionPoint {
  date: Date;
  transfer: number;
  allowance: number;
  cumulative: number;
}

export interface Plan {
  goal: number;
  target: YearMonth;
  start: YearMonth;
  freeMargin: number;
  /** Transfers from start up to and including the target month. */
  transfers: number;
  monthly: number;
  holidayShare: number;
  christmasShare: number;
  /** Free margin left after the monthly transfer. */
  buffer: number;
  status: PlanStatus;
  /** First payday where cumulative savings ≥ goal; null if never within the projection limit. */
  reachDate: Date | null;
  /** Transfers needed to reach the goal. */
  transfersToReach: number | null;
  /** Reach date is on or before the target payday. */
  onTime: boolean;
  projection: ProjectionPoint[];
  perWeek: number;
  perDay: number;
}

// ── Month helpers ─────────────────────────────────────────────────────────────

export const monthIndex = ({ year, month }: YearMonth) => year * 12 + (month - 1);
export const fromIndex = (i: number): YearMonth => ({ year: Math.floor(i / 12), month: (i % 12) + 1 });
export const addMonths = (ym: YearMonth, n: number) => fromIndex(monthIndex(ym) + n);
export const paydayOf = ({ year, month }: YearMonth) => new Date(year, month - 1, PAYDAY);

/** Payday months from start to target, inclusive. Nov 2026 → Sep 2027 = 11. */
export function countTransfers(start: YearMonth, target: YearMonth): number {
  return Math.max(0, monthIndex(target) - monthIndex(start) + 1);
}

/** Month of the first payday strictly after `today` (payday itself counts if not passed yet). */
export function nextPayday(today: Date = TODAY): YearMonth {
  const ym = { year: today.getFullYear(), month: today.getMonth() + 1 };
  return today.getDate() < PAYDAY ? ym : addMonths(ym, 1);
}

/** First occurrence of an allowance month within [start, target], or null. */
function allowanceMonthIn(month: number, start: YearMonth, target: YearMonth): YearMonth | null {
  const s = monthIndex(start);
  const first = s + ((month - 1 - (s % 12) + 12) % 12);
  return first <= monthIndex(target) ? fromIndex(first) : null;
}

export const comfortableCap = (freeMargin = FREE_MARGIN) => Math.max(0, freeMargin - MIN_BUFFER);

export function statusFor(buffer: number): PlanStatus {
  if (buffer >= MIN_BUFFER) return 'fits';
  if (buffer >= 0) return 'tight';
  return 'doesntFit';
}

/** Display only: weekly / daily equivalent of a monthly amount, whole euros. */
export const perWeek = (monthly: number) => Math.round((monthly * 12) / 52);
export const perDay = (monthly: number) => Math.round((monthly * 12) / 365);

/** Monthly needed to close the gap left by the allowance shares. */
export function monthlyNeeded(goal: number, shares: number, transfers: number): number {
  if (transfers <= 0) return Infinity;
  return Math.max(0, Math.ceil((goal - shares) / transfers));
}

// ── Main calculation ──────────────────────────────────────────────────────────

export function calculatePlan(input: PlanInput): Plan {
  const { goal, target } = input;
  const start = input.start ?? nextPayday();
  const freeMargin = input.freeMargin ?? FREE_MARGIN;
  const transfers = countTransfers(start, target);

  // Shares only count if their month falls inside the saving window.
  const holidayMonth = allowanceMonthIn(ALLOWANCES.holiday.month, start, target);
  const christmasMonth = allowanceMonthIn(ALLOWANCES.christmas.month, start, target);
  const christmasShare = christmasMonth ? clampShare(input.christmasShare ?? 0, ALLOWANCES.christmas.amount) : 0;

  let monthly: number;
  let holidayShare: number;

  if (input.monthly !== undefined) {
    // Fixed monthly from chat: the date moves, not the amount.
    monthly = Math.max(0, input.monthly);
    holidayShare = holidayMonth
      ? clampShare(input.holidayShare ?? goal - monthly * transfers - christmasShare, ALLOWANCES.holiday.amount)
      : 0;
  } else if (input.holidayShare !== undefined) {
    holidayShare = holidayMonth ? clampShare(input.holidayShare, ALLOWANCES.holiday.amount) : 0;
    monthly = monthlyNeeded(goal, holidayShare + christmasShare, transfers);
  } else {
    // Default proposal: comfortable cap each month, holiday allowance fills the gap.
    const cap = comfortableCap(freeMargin);
    const gap = goal - cap * transfers - christmasShare;
    holidayShare = holidayMonth ? clampShare(gap, ALLOWANCES.holiday.amount) : 0;
    monthly = gap <= holidayShare
      ? Math.min(cap, monthlyNeeded(goal, holidayShare + christmasShare, transfers))
      : monthlyNeeded(goal, holidayShare + christmasShare, transfers);
  }

  const buffer = freeMargin - monthly;
  const projection = project({ goal, start, target, monthly, holidayShare, christmasShare });
  const last = projection[projection.length - 1];
  const reached = last && last.cumulative >= goal;
  const reachDate = reached ? last.date : null;
  const transfersToReach = reached ? projection.length : null;

  return {
    goal,
    target,
    start,
    freeMargin,
    transfers,
    monthly,
    holidayShare,
    christmasShare,
    buffer,
    status: statusFor(buffer),
    reachDate,
    transfersToReach,
    onTime: reachDate !== null && reachDate <= paydayOf(target),
    projection,
    perWeek: perWeek(monthly),
    perDay: perDay(monthly),
  };
}

function clampShare(value: number, max: number) {
  return Math.min(max, Math.max(0, Math.round(value)));
}

/**
 * Cumulative savings per payday, adding each allowance share once, in its first
 * month inside the window. Runs until the goal is reached (or the safety stop).
 */
export function project(p: {
  goal: number;
  start: YearMonth;
  target: YearMonth;
  monthly: number;
  holidayShare: number;
  christmasShare: number;
}): ProjectionPoint[] {
  const holidayAt = p.holidayShare ? allowanceMonthIn(ALLOWANCES.holiday.month, p.start, p.target) : null;
  const christmasAt = p.christmasShare ? allowanceMonthIn(ALLOWANCES.christmas.month, p.start, p.target) : null;
  const points: ProjectionPoint[] = [];
  let cumulative = 0;

  for (let i = 0; i < MAX_TRANSFERS; i++) {
    const ym = addMonths(p.start, i);
    const idx = monthIndex(ym);
    let allowance = 0;
    if (holidayAt && monthIndex(holidayAt) === idx) allowance += p.holidayShare;
    if (christmasAt && monthIndex(christmasAt) === idx) allowance += p.christmasShare;
    cumulative += p.monthly + allowance;
    points.push({ date: paydayOf(ym), transfer: p.monthly, allowance, cumulative });
    if (cumulative >= p.goal) break;
    if (p.monthly <= 0 && idx >= monthIndex(p.target)) break; // nothing more will arrive
  }
  return points;
}

/** Extra saved by the target month from a recurring monthly saving (e.g. cancelling Netflix). */
export function extraByTarget(extraMonthly: number, transfers: number): number {
  return extraMonthly * transfers;
}
