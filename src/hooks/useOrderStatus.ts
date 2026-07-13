"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrderStatus, type OrderStatus } from "@/services/orderService";

const POLL_INTERVAL_MS = 3000;        // 3 giây
const MAX_POLL_DURATION_MS = 10 * 60 * 1000; // 10 phút

interface UseOrderStatusReturn {
  data: OrderStatus | null;
  isLoading: boolean;
  error: string | null;
  /** true khi đơn đã synced hoặc hết hạn — polling dừng */
  isSettled: boolean;
}

/**
 * Hook polling trạng thái đơn hàng mỗi 3 giây.
 * Tự dừng khi:
 *   - status = 'synced' hoặc 'sync_failed'
 *   - payment_status = 'expired'
 *   - Đã chạy quá 10 phút
 */
export function useOrderStatus(orderCode: string | null): UseOrderStatusReturn {
  const [data, setData]       = useState<OrderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [isSettled, setIsSettled] = useState(false);

  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const isMounted   = useRef(true);

  const shouldStop = useCallback((status: OrderStatus): boolean => {
    if (status.payment_status === "expired") return true;
    if (status.status === "synced" || status.status === "sync_failed") return true;
    return false;
  }, []);

  const poll = useCallback(async () => {
    if (!orderCode || !isMounted.current) return;

    // Hard timeout
    if (Date.now() - startedAtRef.current > MAX_POLL_DURATION_MS) {
      setIsSettled(true);
      setError("Hết thời gian chờ. Vui lòng kiểm tra lại đơn hàng.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await getOrderStatus(orderCode);

      if (!isMounted.current) return;

      setData(result);
      setError(null);

      if (shouldStop(result)) {
        setIsSettled(true);
        return; // Không schedule thêm
      }
    } catch (err) {
      if (!isMounted.current) return;
      setError(err instanceof Error ? err.message : "Lỗi kiểm tra trạng thái.");
    } finally {
      if (isMounted.current) setIsLoading(false);
    }

    // Schedule lần poll tiếp theo
    if (isMounted.current && !isSettled) {
      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    }
  }, [orderCode, shouldStop, isSettled]);

  useEffect(() => {
    if (!orderCode) return;

    isMounted.current  = true;
    startedAtRef.current = Date.now();
    setIsSettled(false);
    setData(null);
    setError(null);

    // Bắt đầu poll ngay lập tức
    poll();

    return () => {
      isMounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderCode]);

  return { data, isLoading, error, isSettled };
}
