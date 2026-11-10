import { useEffect, useState } from 'react';
import { DeviceFrame } from './components';
import { formatCurrency } from './lib/format';
import { ComponentGallery } from './screens/ComponentGallery/ComponentGallery';
import styles from './App.module.css';

type View = 'prototype' | 'components';

const viewFromHash = (): View => (window.location.hash.startsWith('#components') ? 'components' : 'prototype');

export default function App() {
  const [view, setView] = useState<View>(viewFromHash);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className={styles.stage}>
      {/* Desktop/tablet only: switch between the prototype and the component gallery. */}
      <nav className={styles.switcher} aria-label="View">
        <a href="#" aria-current={view === 'prototype' ? 'page' : undefined}>Prototype</a>
        <a href="#components" aria-current={view === 'components' ? 'page' : undefined}>Components</a>
      </nav>
      <DeviceFrame>
        {view === 'components' ? (
          <ComponentGallery />
        ) : (
          // Screens (Home, Assistant, Goal) come next.
          <div className={styles.placeholder}>
            <h1 className={styles.title}>Good morning, Inês</h1>
            <p className={styles.caption}>Current balance</p>
            <p className={styles.balance}>{formatCurrency(1240.18)}</p>
          </div>
        )}
      </DeviceFrame>
    </div>
  );
}
