import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './Link.module.css';

export interface LinkProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
}

/** In-app text action. Rendered as a button because it never navigates to a URL. */
export function Link({ className, type = 'button', children, ...rest }: LinkProps) {
  return (
    <button type={type} className={cx(styles.link, className)} {...rest}>
      {children}
    </button>
  );
}
