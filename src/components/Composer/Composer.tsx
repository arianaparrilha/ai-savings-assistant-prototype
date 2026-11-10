import { useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Mic, SendHorizontal } from 'lucide-react';
import { cx } from '../../lib/cx';
import { IconButton } from '../IconButton/IconButton';
import styles from './Composer.module.css';

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  /** Simulated voice input. */
  onVoice?: () => void;
  /** True while simulated voice is "listening". */
  listening?: boolean;
  placeholder?: string;
  /** 'chat' = fixed bottom bar of the conversation; 'compact' = single line inside a card (Home). */
  variant?: 'chat' | 'compact';
  disabled?: boolean;
  className?: string;
}

export function Composer({
  value,
  onChange,
  onSend,
  onVoice,
  listening,
  placeholder = 'Ask anything...',
  variant = 'chat',
  disabled,
  className,
}: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const hasText = value.trim().length > 0;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!hasText || disabled) return;
    onSend(value.trim());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) submit(e);
  };

  const mic = (
    <IconButton
      icon={Mic}
      label={listening ? 'Listening' : 'Speak'}
      aria-pressed={listening}
      className={cx(listening && styles.listening)}
      disabled={disabled}
      onClick={onVoice}
    />
  );
  const send = <IconButton icon={SendHorizontal} label="Send" type="submit" disabled={!hasText || disabled} />;

  if (variant === 'compact') {
    // Send replaces the mic once there's text.
    return (
      <form className={cx(styles.compact, className)} onSubmit={submit}>
        <input
          className={styles.input}
          value={value}
          placeholder={listening ? 'Listening…' : placeholder}
          aria-label={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {hasText ? send : mic}
      </form>
    );
  }

  return (
    <form className={cx(styles.chat, className)} onSubmit={submit}>
      <textarea
        ref={ref}
        className={styles.textarea}
        rows={3}
        value={value}
        placeholder={listening ? 'Listening…' : placeholder}
        aria-label={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className={styles.buttons}>
        {send}
        {mic}
      </div>
    </form>
  );
}
