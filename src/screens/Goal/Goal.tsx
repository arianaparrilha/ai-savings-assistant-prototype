import { useState } from 'react';
import { Euro, Gift, Goal as GoalIcon, Plane, Repeat, Sun, UserPlus } from 'lucide-react';
import { ActionChip, BottomNav, Button, Card, ChatMessage, ListRow, PlanHeader, ProgressBar, Tag, TopBar, type NavItem } from '../../components';
import { planOf, summaryOf, titleOf } from '../../lib/conversation';
import { currencyLabel, formatCurrency, formatDate, formatMonth } from '../../lib/format';
import { ALLOWANCES, allowanceMonthIn, paydayOf } from '../../lib/plan';
import type { Conversation } from '../../lib/useConversation';
import styles from './Goal.module.css';

export interface GoalProps {
  convo: Conversation;
  onNavigate: (item: NavItem) => void;
  /** Open the conversation as it is. */
  onOpenAssistant: () => void;
  /** Reopen the approved plan for editing in the conversation. */
  onEditPlan: () => void;
}

const NOT_IN_PROTOTYPE = "This isn't part of the prototype yet.";

export function Goal({ convo, onNavigate, onOpenAssistant, onEditPlan }: GoalProps) {
  const [notice, setNotice] = useState('');
  const state = convo.state;
  const plan = planOf(state);
  const approved = state.approvedActions;

  if (!plan || !approved) {
    return (
      <div className={styles.screen}>
        <TopBar title="Goals" icon={GoalIcon} />
        <div className={styles.scroll}>
          <Card>
            <p className={styles.empty}>
              {plan ? `${titleOf(state)} isn't approved yet.` : 'No goals yet.'} The assistant can help you plan one from your budget.
            </p>
            <div className={styles.chips}>
              <ActionChip tone="ai" onClick={onOpenAssistant}>{plan ? 'Continue in assistant' : 'Plan a goal'}</ActionChip>
            </div>
          </Card>
        </div>
        <BottomNav active="goals" onNavigate={onNavigate} />
      </div>
    );
  }

  const title = titleOf(state);
  const first = formatDate(paydayOf(plan.start)).replace(/ \d{4}$/, '');
  const alert = (kind: 'christmas' | 'holiday', share: number) => {
    const month = allowanceMonthIn(ALLOWANCES[kind].month, plan.start, plan.target);
    return month ? `${formatMonth(month)} · ${formatCurrency(share)}, you confirm first` : '';
  };
  const rows = [
    approved.includes('monthly') && (
      <ListRow key="monthly" context="card" leading={Repeat} title={`Monthly transfer ${formatCurrency(plan.monthly)}`} subtitle={`Every 25th · next on ${first}`} />
    ),
    approved.includes('christmas') && plan.christmasShare > 0 && (
      <ListRow key="christmas" context="card" leading={Gift} title="Christmas allowance alert" subtitle={alert('christmas', plan.christmasShare)} />
    ),
    approved.includes('holiday') && plan.holidayShare > 0 && (
      <ListRow key="holiday" context="card" leading={Sun} title="Holiday allowance alert" subtitle={alert('holiday', plan.holidayShare)} />
    ),
  ].filter(Boolean);

  const soon = () => setNotice(NOT_IN_PROTOTYPE);

  return (
    <div className={styles.screen}>
      <TopBar title={title} icon={Plane} />
      <div className={styles.scroll}>
        <PlanHeader title={title} summary={summaryOf(plan)} status={{ tone: 'success', label: 'On track' }} onClick={onOpenAssistant} />

        <Card>
          <p className={styles.label}>Saved</p>
          <p className={styles.saved} aria-label={`${currencyLabel(0)} of ${currencyLabel(plan.goal)}`}>
            {formatCurrency(0)} of {formatCurrency(plan.goal)}
          </p>
          <ProgressBar value={0} ariaLabel="Saved so far" />
        </Card>

        {rows.length > 0 && (
          <Card title="Active">
            <div>{rows}</div>
          </Card>
        )}

        {state.trip.people === 2 && (
          <div className={styles.invite}>
            <ChatMessage type="ai">Since this trip is for two, want to invite your partner to save together?</ChatMessage>
            <Button onClick={soon}>
              <UserPlus size={20} strokeWidth={1.5} aria-hidden />
              Invite partner
            </Button>
          </div>
        )}

        <section className={styles.more}>
          <h2 className={styles.label}>More actions</h2>
          <div className={styles.chips}>
            <ActionChip tone="action" icon={Euro} onClick={soon}>Add money</ActionChip>
            <ActionChip tone="action" icon={Euro} onClick={soon}>Round up payments</ActionChip>
            <ActionChip tone="ai" onClick={onEditPlan}>Edit plan with assistant</ActionChip>
            <ActionChip tone="ai" onClick={onOpenAssistant}>View conversation</ActionChip>
          </div>
          <div aria-live="polite">{notice && <Tag tone="neutral" icon={null}>{notice}</Tag>}</div>
        </section>
      </div>
      <BottomNav active="goals" onNavigate={onNavigate} />
    </div>
  );
}
