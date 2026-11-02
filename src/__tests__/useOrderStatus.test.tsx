import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOrderStatus } from '@/hooks/useOrderStatus';
import * as orderService from '@/services/orderService';

vi.mock('@/services/orderService', () => ({
  getOrderStatus: vi.fn(),
}));

describe('useOrderStatus hook (P1-5 / P1-6 verification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops polling immediately when payment_status is "paid" or status is "confirmed"/"completed"/"cancelled"', async () => {
    const getOrderStatusMock = vi.mocked(orderService.getOrderStatus);
    getOrderStatusMock.mockResolvedValue({
      order_code: 'ORD-001',
      status: 'confirmed',
      payment_status: 'paid',
      total: '150000',
    } as any);

    const { result } = renderHook(() => useOrderStatus('ORD-001'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.data?.payment_status).toBe('paid');
    expect(result.current.isSettled).toBe(true);
    expect(getOrderStatusMock).toHaveBeenCalledTimes(1);

    // Advance timers by 30 seconds — should NOT poll again because shouldStop matched
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(getOrderStatusMock).toHaveBeenCalledTimes(1);
  });

  it('polls up to 15 minutes (900,000 ms) to match PaymentQRScreen countdown and then settles with timeout error', async () => {
    const getOrderStatusMock = vi.mocked(orderService.getOrderStatus);
    getOrderStatusMock.mockResolvedValue({
      order_code: 'ORD-002',
      status: 'pending',
      payment_status: 'pending',
      total: '150000',
    } as any);

    const { result } = renderHook(() => useOrderStatus('ORD-002'));

    await act(async () => {
      await Promise.resolve();
    });

    // At 10 minutes (600,000 ms), it must NOT be settled yet (previously timed out at 10m)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });
    expect(result.current.isSettled).toBe(false);
    expect(result.current.error).toBeNull();

    // At 15 minutes + 3s (past 900,000 ms), next poll triggers timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 3000);
    });
    expect(result.current.isSettled).toBe(true);
    expect(result.current.error).toContain('Hết thời gian chờ');
  });
});
