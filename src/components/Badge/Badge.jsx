import styles from './Badge.module.scss';

// tone: blue | purple | green | amber | red | cyan | pink | gray
const Badge = ({ tone = 'gray', dot, color, children, className = '', ...props }) => (
  <span
    className={`${styles.badge} ${color ? styles.custom : styles[tone]} ${className}`}
    style={color ? { '--c': color } : undefined}
    {...props}
  >
    {dot && <i className={styles.dot} />}
    {children}
  </span>
);

// <StatusBadge map={STUDENT_STATUS} value="active" />
export const StatusBadge = ({ map, value, dot = true }) => {
  const item = map?.[value];
  if (!item) return null;
  return (
    <Badge tone={item.tone} dot={dot}>
      {item.label}
    </Badge>
  );
};

export default Badge;
