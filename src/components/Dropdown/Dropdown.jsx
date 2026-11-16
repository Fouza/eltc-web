import { useEffect, useRef, useState } from 'react';
import styles from './Dropdown.module.scss';

// <Dropdown trigger={<Button .../>} items={[{ label, icon, onClick, danger, hidden }]} />
const Dropdown = ({ trigger, items = [], align = 'end', width = 220, children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className={styles.wrap} ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className={`${styles.menu} ${styles[align]}`} style={{ width }}>
          {children
            ? children(() => setOpen(false))
            : items
                .filter((i) => !i.hidden)
                .map(({ label, icon: Icon, onClick, danger }) => (
                  <button
                    key={label}
                    type="button"
                    className={`${styles.item} ${danger ? styles.danger : ''}`}
                    onClick={() => {
                      setOpen(false);
                      onClick?.();
                    }}
                  >
                    {Icon && <Icon size={16} />} {label}
                  </button>
                ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
