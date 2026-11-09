import { describe, expect, it } from 'vitest';
import { calculatePlan, countTransfers, extraByTarget, nextPayday } from './plan';
import { formatDate } from './format';

const SEP_2027 = { year: 2027, month: 9 };
const reach = (p: ReturnType<typeof calculatePlan>) => (p.reachDate ? formatDate(p.reachDate) : null);

describe('basics', () => {
  it('next payday from 4 Nov 2026 is Nov 2026', () => {
    expect(nextPayday()).toEqual({ year: 2026, month: 11 });
  });
  it('Nov 2026 → Sep 2027 is 11 transfers', () => {
    expect(countTransfers({ year: 2026, month: 11 }, SEP_2027)).toBe(11);
  });
});

describe('CLAUDE.md test cases', () => {
  it('3.000 €, Sep 2027, defaults', () => {
    const p = calculatePlan({ goal: 3000, target: SEP_2027 });
    expect(p.monthly).toBe(150);
    expect(p.perWeek).toBe(35);
    expect(p.perDay).toBe(5);
    expect(p.holidayShare).toBe(1350);
    expect(reach(p)).toBe('25 Sep 2027');
    expect(p.buffer).toBe(70);
    expect(p.status).toBe('fits');
  });

  it('4.000 €, Sep 2027, full holiday 1.500 € → doesn’t fit', () => {
    const p = calculatePlan({ goal: 4000, target: SEP_2027, holidayShare: 1500 });
    expect(p.monthly).toBe(228);
    expect(p.buffer).toBe(-8);
    expect(p.status).toBe('doesntFit');
  });

  it('4.000 € defaults also lands on the full allowance and 228 €/month', () => {
    const p = calculatePlan({ goal: 4000, target: SEP_2027 });
    expect(p.holidayShare).toBe(1500);
    expect(p.monthly).toBe(228);
    expect(p.status).toBe('doesntFit');
  });

  it('4.000 € + Christmas 500 € + holiday 1.500 € → tight', () => {
    const p = calculatePlan({ goal: 4000, target: SEP_2027, holidayShare: 1500, christmasShare: 500 });
    expect(p.monthly).toBe(182);
    expect(p.buffer).toBe(38);
    expect(reach(p)).toBe('25 Sep 2027');
    expect(p.status).toBe('tight');
    expect(p.holidayShare).toBe(1500); // whole June allowance
  });

  it('4.000 €, 180 €/month, holiday 1.500 €, no Christmas → 14 transfers, Dec 2027', () => {
    const p = calculatePlan({ goal: 4000, target: SEP_2027, monthly: 180, holidayShare: 1500, christmasShare: 0 });
    expect(p.transfersToReach).toBe(14);
    expect(reach(p)).toBe('25 Dec 2027');
    expect(p.onTime).toBe(false);
  });

  // "Reach it sooner": the default plan (150 €/month, 1.350 € holiday) stays, Christmas is added on top.
  it('3.000 € + Christmas 500 € → Jun 2027', () => {
    const p = calculatePlan({ goal: 3000, target: SEP_2027, monthly: 150, holidayShare: 1350, christmasShare: 500 });
    expect(reach(p)).toBe('25 Jun 2027');
  });

  it('3.000 €, eating out back to 80 € (margin 250, 180 €/month) → Aug 2027', () => {
    const p = calculatePlan({ goal: 3000, target: SEP_2027, freeMargin: 250, monthly: 180, holidayShare: 1350 });
    expect(reach(p)).toBe('25 Aug 2027');
    expect(p.buffer).toBe(70);
  });

  it('3.000 €, cancel Netflix (+8,99 €) → ≈ 99 € more by September', () => {
    const p = calculatePlan({ goal: 3000, target: SEP_2027 });
    expect(Math.round(extraByTarget(8.99, p.transfers))).toBe(99);
  });

  it('3.000 €, no allowances, 220 €/month → Dec 2027', () => {
    const p = calculatePlan({ goal: 3000, target: SEP_2027, monthly: 220, holidayShare: 0, christmasShare: 0 });
    expect(reach(p)).toBe('25 Dec 2027');
  });

  it('3.000 €, no allowances, by Sep 2027 → doesn’t fit', () => {
    const p = calculatePlan({ goal: 3000, target: SEP_2027, holidayShare: 0, christmasShare: 0 });
    expect(220 * p.transfers).toBe(2420);
    expect(p.monthly).toBeGreaterThan(220);
    expect(p.status).toBe('doesntFit');
  });
});

describe('projection', () => {
  it('adds the holiday share in June', () => {
    const p = calculatePlan({ goal: 3000, target: SEP_2027 });
    const june = p.projection.find((pt) => pt.date.getMonth() === 5)!;
    expect(june.allowance).toBe(1350);
    expect(june.cumulative).toBe(150 * 8 + 1350);
  });
});
