import { act, renderHook } from '@testing-library/react';
import { usePurchaseIntentIdempotency } from './usePurchaseIntentIdempotency';

describe('usePurchaseIntentIdempotency', () => {
  it('reuses one key for unchanged retries and rotates it after a failed intent is edited', () => {
    const createKey = jest
      .fn()
      .mockReturnValueOnce('purchase-1')
      .mockReturnValueOnce('purchase-2');
    const { result } = renderHook(() =>
      usePurchaseIntentIdempotency(createKey),
    );

    act(() => result.current.start());
    act(() => result.current.handleValuesChange());
    expect(result.current.current()).toBe('purchase-1');
    expect(result.current.current()).toBe('purchase-1');
    expect(createKey).toHaveBeenCalledTimes(1);

    act(() => result.current.markFailed());
    expect(result.current.current()).toBe('purchase-1');

    act(() => result.current.handleValuesChange());
    expect(result.current.current()).toBe('purchase-2');
    expect(createKey).toHaveBeenCalledTimes(2);
  });

  it('creates a new key after the current purchase intent is closed and reopened', () => {
    const createKey = jest
      .fn()
      .mockReturnValueOnce('purchase-1')
      .mockReturnValueOnce('purchase-2');
    const { result } = renderHook(() =>
      usePurchaseIntentIdempotency(createKey),
    );

    act(() => result.current.start());
    expect(result.current.current()).toBe('purchase-1');

    act(() => result.current.finish());
    act(() => result.current.start());
    expect(result.current.current()).toBe('purchase-2');
  });
});
