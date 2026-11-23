import { useEffect, useState } from 'react';
import { DeviceFrame, type NavItem } from './components';
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

const SCREENS: Screen[] = ['home', 'payments', 'assistant', 'goals', 'cards'];

const viewFromHash = (): View => (window.location.hash.startsWith('#components') ? 'components' : 'prototype');
const screenFromHash = (): Screen => SCREENS.find((s) => `#${s}` === window.location.hash) ?? 'home';

export default function App() {
  const [view, setView] = useState<View>(viewFromHash);
  const [screen, setScreen] = useState<Screen>(screenFromHash);
  const [backTo, setBackTo] = useState<Screen>('home');
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

  const go = (next: Screen) => {
    if (next === 'assistant' && screen !== 'assistant') setBackTo(screen);
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
    go('home');
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
      <DeviceFrame>{view === 'components' ? <ComponentGallery /> : prototype()}</DeviceFrame>
    </div>
  );
}
