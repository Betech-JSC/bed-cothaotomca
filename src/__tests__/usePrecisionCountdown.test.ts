import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePrecisionCountdown, formatTimer } from "@/hooks/usePrecisionCountdown";

describe("formatTimer helper", () => {
  it("formats seconds into mm:ss string", () => {
    expect(formatTimer(900)).toBe("15:00");
    expect(formatTimer(899)).toBe("14:59");
    expect(formatTimer(65)).toBe("01:05");
    expect(formatTimer(5)).toBe("00:05");
    expect(formatTimer(0)).toBe("00:00");
    expect(formatTimer(-10)).toBe("00:00");
  });
});

describe("usePrecisionCountdown hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("initializes with initialSeconds and counts down every second", () => {
    const { result } = renderHook(() =>
      usePrecisionCountdown({ initialSeconds: 900 })
    );

    expect(result.current.secondsLeft).toBe(900);
    expect(result.current.formattedTime).toBe("15:00");
    expect(result.current.isExpired).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.secondsLeft).toBe(899);
    expect(result.current.formattedTime).toBe("14:59");
  });

  it("calculates remaining time from ISO expiresAt string", () => {
    const now = Date.now();
    const expiresAt = new Date(now + 300 * 1000).toISOString(); // 5 minutes ahead

    const { result } = renderHook(() =>
      usePrecisionCountdown({ expiresAt })
    );

    expect(result.current.secondsLeft).toBe(300);
    expect(result.current.formattedTime).toBe("05:00");
  });

  it("calls onExpire callback when countdown reaches zero", () => {
    const onExpireMock = vi.fn();
    const { result } = renderHook(() =>
      usePrecisionCountdown({ initialSeconds: 2, onExpire: onExpireMock })
    );

    expect(result.current.secondsLeft).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsLeft).toBe(1);
    expect(onExpireMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isExpired).toBe(true);
    expect(onExpireMock).toHaveBeenCalledTimes(1);
  });

  it("resynchronizes immediately on visibilitychange event (mobile wakeup)", () => {
    const { result } = renderHook(() =>
      usePrecisionCountdown({ initialSeconds: 600 })
    );

    expect(result.current.secondsLeft).toBe(600);

    // Simulate 60 seconds passing while screen was sleeping/throttled
    act(() => {
      vi.advanceTimersByTime(60000);
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.secondsLeft).toBe(540);
    expect(result.current.formattedTime).toBe("09:00");
  });

  it("resynchronizes immediately on window focus event", () => {
    const { result } = renderHook(() =>
      usePrecisionCountdown({ initialSeconds: 300 })
    );

    act(() => {
      vi.advanceTimersByTime(30000);
      window.dispatchEvent(new Event("focus"));
    });

    expect(result.current.secondsLeft).toBe(270);
    expect(result.current.formattedTime).toBe("04:30");
  });
});
