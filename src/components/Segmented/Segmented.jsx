import styles from './Segmented.module.scss';

// options: [{ value, label, tone }]
const Segmented = ({ options, value, onChange, size = 'md', className = '' }) => (
  <div className={`${styles.group} ${styles[size]} ${className}`} role="radiogroup">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="radio"
        aria-checked={value === o.value}
        title={o.title ?? o.label}
        className={`${styles.option} ${value === o.value ? `${styles.active} ${styles[o.tone ?? 'blue']}` : ''}`}
        onClick={() => onChange(o.value)}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export default Segmented;
