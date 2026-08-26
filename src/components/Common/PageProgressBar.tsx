"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setIsLoading(false);
    setProgress(100);

    const timer = setTimeout(() => {
      setProgress(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isLoading) {
      setProgress(15);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          const diff = Math.random() * 10;
          return Math.min(prev + diff, 90);
        });
      }, 120);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || target.target === "_blank") {
        return;
      }

      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl) return;

      if (href.startsWith("/") || href.startsWith(window.location.origin)) {
        setIsLoading(true);
        setProgress(25);
      }
    };

    document.addEventListener("click", handleAnchorClick);

    return () => {
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  if (progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-1 bg-transparent overflow-hidden"
    >
      <div
        className="h-full bg-secondary shadow-[0_0_12px_rgba(205,72,41,0.5)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress > 0 && progress < 100 ? 1 : 0,
        }}
      />
    </div>
  );
}

export default function PageProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarInner />
    </Suspense>
  );
}
