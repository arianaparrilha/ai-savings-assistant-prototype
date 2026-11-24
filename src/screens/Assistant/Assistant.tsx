import { useEffect, useRef, useState } from 'react';
import {
  ActionChip, Card, ChatMessage, Composer, PlanCard, PlanHeader, RequestSummary, TopBar,
  type Frequency,
} from '../../components';
import {
  actionsOf, alternativesOf, budgetOf, cardState, headerStatusOf, isEdited, noteOf, planOf, START_CHIPS,
  suggestionsOf, summaryOf, titleOf, tripLabel, voiceLine,
  type ActionId, type AlternativeId, type Message, type SuggestionId,
} from '../../lib/conversation';
import { formatCurrency } from '../../lib/format';
import { paydayOf } from '../../lib/plan';
import type { Conversation } from '../../lib/useConversation';
import { cx } from '../../lib/cx';
import { ReviewSheet, WhySheet } from './Sheets';
import styles from './Assistant.module.css';

export interface AssistantProps {
  convo: Conversation;
  onBack: () => void;
  onViewGoal: () => void;
}

const VOICE_MS = 1500;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Full-screen conversation: TopBar and Composer stay fixed, the thread scrolls. */
export function Assistant({ convo, onBack, onViewGoal }: AssistantProps) {
  const { state, dispatch, send, thinking } = convo;
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('month');
  const [off, setOff] = useState<ActionId[]>([]);
  const [pinned, setPinned] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  // Messages that existed when the screen opened don't animate in again.
  const seenUpTo = useRef(state.seq);
  const mounted = useRef(false);

  const plan = planOf(state);
  const lastId = state.messages.at(-1)?.id;
  const lastReply = [...state.messages].reverse().find((m): m is Extract<Message, { type: 'ai' }> => m.type === 'ai')?.text ?? '';

  // Bring the newest reply (or the user's message) to the top of the thread.
  useEffect(() => {
    const scroller = scrollRef.current;
    const el = scroller?.querySelector<HTMLElement>(`[data-msg="${state.focus}"]`);
    const instant = !mounted.current || reducedMotion();
    mounted.current = true;
    if (!scroller || !el) return;
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16;
    scroller.scrollTo({ top, behavior: instant ? 'auto' : 'smooth' });
  }, [state.focus]);

  // PlanHeader sticks below the TopBar once the card's header scrolls away.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const update = () => {
      const card = cardRef.current;
      setPinned(!!card && card.getBoundingClientRect().top - scroller.getBoundingClientRect().top < -56);
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    return () => scroller.removeEventListener('scroll', update);
  }, [state.messages]);

  const submit = (text: string) => {
    setDraft('');
    void send(text);
  };

  const voice = () => {
    if (listening) return;
    setListening(true);
    const line = voiceLine(state);
    window.setTimeout(() => {
      setListening(false);
      setDraft(line);
    }, VOICE_MS);
  };

  const showCard = () => {
    const scroller = scrollRef.current;
    const card = cardRef.current;
    if (!scroller || !card) return;
    const top = card.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16;
    scroller.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  const chips = (items: string[]) => (
    <div className={styles.chips}>
      {items.map((c) => (
        <ActionChip key={c} tone="ai" onClick={() => submit(c)}>{c}</ActionChip>
      ))}
    </div>
  );

  const render = (m: Message) => {
    switch (m.type) {
      case 'user':
        return <ChatMessage type="user">{m.text}</ChatMessage>;
      case 'ai':
        return (
          <>
            <ChatMessage type="ai">{m.text}</ChatMessage>
            {m.chips && m.id === lastId && !thinking && chips(m.chips)}
          </>
        );
      case 'working':
        return (
          <ChatMessage type="working">
            {m.steps.map((s) => <span key={s}>{s}</span>)}
          </ChatMessage>
        );
      case 'changeLog':
        return (
          <ChatMessage type="changeLog" onUndo={m.undo ? () => dispatch({ type: 'undo', id: m.id }) : undefined}>
            {m.undone ? `${m.text} · undone` : m.text}
          </ChatMessage>
        );
      case 'request': {
        const editable = !state.plan && state.stage === 'askBudget';
        return (
          <Card>
            <RequestSummary
              trip={tripLabel(state.trip)}
              goal={state.plan?.input.goal ?? state.goal}
              targetDate={state.plan?.input.target ?? state.trip.target!}
              editing={editable ? state.editing : null}
              onEdit={editable ? (field) => dispatch({ type: 'edit', field }) : undefined}
              onSave={(field, raw) => dispatch({ type: 'save', field, raw })}
              onCancel={() => dispatch({ type: 'cancelEdit' })}
            />
          </Card>
        );
      }
      case 'plan':
        if (!plan) return null;
        return (
          <PlanCard
            ref={cardRef}
            state={cardState(state)}
            title={titleOf(state)}
            trip={tripLabel(state.trip)}
            plan={plan}
            budget={budgetOf(state)}
            frequency={frequency}
            onFrequencyChange={setFrequency}
            note={noteOf(plan)}
            editing={state.editing}
            onEdit={(field) => dispatch({ type: 'edit', field })}
            onSave={(field, raw) => dispatch({ type: 'save', field, raw })}
            onCancel={() => dispatch({ type: 'cancelEdit' })}
            suggestions={suggestionsOf(state)}
            onApplySuggestion={(id) => dispatch({ type: 'apply', id: id as SuggestionId })}
            onDismissSuggestion={(id) => dispatch({ type: 'dismiss', id: id as SuggestionId })}
            alternatives={alternativesOf(state)}
            onAlternative={(id) => dispatch({ type: 'alternative', id: id as AlternativeId })}
            actions={actionsOf(state).map((a) => ({ id: a.id, title: a.title, detail: a.detail, enabled: !off.includes(a.id) }))}
            onToggleAction={(id, enabled) => toggle(id as ActionId, enabled)}
            onReview={() => dispatch({ type: 'openSheet', sheet: 'review' })}
            onWhyNumbers={() => dispatch({ type: 'openSheet', sheet: 'why' })}
            onWhyMonthly={() => submit(`Why ${formatCurrency(plan.monthly)}?`)}
            onReachSooner={() => dispatch({ type: 'intent', intent: { kind: 'reachSooner' } })}
            onSeeProposal={isEdited(state) ? () => dispatch({ type: 'seeProposal' }) : undefined}
            onViewGoal={onViewGoal}
          />
        );
    }
  };

  const toggle = (id: ActionId, enabled: boolean) => setOff((o) => (enabled ? o.filter((x) => x !== id) : [...o, id]));
  const closeSheet = () => dispatch({ type: 'closeSheet' });

  return (
    <div className={styles.screen}>
      <TopBar title="Assistant" onBack={onBack} />
      <div className={styles.body}>
        {plan && (
          <PlanHeader
            className={cx(styles.pinned, pinned && styles.pinnedVisible)}
            title={titleOf(state)}
            summary={summaryOf(plan)}
            status={headerStatusOf(state)}
            onClick={showCard}
          />
        )}
        <div ref={scrollRef} className={styles.scroll}>
          <div className={styles.thread}>
            {state.messages.length === 0 && (
              <div className={styles.item}>
                <ChatMessage type="ai">Hi Inês. What would you like to do?</ChatMessage>
                {!thinking && chips(START_CHIPS)}
              </div>
            )}
            {state.messages.map((m) => (
              <div key={m.id} data-msg={m.id} className={cx(styles.item, m.type === 'changeLog' && styles.log, m.id > seenUpTo.current && styles.enter)}>
                {render(m)}
              </div>
            ))}
            {thinking && (
              <ChatMessage type="working" className={styles.enter}>
                <span>Thinking…</span>
              </ChatMessage>
            )}
          </div>
        </div>
      </div>
      {/* Screen readers hear each new reply once (the thread itself isn't a live region: the card moves). */}
      <p className={styles.srOnly} aria-live="polite">{lastReply}</p>
      <Composer
        value={draft}
        onChange={setDraft}
        onSend={submit}
        onVoice={voice}
        listening={listening}
        placeholder={listening ? 'Listening…' : 'Ask anything...'}
      />

      {state.sheet === 'why' && <WhySheet onClose={closeSheet} />}
      {state.sheet === 'review' && plan && (
        <ReviewSheet
          title={titleOf(state)}
          actions={actionsOf(state)}
          off={off}
          onToggle={toggle}
          onApprove={(ids) => dispatch({ type: 'approve', actions: ids })}
          onClose={closeSheet}
          onViewGoal={() => {
            closeSheet();
            onViewGoal();
          }}
          firstTransfer={paydayOf(plan.start)}
        />
      )}
    </div>
  );
}
