// The assistant's "understanding" layer. Screens and the conversation state machine only
// talk to an AssistantEngine; the default one is scripted (keyword and number matching,
// no LLM calls). A Claude-backed engine can implement the same interface later, calling a
// Worker at /api/assistant. Test cases for every engine live in examples.ts.
import { monthIndex, nextPayday, TODAY, type YearMonth } from './plan';

export type Stage = 'start' | 'askTrip' | 'askBudget' | 'analysing' | 'plan' | 'approved';
export type SuggestionId = 'christmas' | 'eatingOut' | 'netflix';

export type Intent =
  | { kind: 'startTrip'; destination?: string; people?: number; target?: YearMonth }
  | { kind: 'setGoal'; amount: number }
  | { kind: 'setTarget'; target: YearMonth }
  | { kind: 'setMonthly'; amount: number }
  | { kind: 'applySuggestion'; id: SuggestionId }
  | { kind: 'reachSooner' }
  | { kind: 'why' }
  | { kind: 'enterAmount' }
  | { kind: 'review' }
  | { kind: 'unknown' };

export interface AssistantContext {
  stage: Stage;
  /** Current target month, used to resolve "in October" without a year. */
  target?: YearMonth;
  today?: Date;
}

export interface AssistantEngine {
  readonly name: string;
  interpret(text: string, context: AssistantContext): Promise<Intent>;
}

// ── Parsing ───────────────────────────────────────────────────────────────────

const MONTH_RE =
  /\b(?:(\d{1,2})\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b\.?(?:,?\s+(\d{4}))?/gi;
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const ISO_MONTH_RE = /\b(\d{4})-(\d{1,2})\b/;

/** Month without a year → the first one on or after the next payday, in the current target's year if given. */
function resolveYear(month: number, context: AssistantContext): YearMonth {
  const earliest = nextPayday(context.today ?? TODAY);
  let year = context.target?.year ?? earliest.year;
  while (monthIndex({ year, month }) < monthIndex(earliest)) year++;
  return { year, month };
}

export interface MonthMatch {
  target: YearMonth;
  index: number;
  length: number;
}

export function findMonth(text: string, context: AssistantContext = { stage: 'plan' }): MonthMatch | null {
  const iso = ISO_MONTH_RE.exec(text);
  if (iso) {
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) return { target: { year: Number(iso[1]), month }, index: iso.index, length: iso[0].length };
  }
  for (const m of text.matchAll(MONTH_RE)) {
    const word = m[2].toLowerCase();
    const year = m[3] ? Number(m[3]) : undefined;
    // "may" is also a verb: only a month with a year or after "in/by/until/before".
    if (word === 'may' && !year && !/\b(in|by|until|before|from)\s+$/i.test(text.slice(0, m.index + (m[1] ? m[1].length + 1 : 0)))) continue;
    const month = MONTH_KEYS.indexOf(word.slice(0, 3)) + 1;
    const target = year ? { year, month } : resolveYear(month, context);
    return { target, index: m.index, length: m[0].length };
  }
  return null;
}

const WORD_NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

/** People on the trip, or undefined if not mentioned. */
export function findPeople(text: string): number | undefined {
  const t = text.toLowerCase();
  if (/\b(alone|solo|just me|by myself)\b/.test(t)) return 1;
  if (/\b(with my (partner|wife|husband|boyfriend|girlfriend)|for (us|both of us|the two of us)|as a couple)\b/.test(t)) return 2;
  const m =
    /\bfor\s+(one|two|three|four|five|six|[1-6])\b(?!\s*(?:€|eur|k\b|\d|[.,]\d))/.exec(t) ??
    /\b(one|two|three|four|five|six|[1-6])\s+(people|persons|of us|adults)\b/.exec(t);
  if (!m) return undefined;
  return WORD_NUMBERS[m[1]] ?? Number(m[1]);
}

/** pt-PT amounts: "4.000", "4 000", "4000 €", "3.000,50", "4k", "1,5k". English decimals ("8.99") too. */
export function findAmount(text: string): number | null {
  const t = text.replace(/ /g, ' ');
  const english = /(?<![\d.,])(\d+)\.(\d{1,2})(?![\d])/.exec(t);
  if (english) return Number(`${english[1]}.${english[2]}`);
  const m = /(?<![\d.,])(\d{1,3}(?:[. ]\d{3})+|\d+)(?:,(\d{1,2}))?\s*(k\b)?/i.exec(t);
  if (!m) return null;
  let value = Number(m[1].replace(/[. ]/g, ''));
  if (m[2]) value += Number(`0.${m[2]}`);
  if (m[3]) value *= 1000;
  return value;
}

const STOP_WORDS = new Set(['I', "I'm", 'Im', 'We', "We're", 'My', 'The', 'A', 'In', 'To', 'For', 'Save', 'Trip', 'And', 'Our', 'Me', 'Us', 'With']);
const isMonthWord = (w: string) =>
  /^(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)$/i.test(w);

/** "trip to Japan" → "Japan". With `loose`, any capitalised word that isn't a month or a stop word. */
export function findDestination(text: string, loose = false): string | undefined {
  for (const m of text.matchAll(/\b(?:to|visit(?:ing)?)\s+([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+)*)/gu)) {
    if (!isMonthWord(m[1])) return m[1];
  }
  if (!loose) return undefined;
  for (const m of text.matchAll(/\b([A-Z][\p{L}'-]+(?:\s+[A-Z][\p{L}'-]+)*)/gu)) {
    const words = m[1].split(/\s+/).filter((w) => !STOP_WORDS.has(w) && !isMonthWord(w));
    if (words.length) return words.join(' ');
  }
  return undefined;
}

// ── Scripted engine ───────────────────────────────────────────────────────────

const TRIP_RE = /\b(trip|travel\w*|vacation|visit\w*|going to|fly(?:ing)? to)\b/i;
const MONTHLY_RE = /\b(a|per|each|every)\s+month\b|\/\s*(month|mo)\b|\bmonthly\b|\bmonth\b/i;

export function interpretScripted(text: string, context: AssistantContext): Intent {
  const t = text.trim().toLowerCase();
  if (!t) return { kind: 'unknown' };

  if (/\bwhy\b/.test(t)) return { kind: 'why' };
  if (/\b(sooner|faster|earlier|quicker)\b/.test(t)) return { kind: 'reachSooner' };
  if (/\bchristmas\b/.test(t)) return { kind: 'applySuggestion', id: 'christmas' };
  if (/\b(eating out|restaurants?|dining)\b/.test(t)) return { kind: 'applySuggestion', id: 'eatingOut' };
  if (/\bnetflix\b/.test(t)) return { kind: 'applySuggestion', id: 'netflix' };
  if (/\b(other|input|enter|type)\s+(an\s+|the\s+|a\s+different\s+)?amount\b/.test(t)) return { kind: 'enterAmount' };
  if (/\b(approve|review|go ahead|set it up)\b/.test(t)) return { kind: 'review' };

  const month = findMonth(text, context);
  const planning = context.stage === 'start' || context.stage === 'askTrip';
  const trip = (): Intent => ({
    kind: 'startTrip',
    destination: findDestination(text, context.stage === 'askTrip'),
    people: findPeople(text),
    target: month?.target,
  });

  if (planning && (TRIP_RE.test(t) || (context.stage === 'askTrip' && (month || findDestination(text, true))))) return trip();

  // Numbers that belong to dates or head counts aren't amounts.
  let rest = month ? text.slice(0, month.index) + ' ' + text.slice(month.index + month.length) : text;
  rest = rest.replace(/\bfor\s+[1-6]\b(?!\s*(?:€|eur|k\b|\d))/gi, ' ').replace(/\b[1-6]\s+(people|persons|adults)\b/gi, ' ');
  const amount = findAmount(rest);
  if (amount !== null && amount > 0 && MONTHLY_RE.test(t)) return { kind: 'setMonthly', amount };
  if (amount !== null && amount > 0) return { kind: 'setGoal', amount };
  if (month) return { kind: 'setTarget', target: month.target };
  if (TRIP_RE.test(t)) return trip();
  return { kind: 'unknown' };
}

export const scriptedEngine: AssistantEngine = {
  name: 'scripted',
  interpret: async (text, context) => interpretScripted(text, context),
};
