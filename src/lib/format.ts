// pt-PT number format, English UI. Formatted manually because
// Intl.NumberFormat('pt-PT') drops grouping for 4-digit numbers.

const MINUS = '−'; // real minus sign
const NBSP = ' '; // keeps "€" on the same line as the number

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface CurrencyOptions {
  /** 'auto' shows cents only when the amount has them (3.000 € vs 1.240,18 €). */
  decimals?: 0 | 2 | 'auto';
  /** Prefix positive amounts with "+". */
  signed?: boolean;
}

/** 1240.18 → "1.240,18 €", -42.3 → "−42,30 €", 3000 → "3.000 €" */
export function formatCurrency(amount: number, { decimals = 'auto', signed = false }: CurrencyOptions = {}): string {
  const cents = Math.round(Math.abs(amount) * 100);
  const places = decimals === 'auto' ? (cents % 100 === 0 ? 0 : 2) : decimals;
  const whole = places === 0 ? Math.round(cents / 100) : Math.floor(cents / 100);
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraction = places === 2 ? `,${String(cents % 100).padStart(2, '0')}` : '';
  const isZero = places === 0 ? whole === 0 : cents === 0;
  const sign = amount < 0 && !isZero ? MINUS : signed && amount > 0 ? '+' : '';
  return `${sign}${grouped}${fraction}${NBSP}€`;
}

/** Screen-reader label: 150 → "150 euros", 1240.18 → "1240 euros and 18 cents". */
export function currencyLabel(amount: number): string {
  const cents = Math.round(Math.abs(amount) * 100);
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  const sign = amount < 0 ? 'minus ' : '';
  const eurosPart = `${euros} ${euros === 1 ? 'euro' : 'euros'}`;
  return rest ? `${sign}${eurosPart} and ${rest} ${rest === 1 ? 'cent' : 'cents'}` : `${sign}${eurosPart}`;
}

/** "25 Sep 2027" */
export function formatDate(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Screen-reader label: "25 September 2027" */
export function dateLabel(date: Date): string {
  return `${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Sep 2027". Accepts a Date or a {year, month (1–12)} pair. */
export function formatMonth(value: Date | { year: number; month: number }): string {
  const [y, m] = value instanceof Date ? [value.getFullYear(), value.getMonth()] : [value.year, value.month - 1];
  return `${MONTHS[m]} ${y}`;
}
