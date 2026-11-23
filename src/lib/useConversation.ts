import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssistantEngine } from './assistant';
import { initialState, step, type ConversationEvent, type ConversationState } from './conversation';

/** Pause before the assistant answers, so replies don't appear in the same frame as the question. */
const REPLY_DELAY = 450;

export interface Conversation {
  state: ConversationState;
  dispatch: (event: ConversationEvent) => void;
  /** User message (typed, chip or voice) → engine → intent. */
  send: (text: string) => Promise<void>;
  reset: () => void;
  /** True between a user message and the assistant's reply. */
  thinking: boolean;
}

export function useConversation(engine: AssistantEngine): Conversation {
  const [state, setState] = useState(initialState);
  const [thinking, setThinking] = useState(false);
  const ref = useRef(state);
  const timers = useRef<number[]>([]);
  const generation = useRef(0);

  const dispatch = useCallback((event: ConversationEvent) => {
    const result = step(ref.current, event);
    ref.current = result.state;
    setState(result.state);
    const gen = generation.current;
    for (const { delay, event: next } of result.later ?? []) {
      timers.current.push(
        window.setTimeout(() => {
          if (generation.current === gen) dispatch(next);
        }, delay),
      );
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const gen = generation.current;
      dispatch({ type: 'say', text: trimmed });
      setThinking(true);
      const s = ref.current;
      const [intent] = await Promise.all([
        engine.interpret(trimmed, { stage: s.stage, target: s.plan?.input.target ?? s.trip.target }),
        new Promise((r) => setTimeout(r, REPLY_DELAY)),
      ]);
      if (generation.current !== gen) return;
      setThinking(false);
      dispatch({ type: 'intent', intent });
    },
    [dispatch, engine],
  );

  const reset = useCallback(() => {
    generation.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    ref.current = initialState;
    setState(initialState);
    setThinking(false);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return { state, dispatch, send, reset, thinking };
}
