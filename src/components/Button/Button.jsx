import styles from './Button.module.scss';

// variant: primary (gradient) | secondary (white) | soft (light blue) | ghost | danger
const Button = ({ variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, loading, block, className = '', children, type = 'button', ...props }) => (
  <button
    type={type}
    className={`${styles.btn} ${styles[variant]} ${styles[size]} ${block ? styles.block : ''} ${!children ? styles.iconOnly : ''} ${className}`}
    disabled={loading || props.disabled}
    {...props}
  >
    {loading ? <span className={styles.spinner} /> : Icon && <Icon size={size === 'sm' ? 15 : 17} strokeWidth={2.2} />}
    {children && <span>{children}</span>}
    {IconRight && <IconRight size={16} strokeWidth={2.2} />}
  </button>
);

export default Button;
