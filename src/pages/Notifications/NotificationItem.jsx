import { AlertTriangle, CalendarClock, GraduationCap, Info, Users, Wallet, Flag } from 'lucide-react';
import { fromNow } from '@helpers/format';
import styles from './Notifications.module.scss';

const ICONS = {
  payment_overdue: Wallet, payments_due_soon: CalendarClock, low_attendance: AlertTriangle,
  exam_not_graded: GraduationCap, group_almost_full: Users, group_ended: Flag,
};

const NotificationItem = ({ notification: n, onClick, compact }) => {
  const Icon = ICONS[n.type] ?? Info;
  return (
    <button type="button" className={`${styles.item} ${!n.read ? styles.unread : ''} ${compact ? styles.compact : ''}`} onClick={onClick}>
      <span className={`${styles.icon} ${styles[n.severity]}`}>
        <Icon size={compact ? 15 : 17} />
      </span>
      <div className="flex-grow-1 min-w-0 text-start">
        <div className={styles.title}>{n.title}</div>
        {n.message && <div className={styles.message}>{n.message}</div>}
        <div className={styles.time}>{fromNow(n.createdAt)}</div>
      </div>
      {!n.read && <span className={styles.dot} />}
    </button>
  );
};

export default NotificationItem;
