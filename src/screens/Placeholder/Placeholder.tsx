import { CreditCard, Wallet } from 'lucide-react';
import { ActionChip, BottomNav, Card, TopBar, type NavItem } from '../../components';
import styles from '../Goal/Goal.module.css';

export interface PlaceholderProps {
  tab: 'payments' | 'cards';
  onNavigate: (item: NavItem) => void;
}

/** Tabs outside the case study. */
export function Placeholder({ tab, onNavigate }: PlaceholderProps) {
  const title = tab === 'payments' ? 'Payments' : 'Cards';
  return (
    <div className={styles.screen}>
      <TopBar title={title} icon={tab === 'payments' ? Wallet : CreditCard} />
      <div className={styles.scroll}>
        <Card>
          <p className={styles.empty}>{title} aren't part of this prototype. It follows one flow: saving for a goal with the assistant.</p>
          <div className={styles.chips}>
            <ActionChip tone="ai" onClick={() => onNavigate('assistant')}>Open the assistant</ActionChip>
          </div>
        </Card>
      </div>
      <BottomNav active={tab} onNavigate={onNavigate} />
    </div>
  );
}
