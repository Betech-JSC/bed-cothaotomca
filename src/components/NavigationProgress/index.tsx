"use client";

import { usePathname } from "@/i18n/i18n-navigation";
import { useEffect, useRef, useState } from "react";

const NavigationProgress = () => {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPathRef = useRef(pathname);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      setIsNavigating(true);
      prevPathRef.current = pathname;

      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);

      progressTimerRef.current = setTimeout(() => {
        setIsNavigating(false);
      }, 600);
    }
    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    };
  }, [pathname]);

  if (!isNavigating) return null;

  return (
    <span
      className="pointer-events-none fixed top-0 left-0 h-[2px] bg-secondary animate-progress-bar z-[200]"
      aria-hidden="true"
    />
  );
};

export default NavigationProgress;
