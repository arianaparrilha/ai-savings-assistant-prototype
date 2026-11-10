import { cx } from '../../lib/cx';
import { currencyLabel, formatCurrency, formatMonth } from '../../lib/format';
import type { YearMonth } from '../../lib/plan';
import type { FieldEditing } from '../types';
import { ValueField } from '../ValueField/ValueField';
import styles from './RequestSummary.module.css';

export interface RequestSummaryProps extends FieldEditing {
  /** "Trip · Japan · 2 people" */
  trip: string;
  goal?: number;
  targetDate: YearMonth;
  /** Hide the "Your request" heading when the parent already titles it. */
  hideHeading?: boolean;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function RequestSummary({ trip, goal, targetDate, hideHeading, editing, onEdit, onSave, onCancel, className }: RequestSummaryProps) {
  const stateOf = (f: 'goal' | 'targetDate') => (editing === f ? 'editing' : onEdit ? 'editable' : 'readOnly');
  return (
    <section className={cx(styles.summary, className)} aria-label="Your request">
      {!hideHeading && <h3 className={styles.heading}>Your request</h3>}
      <p className={styles.trip}>{trip}</p>
      <div className={styles.grid}>
        <ValueField
          label="Goal"
          state={stateOf('goal')}
          value={goal === undefined ? '?' : formatCurrency(goal)}
          ariaValue={goal === undefined ? 'not set yet' : currencyLabel(goal)}
          editValue={goal === undefined ? '' : String(goal)}
          inputType="amount"
          onEdit={() => onEdit?.('goal')}
          onSave={(raw) => onSave?.('goal', raw)}
          onCancel={onCancel}
        />
        <ValueField
          label="Target date"
          state={stateOf('targetDate')}
          value={formatMonth(targetDate)}
          editValue={`${targetDate.year}-${pad(targetDate.month)}`}
          inputType="month"
          onEdit={() => onEdit?.('targetDate')}
          onSave={(raw) => onSave?.('targetDate', raw)}
          onCancel={onCancel}
        />
      </div>
    </section>
  );
}
