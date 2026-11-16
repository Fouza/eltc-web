// Tiny form-state helper: const { values, set, bind } = useForm(initial)
import { useState, useCallback } from 'react';

export const useForm = (initial) => {
  const [values, setValues] = useState(initial);
  const set = useCallback((name, value) => setValues((v) => ({ ...v, [name]: value })), []);
  const setPath = useCallback((path, value) => {
    const [a, b] = path.split('.');
    setValues((v) => (b ? { ...v, [a]: { ...(v[a] ?? {}), [b]: value } } : { ...v, [a]: value }));
  }, []);
  const get = (path) => path.split('.').reduce((o, k) => o?.[k], values);
  // <input {...bind('firstName')} /> or bind('guardian.phone')
  const bind = (path, { type } = {}) =>
    type === 'checkbox'
      ? { checked: Boolean(get(path)), onChange: (e) => setPath(path, e.target.checked) }
      : { value: get(path) ?? '', onChange: (e) => setPath(path, e.target.value) };
  return { values, setValues, set, setPath, bind };
};

// Drops empty strings so optional fields are not sent as "".
export const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([k, v]) => [k, v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) ? compact(v) : v]),
  );
