import { useEffect, useRef, useState } from 'react';
import { DeviceFrame, type NavItem } from './components';
import { cx } from './lib/cx';
import { scriptedEngine } from './lib/assistant';
import { useConversation } from './lib/useConversation';
import { Assistant } from './screens/Assistant/Assistant';
import { ComponentGallery } from './screens/ComponentGallery/ComponentGallery';
import { Goal } from './screens/Goal/Goal';
import { Home } from './screens/Home/Home';
import { Placeholder } from './screens/Placeholder/Placeholder';
import styles from './App.module.css';

type View = 'prototype' | 'components';
type Screen = NavItem;
/** push: into the conversation · pop: back out of it · tab: between bottom-nav tabs. */
type Motion = 'none' | 'push' | 'pop' | 'tab';

const SCREENS: Screen[] = ['home', 'payments', 'assistant', 'goals', 'cards'];

const viewFromHash = (): View => (window.location.hash.startsWith('#components') ? 'components' : 'prototype');
const screenFromHash = (): Screen => SCREENS.find((s) => `#${s}` === window.location.hash) ?? 'home';

export default function App() {
  const [view, setView] = useState<View>(viewFromHash);
  const [screen, setScreen] = useState<Screen>(screenFromHash);
  const [backTo, setBackTo] = useState<Screen>('home');
  const [motion, setMotion] = useState<Motion>('none');
  const viewRef = useRef<HTMLDivElement>(null);
  // The AI engine is chosen here only; screens never know which one runs.
  const convo = useConversation(scriptedEngine);

  useEffect(() => {
    const onHash = () => {
      setView(viewFromHash());
      if (!window.location.hash.startsWith('#components')) setScreen(screenFromHash());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Move focus to the new screen so keyboard and screen-reader users land in it (not on first load).
  useEffect(() => {
    if (motion !== 'none') viewRef.current?.focus({ preventScroll: true });
  }, [screen, motion]);

  const go = (next: Screen) => {
    if (next === screen) return;
    if (next === 'assistant') setBackTo(screen);
    setMotion(next === 'assistant' ? 'push' : screen === 'assistant' ? 'pop' : 'tab');
    setScreen(next);
    window.history.replaceState(null, '', next === 'home' ? window.location.pathname : `#${next}`);
  };

  const ask = (text?: string) => {
    go('assistant');
    if (text) void convo.send(text);
  };

  const restart = () => {
    convo.reset();
    setBackTo('home');
    setMotion('none');
    setScreen('home');
    window.history.replaceState(null, '', window.location.pathname);
    setView('prototype');
  };

  const prototype = () => {
    switch (screen) {
      case 'assistant':
        return <Assistant convo={convo} onBack={() => go(backTo)} onViewGoal={() => go('goals')} />;
      case 'goals':
        return (
          <Goal
            convo={convo}
            onNavigate={go}
            onOpenAssistant={() => go('assistant')}
            onEditPlan={() => {
              convo.dispatch({ type: 'editPlan' });
              go('assistant');
            }}
          />
        );
      case 'payments':
      case 'cards':
        return <Placeholder tab={screen} onNavigate={go} />;
      default:
        return <Home convo={convo} onAsk={ask} onNavigate={go} />;
    }
  };

  return (
    <div className={styles.stage}>
      {/* Desktop/tablet only: switch between the prototype and the component gallery. */}
      <nav className={styles.switcher} aria-label="View">
        <a href={screen === 'home' ? '#' : `#${screen}`} aria-current={view === 'prototype' ? 'page' : undefined}>Prototype</a>
        <a href="#components" aria-current={view === 'components' ? 'page' : undefined}>Components</a>
        <button type="button" className={styles.restart} onClick={restart}>Restart demo</button>
      </nav>
      <DeviceFrame>
        {view === 'components' ? (
          <ComponentGallery />
        ) : (
          <div key={screen} ref={viewRef} tabIndex={-1} className={cx(styles.view, motion !== 'none' && styles[motion])}>
            {prototype()}
          </div>
        )}
      </DeviceFrame>
    </div>
  );
}
