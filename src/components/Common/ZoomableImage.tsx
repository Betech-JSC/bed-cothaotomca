'use client'

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface ZoomableImageProps extends Omit<ImageProps, 'onClick'> {
  containerClassName?: string;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({ 
  src, 
  alt, 
  containerClassName = "w-full h-full",
  className = "",
  fill,
  ...props 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        className={`cursor-zoom-in relative ${containerClassName}`}
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

      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center cursor-zoom-out animate-zoom-fade"
          onClick={() => setIsOpen(false)}
        >
          {/* Close button */}
          <button 
            className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors p-2 rounded-full bg-white/10 hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Centered Image */}
          <div className="relative max-w-[90vw] max-h-[90vh] md:max-w-[80vw] md:max-h-[80vh] w-full h-full flex items-center justify-center p-4">
            <img 
              src={typeof src === 'string' ? src : (src as any).src || ''} 
              alt={alt} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none animate-zoom-scale"
            />
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes zoomFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes zoomScaleUp {
              from { transform: scale(0.95); opacity: 0; }
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
      )}
    </>
  );
};

export default ZoomableImage;
