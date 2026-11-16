import styles from './Field.module.scss';

// <Field label="First name" required error={...} hint="..."><input className="form-control" /></Field>
const Field = ({ label, required, error, hint, className = '', children }) => (
  <div className={`${styles.field} ${className}`}>
    {label && (
      <label className="form-label">
        {label}
        {required && <span className={styles.req}>*</span>}
      </label>
    )}
    {children}
    {error ? <div className="invalid-msg">{error}</div> : hint ? <div className="form-text">{hint}</div> : null}
  </div>
);

export default Field;
