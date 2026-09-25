import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { CartProvider, useCart, checkItemOutOfStock, CartItem } from '@/contexts/CartContext';
import { calcOrderTotal } from '@/services/orderService';

describe('Package 2: Voucher and Stock UX Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('KiotViet SKU Verification & stock: 0 policy (checkItemOutOfStock)', () => {
    const mockCache = [
      {
        id: 101,
        slug: 'mon-don-kho',
        code: 'SP-DON-101',
        stock: 0, // stock is 0 in physical inventory
        price: 80000,
        variants: [],
      },
      {
        id: 102,
        slug: 'mon-co-variant',
        code: 'SP-VAR-102',
        price: 120000,
        variants: [
          {
            id: 1021,
            size: 'Phần Nhỏ',
            code: 'VAR-102-S',
            stock: 0, // variant stock is 0
            price: 120000,
          },
          {
            id: 1022,
            size: 'Phần Lớn',
            code: '', // missing SKU
            stock: 10,
            price: 180000,
          },
        ],
      },
      {
        id: 103,
        slug: 'mon-khong-co-sku',
        code: '', // missing SKU in KiotViet
        stock: 50,
        price: 90000,
      },
    ];

    it('returns false (in stock / orderable) for simple product with stock: 0 but valid KiotViet SKU', () => {
      const item: CartItem = {
        id: '101-',
        productId: 101,
        productCode: 'SP-DON-101',
        slug: 'mon-don-kho',
        categorySlug: 'mon-chinh',
        title: 'Món Đơn Kho',
        imageUrl: '/img.jpg',
        variant: '',
        unitPrice: 80000,
        quantity: 1,
      };

      // Even though stock is 0, valid SKU means customer can order
      const isOut = checkItemOutOfStock(item, mockCache);
      expect(isOut).toBe(false);
    });

    it('returns false (in stock / orderable) for variant product with variant stock: 0 but valid KiotViet SKU', () => {
      const item: CartItem = {
        id: '102-Phần Nhỏ',
        productId: 102,
        productCode: 'VAR-102-S',
        slug: 'mon-co-variant',
        categorySlug: 'mon-chinh',
        title: 'Món Có Variant',
        imageUrl: '/img.jpg',
        variant: 'Phần Nhỏ',
        unitPrice: 120000,
        quantity: 1,
      };

      const isOut = checkItemOutOfStock(item, mockCache);
      expect(isOut).toBe(false);
    });

    it('returns true (out of stock) when item productCode is empty or missing', () => {
      const item: CartItem = {
        id: '101-',
        productId: 101,
        productCode: '',
        slug: 'mon-don-kho',
        categorySlug: 'mon-chinh',
        title: 'Món Đơn Kho',
        imageUrl: '/img.jpg',
        variant: '',
        unitPrice: 80000,
        quantity: 1,
      };

      expect(checkItemOutOfStock(item, mockCache)).toBe(true);
      expect(checkItemOutOfStock({ ...item, productCode: '   ' }, mockCache)).toBe(true);
    });

    it('returns true when product is not found in productsCache', () => {
      const item: CartItem = {
        id: '999-',
        productId: 999,
        productCode: 'UNKNOWN-SKU',
        slug: 'mon-chua-co',
        categorySlug: 'mon-chinh',
        title: 'Món Chưa Có',
        imageUrl: '/img.jpg',
        variant: '',
        unitPrice: 50000,
        quantity: 1,
      };

      expect(checkItemOutOfStock(item, mockCache)).toBe(true);
    });

    it('returns true when variant has empty code in KiotViet system', () => {
      const item: CartItem = {
        id: '102-Phần Lớn',
        productId: 102,
        productCode: 'VAR-102-L',
        slug: 'mon-co-variant',
        categorySlug: 'mon-chinh',
        title: 'Món Có Variant Lớn',
        imageUrl: '/img.jpg',
        variant: 'Phần Lớn',
        unitPrice: 180000,
        quantity: 1,
      };

      // Even though variant has stock 10, empty code in cache means not valid in KiotViet
      expect(checkItemOutOfStock(item, mockCache)).toBe(true);
    });

    it('returns true when simple product has empty code in KiotViet system', () => {
      const item: CartItem = {
        id: '103-',
        productId: 103,
        productCode: 'SKU-TEMP',
        slug: 'mon-khong-co-sku',
        categorySlug: 'mon-chinh',
        title: 'Món Không Có SKU',
        imageUrl: '/img.jpg',
        variant: '',
        unitPrice: 90000,
        quantity: 1,
      };

      expect(checkItemOutOfStock(item, mockCache)).toBe(true);
    });

    it('falls back to Boolean(item.isOutOfStock) when cache is empty', () => {
      const item: CartItem = {
        id: '101-',
        productId: 101,
        productCode: 'SKU-01',
        slug: 'mon-1',
        categorySlug: 'mon-chinh',
        title: 'Món 1',
        imageUrl: '/img.jpg',
        variant: '',
        unitPrice: 100000,
        quantity: 1,
        isOutOfStock: false,
      };

      expect(checkItemOutOfStock(item, [])).toBe(false);
      expect(checkItemOutOfStock({ ...item, isOutOfStock: true }, [])).toBe(true);
    });
  });

  describe('CartContext Out of Stock Detection & Subtotal Exclusion', () => {
    it('marks item as out of stock when isOutOfStock is set or SKU is empty, and excludes it from subtotal', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CartProvider>{children}</CartProvider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      // Add normal item with quantity 2
      act(() => {
        result.current.addToCart({
          id: 'item-1',
          productId: 101,
          slug: 'mon-con-hang',
          categorySlug: 'mon-chinh',
          title: 'Món Còn Hàng',
          variant: 'Phần Tiêu Chuẩn',
          unitPrice: 100000,
          imageUrl: '/item1.jpg',
          productCode: 'SKU-01',
          isOutOfStock: false,
        }, 2);
      });

      expect(result.current.subtotal).toBe(200000);
      expect(result.current.hasOutOfStockItems).toBe(false);

      // Add out of stock item (missing SKU)
      act(() => {
        result.current.addToCart({
          id: 'item-2',
          productId: 102,
          slug: 'mon-het-hang',
          categorySlug: 'mon-chinh',
          title: 'Món Tạm Hết Hàng',
          variant: 'Phần Lớn',
          unitPrice: 150000,
          imageUrl: '/item2.jpg',
          productCode: '', // Missing SKU -> isOutOfStock true
        }, 1);
      });

      // Subtotal should EXCLUDE the out-of-stock item
      expect(result.current.subtotal).toBe(200000);
      // hasOutOfStockItems should be true
      expect(result.current.hasOutOfStockItems).toBe(true);
      expect(result.current.cartItems.find(i => i.id === 'item-2')?.isOutOfStock).toBe(true);

      // Removing out-of-stock item clears the flag
      act(() => {
        result.current.removeFromCart('item-2');
      });

      expect(result.current.hasOutOfStockItems).toBe(false);
      expect(result.current.subtotal).toBe(200000);
    });

    it('fetches products using backend API URL and does not mark stock: 0 items as out of stock', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 201,
              slug: 'lau-tom-ca',
              code: 'LAU-TOM-CA',
              stock: 0, // zero stock in inventory
              price: 250000,
              variants: [],
            },
          ],
        }),
      });
      global.fetch = mockFetch;

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CartProvider>{children}</CartProvider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('/products?per_page=all');
      expect(calledUrl).not.toBe('/api/products?per_page=all');

      act(() => {
        result.current.addToCart({
          id: 'item-201',
          productId: 201,
          slug: 'lau-tom-ca',
          categorySlug: 'lau',
          title: 'Lẩu Tôm Cá',
          variant: '',
          unitPrice: 250000,
          imageUrl: '/lau.jpg',
          productCode: 'LAU-TOM-CA',
        }, 1);
      });

      // Item with stock: 0 must NOT be marked as out of stock
      expect(result.current.hasOutOfStockItems).toBe(false);
      expect(result.current.subtotal).toBe(250000);
      const addedItem = result.current.cartItems.find(i => i.id === 'item-201');
      expect(addedItem?.isOutOfStock).toBe(false);
    });
  });

  describe('calcOrderTotal calculation with exclusions', () => {
    it('calculates total correctly without negative amounts', () => {
      const items = [{ price: 100000, quantity: 2 }];
      const result = calcOrderTotal(items, 'delivery', 20000, 50000);
      expect(result.subtotal).toBe(200000);
      expect(result.shipping).toBe(20000);
      expect(result.total).toBe(170000);
    });
  });
});

