import { Search, X } from 'lucide-react';
import styles from './SearchInput.module.scss';

const SearchInput = ({ value, onChange, placeholder = 'Search…', className = '', autoFocus, ...props }) => (
  <div className={`${styles.wrap} ${className}`}>
    <Search size={16} className={styles.icon} />
    <input className={`form-control ${styles.input}`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} {...props} />
    {value && (
      <button type="button" className={styles.clear} onClick={() => onChange('')} aria-label="Clear">
        <X size={14} />
      </button>
    )}
  </div>
);

export default SearchInput;
