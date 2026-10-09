import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import SectionHero from '@/components/Hero/SectionHero';
import Banner from '@/components/Banner';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock Swiper
vi.mock('swiper/react', () => ({
  Swiper: ({ children, className }: any) => <div data-testid="swiper-mock" className={className}>{children}</div>,
  SwiperSlide: ({ children, className }: any) => <div data-testid="swiper-slide-mock" className={className}>{children}</div>,
}));

vi.mock('swiper/modules', () => ({
  Navigation: {},
  Pagination: {},
}));

// Mock Next/Image
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, priority, className }: any) => (
    <img
      src={src}
      alt={alt}
      data-fill={fill ? 'true' : undefined}
      data-priority={priority ? 'true' : undefined}
      className={className}
    />
  ),
}));

describe('Hero & Banner Aspect Ratio and Max-Height Lock Tests', () => {
  const mockHeroItems = [
    {
      image: { url: '/cover.jpg', alt: 'Main Banner' },
      image_mobile: { url: '/cover-mobile.jpg', alt: 'Mobile Banner' },
      title: 'Cô Thảo Tôm Cá',
    },
  ];

  it('SectionHero locks aspect-ratio 16/9 and applies max-height ceiling', () => {
    const { container } = render(<SectionHero items={mockHeroItems} />);
    const section = container.querySelector('section');

    expect(section).toBeInTheDocument();
    const sectionClass = section?.getAttribute('class') || '';

    // Verify aspect-ratio 16:9 lock
    expect(sectionClass).toContain('aspect-[16/9]');

    // Verify max-height ceiling for 2K / 16:10 screens
    expect(sectionClass).toContain('max-h-[520px]');
    expect(sectionClass).toContain('2xl:max-h-[560px]');
    expect(sectionClass).toContain('min-h-[195px]');

    // Verify images have object-cover and object-center
    const images = container.querySelectorAll('img');
    expect(images.length).toBeGreaterThan(0);
    images.forEach((img) => {
      const imgClass = img.getAttribute('class') || '';
      expect(imgClass).toContain('object-cover');
      expect(imgClass).toContain('object-center');
    });
  });

  it('Banner component defaults to aspect-ratio 16/9 with max-height ceiling', () => {
    const mockBanner = {
      image: { url: '/cover.jpg', alt: 'Desktop Banner' },
      image_mobile: { url: '/cover-mobile.jpg', alt: 'Mobile Banner' },
    };

    const { container } = render(<Banner banner={mockBanner} />);
    const bannerContainer = container.firstElementChild;

    expect(bannerContainer).toBeInTheDocument();
    const bannerClass = bannerContainer?.getAttribute('class') || '';

    // Verify aspect-ratio and ceiling
    expect(bannerClass).toContain('aspect-[16/9]');
    expect(bannerClass).toContain('max-h-[360px]');
    expect(bannerClass).toContain('md:max-h-[440px]');
    expect(bannerClass).toContain('xl:max-h-[480px]');

    // Verify object-center
    const images = container.querySelectorAll('img');
    images.forEach((img) => {
      const imgClass = img.getAttribute('class') || '';
      expect(imgClass).toContain('object-center');
    });
  });

  it('SectionHero wraps formatImageUrl for relative and backend CMS URLs', () => {
    const customHeroItems = [
      {
        image: { url: '/storage/uploads/banners/hero-desktop.webp', alt: 'CMS Desktop' },
        image_mobile: { url: 'uploads/banners/hero-mobile.webp', alt: 'CMS Mobile' },
      },
    ];

    const { container } = render(<SectionHero items={customHeroItems} />);
    const images = container.querySelectorAll('img');

    // Desktop and mobile images should be prepended with backend origin
    const sources = Array.from(images).map((img) => img.getAttribute('src'));
    expect(sources).toContain('https://cms.cothaotomca.vn/storage/uploads/banners/hero-desktop.webp');
    expect(sources).toContain('https://cms.cothaotomca.vn/uploads/banners/hero-mobile.webp');
  });

  it('Banner wraps formatImageUrl for relative and backend CMS URLs', () => {
    const customBanner = {
      image: { url: '/storage/uploads/banners/promo.png', alt: 'CMS Banner' },
      image_mobile: { url: 'https://cothaotomca.vn/storage/banners/promo-mb.png', alt: 'CMS Mobile' },
    };

    const { container } = render(<Banner banner={customBanner} />);
    const images = container.querySelectorAll('img');

    const sources = Array.from(images).map((img) => img.getAttribute('src'));
    expect(sources).toContain('https://cms.cothaotomca.vn/storage/uploads/banners/promo.png');
    expect(sources).toContain('https://cms.cothaotomca.vn/storage/banners/promo-mb.png');
  });
});
