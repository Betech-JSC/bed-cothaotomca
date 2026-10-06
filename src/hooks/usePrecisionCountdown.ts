"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface UsePrecisionCountdownOptions {
  initialSeconds?: number | null;
  expiresAt?: string | Date | null;
  onExpire?: () => void;
  enabled?: boolean;
}

/**
 * Format remaining seconds into mm:ss format (e.g. 14:59)
 */
export function formatTimer(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(safeSeconds / 60);
  const s = safeSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function computeTargetTime(
  initialSeconds?: number | null,
  expiresAt?: string | Date | null
): number | null {
  if (typeof initialSeconds === "number" && initialSeconds > 0) {
    return Date.now() + initialSeconds * 1000;
  }
  if (expiresAt) {
    const parsed = new Date(expiresAt).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function computeRemainingSeconds(targetTimeMs: number | null): number {
  if (!targetTimeMs) return 0;
  const diffMs = targetTimeMs - Date.now();
  return Math.max(0, Math.floor(diffMs / 1000));
}

/**
 * Precision Countdown Hook
 * Anchors countdown to absolute target timestamp to avoid mobile timer throttle / freeze.
 * Listens to visibilitychange and window focus events to immediately resynchronize remaining seconds.
 */
export function usePrecisionCountdown({
  initialSeconds,
  expiresAt,
  onExpire,
  enabled = true,
}: UsePrecisionCountdownOptions) {
  const prevInputsRef = useRef<{ initialSeconds?: number | null; expiresAt?: string | Date | null }>({
    initialSeconds,
    expiresAt,
  });

  const [targetTimeMs, setTargetTimeMs] = useState<number | null>(() =>
    computeTargetTime(initialSeconds, expiresAt)
  );

  // If inputs changed, update targetTimeMs immediately during render
  if (
    prevInputsRef.current.initialSeconds !== initialSeconds ||
    prevInputsRef.current.expiresAt !== expiresAt
  ) {
    prevInputsRef.current = { initialSeconds, expiresAt };
    const newTarget = computeTargetTime(initialSeconds, expiresAt);
    if (newTarget !== targetTimeMs) {
      setTargetTimeMs(newTarget);
    }
  }

  // Current remaining seconds state
  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    computeRemainingSeconds(targetTimeMs)
  );

  // Sync secondsLeft immediately during render if targetTimeMs changed
  const [prevTargetForSeconds, setPrevTargetForSeconds] = useState<number | null>(targetTimeMs);
  if (prevTargetForSeconds !== targetTimeMs) {
    setPrevTargetForSeconds(targetTimeMs);
    setSecondsLeft(computeRemainingSeconds(targetTimeMs));
  }

  const onExpireCalledRef = useRef<boolean>(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const syncRemaining = useCallback(() => {
    if (!targetTimeMs) {
      setSecondsLeft(0);
      return;
    }
    const remaining = computeRemainingSeconds(targetTimeMs);
    setSecondsLeft(remaining);

    if (remaining === 0 && !onExpireCalledRef.current) {
      onExpireCalledRef.current = true;
      onExpireRef.current?.();
    }
  }, [targetTimeMs]);

  useEffect(() => {
    if (!enabled || !targetTimeMs) return;

    onExpireCalledRef.current = computeRemainingSeconds(targetTimeMs) === 0;
    syncRemaining();

    const interval = setInterval(() => {
      syncRemaining();
    }, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncRemaining();
      }
    };

    const handleFocus = () => {
      syncRemaining();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [enabled, targetTimeMs, syncRemaining]);

  return {
    secondsLeft,
    formattedTime: formatTimer(secondsLeft),
    isExpired: secondsLeft <= 0,
    syncRemaining,
  };
}
