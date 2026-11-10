import { useId, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Toggle } from '../Toggle/Toggle';
import styles from './ActionRow.module.css';

export interface ActionRowProps {
  title: ReactNode;
  detail?: ReactNode;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

export function ActionRow({ title, detail, enabled, onToggle, className }: ActionRowProps) {
  const titleId = useId();
  return (
    <div className={cx(styles.row, className)}>
      <div className={styles.text}>
        <span id={titleId} className={styles.title}>{title}</span>
        {detail && <span className={styles.detail}>{detail}</span>}
      </div>
      <Toggle checked={enabled} onChange={onToggle} labelledBy={titleId} />
    </div>
  );
}
