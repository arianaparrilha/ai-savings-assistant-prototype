import { describe, expect, it } from 'vitest';
import { currencyLabel, formatCurrency, formatDate, formatMonth } from './format';

const nb = (s: string) => s.replace(/ /g, ' ');

describe('formatCurrency', () => {
  it('groups thousands with dots and uses comma decimals', () => {
    expect(nb(formatCurrency(1240.18))).toBe('1.240,18 €');
    expect(nb(formatCurrency(1234567.5))).toBe('1.234.567,50 €');
  });
  it('groups 4-digit numbers', () => {
    expect(nb(formatCurrency(3000))).toBe('3.000 €');
  });
  it('uses a real minus sign', () => {
    expect(nb(formatCurrency(-42.3))).toBe('−42,30 €');
  });
  it('respects fixed decimals and sign', () => {
    expect(nb(formatCurrency(150, { decimals: 2 }))).toBe('150,00 €');
    expect(nb(formatCurrency(8.99, { decimals: 0 }))).toBe('9 €');
    expect(nb(formatCurrency(99, { signed: true }))).toBe('+99 €');
    expect(nb(formatCurrency(0))).toBe('0 €');
  });
});

describe('labels and dates', () => {
  it('reads amounts for screen readers', () => {
    expect(currencyLabel(150)).toBe('150 euros');
    expect(currencyLabel(1240.18)).toBe('1240 euros and 18 cents');
  });
  it('formats dates and months', () => {
    expect(formatDate(new Date(2027, 8, 25))).toBe('25 Sep 2027');
    expect(formatMonth({ year: 2027, month: 9 })).toBe('Sep 2027');
    expect(formatMonth(new Date(2026, 10, 4))).toBe('Nov 2026');
  });
});
