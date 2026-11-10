import { CreditCard, Goal, House, Sparkles, Wallet, type LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';
import styles from './BottomNav.module.css';

export type NavItem = 'home' | 'payments' | 'assistant' | 'goals' | 'cards';

const ITEMS: Array<{ id: NavItem; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'assistant', label: 'Assistant', icon: Sparkles },
  { id: 'goals', label: 'Goals', icon: Goal },
  { id: 'cards', label: 'Cards', icon: CreditCard },
];

export interface BottomNavProps {
  active: NavItem;
  onNavigate?: (item: NavItem) => void;
  className?: string;
}

export function BottomNav({ active, onNavigate, className }: BottomNavProps) {
  return (
    <nav className={cx(styles.nav, className)} aria-label="Main">
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={styles.item}
          aria-current={id === active ? 'page' : undefined}
          onClick={() => onNavigate?.(id)}
        >
          <span className={styles.indicator}>
            <Icon size={24} strokeWidth={1.5} aria-hidden />
          </span>
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
