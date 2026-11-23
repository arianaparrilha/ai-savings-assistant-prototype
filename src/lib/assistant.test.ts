import { describe, expect, it } from 'vitest';
import { findAmount, findMonth, scriptedEngine } from './assistant';
import { EXAMPLES } from './examples';

describe('scripted engine · examples.ts', () => {
  it.each(EXAMPLES)('"$text" ($context.stage)', async ({ text, context, expected }) => {
    const intent = await scriptedEngine.interpret(text, context);
    // Unset optional fields don't count: { kind: 'startTrip' } matches { kind: 'startTrip', people: undefined }.
    expect(JSON.parse(JSON.stringify(intent))).toEqual(expected);
  });
});

describe('parsing', () => {
  it('reads pt-PT amounts', () => {
    expect(findAmount('4.000 €')).toBe(4000);
    expect(findAmount('4 000')).toBe(4000);
    expect(findAmount('3.000,50')).toBe(3000.5);
    expect(findAmount('1,5k')).toBe(1500);
    expect(findAmount('8.99')).toBe(8.99);
    expect(findAmount('no numbers')).toBeNull();
  });

  it('resolves months without a year after the next payday', () => {
    expect(findMonth('September', { stage: 'start' })?.target).toEqual({ year: 2027, month: 9 });
    expect(findMonth('by June', { stage: 'plan', target: { year: 2027, month: 9 } })?.target).toEqual({ year: 2027, month: 6 });
    expect(findMonth('2027-10')?.target).toEqual({ year: 2027, month: 10 });
    expect(findMonth('I may go')).toBeNull();
  });
});
