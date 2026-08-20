'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import ZoomableImage from '@/components/Common/ZoomableImage';
import Chevron from '@/components/Icons/Chevron';

export interface GalleryImage {
  url: string;
  alt?: string;
  title?: string;
}

interface ProductGalleryProps {
  images: GalleryImage[];
  title?: string;
}

const ProductGallery: React.FC<ProductGalleryProps> = ({ images = [], title = 'Sản phẩm' }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const safeImages = images.length > 0 ? images : [{ url: '/cover.jpg', alt: title }];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : safeImages.length - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev < safeImages.length - 1 ? prev + 1 : 0));
  };

  // Tự động cuộn thumbnail đang chọn vào giữa tầm nhìn
  useEffect(() => {
    const activeThumb = thumbnailRefs.current[activeIndex];
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeIndex]);

  // Hỗ trợ vuốt chạm (swipe) trên mobile/tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div className="w-full space-y-4">
      {/* 1. Khung Ảnh Chính (Main Image View) với Slider Track trượt mượt mà */}
      <div
        className="relative w-full aspect-square rounded-[20px] md:rounded-[24px] overflow-hidden border border-gray-200/90 bg-white shadow-sm select-none group"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slider Track (Băng trượt ảnh mượt bằng GPU hardware acceleration) */}
        <div
          className="flex w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-transform"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {safeImages.map((img, idx) => (
            <div key={idx} className="relative w-full h-full flex-shrink-0">
              <ZoomableImage
                src={img.url || '/cover.jpg'}
                alt={img.alt || `${title} ${idx + 1}`}
                fill
                priority={idx === 0}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 650px"
                className="object-cover w-full h-full"
                images={safeImages}
                initialIndex={idx}
              />
            </div>
          ))}
        </div>

        {/* Nút điều hướng bấm qua lại */}
        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Ảnh trước"
              className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 z-10 size-10 md:size-12 rounded-full bg-white/95 text-primary border border-gray-200/80 shadow-md backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:bg-primary hover:text-yellow hover:border-primary active:scale-90 cursor-pointer focus:outline-none opacity-90 hover:opacity-100"
            >
              <div className="rotate-90">
                <Chevron />
              </div>
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Ảnh tiếp theo"
              className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 z-10 size-10 md:size-12 rounded-full bg-white/95 text-primary border border-gray-200/80 shadow-md backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:bg-primary hover:text-yellow hover:border-primary active:scale-90 cursor-pointer focus:outline-none opacity-90 hover:opacity-100"
            >
              <div className="-rotate-90">
                <Chevron />
              </div>
            </button>

            {/* Badge đếm số lượng ảnh */}
            <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-10 px-2.5 py-1 rounded-full bg-primary/80 text-yellow text-xs font-medium tracking-wide backdrop-blur-md shadow-sm pointer-events-none">
              {activeIndex + 1} / {safeImages.length}
            </div>
          </>
        )}
      </div>

      {/* 2. Dải Ảnh Thu Nhỏ (Thumbnails Strip) */}
      {safeImages.length > 1 && (
        <div className="flex items-center gap-3 md:gap-4 overflow-x-auto py-1.5 px-0.5 no-scrollbar scroll-smooth">
          {safeImages.map((img, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={idx}
                ref={(el) => {
                  thumbnailRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Xem ảnh ${idx + 1}`}
                className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 xl:w-24 xl:h-24 rounded-[14px] md:rounded-[16px] overflow-hidden transition-all duration-300 cursor-pointer bg-white ${
                  isActive
                    ? 'border-2 border-primary ring-2 ring-primary/20 shadow-md scale-[1.03] opacity-100'
                    : 'border-2 border-gray-200/80 hover:border-primary/50 opacity-60 hover:opacity-100 hover:scale-[1.01]'
                }`}
              >
                <Image
                  src={img.url || '/cover.jpg'}
                  alt={img.alt || `${title} thumbnail ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 64px, 96px"
                  className="object-cover w-full h-full"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
