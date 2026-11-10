import { useId } from 'react';
import { cx } from '../../lib/cx';
import styles from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Visible label. Without it, pass ariaLabel. */
  label?: string;
  ariaLabel?: string;
  /** id of an external element that names the switch (e.g. a row title). */
  labelledBy?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked, onChange, label, ariaLabel, labelledBy, disabled, className }: ToggleProps) {
  const labelId = useId();
  return (
    <div className={cx(styles.toggle, disabled && styles.disabled, className)}>
      {label && (
        <span id={labelId} className={styles.label}>
          {label}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? labelId : labelledBy}
        aria-label={label || labelledBy ? undefined : ariaLabel}
        disabled={disabled}
        className={styles.track}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.thumb} />
      </button>
    </div>
  );
}
