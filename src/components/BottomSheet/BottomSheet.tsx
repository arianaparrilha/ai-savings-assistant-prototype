import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import styles from './BottomSheet.module.css';

export interface BottomSheetProps {
  /** 'info' closes on scrim tap / Escape; 'action' only through its own buttons. */
  type?: 'info' | 'action';
  state?: 'default' | 'review' | 'validating' | 'success';
  title: string;
  onClose?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

/** Modal sheet. Render it inside the screen container (it fills the nearest positioned ancestor). */
export function BottomSheet({ type = 'info', state = 'default', title, onClose, footer, children }: BottomSheetProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const dismissible = type === 'info';

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.scrim} onClick={dismissible ? onClose : undefined} aria-hidden />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={state === 'validating'}
        tabIndex={-1}
        className={cx(styles.sheet, styles[state])}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && dismissible) onClose?.();
          if (e.key === 'Tab') trapFocus(e, sheetRef.current);
        }}
      >
        <span className={styles.handle} aria-hidden />
        <h2 id={titleId} className={styles.title}>{title}</h2>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}

function trapFocus(e: KeyboardEvent, root: HTMLElement | null) {
  if (!root) return;
  const focusable = root.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
