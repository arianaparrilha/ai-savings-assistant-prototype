import type { ReactNode } from 'react';
import { CircleCheck, Info, Sparkles, TriangleAlert, type LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';
import styles from './Tag.module.css';

export type TagTone = 'neutral' | 'info' | 'ai' | 'success' | 'warning' | 'danger';

/** Sparkle is reserved for AI; status tones get an icon that matches their meaning. */
const DEFAULT_ICON: Record<TagTone, LucideIcon | null> = {
  neutral: null,
  info: Info,
  ai: Sparkles,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: TriangleAlert,
};

export interface TagProps {
  tone?: TagTone;
  /** Override the tone's default icon; null hides it. */
  icon?: LucideIcon | null;
  /** Optional trailing link ("Go now"). Turns the tag into a full-width banner. */
  action?: { label: string; onClick: () => void };
  /** Stretch to the container width (e.g. "Recommended" in SuggestionRow). */
  block?: boolean;
  className?: string;
  children: ReactNode;
}

export function Tag({ tone = 'neutral', icon, action, block, className, children }: TagProps) {
  const Icon = icon === undefined ? DEFAULT_ICON[tone] : icon;
  return (
    <div className={cx(styles.tag, styles[tone], (action || block) && styles.block, className)}>
      {Icon && <Icon className={styles.icon} size={20} strokeWidth={1.5} aria-hidden />}
      <span className={styles.text}>{children}</span>
      {action && (
        <button type="button" className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
