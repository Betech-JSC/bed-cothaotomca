"use client";
import React, { useEffect, useRef, useState } from 'react';

interface AnimateOnScrollProps {
  children: React.ReactNode;
  once?: boolean;
  animate?: 'slideup' | 'slidedown' | 'slideright' | 'slideleft' | 'appear' | 'opacity' | 'card-animate';
  delay?: number;
  className?: string;
  offset?: string;
}

export default function AnimateOnScroll({
  children,
  once = true,
  animate = 'slideup',
  delay = 300,
  className = '',
  offset = '0px 0px -100px 0px',
}: AnimateOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [cardAnimated, setCardAnimated] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleInitialCheck = () => {
      const rect = element.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        setIsVisible(true);
        if (animate === 'card-animate') setCardAnimated(true);
      }
    };

    handleInitialCheck(); // Chạy ngay khi mount

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (animate === 'card-animate') setCardAnimated(true);
          if (once) observer.unobserve(element);
        }
      },
      {
        threshold: 0,
        rootMargin: offset,
      }
    );

    observer.observe(element);
    window.addEventListener('load', handleInitialCheck);
    window.addEventListener('resize', handleInitialCheck);

    return () => {
      observer.disconnect();
      window.removeEventListener('load', handleInitialCheck);
      window.removeEventListener('resize', handleInitialCheck);
    };
  }, [animate, once, offset]);

  return (
    <div
      ref={ref}
      className={`animate ${animate} ${className} ${isVisible ? 'is-visible' : ''} ${cardAnimated ? 'card-animated' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
