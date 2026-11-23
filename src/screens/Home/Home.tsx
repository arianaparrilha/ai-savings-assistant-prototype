import { useState } from 'react';
import { CircleUserRound, Music, Plane, ShoppingBasket, Utensils } from 'lucide-react';
import { ActionChip, BottomNav, Card, Composer, ListRow, ProgressBar, Tag, type NavItem } from '../../components';
import { planOf, START_CHIPS, summaryOf, titleOf, voiceLine } from '../../lib/conversation';
import { currencyLabel, formatCurrency, formatDate } from '../../lib/format';
import { FREE_MARGIN } from '../../lib/plan';
import { PROFILE, TRANSACTIONS, type Transaction } from '../../lib/profile';
import type { Conversation } from '../../lib/useConversation';
import styles from './Home.module.css';

const ICONS: Record<Transaction['icon'], typeof ShoppingBasket> = { groceries: ShoppingBasket, food: Utensils, music: Music };

export interface HomeProps {
  convo: Conversation;
  /** Open the assistant, optionally sending a first message. */
  onAsk: (text?: string) => void;
  onNavigate: (item: NavItem) => void;
}

export function Home({ convo, onAsk, onNavigate }: HomeProps) {
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const state = convo.state;
  const plan = planOf(state);

  const voice = () => {
    if (listening) return;
    setListening(true);
    const line = voiceLine(state);
    window.setTimeout(() => {
      setListening(false);
      setDraft(line);
    }, 1500);
  };

  return (
    <div className={styles.screen}>
      <div className={styles.scroll}>
        <header className={styles.hero}>
          <p className={styles.greeting}>
            <CircleUserRound size={32} strokeWidth={1.5} aria-hidden />
            Good morning, {PROFILE.name}
          </p>
          <h1 className={styles.balanceLabel}>Current balance</h1>
          <p className={styles.balance} aria-label={currencyLabel(PROFILE.balance)}>{formatCurrency(PROFILE.balance, { decimals: 2 })}</p>
        </header>

        <div className={styles.cards}>
          <Card title="How can I help you today?">
            <Composer
              variant="compact"
              value={draft}
              onChange={setDraft}
              onSend={(text) => {
                setDraft('');
                onAsk(text);
              }}
              onVoice={voice}
              listening={listening}
              placeholder={listening ? 'Listening…' : 'Ask anything...'}
            />
            <div className={styles.chips}>
              {START_CHIPS.map((c) => (
                <ActionChip key={c} tone="ai" onClick={() => onAsk(c)}>{c}</ActionChip>
              ))}
            </div>
            <hr className={styles.divider} />
            <Tag tone="ai" icon={null} action={{ label: 'Go now', onClick: () => onAsk('Save for a trip') }}>
              Most months you have about {formatCurrency(FREE_MARGIN)} left over. Want to put it towards something?
            </Tag>
          </Card>

          <Card title="Latest transactions" action={{ label: 'See all', onClick: () => onNavigate('payments') }}>
            <h3 className={styles.date}>{formatDate(TRANSACTIONS.date)}</h3>
            <div>
              {TRANSACTIONS.items.map((t) => (
                <ListRow key={t.id} type="transaction" context="card" leading={ICONS[t.icon]} title={t.title} amount={t.amount} />
              ))}
            </div>
          </Card>

          <Card title="Goals" action={{ label: 'See all', onClick: () => onNavigate('goals') }}>
            {plan && state.approvedActions ? (
              <div className={styles.goal}>
                <ListRow context="card" leading={Plane} title={titleOf(state)} subtitle={summaryOf(plan)} onClick={() => onNavigate('goals')} />
                <p className={styles.saved}>
                  {formatCurrency(0)} of {formatCurrency(plan.goal)}
                </p>
                <ProgressBar value={0} ariaLabel={`Saved ${currencyLabel(0)} of ${currencyLabel(plan.goal)}`} />
              </div>
            ) : (
              <p className={styles.empty}>No goals yet. Ask the assistant to plan one with you.</p>
            )}
          </Card>
        </div>
      </div>
      <BottomNav active="home" onNavigate={onNavigate} />
    </div>
  );
}
