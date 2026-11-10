import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Button } from '../Button/Button';
import styles from './AlternativeRow.module.css';

export interface AlternativeRowProps {
  title: ReactNode;
  detail: ReactNode;
  actionLabel: string;
  onAction: () => void;
  className?: string;
}

export function AlternativeRow({ title, detail, actionLabel, onAction, className }: AlternativeRowProps) {
  return (
    <div className={cx(styles.row, className)}>
      <div className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.detail}>{detail}</span>
      </div>
      <Button level="secondary" onClick={onAction}>{actionLabel}</Button>
    </div>
  );
}
