import styles from './Card.module.scss';

const Card = ({ title, subtitle, icon: Icon, actions, children, padded = true, className = '', bodyClassName = '', ...props }) => (
  <section className={`${styles.card} ${className}`} {...props}>
    {(title || actions) && (
      <header className={styles.header}>
        <div className="d-flex align-items-center gap-10 min-w-0">
          {Icon && (
            <span className={styles.icon}>
              <Icon size={17} />
            </span>
          )}
          <div className="min-w-0">
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="d-flex align-items-center gap-2 flex-shrink-0">{actions}</div>}
      </header>
    )}
    <div className={`${padded ? styles.body : ''} ${bodyClassName}`}>{children}</div>
  </section>
);

export default Card;
