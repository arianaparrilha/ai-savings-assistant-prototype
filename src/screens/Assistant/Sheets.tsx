import { useState } from 'react';
import { Plane } from 'lucide-react';
import { AffordabilityBar, BottomSheet, Button, ReviewActionRow } from '../../components';
import type { ActionId, ActionView } from '../../lib/conversation';
import { currencyLabel, formatCurrency, formatDate } from '../../lib/format';
import { ALLOWANCES, FREE_MARGIN } from '../../lib/plan';
import { BUDGET, FACTS, FIXED_COSTS, FLEXIBLE_COSTS } from '../../lib/profile';
import styles from './Assistant.module.css';

const breakdown = (items: Array<[string, number]>) => items.map(([name, n]) => `${name} ${formatCurrency(n)}`).join(' · ');

const FACT_ROWS = [
  { label: 'Salary, on the 25th', value: BUDGET.income, detail: 'Received in each of the last 6 months' },
  { label: 'Fixed costs', value: BUDGET.fixed, detail: breakdown(FIXED_COSTS) },
  { label: 'Flexible spend, 6-month average', value: BUDGET.flexible, detail: breakdown(FLEXIBLE_COSTS) },
  { label: 'Left over', value: FREE_MARGIN, approx: true, detail: `Varies by about ${formatCurrency(80)}, so the plan keeps a buffer` },
  { label: 'Holiday allowance', value: ALLOWANCES.holiday.amount, detail: `Received on ${formatDate(new Date(2026, 5, 25))}` },
  {
    label: 'Christmas allowance',
    value: ALLOWANCES.christmas.amount,
    detail: `Received in Nov 2025 · about ${formatCurrency(FACTS.christmasUnspent)} still unspent by January`,
  },
];

export function WhySheet({ onClose }: { onClose: () => void }) {
  return (
    <BottomSheet title="Why these numbers?" onClose={onClose} footer={<Button level="secondary" fullWidth onClick={onClose}>Got it</Button>}>
      <AffordabilityBar {...BUDGET} />
      <dl className={styles.facts}>
        {FACT_ROWS.map((row) => (
          <div key={row.label} className={styles.fact}>
            <dt className={styles.factLabel}>{row.label}</dt>
            <dd className={styles.factValue} aria-label={`${row.approx ? 'about ' : ''}${currencyLabel(row.value)}`}>
              {row.approx && '≈ '}
              {formatCurrency(row.value)}
            </dd>
            <dd className={styles.factDetail}>{row.detail}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.caption}>Based only on your current account here. I don't see other banks.</p>
    </BottomSheet>
  );
}

export interface ReviewSheetProps {
  title: string;
  actions: ActionView[];
  off: ActionId[];
  onToggle: (id: ActionId, enabled: boolean) => void;
  /** Called once the (simulated) fingerprint check passes. */
  onApprove: (ids: ActionId[]) => void;
  onClose: () => void;
  onViewGoal: () => void;
  firstTransfer?: Date;
}

const VALIDATION_MS = 1500;

export function ReviewSheet({ title, actions, off, onToggle, onApprove, onClose, onViewGoal, firstTransfer }: ReviewSheetProps) {
  const [phase, setPhase] = useState<'review' | 'validating' | 'success'>('review');
  const enabled = actions.filter((a) => !off.includes(a.id));
  const count = enabled.length;
  const noun = count === 1 ? 'action' : 'actions';
  const allowances = enabled.filter((a) => a.id === 'christmas' || a.id === 'holiday').length;
  const monthly = enabled.some((a) => a.id === 'monthly');

  const approve = () => {
    setPhase('validating');
    window.setTimeout(() => {
      onApprove(enabled.map((a) => a.id));
      setPhase('success');
    }, VALIDATION_MS);
  };

  return (
    <BottomSheet
      type="action"
      state={phase}
      title={`Review ${count} ${noun}`}
      onClose={onClose}
      footer={
        phase === 'success' ? (
          <>
            <Button fullWidth onClick={onViewGoal}>View goal</Button>
            <Button level="ghost" fullWidth onClick={onClose}>Back to chat</Button>
          </>
        ) : (
          <>
            <Button fullWidth disabled={count === 0 || phase === 'validating'} onClick={approve}>
              {phase === 'validating' ? 'Validating…' : `Approve ${count} ${noun}`}
            </Button>
            {phase === 'review' && <Button level="ghost" fullWidth onClick={onClose}>Cancel</Button>}
          </>
        )
      }
    >
      {phase === 'success' ? (
        <div className={styles.success} role="status">
          <Plane size={32} strokeWidth={1.5} aria-hidden className={styles.brandIcon} />
          <p className={styles.successTitle}>Done. {title} is set up.</p>
          {monthly && firstTransfer && (
            <p className={styles.successDetail}>First transfer on {formatDate(firstTransfer).replace(/ \d{4}$/, '')}.</p>
          )}
        </div>
      ) : (
        <>
          <ol className={styles.reviewList}>
            {actions.map((a, i) => (
              <ReviewActionRow
                key={a.id}
                number={i + 1}
                title={a.reviewTitle}
                detail={a.reviewDetail}
                enabled={!off.includes(a.id)}
                disabled={phase === 'validating'}
                onToggle={(v) => onToggle(a.id, v)}
              />
            ))}
          </ol>
          {allowances > 0 && (
            <p className={styles.caption}>
              Nothing moves from {allowances === 2 ? 'either allowance' : 'your allowance'} without your confirmation.
            </p>
          )}
        </>
      )}
    </BottomSheet>
  );
}
