import { cx } from '../../lib/cx';
import { formatCurrency } from '../../lib/format';
import styles from './AffordabilityBar.module.css';

export interface AffordabilityBarProps {
  income: number;
  fixed: number;
  flexible: number;
  className?: string;
}

export function AffordabilityBar({ income, fixed, flexible, className }: AffordabilityBarProps) {
  const free = Math.max(0, income - fixed - flexible);
  // Legend is a summary: nearest 10 € (859,47 → 860 €, as in Figma). Exact figures live in the "Why" sheet.
  const to10 = (n: number) => formatCurrency(Math.round(n / 10) * 10);
  const fixedLabel = to10(fixed);
  const flexibleLabel = to10(flexible);
  const freeLabel = to10(free);
  const segments = [
    { key: 'fixed', value: fixed, label: `Fixed ${fixedLabel}` },
    { key: 'flexible', value: flexible, label: `Flexible ${flexibleLabel}` },
    { key: 'free', value: free, label: `Free ≈ ${freeLabel}` },
  ] as const;

  return (
    <figure
      className={cx(styles.figure, className)}
      aria-label={`Monthly budget: fixed costs ${fixedLabel}, flexible spending ${flexibleLabel}, about ${freeLabel} free`}
    >
      <div className={styles.bar} aria-hidden>
        {segments.map((s) => (
          <span key={s.key} className={cx(styles.segment, styles[s.key])} style={{ flexGrow: s.value }} />
        ))}
      </div>
      <figcaption className={styles.legend} aria-hidden>
        {segments.map((s) => (
          <span key={s.key} className={styles.legendItem}>
            <span className={cx(styles.dot, styles[s.key])} />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
