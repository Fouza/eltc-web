import { Outlet } from 'react-router';
import styles from './PublicLayout.module.scss';

const PublicLayout = () => (
  <div className={styles.page}>
    <Outlet />
  </div>
);

export default PublicLayout;
