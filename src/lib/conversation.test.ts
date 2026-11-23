import { describe, expect, it } from 'vitest';
import { interpretScripted } from './assistant';
import {
  actionsOf, alternativesOf, cardState, initialState, planOf, SCRIPT, step, suggestionsOf,
  type ConversationEvent, type ConversationState,
} from './conversation';
import { formatDate } from './format';

/** Runs events, firing timed follow-ups immediately. */
function run(state: ConversationState, ...events: ConversationEvent[]) {
  let s = state;
  const queue = [...events];
  while (queue.length) {
    const result = step(s, queue.shift()!);
    s = result.state;
    queue.unshift(...(result.later ?? []).map((l) => l.event));
  }
  return s;
}

const say = (s: ConversationState, text: string) =>
  run(s, { type: 'say', text }, { type: 'intent', intent: interpretScripted(text, { stage: s.stage, target: s.plan?.input.target ?? s.trip.target }) });

/** format.ts puts a non-breaking space before €; compare with plain spaces. */
const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v).replace(/\u00a0/g, ' ').replace(/\\u00a0/g, ' '));

const lastAi = (s: ConversationState) => [...s.messages].reverse().find((m) => m.type === 'ai');
const text = (s: ConversationState) => {
  const m = lastAi(s);
  return m && m.type === 'ai' ? plain(m.text) : '';
};

function toPlan() {
  let s = say(initialState, SCRIPT.opening);
  s = say(s, '3.000 €');
  return s;
}

describe('happy path', () => {
  it('asks for a budget after the trip request', () => {
    const s = say(initialState, SCRIPT.opening);
    expect(s.stage).toBe('askBudget');
    expect(s.trip).toEqual({ destination: 'Japan', people: 2, target: { year: 2027, month: 9 } });
    expect(s.messages.map((m) => m.type)).toEqual(['user', 'ai', 'request', 'ai']);
  });

  it('3.000 € → analysis → plan that fits', () => {
    const s = toPlan();
    expect(s.stage).toBe('plan');
    expect(cardState(s)).toBe('default');
    expect(text(s)).toBe("Good news: 3.000 € by September fits your budget. Here's a plan.");
    expect(planOf(s)!.monthly).toBe(150);
    expect(s.messages.at(-1)!.type).toBe('plan');
  });

  it('4.000 € doesn\'t fit: suggestions and alternatives', () => {
    const s = say(toPlan(), 'Make it 4.000 €');
    expect(cardState(s)).toBe('doesntFit');
    expect(text(s)).toBe(
      "4.000 € by September doesn't quite fit: you'd need 228 €/month even with your whole allowance, about 8 € more than you have free. Here are some ways to get there.",
    );
    const sugg = plain(suggestionsOf(s));
    expect(sugg.map((x) => x.id)).toEqual(['christmas', 'eatingOut', 'netflix']);
    expect(sugg[0].recommended).toBe(true);
    expect(sugg[0].impact).toBe('182 €/month · ≈ 38 € left each month · nothing else changes');
    expect(sugg[1].impact).toBe('≈ 22 € left each month');
    expect(sugg[2].impact).toBe('≈ 1 € left each month, very tight');
    expect(plain(alternativesOf(s).map((a) => a.detail))).toEqual(['180 €/month, reach it on 25 Dec 2027', 'The original plan for September']);
  });

  it('applying the Christmas allowance adjusts the plan', () => {
    const s = run(say(toPlan(), 'Make it 4.000 €'), { type: 'apply', id: 'christmas' });
    expect(cardState(s)).toBe('adjusted');
    expect(text(s)).toBe(
      "Updated: 182 €/month, 500 € from your Christmas allowance in November and 1.500 € from your holiday allowance in June get you to 4.000 € by 25 Sep 2027, with about 38 € left each month. I'll ask you to confirm each allowance when it arrives. Heads-up: this uses your whole June allowance.",
    );
    expect(plain(actionsOf(s).map((a) => a.reviewTitle))).toEqual(['Create goal "Japan 2027"', 'Monthly transfer 182 €', 'Nov 2026: move 500 €', 'Jun 2027: move 1.500 €']);
    expect(plain(actionsOf(s)[1].reviewDetail)).toContain('11 transfers');
  });

  it('typing gives the same result as tapping', () => {
    const typed = say(say(toPlan(), 'Make it 4.000 €'), SCRIPT.fix);
    const tapped = run(say(toPlan(), 'Make it 4.000 €'), { type: 'apply', id: 'christmas' });
    expect(typed.plan).toEqual(tapped.plan);
    const edited = run(toPlan(), { type: 'save', field: 'goal', raw: '4000' });
    expect(edited.plan).toEqual(say(toPlan(), 'Make it 4.000 €').plan);
  });

  it('approve → approved card and partner invite', () => {
    const s = run(say(toPlan(), 'Make it 4.000 €'), { type: 'apply', id: 'christmas' }, { type: 'approve', actions: ['goal', 'monthly', 'christmas', 'holiday'] });
    expect(cardState(s)).toBe('approved');
    expect(text(s)).toBe('Since this trip is for two, want to invite your partner to save together?');
  });
});

describe('interaction rules', () => {
  it('undo restores the previous plan', () => {
    let s = say(toPlan(), 'Make it 4.000 €');
    const log = s.messages.find((m) => m.type === 'changeLog')!;
    s = run(s, { type: 'undo', id: log.id });
    expect(planOf(s)!.goal).toBe(3000);
    expect(cardState(s)).toBe('default');
  });

  it('dismissing the recommended suggestion moves the tag', () => {
    const s = run(say(toPlan(), 'Make it 4.000 €'), { type: 'dismiss', id: 'christmas' });
    expect(suggestionsOf(s).map((x) => [x.id, x.recommended])).toEqual([['eatingOut', true], ['netflix', false]]);
  });

  it('all dismissed: only the alternatives remain', () => {
    const s = run(say(toPlan(), 'Make it 4.000 €'), { type: 'dismiss', id: 'christmas' }, { type: 'dismiss', id: 'eatingOut' }, { type: 'dismiss', id: 'netflix' });
    expect(suggestionsOf(s)).toEqual([]);
    expect(alternativesOf(s)).toHaveLength(2);
  });

  it('move the date replaces the plan', () => {
    const s = run(say(toPlan(), 'Make it 4.000 €'), { type: 'alternative', id: 'date' });
    expect(planOf(s)!.monthly).toBe(180);
    expect(formatDate(planOf(s)!.reachDate!)).toBe('25 Dec 2027');
  });

  it('reach it sooner keeps the monthly and adds on top', () => {
    let s = say(toPlan(), 'Reach it sooner');
    expect(plain(suggestionsOf(s).map((x) => x.impact))).toEqual([
      'Reach it on 25 Jun 2027 · nothing else changes',
      'Reach it on 25 Aug 2027 · 180 €/month',
      '≈ 99 € more by September',
    ]);
    s = run(s, { type: 'apply', id: 'christmas' });
    expect(formatDate(planOf(s)!.reachDate!)).toBe('25 Jun 2027');
    expect(cardState(s)).toBe('adjusted');
    s = run(s, { type: 'seeProposal' });
    expect(cardState(s)).toBe('default');
  });

  it('a fixed monthly amount moves the date', () => {
    const s = say(toPlan(), 'I can only do 120 a month');
    expect(planOf(s)!.monthly).toBe(120);
    expect(formatDate(planOf(s)!.reachDate!)).toBe('25 Dec 2027');
    expect(s.plan!.input.target).toEqual({ year: 2027, month: 12 });
  });

  it('netflix only sets a reminder', () => {
    const before = say(toPlan(), 'Make it 4.000 €');
    const s = run(before, { type: 'apply', id: 'netflix' });
    expect(s.plan!.input).toEqual(before.plan!.input);
    expect(suggestionsOf(s).map((x) => x.id)).toEqual(['christmas', 'eatingOut']);
  });

  it('anything else: "can\'t help yet" with chips', () => {
    const s = say(initialState, 'Transfer money');
    const m = lastAi(s)!;
    expect(m.type === 'ai' && m.chips).toEqual(['Save for a trip']);
  });
});
