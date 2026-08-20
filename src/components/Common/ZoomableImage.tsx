'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image, { ImageProps } from 'next/image';
import { createPortal } from 'react-dom';
import Chevron from '@/components/Icons/Chevron';

export interface GalleryItem {
  url: string;
  alt?: string;
  title?: string;
}

interface ZoomableImageProps extends Omit<ImageProps, 'onClick'> {
  containerClassName?: string;
  images?: GalleryItem[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({
  src,
  alt,
  containerClassName = "w-full h-full",
  className = "",
  fill,
  images,
  initialIndex = 0,
  onIndexChange,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalIndex, setModalIndex] = useState(initialIndex);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setModalIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const galleryList: GalleryItem[] = (images && images.length > 0)
    ? images
    : [{ url: typeof src === 'string' ? src : (src as any).src || '', alt: alt || '' }];

  const activeItem = galleryList[modalIndex] || galleryList[0];

  const handleSelectIndex = useCallback((idx: number) => {
    setModalIndex(idx);
  }, []);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextIdx = modalIndex > 0 ? modalIndex - 1 : galleryList.length - 1;
    handleSelectIndex(nextIdx);
  }, [modalIndex, galleryList.length, handleSelectIndex]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextIdx = modalIndex < galleryList.length - 1 ? modalIndex + 1 : 0;
    handleSelectIndex(nextIdx);
  }, [modalIndex, galleryList.length, handleSelectIndex]);

  // Cuộn thumbnail đang chọn vào giữa trong Lightbox Modal
  useEffect(() => {
    if (isOpen && thumbRefs.current[modalIndex]) {
      thumbRefs.current[modalIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [isOpen, modalIndex]);

  // Phím điều hướng Keyboard (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext]);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-black/92 backdrop-blur-md flex flex-col justify-between items-center py-6 px-4 select-none animate-zoom-fade"
      onClick={() => setIsOpen(false)}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 md:top-6 md:right-6 text-white/80 hover:text-white transition-all p-2.5 rounded-full bg-white/10 hover:bg-white/20 z-30 cursor-pointer focus:outline-none"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(false);
        }}
        aria-label="Đóng"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      {/* Nút Prev ở góc trái Lightbox */}
      {galleryList.length > 1 && (
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Ảnh trước"
          className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 z-30 size-11 md:size-13 rounded-full bg-white/15 hover:bg-white/30 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer focus:outline-none active:scale-90"
        >
          <div className="rotate-90">
            <Chevron />
          </div>
        </button>
      )}

      {/* Centered Large Image */}
      <div className="relative flex-1 w-full max-w-[90vw] max-h-[72vh] md:max-h-[78vh] flex items-center justify-center p-2 z-10">
        <img
          key={activeItem.url}
          src={activeItem.url || '/cover.jpg'}
          alt={activeItem.alt || alt || ''}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl select-none animate-zoom-scale"
        />
      </div>

      {/* Nút Next ở góc phải Lightbox */}
      {galleryList.length > 1 && (
        <button
          type="button"
          onClick={handleNext}
          aria-label="Ảnh tiếp theo"
          className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 z-30 size-11 md:size-13 rounded-full bg-white/15 hover:bg-white/30 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer focus:outline-none active:scale-90"
        >
          <div className="-rotate-90">
            <Chevron />
          </div>
        </button>
      )}

      {/* Dải ảnh Thumbnails bên dưới Lightbox Modal */}
      {galleryList.length > 1 && (
        <div className="flex flex-col items-center gap-2.5 z-20 max-w-full px-4 mb-2">
          {/* Badge đếm ảnh */}
          <div className="px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-md border border-white/10">
            {modalIndex + 1} / {galleryList.length}
          </div>

          {/* Dải Thumbnails bấm chọn */}
          <div
            className="flex items-center gap-2 md:gap-3 overflow-x-auto max-w-[90vw] py-1.5 px-2.5 no-scrollbar scroll-smooth bg-black/50 backdrop-blur-md rounded-2xl border border-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            {galleryList.map((gImg, gIdx) => {
              const isActive = gIdx === modalIndex;
              return (
                <button
                  key={gIdx}
                  ref={(el) => { thumbRefs.current[gIdx] = el; }}
                  type="button"
                  onClick={() => handleSelectIndex(gIdx)}
                  aria-label={`Xem ảnh ${gIdx + 1}`}
                  className={`relative flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer bg-white/5 ${
                    isActive
                      ? 'border-2 border-primary ring-2 ring-primary/50 scale-105 opacity-100'
                      : 'border border-white/20 opacity-50 hover:opacity-100 hover:scale-102'
                  }`}
                >
                  <img
                    src={gImg.url || '/cover.jpg'}
                    alt={gImg.alt || `Thumbnail ${gIdx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes zoomFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomScaleUp {
          from { transform: scale(0.96); opacity: 0.8; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-zoom-fade {
          animation: zoomFadeIn 0.2s ease-out forwards;
        }
        .animate-zoom-scale {
          animation: zoomScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );

  return (
    <>
      <div
        className={`cursor-zoom-in relative max-md:contents ${containerClassName}`}
        onClick={() => setIsOpen(true)}
      >
        <Image
          src={src}
          alt={alt}
          className={`${className}`}
          fill={fill}
          {...props}
        />
      </div>

      {isOpen && mounted
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
};

export default ZoomableImage;
