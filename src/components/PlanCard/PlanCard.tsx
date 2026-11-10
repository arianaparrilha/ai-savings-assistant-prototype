import type { ReactNode, Ref } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { cx } from '../../lib/cx';
import { currencyLabel, dateLabel, formatCurrency, formatDate } from '../../lib/format';
import type { Plan, YearMonth } from '../../lib/plan';
import { paydayOf } from '../../lib/plan';
import { ActionRow } from '../ActionRow/ActionRow';
import { AffordabilityBar } from '../AffordabilityBar/AffordabilityBar';
import { AlternativeRow } from '../AlternativeRow/AlternativeRow';
import { Button } from '../Button/Button';
import { Link } from '../Link/Link';
import { RequestSummary } from '../RequestSummary/RequestSummary';
import { SegmentedControl } from '../SegmentedControl/SegmentedControl';
import { SuggestionRow } from '../SuggestionRow/SuggestionRow';
import { Tag } from '../Tag/Tag';
import type { EditableField, FieldEditing } from '../types';
import { ValueField } from '../ValueField/ValueField';
import styles from './PlanCard.module.css';

export type PlanCardState = 'default' | 'doesntFit' | 'adjusted' | 'approved';
export type Frequency = 'month' | 'week' | 'day';

export interface Budget {
  income: number;
  fixed: number;
  flexible: number;
}

export interface PlanSuggestion {
  id: string;
  recommended?: boolean;
  text: ReactNode;
  impact: ReactNode;
  question: ReactNode;
}

export interface PlanAlternative {
  id: string;
  title: ReactNode;
  detail: ReactNode;
  actionLabel: string;
}

export interface PlanAction {
  id: string;
  title: ReactNode;
  detail: ReactNode;
  enabled: boolean;
}

export interface PlanCardProps extends FieldEditing {
  state: PlanCardState;
  /** Goal name ("Japan 2027"). */
  title: string;
  /** "Trip · Japan · 2 people" */
  trip: string;
  plan: Plan;
  budget: Budget;
  frequency: Frequency;
  onFrequencyChange: (f: Frequency) => void;
  /** Warning shown on an adjusted plan ("Uses your whole June allowance"). */
  note?: string;
  suggestions?: PlanSuggestion[];
  onApplySuggestion?: (id: string) => void;
  onDismissSuggestion?: (id: string) => void;
  alternatives?: PlanAlternative[];
  onAlternative?: (id: string) => void;
  actions?: PlanAction[];
  onToggleAction?: (id: string, enabled: boolean) => void;
  onReview?: () => void;
  onWhyNumbers?: () => void;
  onWhyMonthly?: () => void;
  onReachSooner?: () => void;
  onSeeProposal?: () => void;
  onViewGoal?: () => void;
  ref?: Ref<HTMLElement>;
  className?: string;
}

const STATUS = {
  default: { tone: 'success', label: 'Fits your budget', icon: undefined },
  doesntFit: { tone: 'danger', label: "Doesn't fit", icon: undefined },
  adjusted: { tone: 'info', label: 'Plan adjusted', icon: SlidersHorizontal },
  approved: { tone: 'success', label: 'Approved', icon: undefined },
} as const;

const FREQUENCIES = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
] as const satisfies ReadonlyArray<{ value: Frequency; label: string }>;

const pad = (n: number) => String(n).padStart(2, '0');
const ymValue = (ym: YearMonth) => `${ym.year}-${pad(ym.month)}`;

export function PlanCard(props: PlanCardProps) {
  const { state, title, ref, className } = props;
  const status = STATUS[state];
  return (
    <article ref={ref} className={cx(styles.card, className)} aria-label={`Plan: ${title}`}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <Tag tone={status.tone} icon={status.icon}>{status.label}</Tag>
      </header>
      {state === 'approved' ? <Approved {...props} /> : <Editable {...props} />}
    </article>
  );
}

function Approved({ plan, onViewGoal }: PlanCardProps) {
  const first = paydayOf(plan.start);
  return (
    <>
      <section className={styles.section}>
        <h3 className={styles.subheading}>Your plan</h3>
        <div className={styles.grid}>
          <ValueField label="Goal" value={formatCurrency(plan.goal)} ariaValue={currencyLabel(plan.goal)} />
          <ValueField label="Monthly saving" value={formatCurrency(plan.monthly)} ariaValue={`${currencyLabel(plan.monthly)} per month`} />
          <ReachField plan={plan} />
          <ValueField label="First transfer" value={formatDate(first)} ariaValue={dateLabel(first)} />
        </div>
      </section>
      <Button level="secondary" fullWidth onClick={onViewGoal}>View goal</Button>
    </>
  );
}

function Editable(props: PlanCardProps) {
  const { state, trip, plan, budget, editing, onEdit, onSave, onCancel, onWhyNumbers, actions = [], onToggleAction, onReview } = props;
  const fits = state !== 'doesntFit';
  return (
    <>
      <RequestSummary
        trip={trip}
        goal={plan.goal}
        targetDate={plan.target}
        editing={editing}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
      />

      <section className={styles.section}>
        <h3 className={styles.subheading}>Analysis</h3>
        <AffordabilityBar {...budget} />
        <p className={styles.caption}>Last 6 months of spending · 12 months for allowances</p>
        <Link onClick={onWhyNumbers}>Why these numbers?</Link>
      </section>

      {fits ? <Proposal {...props} /> : <DoesntFit {...props} />}

      {fits && actions.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.subheading}>Actions</h3>
          <div className={styles.list}>
            {actions.map((a) => (
              <ActionRow key={a.id} title={a.title} detail={a.detail} enabled={a.enabled} onToggle={(v) => onToggleAction?.(a.id, v)} />
            ))}
          </div>
        </section>
      )}

      <Button fullWidth disabled={!fits || !actions.some((a) => a.enabled)} onClick={onReview}>
        Review and approve
      </Button>
    </>
  );
}

function Proposal({ state, plan, frequency, onFrequencyChange, note, editing, onEdit, onSave, onCancel, onReachSooner, onWhyMonthly, onSeeProposal }: PlanCardProps) {
  const edit = (field: EditableField) => ({
    state: editing === field ? ('editing' as const) : ('editable' as const),
    onEdit: () => onEdit?.(field),
    onSave: (raw: string) => onSave?.(field, raw),
    onCancel,
  });

  const saving = {
    month: { label: 'Monthly saving', amount: plan.monthly, unit: 'per month' },
    week: { label: 'Weekly saving', amount: plan.perWeek, unit: 'per week' },
    day: { label: 'Daily saving', amount: plan.perDay, unit: 'per day' },
  }[frequency];

  const holiday = (
    <ValueField
      key="holiday"
      label="Holiday allowance (Jun)"
      value={formatCurrency(plan.holidayShare)}
      ariaValue={currencyLabel(plan.holidayShare)}
      editValue={String(plan.holidayShare)}
      {...edit('holidayShare')}
    />
  );
  const christmas = plan.christmasShare > 0 && (
    <ValueField
      key="christmas"
      label="Christmas allowance (Nov)"
      value={formatCurrency(plan.christmasShare)}
      ariaValue={currencyLabel(plan.christmasShare)}
      editValue={String(plan.christmasShare)}
      {...edit('christmasShare')}
    />
  );
  const left = (
    <ValueField key="left" label="Left each month" approx value={formatCurrency(plan.buffer)} ariaValue={`about ${currencyLabel(plan.buffer)}`} />
  );
  const reach = <ReachField key="reach" plan={plan} />;

  // One allowance: [allowance, left] [reach]. Two: [christmas, holiday] [reach, left].
  const cells = christmas ? [christmas, holiday, reach, left] : [holiday, left, reach];

  return (
    <section className={styles.section}>
      <h3 className={styles.subheading}>Proposal</h3>
      <div className={styles.live} aria-live="polite">
        <div className={styles.grid}>
          <ValueField
            label={saving.label}
            approx={frequency !== 'month'}
            value={formatCurrency(saving.amount)}
            ariaValue={`${frequency !== 'month' ? 'about ' : ''}${currencyLabel(saving.amount)} ${saving.unit}`}
          />
          <ValueField
            label="Starts"
            value={formatDate(paydayOf(plan.start))}
            ariaValue={dateLabel(paydayOf(plan.start))}
            editValue={ymValue(plan.start)}
            inputType="month"
            {...edit('start')}
          />
        </div>
        <SegmentedControl ariaLabel="Show saving per" options={[...FREQUENCIES]} value={frequency} onChange={onFrequencyChange} />
        <div className={styles.grid}>{cells}</div>
      </div>

      {state === 'adjusted' ? (
        <>
          {note && <Tag tone="warning" block>{note}</Tag>}
          <Link onClick={onSeeProposal}>See AI proposal</Link>
        </>
      ) : (
        <div className={styles.inline}>
          <Button level="secondary" onClick={onReachSooner}>Reach it sooner</Button>
          <Link onClick={onWhyMonthly}>Why {formatCurrency(plan.monthly)}?</Link>
        </div>
      )}
    </section>
  );
}

function DoesntFit({ plan, suggestions = [], onApplySuggestion, onDismissSuggestion, alternatives = [], onAlternative }: PlanCardProps) {
  const over = Math.max(0, -plan.buffer);
  return (
    <>
      <section className={styles.section}>
        <h3 className={styles.subheading}>Proposal</h3>
        <div className={styles.live} aria-live="polite">
          <div className={styles.grid}>
            <ValueField label="Monthly needed" value={formatCurrency(plan.monthly)} ariaValue={`${currencyLabel(plan.monthly)} per month`} />
            <ValueField label="Free each month" approx value={formatCurrency(plan.freeMargin)} ariaValue={`about ${currencyLabel(plan.freeMargin)}`} />
          </div>
          <p className={styles.warning}>≈ {formatCurrency(over)} more than you have free each month</p>
        </div>
        {suggestions.length > 0 && (
          <>
            <h3 className={styles.heading}>Ways to get there</h3>
            <div className={styles.list}>
              {suggestions.map((s) => (
                <SuggestionRow
                  key={s.id}
                  recommended={s.recommended}
                  text={s.text}
                  impact={s.impact}
                  question={s.question}
                  onApply={() => onApplySuggestion?.(s.id)}
                  onDismiss={() => onDismissSuggestion?.(s.id)}
                />
              ))}
            </div>
          </>
        )}
      </section>
      {alternatives.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.heading}>{suggestions.length > 0 ? 'Or, instead' : 'Ways to get there'}</h3>
          <div className={styles.list}>
            {alternatives.map((a) => (
              <AlternativeRow key={a.id} title={a.title} detail={a.detail} actionLabel={a.actionLabel} onAction={() => onAlternative?.(a.id)} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function ReachField({ plan }: { plan: Plan }) {
  return plan.reachDate ? (
    <ValueField label="You'll reach it" value={formatDate(plan.reachDate)} ariaValue={dateLabel(plan.reachDate)} />
  ) : (
    <ValueField label="You'll reach it" value="Not yet" />
  );
}
