import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import { ChevronDown, LogOut, Menu, MapPin, UserRound } from 'lucide-react';
import { Avatar, Dropdown } from '@components';
import { campusSelected, sidebarToggled } from '@store/uiSlice';
import { logout } from '@store/authSlice';
import { fullName } from '@helpers/format';
import { ROLE_LABELS } from '@data/roles';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import styles from './AppLayout.module.scss';

const Topbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const campuses = useSelector((s) => s.refs.campuses);
  const campus = useSelector((s) => s.ui.campus);
  const allowed = user?.campusIds?.length ? campuses.filter((c) => user.campusIds.some((u) => (u._id ?? u) === c._id)) : campuses;

  return (
    <header className={`${styles.topbar} no-print`}>
      <button type="button" className={`${styles.iconBtn} d-lg-none`} onClick={() => dispatch(sidebarToggled())} aria-label="Menu">
        <Menu size={20} />
      </button>
      <GlobalSearch />
      <div className="d-flex align-items-center gap-2 ms-auto">
        <div className={styles.campusSelect}>
          <MapPin size={16} />
          <select value={campus} onChange={(e) => dispatch(campusSelected(e.target.value))} aria-label="Campus">
            <option value="">{allowed.length === campuses.length ? 'All campuses' : 'My campuses'}</option>
            {allowed.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <NotificationBell />
        <Dropdown
          width={230}
          items={[
            { label: 'My account', icon: UserRound, onClick: () => navigate('/account') },
            { label: 'Log out', icon: LogOut, danger: true, onClick: () => { dispatch(logout()); navigate('/login'); } },
          ]}
          trigger={
            <button type="button" className={styles.userBtn}>
              <Avatar person={user} size={36} color="#064CA5" />
              <div className="text-start d-none d-md-block">
                <div className="fw-700 fs-13 lh-sm">{fullName(user)}</div>
                <div className="fs-12 fg-subtle lh-sm">{user?.roles?.map((r) => ROLE_LABELS[r]).join(', ')}</div>
              </div>
              <ChevronDown size={16} className="fg-subtle" />
            </button>
          }
        />
      </div>
    </header>
  );
};

export default Topbar;
