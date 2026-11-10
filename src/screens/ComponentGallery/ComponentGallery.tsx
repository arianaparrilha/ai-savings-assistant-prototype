import { useMemo, useState, type ReactNode } from 'react';
import { Plane, ShoppingBasket, Sparkles } from 'lucide-react';
import {
  ActionChip, ActionRow, AffordabilityBar, AlternativeRow, BottomNav, BottomSheet, Button, Card, ChatMessage,
  Composer, IconButton, Link, ListRow, PlanCard, PlanHeader, ProgressBar, RequestSummary, ReviewActionRow,
  SegmentedControl, SuggestionRow, Tag, TextField, Toggle, TopBar, ValueField,
  type EditableField, type Frequency, type NavItem, type PlanCardState,
} from '../../components';
import { Mic } from 'lucide-react';
import { calculatePlan } from '../../lib/plan';
import { formatCurrency, formatDate } from '../../lib/format';
import styles from './ComponentGallery.module.css';

const SEP_2027 = { year: 2027, month: 9 };
const BUDGET = { income: 1500, fixed: 859.47, flexible: 420 };

/** Every component and state in one scrollable screen, for review before building screens. */
export function ComponentGallery() {
  return (
    <div className={styles.page}>
      <TopBar title="Components" icon={Sparkles} />
      <div className={styles.scroll}>
        <BaseSection />
        <CompositeSection />
        <PlanSection />
        <ChatSection />
        <NavSection />
        <SheetSection />
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{title}</h2>
      <div className={styles.stack}>{children}</div>
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}

function BaseSection() {
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('3000');
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [freq, setFreq] = useState<Frequency>('month');
  return (
    <>
      <Group title="Button">
        <Row>
          <Button>Primary</Button>
          <Button level="secondary">Secondary</Button>
          <Button level="ghost">Ghost</Button>
        </Row>
        <Row>
          <Button disabled>Primary</Button>
          <Button level="secondary" disabled>Secondary</Button>
          <Button level="ghost" disabled>Ghost</Button>
        </Row>
      </Group>
      <Group title="IconButton">
        <Row>
          <IconButton icon={Mic} label="Speak" />
          <IconButton icon={Mic} label="Speak (disabled)" disabled />
        </Row>
      </Group>
      <Group title="Tag">
        <Row>
          <Tag tone="success">Fits your budget</Tag>
          <Tag tone="danger">Doesn't fit</Tag>
        </Row>
        <Row>
          <Tag tone="info">Info</Tag>
          <Tag tone="ai">AI</Tag>
          <Tag tone="warning">Warning</Tag>
          <Tag tone="neutral">Neutral</Tag>
        </Row>
        <Tag tone="ai" action={{ label: 'Go now', onClick: () => {} }}>
          Most months you have about 220 € left over. Want to put it towards something?
        </Tag>
      </Group>
      <Group title="ActionChip">
        <div className={styles.chips}>
          <ActionChip tone="ai">Save for a trip</ActionChip>
          <ActionChip tone="ai">Transfer money</ActionChip>
          <ActionChip tone="ai">Block card</ActionChip>
        </div>
        <div className={styles.chips}>
          <ActionChip>Save for a trip</ActionChip>
          <ActionChip disabled>Disabled</ActionChip>
        </div>
      </Group>
      <Group title="TextField">
        <TextField label="Label" placeholder="Ask anything..." value={text} onChange={setText} />
        <TextField label="Amount" type="number" placeholder="0" value={amount} onChange={setAmount} />
        <TextField label="Date" type="date" placeholder="Sep 2027" value="" disabled />
      </Group>
      <Group title="Toggle">
        <Row>
          <Toggle label="On" checked={on} onChange={setOn} />
          <Toggle label="Off" checked={off} onChange={setOff} />
          <Toggle label="Disabled" checked={false} onChange={() => {}} disabled />
        </Row>
      </Group>
      <Group title="SegmentedControl">
        <SegmentedControl
          ariaLabel="Frequency"
          options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }, { value: 'day', label: 'Day' }]}
          value={freq}
          onChange={setFreq}
        />
      </Group>
      <Group title="ListRow">
        <ListRow leading={ShoppingBasket} title="Monthly transfer" subtitle="Every 25th · next on 25 Nov" onClick={() => {}} />
        <ListRow type="transaction" leading={ShoppingBasket} title="Business name" amount={-42.3} onClick={() => {}} />
        <ListRow type="transaction" leading={ShoppingBasket} title="Salary" subtitle="25 Oct 2026" amount={1500} />
      </Group>
      <Group title="Link · ProgressBar">
        <Link onClick={() => {}}>Why 150 €?</Link>
        <ProgressBar value={35} ariaLabel="Saved so far" />
      </Group>
      <Group title="Card">
        <Card title="Latest transactions" action={{ label: 'See all', onClick: () => {} }}>
          <ListRow type="transaction" leading={ShoppingBasket} title="Business name" amount={-42.3} />
        </Card>
      </Group>
    </>
  );
}

function CompositeSection() {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(150);
  const [enabled, setEnabled] = useState(true);
  const [reqEditing, setReqEditing] = useState<EditableField | null>(null);
  const [goal, setGoal] = useState<number | undefined>(undefined);
  return (
    <>
      <Group title="ValueField">
        <div className={styles.grid}>
          <ValueField label="Monthly saving" value={formatCurrency(value)} />
          <ValueField
            label="Editable"
            state={editing ? 'editing' : 'editable'}
            value={formatCurrency(value)}
            editValue={String(value)}
            onEdit={() => setEditing(true)}
            onSave={(raw) => {
              const n = Number(raw.replace(/[^\d,.-]/g, '').replace(',', '.'));
              if (!Number.isNaN(n)) setValue(n);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </Group>
      <Group title="AffordabilityBar">
        <AffordabilityBar {...BUDGET} />
      </Group>
      <Group title="ActionRow">
        <ActionRow title="Monthly transfer 150 €" detail="Every 25th from 25 Nov 2026" enabled={enabled} onToggle={setEnabled} />
      </Group>
      <Group title="SuggestionRow">
        <SuggestionRow
          recommended
          text="Eating out went from 80 € to 110 € over 4 months. Back to 80 € frees 30 €/month."
          impact="≈ 22 € left each month"
          question="Set an 80 €/month eating-out budget with alerts?"
          onApply={() => {}}
          onDismiss={() => {}}
        />
      </Group>
      <Group title="AlternativeRow">
        <AlternativeRow title="Move the date" detail="180 €/month, reach it on 25 Dec 2027" actionLabel="Update goal date" onAction={() => {}} />
      </Group>
      <Group title="ReviewActionRow">
        <ol className={styles.list}>
          <ReviewActionRow number={1} title='Create goal "Japan 2027"' detail="4.000 € by 25 Sep 2027" enabled={enabled} onToggle={setEnabled} />
        </ol>
      </Group>
      <Group title="RequestSummary">
        <Card>
          <RequestSummary
            trip="Trip · Japan · 2 people"
            goal={goal}
            targetDate={SEP_2027}
            editing={reqEditing}
            onEdit={setReqEditing}
            onSave={(field, raw) => {
              if (field === 'goal') setGoal(Number(raw.replace(/\D/g, '')) || undefined);
              setReqEditing(null);
            }}
            onCancel={() => setReqEditing(null)}
          />
        </Card>
      </Group>
    </>
  );
}

const PLAN_STATES: Array<{ state: PlanCardState; label: string }> = [
  { state: 'default', label: 'Default · 3.000 €' },
  { state: 'doesntFit', label: "Doesn't fit · 4.000 €" },
  { state: 'adjusted', label: 'Adjusted · + Christmas 500 €' },
  { state: 'approved', label: 'Approved' },
];

function PlanSection() {
  return (
    <Group title="PlanCard">
      {PLAN_STATES.map(({ state, label }) => (
        <div key={state} className={styles.stack}>
          <h3 className={styles.subTitle}>{label}</h3>
          <PlanDemo state={state} />
        </div>
      ))}
      <h3 className={styles.subTitle}>PlanHeader</h3>
      <PlanHeader title="Japan 2027" summary="150 €/month · 25 Sep 2027" status={{ tone: 'success', label: 'On track' }} />
    </Group>
  );
}

function PlanDemo({ state }: { state: PlanCardState }) {
  const [frequency, setFrequency] = useState<Frequency>('month');
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [actionsOn, setActionsOn] = useState<Record<string, boolean>>({});
  const plan = useMemo(() => {
    switch (state) {
      case 'doesntFit':
        return calculatePlan({ goal: 4000, target: SEP_2027, holidayShare: 1500 });
      case 'adjusted':
      case 'approved':
        return calculatePlan({ goal: 4000, target: SEP_2027, holidayShare: 1500, christmasShare: 500 });
      default:
        return calculatePlan({ goal: 3000, target: SEP_2027 });
    }
  }, [state]);

  const actions = [
    { id: 'goal', title: 'Create goal "Japan 2027"', detail: `${formatCurrency(plan.goal)} by ${plan.reachDate ? formatDate(plan.reachDate) : '—'}` },
    { id: 'monthly', title: `Monthly transfer ${formatCurrency(plan.monthly)}`, detail: 'Every 25th from 25 Nov 2026' },
    ...(plan.christmasShare ? [{ id: 'christmas', title: `Christmas allowance: ${formatCurrency(plan.christmasShare)}`, detail: "Nov 2026 · I'll ask you to confirm" }] : []),
    { id: 'holiday', title: `Holiday allowance: ${formatCurrency(plan.holidayShare)}`, detail: "Jun 2027 · I'll ask you to confirm" },
  ].map((a) => ({ ...a, enabled: actionsOn[a.id] ?? true }));

  return (
    <PlanCard
      state={state}
      title="Japan 2027"
      trip="Trip · Japan · 2 people"
      plan={plan}
      budget={BUDGET}
      frequency={frequency}
      onFrequencyChange={setFrequency}
      note="Uses your whole June allowance"
      editing={editing}
      onEdit={setEditing}
      onSave={() => setEditing(null)}
      onCancel={() => setEditing(null)}
      actions={actions}
      onToggleAction={(id, v) => setActionsOn((s) => ({ ...s, [id]: v }))}
      suggestions={[
        {
          id: 'christmas',
          recommended: true,
          text: 'Last November about 500 € of your Christmas allowance stayed in your account. Use the same amount this year?',
          impact: '182 €/month · ≈ 38 € left each month · nothing else changes',
          question: 'Move 500 € to Japan when your Christmas allowance arrives?',
        },
        {
          id: 'eatingOut',
          text: 'Eating out went from 80 € to 110 € over 4 months. Back to 80 € frees 30 €/month.',
          impact: '≈ 22 € left each month',
          question: 'Set an 80 €/month eating-out budget with alerts?',
        },
        {
          id: 'netflix',
          text: 'You pay for Netflix and Prime Video. Still using both? Cancelling Netflix frees 8,99 €/month.',
          impact: '≈ 1 € left each month, very tight',
          question: 'Remind you before Netflix renews?',
        },
      ]}
      alternatives={[
        { id: 'date', title: 'Move the date', detail: '180 €/month, reach it on 25 Dec 2027', actionLabel: 'Update goal date' },
        { id: 'back', title: 'Go back to 3.000 €', detail: 'The original plan for September', actionLabel: 'Go back' },
      ]}
    />
  );
}

function ChatSection() {
  const [value, setValue] = useState('');
  const [listening, setListening] = useState(false);
  const voice = () => {
    setListening(true);
    setTimeout(() => {
      setListening(false);
      setValue('Make it 4.000 €');
    }, 1500);
  };
  return (
    <Group title="ChatMessage">
      <ChatMessage type="user">I'm planning a trip to Japan for two in September 2027 and want to start saving for it.</ChatMessage>
      <ChatMessage type="ai">Great plan. Here's what I understood:</ChatMessage>
      <ChatMessage type="working">
        <span>Checking your income and fixed costs…</span>
        <span>Looking for your holiday allowance…</span>
      </ChatMessage>
      <ChatMessage type="changeLog" onUndo={() => {}}>Updated: goal 4.000 € · 182 €/month</ChatMessage>
      <h3 className={styles.subTitle}>Composer</h3>
      <Composer variant="compact" value={value} onChange={setValue} onSend={() => setValue('')} onVoice={voice} listening={listening} />
      <div className={styles.bleed}>
        <Composer value={value} onChange={setValue} onSend={() => setValue('')} onVoice={voice} listening={listening} />
      </div>
    </Group>
  );
}

function NavSection() {
  const [active, setActive] = useState<NavItem>('home');
  return (
    <Group title="TopBar · BottomNav">
      <div className={styles.bleed}>
        <TopBar title="Assistant" icon={Sparkles} />
        <TopBar title="Japan 2027" onBack={() => {}} />
        <BottomNav active={active} onNavigate={setActive} />
      </div>
    </Group>
  );
}

function SheetSection() {
  const initial = /sheet=(info|review|validating|success)/.exec(window.location.hash)?.[1];
  const [open, setOpen] = useState<null | 'info' | 'review'>(initial === 'info' ? 'info' : initial ? 'review' : null);
  const [state, setState] = useState<'review' | 'validating' | 'success'>(
    initial === 'validating' || initial === 'success' ? initial : 'review',
  );
  const [toggles, setToggles] = useState([true, true, true, true]);
  const rows = [
    ['Create goal "Japan 2027"', '4.000 € by 25 Sep 2027'],
    ['Monthly transfer 182 €', 'From your current account · every 25th from 25 Nov 2026 · 11 transfers · pause or cancel anytime'],
    ['Nov 2026: move 500 €', "From your Christmas allowance · I'll ask you to confirm first"],
    ['Jun 2027: move 1.500 €', "From your holiday allowance · I'll ask you to confirm first"],
  ];
  const count = toggles.filter(Boolean).length;
  const approve = () => {
    setState('validating');
    setTimeout(() => setState('success'), 1500);
  };
  const close = () => {
    setOpen(null);
    setState('review');
  };
  return (
    <Group title="BottomSheet">
      <Row>
        <Button level="secondary" onClick={() => setOpen('info')}>Info sheet</Button>
        <Button level="secondary" onClick={() => setOpen('review')}>Review sheet</Button>
      </Row>
      {open === 'info' && (
        <BottomSheet title="Why these numbers?" onClose={close} footer={<Button level="secondary" fullWidth onClick={close}>Got it</Button>}>
          <AffordabilityBar {...BUDGET} />
          <p className={styles.caption}>Based only on your current account here. I don't see other banks.</p>
        </BottomSheet>
      )}
      {open === 'review' && (
        <BottomSheet
          type="action"
          state={state}
          title={`Review ${count} actions`}
          onClose={close}
          footer={
            state === 'success' ? (
              <>
                <Button fullWidth onClick={close}>View goal</Button>
                <Button level="ghost" fullWidth onClick={close}>Back to chat</Button>
              </>
            ) : (
              <>
                <Button fullWidth disabled={count === 0 || state === 'validating'} onClick={approve}>
                  {state === 'validating' ? 'Validating…' : `Approve ${count} actions`}
                </Button>
                {state === 'review' && <Button level="ghost" fullWidth onClick={close}>Cancel</Button>}
              </>
            )
          }
        >
          {state === 'success' ? (
            <div className={styles.success}>
              <Plane size={32} strokeWidth={1.5} aria-hidden className={styles.brandIcon} />
              <p className={styles.successTitle}>Done. Japan 2027 is set up.</p>
              <p className={styles.caption}>First transfer on 25 Nov.</p>
            </div>
          ) : (
            <>
              <ol className={styles.list}>
                {rows.map(([title, detail], i) => (
                  <ReviewActionRow
                    key={title}
                    number={i + 1}
                    title={title}
                    detail={detail}
                    enabled={toggles[i]}
                    disabled={state === 'validating'}
                    onToggle={(v) => setToggles((t) => t.map((x, j) => (j === i ? v : x)))}
                  />
                ))}
              </ol>
              <p className={styles.caption}>Nothing moves from either allowance without your confirmation.</p>
            </>
          )}
        </BottomSheet>
      )}
    </Group>
  );
}
