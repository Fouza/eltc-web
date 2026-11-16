import styles from './Loader.module.scss';

const Loader = ({ label, full }) => (
  <div className={`${styles.wrap} ${full ? styles.full : ''}`}>
    <span className={styles.spinner} />
    {label && <span className={styles.label}>{label}</span>}
  </div>
);

export const Skeleton = ({ height = 16, width = '100%', className = '' }) => <span className={`${styles.skeleton} ${className}`} style={{ height, width }} />;

export default Loader;
