import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { hasRole } from './auth';

// Page-local data: const { data, loading, error, reload, setData } = useApi(() => api.get(...), [deps])
export const useApi = (fn, deps = [], { skip = false } = {}) => {
  const [state, setState] = useState({ data: null, loading: !skip, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (id === seq.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (id === seq.current) setState((s) => ({ ...s, loading: false, error }));
      return null;
    }
  }, []);

  useEffect(() => {
    if (!skip) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, skip]);

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload, setData };
};

export const useCan = (roles) => {
  const user = useSelector((s) => s.auth.user);
  return hasRole(user, roles);
};

export const useDebounced = (value, delay = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

// The campus chosen in the top bar ('' = all campuses the user can see).
export const useCampus = () => useSelector((s) => s.ui.campus);
