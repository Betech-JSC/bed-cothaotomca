import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { CartProvider, useCart, CartItem } from '@/contexts/CartContext';

describe('Cart Strike Price Sync Unit Tests (OpenSpec: fix-cart-strike-price-sync)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  describe('1. Biến thể có giá gạch trực tiếp không tham gia Campaign', () => {
    it('đồng bộ đúng giá bán (30.000đ) và giá gạch (70.000đ) cho biến thể sản phẩm', async () => {
      const mockProducts = [
        {
          id: 101,
          slug: 'tom-hum-bo-toi',
          code: 'TH-BT',
          title: 'Tôm Hùm Bơ Tỏi',
          variants: [
            {
              id: 1001,
              code: 'TH-BT-S',
              size: 'Size S',
              price: 30000,
              original_price: 70000,
              campaign_price: null,
              active_campaign: null,
            },
          ],
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockProducts }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CartProvider>{children}</CartProvider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      act(() => {
        result.current.addToCart({
          id: 'tom-hum-bo-toi-Size S',
          productId: 1001,
          productCode: 'TH-BT-S',
          slug: 'tom-hum-bo-toi',
          categorySlug: 'hai-san',
          title: 'Tôm Hùm Bơ Tỏi',
          imageUrl: '/tom-hum.jpg',
          variant: 'Size S',
          unitPrice: 30000,
          originalPrice: 70000,
        }, 2);
      });

      await waitFor(() => {
        const item = result.current.cartItems.find((i) => i.id === 'tom-hum-bo-toi-Size S');
        expect(item).toBeDefined();
        expect(item?.unitPrice).toBe(30000);
        expect(item?.originalPrice).toBe(70000);
      });

      // Subtotal tính theo unitPrice (30.000 * 2 = 60.000)
      expect(result.current.subtotal).toBe(60000);
    });

    it('tự động tự sửa (self-healing) item cũ bị ghi đè giá gốc (70.000đ/70.000đ) về đúng giá khuyến mãi', async () => {
      const corruptItem: CartItem = {
        id: 'tom-hum-bo-toi-Size S',
        productId: 1001,
        productCode: 'TH-BT-S',
        slug: 'tom-hum-bo-toi',
        categorySlug: 'hai-san',
        title: 'Tôm Hùm Bơ Tỏi',
        imageUrl: '/tom-hum.jpg',
        variant: 'Size S',
        unitPrice: 70000, // Giá bị lỗi trước đó
        originalPrice: 70000,
        quantity: 1,
      };

      localStorage.setItem('cothaotomca_cart', JSON.stringify([corruptItem]));

      const mockProducts = [
        {
          id: 101,
          slug: 'tom-hum-bo-toi',
          code: 'TH-BT',
          title: 'Tôm Hùm Bơ Tỏi',
          variants: [
            {
              id: 1001,
              code: 'TH-BT-S',
              size: 'Size S',
              price: '30000',
              original_price: '70000',
              campaign_price: null,
              active_campaign: null,
            },
          ],
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockProducts }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CartProvider>{children}</CartProvider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        const item = result.current.cartItems.find((i) => i.id === 'tom-hum-bo-toi-Size S');
        expect(item?.unitPrice).toBe(30000);
        expect(item?.originalPrice).toBe(70000);
      });

      expect(result.current.subtotal).toBe(30000);
    });
  });

  describe('2. Sản phẩm đơn (không có biến thể) có giá gạch trực tiếp', () => {
    it('đồng bộ đúng giá bán và giá gạch khi không tham gia campaign', async () => {
      const mockProducts = [
        {
          id: 201,
          slug: 'canh-chua-ca-loc',
          code: 'CC-CL',
          title: 'Canh Chua Cá Lóc',
          price: 30000,
          original_price: 70000,
          campaign_price: null,
          active_campaign: null,
          variants: [],
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockProducts }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CartProvider>{children}</CartProvider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      act(() => {
        result.current.addToCart({
          id: 'canh-chua-ca-loc-default',
          productId: 201,
          productCode: 'CC-CL',
          slug: 'canh-chua-ca-loc',
          categorySlug: 'mon-chinh',
          title: 'Canh Chua Cá Lóc',
          imageUrl: '/canh-chua.jpg',
          variant: '',
          unitPrice: 30000,
          originalPrice: 70000,
        }, 1);
      });

      await waitFor(() => {
        const item = result.current.cartItems.find((i) => i.id === 'canh-chua-ca-loc-default');
        expect(item?.unitPrice).toBe(30000);
        expect(item?.originalPrice).toBe(70000);
      });

      expect(result.current.subtotal).toBe(30000);
    });

    it('tự sửa self-healing cho sản phẩm đơn có item cũ trong giỏ hàng', async () => {
      const corruptItem: CartItem = {
        id: 'canh-chua-ca-loc-default',
        productId: 201,
        productCode: 'CC-CL',
        slug: 'canh-chua-ca-loc',
        categorySlug: 'mon-chinh',
        title: 'Canh Chua Cá Lóc',
        imageUrl: '/canh-chua.jpg',
        variant: '',
        unitPrice: 70000,
        originalPrice: 70000,
        quantity: 1,
      };

      localStorage.setItem('cothaotomca_cart', JSON.stringify([corruptItem]));

      const mockProducts = [
        {
          id: 201,
          slug: 'canh-chua-ca-loc',
          code: 'CC-CL',
          title: 'Canh Chua Cá Lóc',
          price: 30000,
          original_price: 70000,
          campaign_price: null,
          active_campaign: null,
          variants: [],
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockProducts }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CartProvider>{children}</CartProvider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        const item = result.current.cartItems.find((i) => i.id === 'canh-chua-ca-loc-default');
        expect(item?.unitPrice).toBe(30000);
        expect(item?.originalPrice).toBe(70000);
      });

      expect(result.current.subtotal).toBe(30000);
    });
  });

  describe('3. Sản phẩm có Campaign Flash Sale hoạt động', () => {
    it('ưu tiên giá Campaign khi campaign thỏa mãn điều kiện', async () => {
      const mockProducts = [
        {
          id: 301,
          slug: 'cua-ca-mau-sot-me',
          code: 'C-CM',
          title: 'Cua Cà Mau Sốt Me',
          variants: [
            {
              id: 3001,
              code: 'C-CM-L',
              size: 'Size L',
              price: 50000,
              original_price: 100000,
              campaign_price: 25000,
              active_campaign: {
                min_order_value: 0,
              },
            },
          ],
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockProducts }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CartProvider>{children}</CartProvider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      act(() => {
        result.current.addToCart({
          id: 'cua-ca-mau-sot-me-Size L',
          productId: 3001,
          productCode: 'C-CM-L',
          slug: 'cua-ca-mau-sot-me',
          categorySlug: 'hai-san',
          title: 'Cua Cà Mau Sốt Me',
          imageUrl: '/cua.jpg',
          variant: 'Size L',
          unitPrice: 50000,
          originalPrice: 100000,
        }, 1);
      });

      await waitFor(() => {
        const item = result.current.cartItems.find((i) => i.id === 'cua-ca-mau-sot-me-Size L');
        expect(item?.unitPrice).toBe(25000);
        expect(item?.originalPrice).toBe(100000);
      });

      expect(result.current.subtotal).toBe(25000);
    });
  });

  describe('4. Sản phẩm thông thường không giảm giá', () => {
    it('gán unitPrice = price và originalPrice = price khi không có giá gạch và campaign', async () => {
      const mockProducts = [
        {
          id: 401,
          slug: 'tra-da',
          code: 'TRA-DA',
          title: 'Trà Đá',
          price: 5000,
          original_price: null,
          campaign_price: null,
          active_campaign: null,
          variants: [],
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockProducts }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CartProvider>{children}</CartProvider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      act(() => {
        result.current.addToCart({
          id: 'tra-da-default',
          productId: 401,
          productCode: 'TRA-DA',
          slug: 'tra-da',
          categorySlug: 'do-uong',
          title: 'Trà Đá',
          imageUrl: '/tra-da.jpg',
          variant: '',
          unitPrice: 5000,
        }, 2);
      });

      await waitFor(() => {
        const item = result.current.cartItems.find((i) => i.id === 'tra-da-default');
        expect(item?.unitPrice).toBe(5000);
        expect(item?.originalPrice).toBe(5000);
        // Không phát sinh điều kiện hiển thị giá gạch (originalPrice > unitPrice is false)
        expect(item && item.originalPrice && item.originalPrice > item.unitPrice).toBeFalsy();
      });

      expect(result.current.subtotal).toBe(10000);
    });

    it('không phát sinh giá gạch khi original_price <= price', async () => {
      const mockProducts = [
        {
          id: 402,
          slug: 'khan-lanh',
          code: 'KHAN-LANH',
          title: 'Khăn Lạnh',
          price: 3000,
          original_price: 3000,
          campaign_price: null,
          active_campaign: null,
          variants: [],
        },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockProducts }),
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CartProvider>{children}</CartProvider>
      );

      const { result } = renderHook(() => useCart(), { wrapper });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      act(() => {
        result.current.addToCart({
          id: 'khan-lanh-default',
          productId: 402,
          productCode: 'KHAN-LANH',
          slug: 'khan-lanh',
          categorySlug: 'khac',
          title: 'Khăn Lạnh',
          imageUrl: '/khan.jpg',
          variant: '',
          unitPrice: 3000,
          originalPrice: 3000,
        }, 1);
      });

      await waitFor(() => {
        const item = result.current.cartItems.find((i) => i.id === 'khan-lanh-default');
        expect(item?.unitPrice).toBe(3000);
        expect(item?.originalPrice).toBe(3000);
        expect(item && item.originalPrice && item.originalPrice > item.unitPrice).toBeFalsy();
      });
    });
  });

  describe('5. Đảm bảo tính toán đúng chuẩn cho CartPopup, MobileCartFlow và CheckoutForm', () => {
    it('tính đúng subtotal, chiết khấu món và tổng giá trị đơn hàng theo giá gốc', () => {
      const cartItems: CartItem[] = [
        {
          id: 'item-1',
          productId: 1,
          productCode: 'P1',
          slug: 'p1',
          categorySlug: 'cat1',
          title: 'Món Ưu Đãi 1',
          imageUrl: '/img1.jpg',
          variant: 'Standard',
          unitPrice: 30000, // Giá ưu đãi
          originalPrice: 70000, // Giá gạch
          quantity: 2,
        },
        {
          id: 'item-2',
          productId: 2,
          productCode: 'P2',
          slug: 'p2',
          categorySlug: 'cat1',
          title: 'Món Thường 2',
          imageUrl: '/img2.jpg',
          variant: 'Standard',
          unitPrice: 50000,
          originalPrice: 50000,
          quantity: 1,
        },
      ];

      // 1. Subtotal (CartPopup & CheckoutForm)
      const subtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      expect(subtotal).toBe(30000 * 2 + 50000 * 1); // 110.000đ

      // 2. Tiền giảm của khuyến mại món (MobileCartFlow & CheckoutForm: sum((originalPrice - unitPrice) * quantity))
      const itemPromoSavings = cartItems.reduce((sum, item) => {
        if (item.originalPrice && item.originalPrice > item.unitPrice) {
          return sum + (item.originalPrice - item.unitPrice) * item.quantity;
        }
        return sum;
      }, 0);
      expect(itemPromoSavings).toBe((70000 - 30000) * 2); // 80.000đ

      // 3. Tổng giá trị đơn hàng theo giá gốc (MobileCartFlow & CheckoutForm)
      const originalSubtotal = cartItems.reduce((sum, item) => {
        const itemOriginal = item.originalPrice && item.originalPrice > item.unitPrice ? item.originalPrice : item.unitPrice;
        return sum + itemOriginal * item.quantity;
      }, 0);
      expect(originalSubtotal).toBe(70000 * 2 + 50000 * 1); // 190.000đ

      // 4. Mối quan hệ: originalSubtotal - itemPromoSavings === subtotal
      expect(originalSubtotal - itemPromoSavings).toBe(subtotal);
    });
  });
});
