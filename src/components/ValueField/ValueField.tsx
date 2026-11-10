import { useEffect, useRef, useState } from 'react';
import { Pencil, Save } from 'lucide-react';
import { cx } from '../../lib/cx';
import styles from './ValueField.module.css';

export interface ValueFieldProps {
  state?: 'readOnly' | 'editable' | 'editing';
  label: string;
  /** Formatted display value ("3.000 €", "Sep 2027"). */
  value: string;
  /** Screen-reader version of the value ("3000 euros"). */
  ariaValue?: string;
  /** Prefix "≈" for approximations. */
  approx?: boolean;
  /** Raw value shown in the input while editing ("3000", "2027-09"). */
  editValue?: string;
  /** 'amount' = number with € suffix, 'month' / 'date' = native pickers. */
  inputType?: 'amount' | 'month' | 'date';
  onEdit?: () => void;
  onSave?: (raw: string) => void;
  onCancel?: () => void;
  className?: string;
}

export function ValueField({
  state = 'readOnly',
  label,
  value,
  ariaValue,
  approx,
  editValue = '',
  inputType = 'amount',
  onEdit,
  onSave,
  onCancel,
  className,
}: ValueFieldProps) {
  return (
    <div className={cx(styles.field, className)}>
      <span className={styles.label}>{label}</span>
      {state === 'editing' ? (
        <Editor label={label} initial={editValue} inputType={inputType} onSave={onSave} onCancel={onCancel} />
      ) : (
        <div className={styles.row}>
          <span className={styles.value} aria-label={ariaValue}>
            {approx && <span aria-hidden>≈ </span>}
            {value}
          </span>
          {state === 'editable' && (
            <button type="button" className={styles.iconButton} aria-label={`Edit ${label.toLowerCase()}`} onClick={onEdit}>
              <Pencil size={24} strokeWidth={1.5} aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Editor({
  label,
  initial,
  inputType,
  onSave,
  onCancel,
}: {
  label: string;
  initial: string;
  inputType: 'amount' | 'month' | 'date';
  onSave?: (raw: string) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const save = () => {
    if (done.current) return;
    done.current = true;
    if (draft.trim() === '' || draft === initial) onCancel?.();
    else onSave?.(draft);
  };
  const cancel = () => {
    if (done.current) return;
    done.current = true;
    onCancel?.();
  };

  const isAmount = inputType === 'amount';
  return (
    <div className={styles.row}>
      <span className={styles.editing}>
        <input
          ref={inputRef}
          className={styles.input}
          type={isAmount ? 'text' : inputType}
          inputMode={isAmount ? 'decimal' : undefined}
          aria-label={label}
          value={draft}
          style={isAmount ? { width: `${Math.max(draft.length, 1) + 0.5}ch` } : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={(e) => {
            // Let the save button handle its own click.
            if (e.relatedTarget instanceof HTMLElement && e.relatedTarget.dataset.save) return;
            save();
          }}
        />
        {isAmount && <span aria-hidden>€</span>}
      </span>
      <button type="button" data-save="true" className={styles.iconButton} aria-label={`Save ${label.toLowerCase()}`} onClick={save}>
        <Save size={24} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
