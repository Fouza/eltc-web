import styles from './Tabs.module.scss';

// tabs: [{ key, label, count, icon }]
const Tabs = ({ tabs, active, onChange, className = '' }) => (
  <div className={`${styles.tabs} ${className}`} role="tablist">
    {tabs.map(({ key, label, count, icon: Icon }) => (
      <button key={key} type="button" role="tab" aria-selected={active === key} className={`${styles.tab} ${active === key ? styles.active : ''}`} onClick={() => onChange(key)}>
        {Icon && <Icon size={15} />}
        {label}
        {count !== undefined && count !== null && <span className={styles.count}>{count}</span>}
      </button>
    ))}
  </div>
);

export default Tabs;
