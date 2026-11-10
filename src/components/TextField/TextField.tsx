import { useId, type InputHTMLAttributes } from 'react';
import { Calendar, Euro } from 'lucide-react';
import { cx } from '../../lib/cx';
import styles from './TextField.module.css';

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /** 'number' shows a € suffix, 'date' a calendar icon. Both stay text inputs so we control formatting. */
  type?: 'text' | 'number' | 'date';
  label?: string;
  value: string;
  onChange?: (value: string) => void;
}

export function TextField({ type = 'text', label, value, onChange, disabled, className, id, ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const Suffix = type === 'number' ? Euro : type === 'date' ? Calendar : null;
  return (
    <div className={cx(styles.field, disabled && styles.disabled, className)}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.control}>
        <input
          id={inputId}
          className={styles.input}
          value={value}
          disabled={disabled}
          inputMode={type === 'number' ? 'decimal' : undefined}
          onChange={(e) => onChange?.(e.target.value)}
          {...rest}
        />
        {Suffix && <Suffix className={styles.suffix} size={20} strokeWidth={1.5} aria-hidden />}
      </div>
    </div>
  );
}
