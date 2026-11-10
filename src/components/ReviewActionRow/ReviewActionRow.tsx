import { useId, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Toggle } from '../Toggle/Toggle';
import styles from './ReviewActionRow.module.css';

export interface ReviewActionRowProps {
  number: number;
  title: ReactNode;
  detail: ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function ReviewActionRow({ number, title, detail, enabled, onToggle, disabled, className }: ReviewActionRowProps) {
  const titleId = useId();
  return (
    <li className={cx(styles.row, className)}>
      <span className={styles.number} aria-hidden>{number}</span>
      <div className={styles.text}>
        <span id={titleId} className={styles.title}>{title}</span>
        <span className={styles.detail}>{detail}</span>
      </div>
      <Toggle checked={enabled} onChange={onToggle} labelledBy={titleId} disabled={disabled} />
    </li>
  );
}
