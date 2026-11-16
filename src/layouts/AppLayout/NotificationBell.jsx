import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { Bell, CheckCheck } from 'lucide-react';
import { Dropdown } from '@components';
import { markAllRead, markRead } from '@store/notificationsSlice';
import NotificationItem from '@pages/Notifications/NotificationItem';
import styles from './AppLayout.module.scss';

const NotificationBell = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, unread } = useSelector((s) => s.notifications);

  return (
    <Dropdown
      width={400}
      trigger={
        <button type="button" className={styles.iconBtn} aria-label="Notifications">
          <Bell size={19} />
          {unread > 0 && <span className={styles.bellDot}>{unread > 9 ? '9+' : unread}</span>}
        </button>
      }
    >
      {(close) => (
        <div>
          <div className="d-flex justify-content-between align-items-center px-2 pt-1 pb-2">
            <div className="fw-700">Notifications</div>
            {unread > 0 && (
              <button type="button" className="btn btn-link btn-sm p-0 fs-12 fw-600" onClick={() => dispatch(markAllRead())}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {items.slice(0, 8).map((n) => (
              <NotificationItem
                key={n._id}
                notification={n}
                compact
                onClick={() => {
                  dispatch(markRead(n._id));
                  close();
                  if (n.link) navigate(n.link);
                }}
              />
            ))}
            {!items.length && <div className="p-4 text-center fg-muted fs-13">You're all caught up 🎉</div>}
          </div>
          <button type="button" className={styles.seeAll} onClick={() => { close(); navigate('/notifications'); }}>
            See all notifications
          </button>
        </div>
      )}
    </Dropdown>
  );
};

export default NotificationBell;
