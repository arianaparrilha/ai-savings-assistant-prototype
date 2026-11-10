import type { ReactNode } from 'react';
import { Loader, Sparkles } from 'lucide-react';
import { cx } from '../../lib/cx';
import { Link } from '../Link/Link';
import styles from './ChatMessage.module.css';

export interface ChatMessageProps {
  type: 'user' | 'ai' | 'working' | 'changeLog';
  /** For 'working', pass one node per step ("Checking your income…"). */
  children: ReactNode;
  /** changeLog only: undo the change. */
  onUndo?: () => void;
  className?: string;
}

export function ChatMessage({ type, children, onUndo, className }: ChatMessageProps) {
  switch (type) {
    case 'user':
      return (
        <div className={cx(styles.user, className)}>
          <p className={styles.bubble}>{children}</p>
        </div>
      );
    case 'ai':
      return (
        <div className={cx(styles.ai, className)}>
          <Sparkles className={styles.aiIcon} size={20} strokeWidth={1.5} aria-label="Assistant" />
          <div className={styles.aiText}>{children}</div>
        </div>
      );
    case 'working':
      return (
        <div className={cx(styles.working, className)} role="status">
          <Loader className={styles.spinner} size={20} strokeWidth={1.5} aria-hidden />
          <div className={styles.steps}>{children}</div>
        </div>
      );
    case 'changeLog':
      return (
        <div className={cx(styles.changeLog, className)}>
          <span>{children}</span>
          {onUndo && <Link onClick={onUndo}>Undo</Link>}
        </div>
      );
  }
}
