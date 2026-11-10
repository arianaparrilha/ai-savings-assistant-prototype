import { cx } from '../../lib/cx';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  /** 0–100 */
  value: number;
  ariaLabel?: string;
  className?: string;
}

export function ProgressBar({ value, ariaLabel = 'Progress', className }: ProgressBarProps) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cx(styles.track, className)}
    >
      <div className={styles.fill} style={{ width: `${v}%` }} />
    </div>
  );
}
