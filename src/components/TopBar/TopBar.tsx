import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { cx } from '../../lib/cx';
import { IconButton } from '../IconButton/IconButton';
import styles from './TopBar.module.css';

export interface TopBarProps {
  title: string;
  onBack?: () => void;
  /** Leading icon when there's no back button (sparkle on Assistant). */
  icon?: LucideIcon;
  className?: string;
}

export function TopBar({ title, onBack, icon: Icon, className }: TopBarProps) {
  return (
    <header className={cx(styles.bar, className)}>
      {onBack ? (
        <IconButton icon={ArrowLeft} label="Back" level="ghost" onClick={onBack} className={styles.back} />
      ) : (
        Icon && <Icon size={24} strokeWidth={1.5} aria-hidden />
      )}
      <h1 className={styles.title}>{title}</h1>
    </header>
  );
}
