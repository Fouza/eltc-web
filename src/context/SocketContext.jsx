import { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { notificationReceived, fetchNotifications } from '@store/notificationsSlice';
import { toast } from '@helpers/toast';
import { NOTIFICATION_NEW } from './socketEvents';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

const POLL_MS = 2 * 60 * 1000; // the scheduler process can't push, so we also poll

// Connects once per login with the JWT in the handshake; maps server events to Redux actions.
export const SocketProvider = ({ children }) => {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  const user = useSelector((s) => s.auth.user);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token || !user) return undefined;
    const s = io(import.meta.env.VITE_SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    const campuses = user.campusIds?.map((c) => c._id ?? c) ?? [];
    s.on(NOTIFICATION_NEW, (n) => {
      if (campuses.length && n.campus && !campuses.includes(n.campus)) return;
      dispatch(notificationReceived(n));
      toast[n.severity === 'danger' ? 'warning' : 'info'](n.title, n.message);
    });
    setSocket(s);

    dispatch(fetchNotifications());
    const poll = setInterval(() => dispatch(fetchNotifications()), POLL_MS);
    const onFocus = () => dispatch(fetchNotifications());
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      s.disconnect();
      setSocket(null);
    };
  }, [token, user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
