import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Sparkles, type LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';
import styles from './ActionChip.module.css';

export interface ActionChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** 'ai' = something the assistant does; 'action' = a regular app action. */
  tone?: 'action' | 'ai';
  /** Defaults to the sparkle. Pass null to hide. */
  icon?: LucideIcon | null;
  children: ReactNode;
}

export function ActionChip({ tone = 'action', icon = Sparkles, className, type = 'button', children, ...rest }: ActionChipProps) {
  const Icon = icon;
  return (
    <button type={type} className={cx(styles.chip, styles[tone], className)} {...rest}>
      {Icon && <Icon size={20} strokeWidth={1.5} aria-hidden />}
      <span>{children}</span>
    </button>
  );
}
