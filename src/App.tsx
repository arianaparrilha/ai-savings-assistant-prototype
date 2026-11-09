import styles from './App.module.css';
import { formatCurrency } from './lib/format';

export default function App() {
  return (
    <div className={styles.stage}>
      <main className={styles.phone}>
        {/* Screens (Home, Assistant, Goal) go here. */}
        <div className={styles.placeholder}>
          <h1 className={styles.title}>Good morning, Inês</h1>
          <p className={styles.caption}>Current balance</p>
          <p className={styles.balance}>{formatCurrency(1240.18)}</p>
        </div>
      </main>
    </div>
  );
}
