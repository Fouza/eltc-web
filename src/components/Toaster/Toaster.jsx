import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { toastRemoved } from '@store/uiSlice';
import styles from './Toaster.module.scss';

const ICONS = { success: CheckCircle2, info: Info, warning: AlertTriangle, danger: XCircle };

const Toast = ({ toast }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    const t = setTimeout(() => dispatch(toastRemoved(toast.id)), toast.tone === 'danger' ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [dispatch, toast]);
  const Icon = ICONS[toast.tone] ?? Info;
  return (
    <div className={`${styles.toast} ${styles[toast.tone]}`}>
      <Icon size={20} className={styles.icon} />
      <div className="flex-grow-1 min-w-0">
        <div className={styles.title}>{toast.title}</div>
        {toast.message && <div className={styles.message}>{toast.message}</div>}
      </div>
      <button type="button" className={styles.close} onClick={() => dispatch(toastRemoved(toast.id))} aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  );
};

const Toaster = () => {
  const toasts = useSelector((s) => s.ui.toasts);
  return (
    <div className={styles.stack}>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
};

export default Toaster;
