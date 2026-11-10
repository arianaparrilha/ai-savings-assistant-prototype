import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Button } from '../Button/Button';
import { Tag } from '../Tag/Tag';
import styles from './SuggestionRow.module.css';

export interface SuggestionRowProps {
  recommended?: boolean;
  /** The fact ("Eating out went from 80 € to 110 €…"). */
  text: ReactNode;
  /** The effect on the plan ("≈ 22 € left each month"). */
  impact: ReactNode;
  /** What the AI offers to do, as a question. */
  question: ReactNode;
  onApply: () => void;
  onDismiss: () => void;
  className?: string;
}

export function SuggestionRow({ recommended, text, impact, question, onApply, onDismiss, className }: SuggestionRowProps) {
  return (
    <article className={cx(styles.card, className)}>
      {recommended && <Tag tone="ai" block>Recommended</Tag>}
      <p className={styles.text}>{text}</p>
      <p className={styles.impact}>{impact}</p>
      <p className={styles.question}>{question}</p>
      <div className={styles.buttons}>
        <Button level="ghost" onClick={onDismiss}>Not now</Button>
        <Button level="secondary" onClick={onApply}>Apply</Button>
      </div>
    </article>
  );
}
