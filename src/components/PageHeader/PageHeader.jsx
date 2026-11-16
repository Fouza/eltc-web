import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import styles from './PageHeader.module.scss';

// breadcrumb: [{ label, to }]
const PageHeader = ({ title, subtitle, actions, breadcrumb, children }) => (
  <div className={styles.header}>
    <div className="min-w-0">
      {breadcrumb && (
        <nav className={styles.crumbs}>
          {breadcrumb.map((b, i) => (
            <span key={b.label} className="d-inline-flex align-items-center">
              {b.to ? <Link to={b.to}>{b.label}</Link> : <span>{b.label}</span>}
              {i < breadcrumb.length - 1 && <ChevronRight size={14} />}
            </span>
          ))}
        </nav>
      )}
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      {children}
    </div>
    {actions && <div className={`${styles.actions} no-print`}>{actions}</div>}
  </div>
);

export default PageHeader;
