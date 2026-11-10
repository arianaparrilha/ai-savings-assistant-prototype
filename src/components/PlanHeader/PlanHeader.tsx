import type { LucideIcon } from 'lucide-react';
import { cx } from '../../lib/cx';
import { Tag, type TagTone } from '../Tag/Tag';
import styles from './PlanHeader.module.css';

export interface PlanHeaderProps {
  title: string;
  /** "150 €/month · 25 Sep 2027" */
  summary: string;
  status: { tone: TagTone; label: string; icon?: LucideIcon };
  /** Scroll back to the full plan card. */
  onClick?: () => void;
  className?: string;
}

/** Compact sticky version of PlanCard, shown below the TopBar once the card scrolls away. */
export function PlanHeader({ title, summary, status, onClick, className }: PlanHeaderProps) {
  return (
    <button type="button" className={cx(styles.header, className)} onClick={onClick} aria-label={`${title}, ${summary}, ${status.label}. Show plan`}>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.summary}>{summary}</span>
      </span>
      <Tag tone={status.tone} icon={status.icon}>{status.label}</Tag>
    </button>
  );
}
