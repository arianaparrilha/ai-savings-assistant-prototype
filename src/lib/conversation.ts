// Scripted conversation: a pure state machine. `step(state, event)` returns the next state
// plus timed follow-ups (the "analysing" steps). Intents come from an AssistantEngine;
// UI events (edit a field, apply a suggestion, undo…) go through the same functions, so
// tapping, typing and voice give the same result. All numbers come from plan.ts.
import type { EditableField } from '../components/types';
import type { Intent, Stage, SuggestionId } from './assistant';
import { formatCurrency, formatDate, formatMonth } from './format';
import {
  ALLOWANCES, allowanceMonthIn, calculatePlan, extraByTarget, FREE_MARGIN, monthIndex, monthOf, moveDateOption,
  nextPayday, paydayOf, TODAY, type Plan, type PlanInput, type YearMonth,
} from './plan';
import { BUDGET, FACTS } from './profile';

export type { Stage, SuggestionId } from './assistant';
export type ActionId = 'goal' | 'monthly' | 'christmas' | 'holiday';
export type AlternativeId = 'date' | 'back';
export type CardState = 'default' | 'doesntFit' | 'adjusted' | 'approved';

export interface Trip {
  destination?: string;
  people: number;
  target?: YearMonth;
}

/** Everything Undo restores. */
export interface PlanState {
  input: PlanInput;
  /** The AI's last proposal ("See AI proposal" resets to it). */
  ai: PlanInput;
  dismissed: SuggestionId[];
  /** Suggestions already applied (or reminders set). */
  done: SuggestionId[];
  /** "Reach it sooner" was asked: show the speed-up suggestions. */
  sooner: boolean;
}

export type Message =
  | { id: number; type: 'user'; text: string }
  | { id: number; type: 'ai'; text: string; chips?: string[] }
  | { id: number; type: 'working'; steps: string[] }
  | { id: number; type: 'changeLog'; text: string; undo?: PlanState; undone?: boolean }
  | { id: number; type: 'request' }
  | { id: number; type: 'plan' };

type NewMessage = Message extends infer M ? (M extends Message ? Omit<M, 'id'> : never) : never;

export interface ConversationState {
  stage: Stage;
  trip: Trip;
  /** Goal before a plan exists (request summary). */
  goal?: number;
  /** First goal the user set ("Go back to 3.000 €"). */
  originalGoal?: number;
  plan: PlanState | null;
  approvedActions: ActionId[] | null;
  messages: Message[];
  editing: EditableField | null;
  sheet: 'why' | 'review' | null;
  /** Message to scroll into view after this step. */
  focus: number | null;
  seq: number;
}

export type ConversationEvent =
  | { type: 'say'; text: string }
  | { type: 'intent'; intent: Intent }
  | { type: 'edit'; field: EditableField }
  | { type: 'cancelEdit' }
  | { type: 'save'; field: EditableField; raw: string }
  | { type: 'apply'; id: SuggestionId }
  | { type: 'dismiss'; id: SuggestionId }
  | { type: 'alternative'; id: AlternativeId }
  | { type: 'seeProposal' }
  | { type: 'undo'; id: number }
  | { type: 'openSheet'; sheet: 'why' | 'review' }
  | { type: 'closeSheet' }
  | { type: 'analysis'; step: 1 | 2 }
  | { type: 'approve'; actions: ActionId[] }
  | { type: 'editPlan' };

export interface StepResult {
  state: ConversationState;
  later?: Array<{ delay: number; event: ConversationEvent }>;
}

export const initialState: ConversationState = {
  stage: 'start',
  trip: { people: 1 },
  plan: null,
  approvedActions: null,
  messages: [],
  editing: null,
  sheet: null,
  focus: null,
  seq: 0,
};

/** Lines the demo voice input "hears" at each point of the script. */
export const SCRIPT = {
  opening: "I'm planning a trip to Japan for two in September 2027 and want to start saving for it.",
  trip: 'Japan, for two, in September 2027',
  budget: '3.000 €',
  bigger: 'Make it 4.000 €',
  fix: 'Use my Christmas allowance',
};

export const START_CHIPS = ['Save for a trip', 'Transfer money', 'Block card'];
const BUDGET_CHIPS = ['3.000 €', 'Help me estimate', 'Other amount'];

// ── Derived views (used by screens) ───────────────────────────────────────────

export const planOf = (s: ConversationState): Plan | null => (s.plan ? calculatePlan(s.plan.input) : null);

export const goalTitle = (trip: Trip, target?: YearMonth) =>
  `${trip.destination ?? 'Trip'} ${(target ?? trip.target ?? monthOf(TODAY)).year}`;

export const tripLabel = (trip: Trip) =>
  ['Trip', trip.destination, `${trip.people} ${trip.people === 1 ? 'person' : 'people'}`].filter(Boolean).join(' · ');

export const titleOf = (s: ConversationState) => goalTitle(s.trip, s.plan?.input.target);

const sameInput = (a: PlanInput, b: PlanInput) => JSON.stringify(a) === JSON.stringify(b);

export function isEdited(s: ConversationState) {
  return !!s.plan && !sameInput(s.plan.input, s.plan.ai);
}

export function cardState(s: ConversationState): CardState {
  const plan = planOf(s);
  if (!plan) return 'default';
  if (s.approvedActions) return 'approved';
  if (plan.status === 'doesntFit' || !plan.reachDate) return 'doesntFit';
  if (isEdited(s) || plan.status === 'tight') return 'adjusted';
  return 'default';
}

/** Budget for the affordability bar: an eating-out budget lowers flexible spending. */
export function budgetOf(s: ConversationState) {
  const margin = s.plan?.input.freeMargin ?? FREE_MARGIN;
  return { ...BUDGET, flexible: BUDGET.flexible - (margin - FREE_MARGIN) };
}

export function noteOf(plan: Plan): string | undefined {
  if (plan.holidayShare >= ALLOWANCES.holiday.amount) return 'Uses your whole June allowance';
  if (plan.status === 'tight') return `Leaves about ${formatCurrency(Math.round(plan.buffer))} free each month`;
  return undefined;
}

export interface SuggestionView {
  id: SuggestionId;
  recommended: boolean;
  text: string;
  impact: string;
  question: string;
}

const leftText = (buffer: number) => {
  const b = Math.round(buffer);
  if (b < 0) return `still about ${formatCurrency(-b)} short each month`;
  return `≈ ${formatCurrency(b)} left each month${b < 10 ? ', very tight' : ''}`;
};

/** Input that applies a suggestion. `sooner` keeps the monthly and holiday share and adds on top. */
function applied(s: ConversationState, id: SuggestionId, sooner: boolean): PlanInput | null {
  const plan = planOf(s)!;
  const input = s.plan!.input;
  const keep = sooner
    ? { monthly: plan.monthly, holidayShare: plan.holidayShare }
    : { monthly: undefined, holidayShare: plan.holidayShare };
  switch (id) {
    case 'christmas':
      return { ...input, ...keep, christmasShare: FACTS.christmasUnspent };
    case 'eatingOut': {
      const freed = FACTS.eatingOut.now - FACTS.eatingOut.before;
      const freeMargin = (input.freeMargin ?? FREE_MARGIN) + freed;
      return sooner ? { ...input, ...keep, freeMargin, monthly: plan.monthly + freed } : { ...input, ...keep, freeMargin };
    }
    case 'netflix':
      return null; // A reminder only: the AI can't cancel subscriptions.
  }
}

function available(s: ConversationState, id: SuggestionId) {
  const plan = planOf(s)!;
  const p = s.plan!;
  if (p.dismissed.includes(id) || p.done.includes(id)) return false;
  if (id === 'christmas') return plan.christmasShare === 0 && !!allowanceMonthIn(ALLOWANCES.christmas.month, plan.start, plan.target);
  if (id === 'eatingOut') return plan.freeMargin === FREE_MARGIN;
  return true;
}

export function suggestionsOf(s: ConversationState): SuggestionView[] {
  const plan = planOf(s);
  const state = cardState(s);
  if (!plan || !s.plan || state === 'approved') return [];
  const sooner = state !== 'doesntFit';
  if (sooner && !s.plan.sooner) return [];
  const where = s.trip.destination ?? 'your goal';
  const views: SuggestionView[] = [];

  for (const id of ['christmas', 'eatingOut', 'netflix'] as const) {
    if (!available(s, id)) continue;
    const next = applied(s, id, sooner);
    const preview = next ? calculatePlan(next) : null;
    const reach = (p: Plan | null) => (p?.reachDate ? `Reach it on ${formatDate(p.reachDate)}` : '');
    if (id === 'christmas') {
      views.push({
        id,
        recommended: false,
        text: `Last November about ${formatCurrency(FACTS.christmasUnspent)} of your Christmas allowance stayed in your account. Use the same amount this year?`,
        impact: sooner
          ? `${reach(preview)} · nothing else changes`
          : `${formatCurrency(preview!.monthly)}/month · ${leftText(preview!.buffer)} · nothing else changes`,
        question: `Move ${formatCurrency(FACTS.christmasUnspent)} to ${where} when your Christmas allowance arrives?`,
      });
    } else if (id === 'eatingOut') {
      const { now, before, months } = FACTS.eatingOut;
      views.push({
        id,
        recommended: false,
        text: `Eating out went from ${formatCurrency(before)} to ${formatCurrency(now)} over ${months} months. Back to ${formatCurrency(before)} frees ${formatCurrency(now - before)}/month.`,
        impact: sooner ? `${reach(preview)} · ${formatCurrency(preview!.monthly)}/month` : leftText(preview!.buffer),
        question: `Set an ${formatCurrency(before)}/month eating-out budget with alerts?`,
      });
    } else {
      const more = Math.round(extraByTarget(FACTS.netflix, plan.transfers));
      views.push({
        id,
        recommended: false,
        text: `You pay for Netflix and Prime Video. Still using both? Cancelling Netflix frees ${formatCurrency(FACTS.netflix)}/month.`,
        impact: sooner ? `≈ ${formatCurrency(more)} more by ${monthName(plan.target)}` : leftText(plan.buffer + FACTS.netflix),
        question: 'Remind you before Netflix renews?',
      });
    }
  }
  if (views[0]) views[0].recommended = true;
  return views;
}

export interface AlternativeView {
  id: AlternativeId;
  title: string;
  detail: string;
  actionLabel: string;
}

export function alternativesOf(s: ConversationState): AlternativeView[] {
  const plan = planOf(s);
  if (!plan || !s.plan || cardState(s) !== 'doesntFit') return [];
  const views: AlternativeView[] = [];
  const option = moveDateOption(s.plan.input);
  if (option) {
    const p = calculatePlan(option);
    views.push({
      id: 'date',
      title: 'Move the date',
      detail: `${formatCurrency(p.monthly)}/month, reach it on ${formatDate(p.reachDate!)}`,
      actionLabel: 'Update goal date',
    });
  }
  if (s.originalGoal !== undefined && s.originalGoal < plan.goal) {
    views.push({
      id: 'back',
      title: `Go back to ${formatCurrency(s.originalGoal)}`,
      detail: `The original plan for ${monthName(plan.target)}`,
      actionLabel: 'Go back',
    });
  }
  return views;
}

export interface ActionView {
  id: ActionId;
  title: string;
  detail: string;
  /** Wording in the review sheet. */
  reviewTitle: string;
  reviewDetail: string;
}

export function actionsOf(s: ConversationState): ActionView[] {
  const plan = planOf(s);
  if (!plan || !plan.reachDate) return [];
  const first = formatDate(paydayOf(plan.start));
  const goal = `${formatCurrency(plan.goal)} by ${formatDate(plan.reachDate)}`;
  const views: ActionView[] = [
    { id: 'goal', title: `Create goal "${titleOf(s)}"`, detail: goal, reviewTitle: `Create goal "${titleOf(s)}"`, reviewDetail: goal },
    {
      id: 'monthly',
      title: `Monthly transfer ${formatCurrency(plan.monthly)}`,
      detail: `Every 25th from ${first}`,
      reviewTitle: `Monthly transfer ${formatCurrency(plan.monthly)}`,
      reviewDetail: `From your current account · every 25th from ${first} · ${plan.transfersToReach} transfers · pause or cancel anytime`,
    },
  ];
  const allowance = (id: 'christmas' | 'holiday', share: number, name: string) => {
    const month = allowanceMonthIn(ALLOWANCES[id].month, plan.start, plan.target);
    if (!share || !month) return;
    views.push({
      id,
      title: `${name} allowance: ${formatCurrency(share)}`,
      detail: `${formatMonth(month)} · I'll ask you to confirm`,
      reviewTitle: `${formatMonth(month)}: move ${formatCurrency(share)}`,
      reviewDetail: `From your ${id === 'holiday' ? 'holiday' : name} allowance · I'll ask you to confirm first`,
    });
  };
  allowance('christmas', plan.christmasShare, 'Christmas');
  allowance('holiday', plan.holidayShare, 'Holiday');
  return views;
}

export function headerStatusOf(s: ConversationState) {
  const state = cardState(s);
  if (state === 'doesntFit') return { tone: 'danger' as const, label: "Doesn't fit" };
  if (state === 'approved') return { tone: 'success' as const, label: 'Approved' };
  return { tone: 'success' as const, label: 'On track' };
}

export function summaryOf(plan: Plan) {
  return `${formatCurrency(plan.monthly)}/month · ${plan.reachDate ? formatDate(plan.reachDate) : 'not reached'}`;
}

/** What the mic "hears" next in the demo. */
export function voiceLine(s: ConversationState): string {
  switch (s.stage) {
    case 'start':
      return SCRIPT.opening;
    case 'askTrip':
      return SCRIPT.trip;
    case 'askBudget':
      return SCRIPT.budget;
    case 'plan': {
      const state = cardState(s);
      if (state === 'doesntFit') return SCRIPT.fix;
      if (state === 'default' && s.plan && s.plan.input.goal === s.originalGoal) return SCRIPT.bigger;
      return 'Reach it sooner';
    }
    default: {
      const plan = planOf(s);
      return plan ? `Why ${formatCurrency(plan.monthly)}?` : SCRIPT.opening;
    }
  }
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "September" within the next 12 months, "September 2028" further out. */
function monthName(ym: YearMonth) {
  const near = monthIndex(ym) - monthIndex(monthOf(TODAY)) < 12;
  return near ? MONTH_NAMES[ym.month - 1] : `${MONTH_NAMES[ym.month - 1]} ${ym.year}`;
}

const list = (parts: string[]) => (parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`);
const eur = (n: number) => formatCurrency(Math.round(n));

function describePlan(plan: Plan, input: PlanInput, first: boolean): string {
  const when = monthName(plan.target);
  if (!plan.reachDate) {
    return `At ${eur(plan.monthly)}/month you wouldn't reach ${eur(plan.goal)}. Try a higher amount or a later date.`;
  }
  if (plan.status === 'doesntFit') {
    const over = eur(-plan.buffer);
    if (input.monthly !== undefined) {
      return `${eur(plan.monthly)}/month is about ${over} more than you have free each month. Here are some ways to get there.`;
    }
    const whole = plan.holidayShare >= ALLOWANCES.holiday.amount ? ' even with your whole allowance' : '';
    return `${eur(plan.goal)} by ${when} doesn't quite fit: you'd need ${eur(plan.monthly)}/month${whole}, about ${over} more than you have free. Here are some ways to get there.`;
  }
  if (first) {
    return plan.status === 'fits'
      ? `Good news: ${eur(plan.goal)} by ${when} fits your budget. Here's a plan.`
      : `${eur(plan.goal)} by ${when} fits, but it's tight: about ${eur(plan.buffer)} left each month. Here's a plan.`;
  }
  const parts = [`${eur(plan.monthly)}/month`];
  if (plan.christmasShare) parts.push(`${eur(plan.christmasShare)} from your Christmas allowance in November`);
  if (plan.holidayShare) parts.push(`${eur(plan.holidayShare)} from your holiday allowance in June`);
  const allowances = (plan.christmasShare ? 1 : 0) + (plan.holidayShare ? 1 : 0);
  let text = `Updated: ${list(parts)} ${parts.length > 1 ? 'get' : 'gets'} you to ${eur(plan.goal)} by ${formatDate(plan.reachDate)}, with about ${eur(plan.buffer)} left each month.`;
  if (allowances === 2) text += " I'll ask you to confirm each allowance when it arrives.";
  if (allowances === 1) text += " I'll ask you to confirm the allowance when it arrives.";
  if (plan.status === 'tight' && plan.holidayShare >= ALLOWANCES.holiday.amount) text += ' Heads-up: this uses your whole June allowance.';
  return text;
}

function explain(s: ConversationState): string {
  const plan = planOf(s);
  if (!plan) return "Once we have a plan, I'll walk you through the numbers.";
  const budget = budgetOf(s);
  const free = `After fixed costs (${formatCurrency(budget.fixed)}) and everyday spending (${eur(budget.flexible)}), about ${eur(plan.freeMargin)} is left each month.`;
  if (cardState(s) === 'doesntFit') {
    return `${free} Reaching ${eur(plan.goal)} by ${monthName(plan.target)} needs ${eur(plan.monthly)}/month, which is more than that.`;
  }
  const shares = plan.holidayShare || plan.christmasShare ? ' Your allowances cover the rest.' : '';
  return `${free} Saving ${eur(plan.monthly)}/month leaves about ${eur(plan.buffer)} for months that cost more.${shares}`;
}

function planChips(s: ConversationState): string[] {
  const plan = planOf(s);
  if (!plan) return [];
  const why = `Why ${formatCurrency(plan.monthly)}?`;
  return cardState(s) === 'doesntFit' ? [why] : ['Reach it sooner', why];
}

const SUGGESTION_NAMES: Record<SuggestionId, string> = {
  christmas: 'Christmas allowance',
  eatingOut: 'eating-out budget',
  netflix: 'Netflix reminder',
};

// ── State helpers ─────────────────────────────────────────────────────────────

function emit(s: ConversationState, ...messages: NewMessage[]): ConversationState {
  let seq = s.seq;
  const added = messages.map((m) => ({ ...m, id: ++seq }) as Message);
  // Scroll to the start of the reply (not to the plan card, which follows it).
  const focus = added.find((m) => m.type !== 'user' && m.type !== 'plan') ?? added.find((m) => m.type === 'user');
  return { ...s, seq, messages: [...s.messages, ...added], focus: focus?.id ?? s.focus };
}

const ai = (text: string, chips?: string[]): NewMessage => ({ type: 'ai', text, chips });

/** The living plan card follows the latest update (same id, so it isn't remounted). */
function moveCard(s: ConversationState): ConversationState {
  const card = s.messages.find((m) => m.type === 'plan');
  if (!card) return emit(s, { type: 'plan' });
  return { ...s, messages: [...s.messages.filter((m) => m !== card), card] };
}

/** Only the latest change can be undone. */
const clearUndo = (s: ConversationState): ConversationState => ({
  ...s,
  messages: s.messages.map((m) => (m.type === 'changeLog' && m.undo ? { ...m, undo: undefined } : m)),
});

const defaultInput = (goal: number, target: YearMonth, start?: YearMonth): PlanInput => (start ? { goal, target, start } : { goal, target });

/** Apply a plan change: change log with Undo, the AI's reply, card moves below it. */
function commit(s: ConversationState, next: PlanState, log: string, reply = true): ConversationState {
  const snapshot = s.plan!;
  const n: ConversationState = { ...clearUndo(s), plan: next, editing: null };
  const changeLog: NewMessage = { type: 'changeLog', text: log, undo: snapshot };
  if (!reply) return emit(n, changeLog);
  return moveCard(emit(n, changeLog, ai(describePlan(planOf(n)!, next.input, false))));
}

function fresh(input: PlanInput): PlanState {
  return { input, ai: input, dismissed: [], done: [], sooner: false };
}

// ── Transitions ───────────────────────────────────────────────────────────────

export function step(s: ConversationState, event: ConversationEvent): StepResult {
  switch (event.type) {
    case 'say':
      return { state: emit({ ...s, editing: null }, { type: 'user', text: event.text }) };
    case 'intent':
      return onIntent(s, event.intent);
    case 'edit':
      return { state: { ...s, editing: event.field } };
    case 'cancelEdit':
      return { state: { ...s, editing: null } };
    case 'save':
      return onSave(s, event.field, event.raw);
    case 'apply':
      return { state: applySuggestion(s, event.id) };
    case 'dismiss': {
      if (!s.plan) return { state: s };
      const next = { ...s.plan, dismissed: [...s.plan.dismissed, event.id] };
      return { state: commit(s, next, `Dismissed: ${SUGGESTION_NAMES[event.id]}`, false) };
    }
    case 'alternative':
      return { state: onAlternative(s, event.id) };
    case 'seeProposal': {
      if (!s.plan || !isEdited(s)) return { state: s };
      return { state: commit(s, { ...s.plan, input: s.plan.ai, sooner: false }, 'Reset to AI proposal') };
    }
    case 'undo': {
      const log = s.messages.find((m) => m.id === event.id);
      if (!log || log.type !== 'changeLog' || !log.undo) return { state: s };
      const messages = s.messages.map((m) => (m === log ? { ...log, undo: undefined, undone: true } : m));
      return { state: { ...s, plan: log.undo, messages, editing: null, focus: null } };
    }
    case 'openSheet':
      return { state: { ...s, sheet: event.sheet, editing: null } };
    case 'closeSheet':
      return { state: { ...s, sheet: null } };
    case 'analysis':
      return { state: onAnalysis(s, event.step) };
    case 'approve': {
      let n: ConversationState = { ...clearUndo(s), stage: 'approved', approvedActions: event.actions, editing: null };
      if (s.trip.people === 2) n = emit(n, ai('Since this trip is for two, want to invite your partner to save together?', ['Invite partner']));
      return { state: n };
    }
    case 'editPlan': {
      if (!s.plan) return { state: s };
      const n = emit({ ...s, stage: 'plan', approvedActions: null }, ai('Sure. What would you like to change?'));
      return { state: moveCard(n) };
    }
  }
}

function onIntent(s: ConversationState, intent: Intent): StepResult {
  const plan = planOf(s);
  const approved = s.stage === 'approved';

  switch (intent.kind) {
    case 'startTrip':
      if (s.plan) {
        return { state: emit(s, ai(`You're already saving for ${titleOf(s)}. For now I can plan one goal at a time.`)) };
      }
      return { state: onTrip(s, intent) };

    case 'setGoal':
      if (s.stage === 'askBudget') return startAnalysis(s, intent.amount);
      if (approved) return locked(s);
      if (s.plan) return { state: changeGoal(s, intent.amount) };
      break;

    case 'setTarget':
      if (s.stage === 'askTrip') return { state: onTrip(s, { kind: 'startTrip', target: intent.target }) };
      if (s.stage === 'askBudget') return { state: changeRequestTarget(s, intent.target) };
      if (approved) return locked(s);
      if (s.plan) return { state: changeTarget(s, intent.target) };
      break;

    case 'setMonthly':
      if (approved) return locked(s);
      if (s.plan) return { state: changeMonthly(s, intent.amount) };
      break;

    case 'applySuggestion':
      if (approved) return locked(s);
      if (s.plan) return { state: applySuggestion(s, intent.id) };
      break;

    case 'reachSooner':
      if (approved) return locked(s);
      if (s.plan) return { state: reachSooner(s) };
      break;

    case 'why':
      return { state: emit(s, ai(explain(s))) };

    case 'enterAmount':
      if (s.stage === 'askBudget') return { state: emit({ ...s, editing: 'goal' }, ai('Sure, type the amount in the goal field above.')) };
      if (s.plan && !approved) return { state: emit({ ...s, editing: 'goal' }, ai('Sure, type the new goal in the plan.')) };
      break;

    case 'review':
      if (approved) return { state: emit(s, ai(`${titleOf(s)} is already set up.`)) };
      if (plan && cardState(s) !== 'doesntFit') return { state: { ...s, sheet: 'review', editing: null } };
      if (plan) return { state: emit(s, ai("Let's make it fit first: pick one of the ways to get there, or change the goal or date.")) };
      break;

    case 'unknown':
      break;
  }
  return { state: unknown(s) };
}

function unknown(s: ConversationState): ConversationState {
  switch (s.stage) {
    case 'start':
      return emit(s, ai("I can't help with that yet. For now I can help you save for something.", ['Save for a trip']));
    case 'askTrip':
      return emit(s, ai("I can't help with that yet. Where are you going, and when?"));
    case 'askBudget':
      return emit(s, ai("I can't help with that yet. Do you already have an amount in mind?", ['3.000 €', 'Other amount']));
    case 'analysing':
      return emit(s, ai("One moment, I'm still checking your account."));
    case 'plan':
      return emit(s, ai("I can't help with that yet. You can change the goal, the date or the monthly amount, or ask me to reach it sooner.", planChips(s)));
    case 'approved':
      return emit(s, ai("I can't help with that yet."));
  }
}

function locked(s: ConversationState): StepResult {
  return { state: emit(s, ai(`${titleOf(s)} is already set up. To change it, open the goal and tap Edit plan with assistant.`)) };
}

function onTrip(s: ConversationState, intent: Extract<Intent, { kind: 'startTrip' }>): ConversationState {
  const trip: Trip = {
    destination: intent.destination ?? s.trip.destination,
    people: intent.people ?? s.trip.people,
    target: intent.target ?? s.trip.target,
  };
  if (!trip.target) {
    const ask = trip.destination ? `${trip.destination} sounds great. When are you planning to go, and how many of you?` : 'Where are you going, and when?';
    return emit({ ...s, trip, stage: 'askTrip' }, ai(ask));
  }
  return emit(
    { ...s, trip, stage: 'askBudget' },
    ai("Great plan. Here's what I understood:"),
    { type: 'request' },
    ai('Do you already have a budget in mind?', BUDGET_CHIPS),
  );
}

function changeRequestTarget(s: ConversationState, target: YearMonth): ConversationState {
  if (monthIndex(target) < monthIndex(nextPayday())) return emit(s, ai(`The target needs to be after the first payday, ${formatDate(paydayOf(nextPayday()))}.`));
  return emit({ ...s, trip: { ...s.trip, target }, editing: null }, { type: 'changeLog', text: `Updated: target date ${formatMonth(target)}` });
}

function startAnalysis(s: ConversationState, goal: number): StepResult {
  const n = emit(
    { ...s, goal, originalGoal: goal, stage: 'analysing', editing: null },
    ai("To see what you can comfortably save, I'll look at your current account: the last 6 months of spending and the last 12 months for allowances."),
    { type: 'working', steps: ['Checking your income and fixed costs…'] },
  );
  return {
    state: n,
    later: [
      { delay: 1200, event: { type: 'analysis', step: 1 } },
      { delay: 2600, event: { type: 'analysis', step: 2 } },
    ],
  };
}

function onAnalysis(s: ConversationState, stepNo: 1 | 2): ConversationState {
  if (s.stage !== 'analysing') return s;
  if (stepNo === 1) {
    return {
      ...s,
      messages: s.messages.map((m) => (m.type === 'working' ? { ...m, steps: [...m.steps, 'Looking for your holiday allowance…'] } : m)),
    };
  }
  const input = defaultInput(s.goal!, s.trip.target!);
  let n: ConversationState = { ...s, stage: 'plan', plan: fresh(input), messages: s.messages.filter((m) => m.type !== 'working') };
  n = emit(n, ai(describePlan(planOf(n)!, input, true)));
  return moveCard(n);
}

function changeGoal(s: ConversationState, goal: number): ConversationState {
  const input = s.plan!.input;
  if (goal === input.goal) return emit({ ...s, editing: null }, ai(`The goal is already ${formatCurrency(goal)}.`));
  return commit(s, fresh(defaultInput(goal, input.target, input.start)), `Updated: goal ${formatCurrency(goal)}`);
}

function changeTarget(s: ConversationState, target: YearMonth): ConversationState {
  const input = s.plan!.input;
  const plan = planOf(s)!;
  if (monthIndex(target) < monthIndex(plan.start)) {
    return emit({ ...s, editing: null }, ai(`The target needs to be after the first transfer on ${formatDate(paydayOf(plan.start))}.`));
  }
  if (monthIndex(target) === monthIndex(input.target)) return emit({ ...s, editing: null }, ai(`The target is already ${formatMonth(target)}.`));
  return commit(s, fresh(defaultInput(input.goal, target, input.start)), `Updated: target date ${formatMonth(target)}`);
}

function changeStart(s: ConversationState, start: YearMonth): ConversationState {
  const input = s.plan!.input;
  if (monthIndex(start) < monthIndex(nextPayday()) || monthIndex(start) > monthIndex(input.target)) {
    return emit({ ...s, editing: null }, ai(`The first transfer can be from ${formatDate(paydayOf(nextPayday()))} up to ${formatMonth(input.target)}.`));
  }
  return commit(s, fresh(defaultInput(input.goal, input.target, start)), `Updated: first transfer ${formatDate(paydayOf(start))}`);
}

function changeShare(s: ConversationState, field: 'holidayShare' | 'christmasShare', amount: number): ConversationState {
  const kind = field === 'holidayShare' ? 'holiday' : 'christmas';
  const value = Math.min(ALLOWANCES[kind].amount, Math.max(0, Math.round(amount)));
  const plan = planOf(s)!;
  const input: PlanInput = {
    ...s.plan!.input,
    monthly: undefined,
    holidayShare: plan.holidayShare,
    christmasShare: plan.christmasShare,
    [field]: value,
  };
  const name = kind === 'holiday' ? 'holiday allowance' : 'Christmas allowance';
  return commit(s, { ...s.plan!, input, sooner: false }, `Updated: ${name} ${formatCurrency(value)}`);
}

function changeMonthly(s: ConversationState, amount: number): ConversationState {
  const plan = planOf(s)!;
  const base: PlanInput = { ...s.plan!.input, monthly: amount, holidayShare: plan.holidayShare };
  const probe = calculatePlan(base);
  if (!probe.reachDate) return emit(s, ai(`At ${formatCurrency(amount)}/month you wouldn't reach ${formatCurrency(plan.goal)}. Try a higher amount.`));
  // The date moves instead of the amount.
  const reach = monthOf(probe.reachDate);
  const target = monthIndex(reach) > monthIndex(base.target) ? reach : base.target;
  return commit(s, { ...s.plan!, input: { ...base, target }, sooner: false }, `Updated: ${formatCurrency(amount)}/month`);
}

function reachSooner(s: ConversationState): ConversationState {
  const state = cardState(s);
  if (state === 'doesntFit') return emit(s, ai("Let's make it fit first. Here are some ways to get there."));
  const n: ConversationState = { ...s, plan: { ...s.plan!, sooner: true } };
  if (suggestionsOf(n).length === 0) return emit(s, ai("I don't see other ways to reach it sooner right now."));
  return moveCard(emit(n, ai('Here are some ways to reach it sooner. Your monthly saving stays the same.')));
}

function applySuggestion(s: ConversationState, id: SuggestionId): ConversationState {
  if (!s.plan) return unknown(s);
  if (!available(s, id)) return emit(s, ai(`The ${SUGGESTION_NAMES[id]} is already part of the plan.`));
  const sooner = cardState(s) !== 'doesntFit';
  const done = [...s.plan.done, id];
  if (id === 'netflix') {
    const n = commit(s, { ...s.plan, done }, 'Reminder set: before Netflix renews', false);
    // Keep the scroll on the change log line, with the reply below it.
    return { ...emit(n, ai("Done. I'll remind you 3 days before Netflix renews. I can't cancel subscriptions, so the plan stays the same unless you cancel it.")), focus: n.focus };
  }
  const input = applied(s, id, sooner)!;
  const log =
    id === 'christmas'
      ? `Applied: ${formatCurrency(FACTS.christmasUnspent)} from Christmas allowance`
      : `Applied: ${formatCurrency(FACTS.eatingOut.before)}/month eating-out budget`;
  return commit(s, { ...s.plan, input, done, sooner: false }, log);
}

function onAlternative(s: ConversationState, id: AlternativeId): ConversationState {
  if (!s.plan) return s;
  const input = s.plan.input;
  if (id === 'date') {
    const option = moveDateOption(input);
    if (!option) return s;
    return commit(s, { ...s.plan, input: option, sooner: false }, `Updated: target date ${formatMonth(option.target)} · ${formatCurrency(option.monthly)}/month`);
  }
  const goal = s.originalGoal!;
  return commit(s, fresh(defaultInput(goal, input.target, input.start)), `Back to ${formatCurrency(goal)}`);
}

function onSave(s: ConversationState, field: EditableField, raw: string): StepResult {
  const cancel = { state: { ...s, editing: null } };
  if (field === 'targetDate' || field === 'start') {
    const m = /^(\d{4})-(\d{1,2})$/.exec(raw.trim());
    if (!m) return cancel;
    const ym = { year: Number(m[1]), month: Number(m[2]) };
    if (field === 'start') return s.plan ? { state: changeStart(s, ym) } : cancel;
    if (s.stage === 'askBudget' || s.stage === 'askTrip') return { state: changeRequestTarget(s, ym) };
    return s.plan ? { state: changeTarget(s, ym) } : cancel;
  }
  const amount = Number(raw.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  if (!Number.isFinite(amount) || raw.trim() === '') return cancel;
  if (field === 'goal') {
    if (amount <= 0) return cancel;
    if (s.stage === 'askBudget') return startAnalysis(s, amount);
    return s.plan ? { state: changeGoal(s, amount) } : cancel;
  }
  return s.plan ? { state: changeShare(s, field, amount) } : cancel;
}
