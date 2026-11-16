import { NavLink } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { hasRole } from '@helpers/auth';
import { sidebarToggled } from '@store/uiSlice';
import { NAV } from './nav';
import styles from './AppLayout.module.scss';

const Sidebar = () => {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const unread = useSelector((s) => s.notifications.unread);
  const open = useSelector((s) => s.ui.sidebarOpen);
  const schoolName = useSelector((s) => s.refs.settings?.schoolName ?? 'ELTC School');

  return (
    <>
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''} no-print`}>
        <div className={styles.brand}>
          <span className={styles.logo}>E</span>
          <div>
            <div className={styles.brandName}>{schoolName}</div>
            <div className={styles.brandSub}>Back office</div>
          </div>
        </div>
        <nav className={styles.nav}>
          {NAV.filter((item) => hasRole(user, item.roles)).map((item) =>
            item.section ? (
              <div key={item.section} className={styles.section}>
                {item.section}
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                onClick={() => dispatch(sidebarToggled(false))}
              >
                <item.icon size={18} strokeWidth={2} />
                <span className="flex-grow-1">{item.label}</span>
                {item.badge === 'notifications' && unread > 0 && <span className={styles.navBadge}>{unread > 99 ? '99+' : unread}</span>}
              </NavLink>
            ),
          )}
        </nav>
        <div className={styles.sideFooter}>
          <div className={styles.promo}>
            <div className="fw-700">Paper lists?</div>
            <div className="fs-12 mt-1" style={{ opacity: 0.85 }}>
              Type a teacher's attendance sheet in under a minute.
            </div>
            <NavLink to="/attendance" className={styles.promoBtn}>
              Take attendance
            </NavLink>
          </div>
        </div>
      </aside>
      {open && <div className={styles.overlay} onClick={() => dispatch(sidebarToggled(false))} />}
    </>
  );
};

export default Sidebar;
