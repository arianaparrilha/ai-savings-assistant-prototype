import type { ReactNode } from 'react';
import { BatteryFull, Signal, Wifi } from 'lucide-react';
import styles from './DeviceFrame.module.css';

/**
 * Desktop / tablet: a static Android mockup (bezel, status bar, gesture bar).
 * Phones: the chrome disappears and the app fills the real screen.
 * Not a Figma component: prototype presentation only.
 */
export function DeviceFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.device}>
      <div className={styles.screen}>
        <div className={styles.statusBar} aria-hidden>
          <span>9:41</span>
          <span className={styles.statusIcons}>
            <Signal size={16} strokeWidth={2} />
            <Wifi size={16} strokeWidth={2} />
            <BatteryFull size={16} strokeWidth={2} />
          </span>
        </div>
        <div className={styles.app} id="app-viewport">
          {children}
        </div>
        <div className={styles.gestureBar} aria-hidden>
          <span />
        </div>
      </div>
    </div>
  );
}
