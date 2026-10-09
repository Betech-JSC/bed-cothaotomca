/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { mapProductToCardItem, mapProductToDetailView, Product } from '@/services/productService';
import CardProduct from '@/components/Card/CardProduct';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, onError, ...props }: any) => (
    <img src={src} alt={alt || ''} onError={onError} data-testid="card-image" {...props} />
  ),
}));

// Mock routing
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href, className, ...props }: any) => (
    <a href={typeof href === 'string' ? href : '#'} className={className} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  usePathname: () => '/products',
}));

// Mock contexts
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ cartItems: [] }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'vi',
}));

describe('Product Image formatImageUrl and Fallback Verification', () => {
  const dummyProduct: Product = {
    id: 101,
    name: 'Súp Bào Ngư Vi Cá',
    price: '350000',
    description: 'Mô tả súp',
    is_best_seller: false,
    ingredients: [],
    translations: [],
    created_at: '2026-01-01',
    image: '/storage/uploads/products/sup-bao-ngu.jpg',
    images: [
      { id: 1, image: '/storage/uploads/gallery/sup1.jpg', sort_order: 1 },
      { id: 2, image: 'http://localhost/storage/uploads/gallery/sup2.jpg', sort_order: 2 },
    ],
    gallery: [
      '/storage/uploads/gallery/sup3.jpg',
    ],
    category: { id: 1, title: 'Súp Bào Ngư', slug: 'sup-bao-ngu', translations: [] },
  };

  it('mapProductToCardItem converts relative image URL to full CMS URL', () => {
    const cardItem = mapProductToCardItem(dummyProduct, 'vi');
    expect(cardItem.image.url).toBe('https://cms.cothaotomca.vn/storage/uploads/products/sup-bao-ngu.jpg');
  });

  it('mapProductToCardItem falls back to /cover.jpg when image is null/empty', () => {
    const emptyImgProduct = { ...dummyProduct, image: null };
    const cardItem = mapProductToCardItem(emptyImgProduct, 'vi');
    expect(cardItem.image.url).toBe('/cover.jpg');
  });

  it('mapProductToDetailView formats sortedImages, gallery, and fallback image', () => {
    const detailView = mapProductToDetailView(dummyProduct, 'vi', { standard: 'Tiêu chuẩn' });
    expect(detailView.images[0].url).toBe('https://cms.cothaotomca.vn/storage/uploads/gallery/sup1.jpg');
    expect(detailView.images[1].url).toBe('https://cms.cothaotomca.vn/storage/uploads/gallery/sup2.jpg');
  });

  it('mapProductToDetailView formats gallery when sortedImages is empty', () => {
    const galleryOnlyProduct: Product = {
      ...dummyProduct,
      images: [],
      gallery: ['/storage/uploads/gallery/gallery-item.jpg'],
    };
    const detailView = mapProductToDetailView(galleryOnlyProduct, 'vi', { standard: 'Tiêu chuẩn' });
    expect(detailView.images[0].url).toBe('https://cms.cothaotomca.vn/storage/uploads/gallery/gallery-item.jpg');
  });

  it('CardProduct renders formatted image and fallbacks to /cover.jpg on error', () => {
    const cardItem = mapProductToCardItem(dummyProduct, 'vi');
    render(<CardProduct item={cardItem} />);

    const img = screen.getByTestId('card-image');
    expect(img.getAttribute('src')).toBe('https://cms.cothaotomca.vn/storage/uploads/products/sup-bao-ngu.jpg');

    // Simulate 404 / error on image
    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe('/cover.jpg');
  });

  it('GiftSelectorModal renders formatted image and falls back on error', async () => {
    const { default: GiftSelectorModal } = await import('@/components/Checkout/GiftSelectorModal');
    render(
      <GiftSelectorModal
        isOpen={true}
        onClose={vi.fn()}
        items={[
          {
            id: 1,
            product_id: 101,
            product_name: 'Quà tặng hấp dẫn',
            original_price: 100000,
            campaign_price: 0,
            image: '/storage/uploads/gifts/gift1.jpg',
          },
        ]}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    const img = screen.getByTestId('card-image');
    expect(img.getAttribute('src')).toBe('https://cms.cothaotomca.vn/storage/uploads/gifts/gift1.jpg');

    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe('/cover.jpg');
  });

  it('SearchSuggestions renders formatted image and falls back on error', async () => {
    const { default: SearchSuggestions } = await import('@/components/Header/SearchSuggestions');
    render(
      <SearchSuggestions
        productSuggestions={[
          {
            id: 101,
            name: 'Súp Bào Ngư',
            slug: 'sup-bao-ngu',
            price: 350000,
            image: '/storage/uploads/products/search-sup.jpg',
          } as any,
        ]}
        blogSuggestions={[]}
        policySuggestions={[]}
        isLoading={false}
        searchQuery="Súp"
        onSelect={vi.fn()}
        visible={true}
      />
    );

    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://cms.cothaotomca.vn/storage/uploads/products/search-sup.jpg');

    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe('/cover.jpg');
  });
});
