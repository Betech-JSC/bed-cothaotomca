'use client';

import React, { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';

export interface SafeImageProps extends ImageProps {
  fallbackSrc?: string;
}

const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackSrc = '/cover.jpg',
  onError,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt || ''}
      onError={(e) => {
        if (imgSrc !== fallbackSrc) {
          setImgSrc(fallbackSrc);
        }
        if (onError) {
          onError(e);
        }
      }}
    />
  );
};

export default SafeImage;
