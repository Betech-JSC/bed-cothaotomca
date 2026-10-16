import { describe, it, expect } from 'vitest';
import { getProductLocalizedSlugs } from '@/lib/productHelper';

describe('getProductLocalizedSlugs', () => {
  it('should return slugs from alternate_slugs when present', () => {
    const product = {
      id: 1,
      slug: 'set-com-ca-hoi-fallback',
      alternate_slugs: {
        vi: {
          slug: 'set-com-ca-hoi-ngam-tuong',
          category_slug: 'set-com-tien-loi',
        },
        en: {
          slug: 'salmon-in-soy-sauce-meal-set',
          category_slug: 'convenient-meal-set',
        },
      },
    };

    const slugs = getProductLocalizedSlugs(product);
    expect(slugs).toEqual({
      viCatSlug: 'set-com-tien-loi',
      viProductSlug: 'set-com-ca-hoi-ngam-tuong',
      enCatSlug: 'convenient-meal-set',
      enProductSlug: 'salmon-in-soy-sauce-meal-set',
    });
  });

  it('should fallback gracefully when alternate_slugs is missing', () => {
    const product = {
      id: 2,
      slug: 'ca-kho-to',
      category: {
        id: 10,
        title: 'Món kho',
        slug: 'mon-kho',
        translations: [
          { locale: 'vi', title: 'Món kho' },
          { locale: 'en', title: 'Braised Dishes', slug: 'braised-dishes' },
        ],
      },
      translations: [
        { locale: 'vi', name: 'Cá kho tộ', slug: 'ca-kho-to' },
        { locale: 'en', name: 'Braised fish in clay pot', slug: 'braised-fish-in-clay-pot' },
      ],
    };

    const slugs = getProductLocalizedSlugs(product);
    expect(slugs.viProductSlug).toBe('ca-kho-to');
    expect(slugs.viCatSlug).toBe('mon-kho');
    expect(slugs.enProductSlug).toBe('braised-fish-in-clay-pot');
    expect(slugs.enCatSlug).toBe('braised-dishes');
  });

  it('should handle partial alternate_slugs gracefully', () => {
    const product = {
      id: 3,
      slug: 'default-slug',
      alternate_slugs: {
        vi: {
          slug: 'vi-product-slug',
          category_slug: 'vi-cat-slug',
        },
      },
    };

    const slugs = getProductLocalizedSlugs(product as any);
    expect(slugs.viProductSlug).toBe('vi-product-slug');
    expect(slugs.viCatSlug).toBe('vi-cat-slug');
    expect(slugs.enCatSlug).toBe('vi-cat-slug');
    expect(slugs.enProductSlug).toBe('vi-product-slug');
  });

  it('should support string alternate_slugs from /api/v1/products list endpoint for 100% sitemap/canonical/card parity', () => {
    const listProduct = {
      id: 4,
      slug: 'set-com-ca-hoi-ngam-tuong-co-thao',
      slug_vi: 'set-com-ca-hoi-ngam-tuong-co-thao',
      slug_en: 'marinated-salmon-rice-set',
      alternate_slugs: {
        vi: 'set-com-ca-hoi-ngam-tuong-co-thao',
        en: 'marinated-salmon-rice-set',
      },
      category: {
        id: 5,
        title: 'Salmon',
        vi_title: 'Cá hồi',
        en_title: 'Salmon',
        slug: 'salmon',
        original_slug: 'ca-hoi',
      },
    };

    const slugs = getProductLocalizedSlugs(listProduct);
    expect(slugs).toEqual({
      viCatSlug: 'ca-hoi',
      viProductSlug: 'set-com-ca-hoi-ngam-tuong-co-thao',
      enCatSlug: 'salmon',
      enProductSlug: 'marinated-salmon-rice-set',
    });
  });
});
