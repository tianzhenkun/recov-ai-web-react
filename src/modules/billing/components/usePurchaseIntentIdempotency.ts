import { useCallback, useRef } from 'react';

const createPurchaseIntentKey = () => crypto.randomUUID();

export const usePurchaseIntentIdempotency = (
  createKey: () => string = createPurchaseIntentKey,
) => {
  const keyRef = useRef<string | undefined>(undefined);
  const failedRef = useRef(false);

  const start = useCallback(() => {
    const key = createKey();
    keyRef.current = key;
    failedRef.current = false;
    return key;
  }, [createKey]);

  const current = useCallback(() => {
    if (!keyRef.current) {
      keyRef.current = createKey();
    }
    return keyRef.current;
  }, [createKey]);

  const markFailed = useCallback(() => {
    if (keyRef.current) {
      failedRef.current = true;
    }
  }, []);

  const handleValuesChange = useCallback(() => {
    if (!failedRef.current) return;
    keyRef.current = createKey();
    failedRef.current = false;
  }, [createKey]);

  const finish = useCallback(() => {
    keyRef.current = undefined;
    failedRef.current = false;
  }, []);

  return { current, finish, handleValuesChange, markFailed, start };
};
