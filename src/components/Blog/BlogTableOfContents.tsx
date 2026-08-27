'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';

export interface HeadingItem {
  id: string;
  text: string;
  level: number; // 2 for h2, 3 for h3
}

export default function BlogTableOfContents() {
  const t = useTranslations('blog');
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // 1. Quét các thẻ H2, H3 trong nội dung bài viết và gán ID tự động
  useEffect(() => {
    const contentEl = document.querySelector('.prose-content');
    if (!contentEl) return;

    const headingNodes = Array.from(contentEl.querySelectorAll('h2, h3'));
    const items: HeadingItem[] = headingNodes.map((node, index) => {
      const level = node.tagName.toLowerCase() === 'h2' ? 2 : 3;
      const text = node.textContent?.trim() || `Mục ${index + 1}`;
      
      // Tạo ID duy nhất nếu chưa có
      if (!node.id) {
        node.id = `toc-heading-${index}`;
      }

      return {
        id: node.id,
        text,
        level,
      };
    });

    setHeadings(items);
  }, []);

  // 2. Scrollspy: Theo dõi thẻ tiêu đề đang hiển thị khi cuộn trang
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140; // Offset cho Navbar

      let currentHeadingId = headings[0].id;
      for (const item of headings) {
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          if (scrollPosition >= top) {
            currentHeadingId = item.id;
          } else {
            break;
          }
        }
      }

      setActiveId(currentHeadingId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Trigger khởi tạo

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimatingOut(false);
    }, 220);
  };

  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (!element) return;

    const navOffset = 110;
    const elementPosition = element.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - navOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });

    handleClose();
  }, []);

  // Nếu bài viết không có hoặc chỉ có ít hơn 2 tiêu đề, không cần hiện bong bóng Mục lục
  if (headings.length < 2) {
    return null;
  }

  return (
    <>
      {/* Nút Bong Bóng Nổi (Floating Bubble Button) ở góc trái màn hình */}
      <div className="fixed bottom-6 left-6 md:bottom-8 md:left-8 z-40 select-none">
        <button
          type="button"
          onClick={() => {
            setIsAnimatingOut(false);
            setIsOpen(true);
          }}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-primary text-yellow rounded-full shadow-2xl border-2 border-yellow/40 hover:bg-secondary hover:text-white transition-all duration-300 active:scale-95 cursor-pointer"
          aria-label={t('toc_title')}
        >
          {/* Icon Mục lục */}
          <svg className="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
          </svg>

          <span className="font-bold text-sm hidden md:inline-block">{t('toc_button')}</span>

          {/* Counter Badge đếm số lượng tiêu đề */}
          <span className="size-5 text-[11px] font-bold rounded-full bg-yellow text-primary flex items-center justify-center group-hover:bg-white group-hover:text-primary transition-colors">
            {headings.length}
          </span>
        </button>
      </div>

      {/* Drawer / Popup Mục lục */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] select-none">
          {/* Backdrop mờ */}
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm ${
              isAnimatingOut ? 'animate-toc-fade-out' : 'animate-toc-fade-in'
            }`}
            onClick={handleClose}
          />

          {/* Content Modal / Bottom Sheet */}
          <div
            className={`fixed bottom-0 left-0 right-0 md:bottom-24 md:left-8 md:right-auto md:w-[380px] max-w-full z-[10000] bg-white rounded-t-[28px] md:rounded-[24px] p-5 pb-6 space-y-4 shadow-2xl max-h-[75vh] flex flex-col overflow-hidden ${
              isAnimatingOut ? 'animate-toc-slide-out' : 'animate-toc-slide-in'
            }`}
          >
            {/* Handle cho Mobile */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto md:hidden opacity-80" />

            {/* Header Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
                  </svg>
                </span>
                <h3 className="title-3 text-primary font-bold">{t('toc_title')}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-semibold">
                  {t('toc_count', { count: headings.length })}
                </span>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Đóng"
                className="size-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-transform cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Danh sách các Mục lục (Triệt tiêu 100% thanh cuộn ngang & dọc) */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-1 pr-1 max-w-full no-scrollbar">
              {headings.map((item) => {
                const isActive = item.id === activeId;
                const isH3 = item.level === 3;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToHeading(item.id)}
                    className={`w-full text-left transition-all duration-200 rounded-xl px-3 py-2 flex items-start gap-2 cursor-pointer text-sm max-w-full overflow-hidden ${
                      isH3 ? 'pl-6 font-normal' : 'font-semibold'
                    } ${
                      isActive
                        ? 'bg-primary/10 text-primary font-bold border-l-4 border-primary pl-3'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
                    }`}
                  >
                    {isH3 && (
                      <span className={`text-xs mt-0.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                        •
                      </span>
                    )}
                    <span className="line-clamp-2 leading-snug break-words flex-1 min-w-0">{item.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Style Animations & Scrollbar Hiding */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes tocFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tocFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes tocSlideIn {
          from { transform: translateY(20px) scale(0.96); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes tocSlideOut {
          from { transform: translateY(0) scale(1); opacity: 1; }
          to { transform: translateY(20px) scale(0.96); opacity: 0; }
        }
        .animate-toc-fade-in {
          animation: tocFadeIn 0.2s ease-out forwards;
        }
        .animate-toc-fade-out {
          animation: tocFadeOut 0.2s ease-in forwards;
        }
        .animate-toc-slide-in {
          animation: tocSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-toc-slide-out {
          animation: tocSlideOut 0.2s cubic-bezier(0.7, 0, 0.84, 0) forwards;
        }
      `}} />
    </>
  );
}
