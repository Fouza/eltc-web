import styles from './ProgressBar.module.scss';

const ProgressBar = ({ value = 0, max = 100, tone, height = 6 }) => {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  const auto = pct >= 100 ? 'red' : pct >= 85 ? 'amber' : 'blue';
  return (
    <div className={styles.track} style={{ height }}>
      <div className={`${styles.bar} ${styles[tone ?? auto]}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

export default ProgressBar;
