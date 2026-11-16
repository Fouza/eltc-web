import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { BellOff, CheckCheck } from 'lucide-react';
import { Button, Card, EmptyState, Loader, PageHeader, Tabs } from '@components';
import { fetchNotifications, markAllRead, markRead } from '@store/notificationsSlice';
import { NOTIFICATION_TYPES } from '@data/enums';
import NotificationItem from './NotificationItem';

const Notifications = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, unread, loading } = useSelector((s) => s.notifications);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    dispatch(fetchNotifications({ limit: 200 }));
  }, [dispatch]);

  const types = useMemo(() => [...new Set(items.map((n) => n.type))], [items]);
  const shown = items.filter((n) => (tab === 'all' ? true : tab === 'unread' ? !n.read : n.type === tab));

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Alerts raised every morning (overdue payments, absences, missing results) and live events."
        actions={unread > 0 && <Button variant="secondary" icon={CheckCheck} onClick={() => dispatch(markAllRead())}>Mark all as read</Button>}
      />
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'all', label: 'All', count: items.length },
          { key: 'unread', label: 'Unread', count: unread },
          ...types.map((t) => ({ key: t, label: NOTIFICATION_TYPES[t] ?? t, count: items.filter((n) => n.type === t).length })),
        ]}
      />
      <Card padded={false}>
        {loading && !items.length ? (
          <Loader />
        ) : shown.length ? (
          <div className="p-2">
            {shown.map((n) => (
              <NotificationItem
                key={n._id}
                notification={n}
                onClick={() => {
                  dispatch(markRead(n._id));
                  if (n.link) navigate(n.link);
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={BellOff} title="No notifications" message="Nothing needs your attention here." />
        )}
      </Card>
    </>
  );
};

export default Notifications;
