import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Button.module.css';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  level?: 'primary' | 'secondary' | 'ghost';
  /** Stretch to the container width (plan card, sheets). */
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({ level = 'primary', fullWidth, className, type = 'button', children, ...rest }: ButtonProps) {
  return (
    <button type={type} className={cx(styles.button, styles[level], fullWidth && styles.fullWidth, className)} {...rest}>
      {children}
    </button>
  );
}
