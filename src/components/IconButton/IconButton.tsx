import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  icon: LucideIcon;
  /** Accessible name (the button has no visible text). */
  label: string;
  /** Filled brand circle (mic, send) or bare icon (edit, back). */
  level?: 'primary' | 'ghost';
}

export function IconButton({ icon: Icon, label, level = 'primary', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} className={cx(styles.iconButton, styles[level], className)} {...rest}>
      <Icon size={24} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
