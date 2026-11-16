import { TrendingDown, TrendingUp } from 'lucide-react';
import styles from './StatCard.module.scss';

// tone: blue | purple | green | amber | red | cyan
const StatCard = ({ label, value, icon: Icon, tone = 'blue', hint, trend, onClick }) => (
  <div className={`${styles.card} ${onClick ? styles.clickable : ''}`} onClick={onClick} role={onClick ? 'button' : undefined}>
    <div className="d-flex justify-content-between align-items-start">
      <div className={styles.label}>{label}</div>
      {Icon && (
        <span className={`${styles.icon} ${styles[tone]}`}>
          <Icon size={18} />
        </span>
      )}
    </div>
    <div className={styles.value}>{value}</div>
    <div className={styles.hint}>
      {trend !== undefined && trend !== null && (
        <span className={trend >= 0 ? styles.up : styles.down}>
          {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(trend)}%
        </span>
      )}
      {hint}
    </div>
  </div>
);

export default StatCard;
