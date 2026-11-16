import { Inbox } from 'lucide-react';
import styles from './EmptyState.module.scss';

const EmptyState = ({ icon: Icon = Inbox, title = 'Nothing here yet', message, action, compact }) => (
  <div className={`${styles.empty} ${compact ? styles.compact : ''}`}>
    <span className={styles.icon}>
      <Icon size={compact ? 20 : 24} />
    </span>
    <div className={styles.title}>{title}</div>
    {message && <div className={styles.message}>{message}</div>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);

export default EmptyState;
