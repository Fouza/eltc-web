import { store } from '@store/index';
import { toastAdded } from '@store/uiSlice';

// toast.success('Saved') / toast.error(err) from anywhere, no hook needed.
export const toast = {
  success: (title, message) => store.dispatch(toastAdded({ tone: 'success', title, message })),
  info: (title, message) => store.dispatch(toastAdded({ tone: 'info', title, message })),
  warning: (title, message) => store.dispatch(toastAdded({ tone: 'warning', title, message })),
  error: (err, title = 'Something went wrong') =>
    store.dispatch(toastAdded({ tone: 'danger', title, message: typeof err === 'string' ? err : err?.message })),
};
