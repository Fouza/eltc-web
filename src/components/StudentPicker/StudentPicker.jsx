import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { studentsApi } from '@api/endpoints';
import { useDebounced } from '@helpers/hooks';
import { fullName } from '@helpers/format';
import Avatar from '../Avatar/Avatar';
import styles from './StudentPicker.module.scss';

// Type-ahead student search. value = student object (or null).
const StudentPicker = ({ value, onChange, params = {}, placeholder = 'Search by name, phone or number…', autoFocus }) => {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(q, 200);
  const ref = useRef(null);

  useEffect(() => {
    if (value) return undefined;
    let alive = true;
    studentsApi.list({ q: debounced, limit: 8, sort: 'name', ...params }).then((r) => alive && setItems(r.items)).catch(() => {});
    return () => { alive = false; };
  }, [debounced, value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (value) {
    return (
      <div className={styles.selected}>
        <Avatar person={value} size={32} />
        <div className="flex-grow-1 min-w-0">
          <div className="fw-700">{fullName(value)}</div>
          <div className="fs-12 fg-subtle">{value.studentNumber} {value.phone && `· ${value.phone}`}</div>
        </div>
        <button type="button" className={styles.clear} onClick={() => onChange(null)} aria-label="Change student">
          <X size={15} />
        </button>
      </div>
    );
  }
  return (
    <div className={styles.wrap} ref={ref}>
      <input className="form-control" value={q} placeholder={placeholder} autoFocus={autoFocus} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} />
      {open && (
        <div className={styles.menu}>
          {items.map((s) => (
            <button key={s._id} type="button" className={styles.item} onClick={() => { onChange(s); setOpen(false); setQ(''); }}>
              <Avatar person={s} size={28} />
              <div className="flex-grow-1 text-start min-w-0">
                <div className="fw-600 text-ellipsis">{fullName(s)}</div>
                <div className="fs-12 fg-subtle">{s.studentNumber} {s.phone && `· ${s.phone}`}</div>
              </div>
              {s.balance > 0 && <span className="fs-12 fg-red fw-600">owes</span>}
            </button>
          ))}
          {!items.length && <div className="p-3 fs-13 fg-muted">No student found</div>}
        </div>
      )}
    </div>
  );
};

export default StudentPicker;
