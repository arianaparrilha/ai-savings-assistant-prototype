import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Link } from '../Link/Link';
import styles from './Card.module.css';

export interface CardProps {
  title?: ReactNode;
  /** Header link on the right ("See all"). */
  action?: { label: string; onClick: () => void };
  className?: string;
  children: ReactNode;
}

export function Card({ title, action, className, children }: CardProps) {
  return (
    <section className={cx(styles.card, className)}>
      {(title || action) && (
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {action && <Link onClick={action.onClick}>{action.label}</Link>}
        </header>
      )}
      {children}
    </section>
  );
}
