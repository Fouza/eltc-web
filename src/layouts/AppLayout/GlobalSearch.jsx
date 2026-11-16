import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Layers, Search, UserSquare2 } from 'lucide-react';
import { searchApi } from '@api/endpoints';
import { useDebounced } from '@helpers/hooks';
import { fullName } from '@helpers/format';
import { Avatar, StatusBadge } from '@components';
import { STUDENT_STATUS, GROUP_STATUS } from '@data/enums';
import styles from './AppLayout.module.scss';

const GlobalSearch = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState(null);
  const debounced = useDebounced(q, 250);
  const ref = useRef(null);
  const input = useRef(null);

  useEffect(() => {
    if (debounced.trim().length < 2) return setResults(null);
    let alive = true;
    searchApi.search(debounced).then((r) => alive && setResults(r)).catch(() => {});
    return () => { alive = false; };
  }, [debounced]);

  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', key);
    };
  }, []);

  const go = (to) => {
    setOpen(false);
    setQ('');
    navigate(to);
  };
  const empty = results && !results.students.length && !results.groups.length && !results.teachers.length;

  return (
    <div className={styles.search} ref={ref}>
      <Search size={17} className={styles.searchIcon} />
      <input
        ref={input}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search a student, phone, group…"
        className={styles.searchInput}
      />
      <kbd className={styles.kbd}>⌘K</kbd>
      {open && results && (
        <div className={styles.searchMenu}>
          {empty && <div className="p-3 fg-muted fs-13">No result for “{q}”</div>}
          {results.students.length > 0 && <div className={styles.searchSection}>Students</div>}
          {results.students.map((s) => (
            <button key={s._id} type="button" className={styles.searchItem} onClick={() => go(`/students/${s._id}`)}>
              <Avatar person={s} size={30} />
              <div className="flex-grow-1 min-w-0 text-start">
                <div className="fw-600 text-ellipsis">{fullName(s)}</div>
                <div className="fs-12 fg-subtle">{s.studentNumber} {s.phone && `· ${s.phone}`}</div>
              </div>
              <StatusBadge map={STUDENT_STATUS} value={s.status} />
            </button>
          ))}
          {results.groups.length > 0 && <div className={styles.searchSection}>Groups</div>}
          {results.groups.map((g) => (
            <button key={g._id} type="button" className={styles.searchItem} onClick={() => go(`/groups/${g._id}`)}>
              <span className={styles.searchGlyph}><Layers size={15} /></span>
              <div className="flex-grow-1 text-start fw-600">{g.name}</div>
              <StatusBadge map={GROUP_STATUS} value={g.status} />
            </button>
          ))}
          {results.teachers.length > 0 && <div className={styles.searchSection}>Teachers</div>}
          {results.teachers.map((t) => (
            <button key={t._id} type="button" className={styles.searchItem} onClick={() => go(`/teachers?open=${t._id}`)}>
              <span className={styles.searchGlyph}><UserSquare2 size={15} /></span>
              <div className="flex-grow-1 text-start fw-600">{fullName(t)}</div>
              <span className="fs-12 fg-subtle">{t.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
