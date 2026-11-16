import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Modal } from '@components';

const ConfirmContext = createContext(null);

// const confirm = useConfirm(); if (await confirm({ title, message, danger: true })) ...
export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const resolver = useRef(null);
  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState(opts);
      }),
    [],
  );
  const close = (value) => {
    resolver.current?.(value);
    setState(null);
  };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(state)}
        size="sm"
        title={state?.title ?? 'Are you sure?'}
        onClose={() => close(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {state?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <div className="d-flex gap-3">
          {state?.danger && <AlertTriangle className="fg-red flex-shrink-0" size={22} />}
          <div className="fg-muted">{state?.message}</div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
};
