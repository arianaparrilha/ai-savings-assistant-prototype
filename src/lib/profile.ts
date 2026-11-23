// Persona data (Inês, Porto). Plan maths lives in plan.ts; this is what the account "shows".

export const PROFILE = {
  name: 'Inês',
  balance: 1240.18,
};

/** 6-month averages, used by the affordability bar and the "Why these numbers?" sheet. */
export const BUDGET = {
  income: 1500,
  fixed: 859.47,
  flexible: 420,
};

export const FIXED_COSTS: Array<[string, number]> = [
  ['Rent', 650],
  ['Utilities and internet', 90],
  ['Transport', 40],
  ['Gym', 35],
  ['Phone', 15],
  ['Subscriptions', 29.47],
];

export const FLEXIBLE_COSTS: Array<[string, number]> = [
  ['Groceries', 220],
  ['Eating out', 110],
  ['Shopping', 60],
  ['Other', 30],
];

/** Facts the AI suggestions are built from. */
export const FACTS = {
  eatingOut: { now: 110, before: 80, months: 4 },
  netflix: 8.99,
  christmasUnspent: 500,
};

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  icon: 'groceries' | 'food' | 'music';
}

export const TRANSACTIONS: { date: Date; items: Transaction[] } = {
  date: new Date(2026, 10, 3),
  items: [
    { id: 't1', title: 'Groceries', amount: -42.3, icon: 'groceries' },
    { id: 't2', title: 'Eating out', amount: -18.5, icon: 'food' },
  ],
};
