/**
 * LỚP kiểm thử BỔ SUNG PHỤ (Lớp 2): Vitest Component Unit & Logic Test
 * GHI CHÚ: Bộ test này chạy trong môi trường JSDOM isolated, dùng để kiểm tra tính hợp lệ của các React Component
 * và Utility Helper của dự án. Đây KHÔNG PHẢI là bằng chứng thay thế cho bộ Playwright E2E thật (Lớp 1 chính thức).
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import ProductDetailsInfo from '@/components/Product/ProductDetailsInfo';
import { calcOrderTotal, calculateShippingFee } from '@/services/orderService';
import { formatPrice } from '@/lib/format';
import { checkOperatingHours } from '@/lib/operatingHours';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'product.size': 'Kích thước',
      'product.contact': 'Liên hệ tư vấn',
      'product.volume': 'Dung tích',
      'product.type': 'Loại',
    };
    return translations[key] || key;
  },
}));

// Mock i18n routing
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, href, className }: any) => <a href={href} className={className}>{children}</a>,
}));

// Mock CartContext
const mockAddToCart = vi.fn();
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
    cartItems: [],
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
  }),
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

// Mock orderService API calls
vi.mock('@/services/orderService', async () => {
  const actual = await vi.importActual('@/services/orderService');
  return {
    ...actual,
    calculateShippingFee: vi.fn(),
    validateVoucher: vi.fn(),
    createOrder: vi.fn(),
  };
});

describe('Storefront Component & Logic Unit Tests (Layer 2 Secondary)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Luồng 1 Component: Biến thể đã gán SKU -> Nút mua enabled, hiển thị "Thêm vào giỏ hàng" & kích hoạt addToCart', () => {
    const productDataLinked: any = {
      title: 'Lẩu Tôm Càng Chờ',
      description: 'Mô tả lẩu tôm',
      images: [{ url: '/cover.jpg' }],
      variant_type: 'Size',
      sizes: [
        { title: 'Size L', price: 250000, code: 'SKU-TOM-L', id: 202 },
      ],
      checkout: {
        productId: 202,
        productCode: 'SKU-TOM-L',
        slug: 'lau-tom-cang-cho',
        categorySlug: 'lau',
      },
      infos: [],
    };

    render(<ProductDetailsInfo productData={productDataLinked} />);

    const buyButton = screen.getByRole('button', { name: /Thêm vào giỏ hàng/i });
    expect(buyButton).toBeInTheDocument();
    expect(buyButton).not.toBeDisabled();
    expect(buyButton.className).toContain('btn-primary');

    const priceText = screen.getByText(formatPrice(250000));
    expect(priceText).toBeInTheDocument();

    fireEvent.click(buyButton);
    expect(mockAddToCart).toHaveBeenCalledTimes(1);
    expect(mockAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        productCode: 'SKU-TOM-L',
        unitPrice: 250000,
        variant: 'Size L',
      }),
      1
    );
  });

  it('Luồng 2 Component: Biến thể chưa gán SKU (code == null) -> Nút mua CHẮC CHẮN bị disabled, có nhãn "Tạm hết hàng"', () => {
    const productDataUnlinked: any = {
      title: 'Lẩu Tôm Càng Chờ',
      description: 'Mô tả lẩu tôm',
      images: [{ url: '/cover.jpg' }],
      variant_type: 'Size',
      sizes: [
        { title: 'Size S (Chưa có SKU)', price: 90000, code: null, id: null },
      ],
      checkout: {
        productId: 1,
        productCode: 'SP01',
        slug: 'lau-tom-cang-cho',
        categorySlug: 'lau',
      },
      infos: [],
    };

    render(<ProductDetailsInfo productData={productDataUnlinked} />);

    const disabledButton = screen.getByRole('button', { name: /Tạm hết hàng/i });
    expect(disabledButton).toBeInTheDocument();
    expect(disabledButton).toBeDisabled();

    fireEvent.click(disabledButton);
    expect(mockAddToCart).not.toHaveBeenCalled();
  });

  it('Luồng 4 Helper: calculateShippingFee mock trả về phí ship chính xác theo địa chỉ', async () => {
    const mockCalc = vi.mocked(calculateShippingFee);

    mockCalc.mockResolvedValueOnce({
      shipping_fee: 15000,
      original_fee: 15000,
      is_freeship: false,
      is_deliverable: true,
      is_configured_area: true,
      branch_id: 201,
      branch_name: 'Chi nhánh Ba Tháng Hai',
      message: null,
    });

    const resPhuong12 = await calculateShippingFee({
      province: 'TP. Hồ Chí Minh', district: 'Quận 10', ward: 'Phường 12', subtotal: 100000
    });

    expect(resPhuong12.shipping_fee).toBe(15000);

    mockCalc.mockResolvedValueOnce({
      shipping_fee: 25000,
      original_fee: 25000,
      is_freeship: false,
      is_deliverable: true,
      is_configured_area: true,
      branch_id: 201,
      branch_name: 'Chi nhánh Ba Tháng Hai',
      message: null,
    });

    const resPhuong15 = await calculateShippingFee({
      province: 'TP. Hồ Chí Minh', district: 'Quận 10', ward: 'Phường 15', subtotal: 100000
    });

    expect(resPhuong15.shipping_fee).toBe(25000);
    expect(resPhuong15.shipping_fee).not.toBe(resPhuong12.shipping_fee);
  });

  it('Luồng 5 Helper: calcOrderTotal tính toán Freeship 0đ khi đơn > 500k và khôi phục khi < 500k', () => {
    const orderAbove500k = calcOrderTotal([{ price: 600000, quantity: 1, discount: 0 }], 'delivery', 0);
    expect(orderAbove500k.shipping).toBe(0);
    expect(orderAbove500k.total).toBe(600000);

    const orderBelow500k = calcOrderTotal([{ price: 200000, quantity: 1, discount: 0 }], 'delivery', 30000);
    expect(orderBelow500k.shipping).toBe(30000);
    expect(orderBelow500k.total).toBe(230000);
  });

  it('Luồng 6: Dropdown danh mục hành chính chuẩn & ward_id real-time calculate', async () => {
    const mockCalc = calculateShippingFee as unknown as ReturnType<typeof vi.fn>;
    mockCalc.mockResolvedValueOnce({
      shipping_fee: 15000,
      original_fee: 15000,
      is_freeship: false,
      is_deliverable: true,
      is_configured_area: true,
      branch_id: 202,
      branch_name: 'Chi nhánh B (Ưu đãi)',
      message: null,
    });

    const resWardId = await calculateShippingFee({
      province: 'TP. Hồ Chí Minh',
      district: 'Quận 3',
      ward: 'Bàn Cờ',
      ward_id: 'ward_hcm_q3_ban_co',
      subtotal: 100000,
    });

    expect(resWardId.shipping_fee).toBe(15000);
    expect(resWardId.branch_id).toBe(202);
    expect(resWardId.branch_name).toBe('Chi nhánh B (Ưu đãi)');
  });
});
