import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';
import { currencyLabel, formatCurrency } from '../../lib/format';
import styles from './ListRow.module.css';

export interface ListRowProps {
  /** 'transaction' puts the icon in a circle and shows an amount. */
  type?: 'default' | 'transaction';
  /** 'card' sits flush inside a Card; 'standalone' has its own side padding. */
  context?: 'card' | 'standalone';
  title: ReactNode;
  subtitle?: ReactNode;
  amount?: number;
  leading?: LucideIcon;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListRow({ type = 'default', context = 'card', title, subtitle, amount, leading: Leading, trailing, onClick, className }: ListRowProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cx(styles.row, styles[type], styles[context], onClick && styles.interactive, className)}
    >
      {Leading && (
        <span className={styles.leading}>
          <Leading size={24} strokeWidth={1.5} aria-hidden />
        </span>
      )}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </span>
      {amount !== undefined && (
        <span className={amount >= 0 ? styles.amountPositive : styles.amount} aria-label={currencyLabel(amount)}>
          {formatCurrency(amount, { decimals: 2, signed: amount > 0 })}
        </span>
      )}
      {trailing}
    </Tag>
  );
}
