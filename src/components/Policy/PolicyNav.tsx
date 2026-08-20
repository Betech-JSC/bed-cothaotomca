'use client';

import React, { useState, useEffect } from 'react';
import { Link } from "@/i18n/routing";
import Chevron from "@/components/Icons/Chevron";
import { useLocale } from 'next-intl';

interface PolicyItem {
  id: number;
  slug: string;
  title: string;
}

interface PolicyNavProps {
  policies: PolicyItem[];
  currentSlug: string;
}

export default function PolicyNav({ policies, currentSlug }: PolicyNavProps) {
  const locale = useLocale();
  const isEn = locale === 'en';
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const currentPolicy = policies.find((p) => p.slug === currentSlug) || policies[0];

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimatingOut(false);
    }, 250);
  };

  // Prevent background body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* 1. Giao diện Desktop (Sidebar Cột Trái Dọc) */}
      <div className="hidden lg:block sticky top-24">
        <div className="bg-white rounded-[16px] overflow-hidden shadow-sm">
          <nav className="flex flex-col p-2 space-y-2">
            {policies.map((policy) => {
              const isActive = policy.slug === currentSlug;
              return (
                <Link
                  key={policy.id}
                  href={{ pathname: '/policy/[slug]', params: { slug: policy.slug } }}
                  className={`p-3 transition-all duration-300 rounded-[12px] ${
                    isActive
                      ? "bg-primary text-yellow shadow-lg font-semibold"
                      : "text-gray-900 lg:hover:text-[#142A68] lg:hover:bg-gray-50 font-medium"
                  } title-3`}
                >
                  {policy.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 2. Giao diện Mobile (Nút bấm mở Bottom Sheet Drawer - PA 3) */}
      <div className="lg:hidden w-full mb-4">
        <button
          type="button"
          onClick={() => {
            setIsAnimatingOut(false);
            setIsOpen(true);
          }}
          className="w-full flex items-center justify-between p-3.5 bg-white border border-gray-200/90 rounded-[18px] shadow-sm text-primary transition-all active:scale-[0.98] duration-200 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <span className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </span>
            <span className="font-semibold text-sm md:text-base text-gray-900 truncate">
              {currentPolicy?.title}
            </span>
          </div>

          <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-semibold flex items-center gap-1.5 flex-shrink-0">
            <span>{isEn ? "Change policy" : "Đổi chính sách"}</span>
            <div className="rotate-180">
              <Chevron className="w-2.5 h-2.5" />
            </div>
          </span>
        </button>
      </div>

      {/* Mobile Bottom Sheet Modal */}
      {isOpen && (
        <div className="fixed inset-0 lg:hidden select-none" style={{ zIndex: 99999 }}>
          {/* Backdrop mờ */}
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
              isAnimatingOut ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ zIndex: 99999 }}
            onClick={handleClose}
          />

          {/* Drawer trượt từ dưới lên */}
          <div
            className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] p-5 pb-8 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto transition-transform duration-300 ease-out ${
              isAnimatingOut ? 'translate-y-full' : 'translate-y-0'
            }`}
            style={{ zIndex: 100000 }}
          >
            {/* Thanh Kéo Handle */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-1 opacity-80" />

            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="title-2 text-primary font-bold">
                {isEn ? "Policies & Terms" : "Chính sách & Quy định"}
              </h3>
              <button
                type="button"
                onClick={handleClose}
                aria-label={isEn ? "Close" : "Đóng"}
                className="size-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-transform"
              >
                ✕
              </button>
            </div>

            {/* Danh sách các chính sách */}
            <div className="space-y-2 pt-1">
              {policies.map((policy, idx) => {
                const isActive = policy.slug === currentSlug;
                return (
                  <Link
                    key={policy.id}
                    href={{ pathname: '/policy/[slug]', params: { slug: policy.slug } }}
                    onClick={handleClose}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    className={`flex items-center justify-between p-3.5 rounded-[16px] transition-all duration-200 active:scale-[0.98] ${
                      isActive
                        ? "bg-primary text-yellow font-bold shadow-md"
                        : "bg-gray-50 text-gray-800 hover:bg-gray-100 font-medium"
                    } ${!isAnimatingOut ? 'animate-sheet-item-in' : ''}`}
                  >
                    <span className="text-sm md:text-base">{policy.title}</span>
                    {isActive && (
                      <span className="size-6 rounded-full bg-yellow text-primary flex items-center justify-center text-xs font-bold shadow-sm">
                        ✓
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Styles Keyframe Animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes sheetBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sheetBackdropOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes sheetSlideIn {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes sheetSlideOut {
          from { transform: translateY(0); }
          to { transform: translateY(100%); }
        }
        @keyframes sheetItemIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-sheet-backdrop-in {
          animation: sheetBackdropIn 0.25s ease-out forwards;
        }
        .animate-sheet-backdrop-out {
          animation: sheetBackdropOut 0.25s ease-in forwards;
        }
        .animate-sheet-slide-in {
          animation: sheetSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-sheet-slide-out {
          animation: sheetSlideOut 0.25s cubic-bezier(0.7, 0, 0.84, 0) forwards;
        }
        .animate-sheet-item-in {
          animation: sheetItemIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}} />
    </>
  );
}
