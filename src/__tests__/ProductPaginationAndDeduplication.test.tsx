import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProductIndexPage from '@/components/Product/ProductIndexPage'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock next/navigation & router
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/product',
}))

// Mock Breadcrumb
vi.mock('@/components/Common/Breadcrumb', () => ({
  default: () => <div data-testid="breadcrumb">Breadcrumb</div>,
}))

// Mock CardProduct
vi.mock('@/components/Card/CardProduct', () => ({
  default: ({ item }: { item: any }) => (
    <div data-testid="card-product" data-product-id={item.id} data-product-slug={item.slug}>
      {item.title}
    </div>
  ),
}))

// Mock ProductFilter
vi.mock('@/components/Product/ProductFilter', () => ({
  default: () => <div data-testid="product-filter">Filter</div>,
}))

// Mock AnimateOnScroll
vi.mock('@/components/Animated/animated-appear', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('ProductIndexPage - Deduplication & Pagination Fix', () => {
  it('deduplicates products with duplicate slugs or id-name combinations', () => {
    const rawProducts = [
      {
        id: 1,
        name: 'Product 1',
        slug: 'product-1',
        price: 100000,
        translations: [{ locale: 'vi', name: 'Product 1' }],
      },
      {
        id: 1, // Duplicate ID & slug
        name: 'Product 1 Duplicate',
        slug: 'product-1',
        price: 100000,
        translations: [{ locale: 'vi', name: 'Product 1 Duplicate' }],
      },
      {
        id: 2,
        name: 'Product 2',
        slug: 'product-2',
        price: 150000,
        translations: [{ locale: 'vi', name: 'Product 2' }],
      },
    ] as any

    render(
      <ProductIndexPage
        category={null}
        selectedIngredients={[]}
        products={rawProducts}
        categories={[]}
        ingredients={[]}
        locale="vi"
        pagination={{
          currentPage: 1,
          lastPage: 1,
          total: 2,
        }}
      />
    )

    const renderedCards = screen.getAllByTestId('card-product')
    // Should have only 2 unique cards rendered instead of 3
    expect(renderedCards).toHaveLength(2)
    expect(renderedCards[0].getAttribute('data-product-slug')).toBe('product-1')
    expect(renderedCards[1].getAttribute('data-product-slug')).toBe('product-2')
  })

  it('uses per_page default of 12 in getProducts', async () => {
    const { getProducts } = await import('@/services/productService')
    // Gọi getProducts với catalog rỗng hoặc mock
    const res = await getProducts({ catalog: true })
    expect(res.per_page).toBe(12)
  })
})
