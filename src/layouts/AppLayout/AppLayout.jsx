import { Suspense, useEffect } from 'react';
import { Outlet } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRefs } from '@store/refsSlice';
import { Loader } from '@components';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import styles from './AppLayout.module.scss';

// Logged-in shell (Rangewell "Templates/Admin").
const AppLayout = () => {
  const dispatch = useDispatch();
  const loaded = useSelector((s) => s.refs.loaded);
  useEffect(() => {
    dispatch(fetchRefs());
  }, [dispatch]);

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Topbar />
        <main className={styles.content}>
          {loaded ? (
            <Suspense fallback={<Loader full />}>
              <Outlet />
            </Suspense>
          ) : (
            <Loader full label="Loading the school…" />
          )}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
