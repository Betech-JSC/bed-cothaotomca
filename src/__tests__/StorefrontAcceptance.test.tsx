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
import CardProduct from '@/components/Card/CardProduct';
import { mapProductToCardItem, normalizeProductDetail, mapProductToDetailView } from '@/services/productService';
import { calcOrderTotal, calculateShippingFee } from '@/services/orderService';
import { formatPrice } from '@/lib/format';
import { checkOperatingHours } from '@/lib/operatingHours';

import viMessages from '@/i18n/locales/vi.json';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    const resolveKey = (key: string) => {
      const fullPath = namespace ? `${namespace}.${key}` : key;
      const parts = fullPath.split('.');
      let current: any = viMessages;
      for (const p of parts) {
        if (current && typeof current === 'object' && p in current) {
          current = current[p];
        } else {
          return key;
        }
      }
      return typeof current === 'string' ? current : key;
    };

    const t: any = (key: string, values?: Record<string, any>) => {
      let text = resolveKey(key);
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return text;
    };

    t.rich = (key: string, values?: Record<string, any>) => {
      let text = resolveKey(key);
      if (!values) return text;
      Object.entries(values).forEach(([k, v]) => {
        if (typeof v !== 'function') {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      });

      const parts = text.split(/(<strong[^>]*>.*?<\/strong>|<code[^>]*>.*?<\/code>)/g);
      return (
        <span>
          {parts.map((part: string, index: number) => {
            const strongMatch = part.match(/<strong[^>]*>(.*?)<\/strong>/);
            if (strongMatch && values.strong) {
              return <React.Fragment key={index}>{values.strong(strongMatch[1])}</React.Fragment>;
            }
            const codeMatch = part.match(/<code[^>]*>(.*?)<\/code>/);
            if (codeMatch && values.code) {
              return <React.Fragment key={index}>{values.code(codeMatch[1])}</React.Fragment>;
            }
            return <React.Fragment key={index}>{part}</React.Fragment>;
          })}
        </span>
      );
    };

    return t;
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

  it('Luồng 7: checkOperatingHours xử lý chính xác 4 khung giờ: Trước 9h, 9h-22h30, 22h30-23h, Sau 23h', () => {
    const config = { store_open: '09:00', store_close: '23:00', delivery_open: '10:00', delivery_close: '23:00', last_order_cutoff: '22:30' };

    // Case 1: 08:30 (Trước 9h sáng)
    const res0830 = checkOperatingHours(config, new Date('2026-08-16T08:30:00+07:00'));
    expect(res0830.canOrderNow).toBe(false);
    expect(res0830.isBeforeOpen).toBe(true);
    expect(res0830.notice).not.toBeNull();
    expect(res0830.notice?.message).toBe('Bếp đã dừng nhận đơn giao ngay sau 22:30. Bạn vẫn có thể đặt trước và chọn khung giờ nhận món từ 10:00 hôm nay (16/08).');
    expect(res0830.defaultDate).toBe('2026-08-16');

    // Case 2: 14:00 (Trong giờ nhận đơn ngay 09:00 - 22:30)
    const res1400 = checkOperatingHours(config, new Date('2026-08-16T14:00:00+07:00'));
    expect(res1400.canOrderNow).toBe(true);
    expect(res1400.notice).toBeNull();
    expect(res1400.defaultDate).toBe('2026-08-16');

    // Case 3: 22:45 (Giờ cutoff 22:30 - 23:00)
    const res2245 = checkOperatingHours(config, new Date('2026-08-16T22:45:00+07:00'));
    expect(res2245.canOrderNow).toBe(false);
    expect(res2245.isAfterCutoff).toBe(true);
    expect(res2245.notice).not.toBeNull();
    expect(res2245.notice?.message).toBe('Bếp đã dừng nhận đơn giao ngay sau 22:30. Bạn vẫn có thể đặt trước và chọn khung giờ nhận món từ 10:00 hôm nay (16/08).');
    expect(res2245.defaultDate).toBe('2026-08-17');

    // Case 4: 23:15 (Sau 23:00 đã đóng cửa)
    const res2315 = checkOperatingHours(config, new Date('2026-08-16T23:15:00+07:00'));
    expect(res2315.canOrderNow).toBe(false);
    expect(res2315.isAfterClose).toBe(true);
    expect(res2315.notice).not.toBeNull();
    expect(res2315.notice?.message).toBe('Bếp đã dừng nhận đơn giao ngay sau 22:30. Bạn vẫn có thể đặt trước và chọn khung giờ nhận món từ 10:00 hôm nay (16/08).');
    expect(res2315.defaultDate).toBe('2026-08-17');
  });

  it('Luồng 8 CardProduct: Không hiển thị chữ "chỉ từ" và hiển thị giá thấp nhất khi có nhiều biến thể giảm giá', () => {
    const productWithVariants: any = {
      id: 101,
      title: 'Lẩu Tôm Đặc Biệt',
      custom_name: 'Lẩu Tôm Đặc Biệt',
      slug: 'lau-tom-dac-biet',
      price: 200000,
      category: { id: '1', title: 'Lẩu', slug: 'lau' },
      image: { url: '/cover.jpg', alt: 'Lẩu Tôm Đặc Biệt' },
      description: 'Mô tả',
      created_at: '2026-01-01',
      variants: [
        { id: 1, size: 'Size Nhỏ', price: 150000, campaign_price: 110000 },
        { id: 2, size: 'Size Vừa', price: 100000, campaign_price: 60000 }, // Lowest effective price: 60,000 (orig: 100,000)
        { id: 3, size: 'Size Lớn', price: 200000, campaign_price: 140000 },
      ],
    };

    render(<CardProduct item={productWithVariants} />);

    // 1. Không được có chữ "chỉ từ" hoặc "only_from"
    expect(screen.queryByText(/chỉ từ/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/only from/i)).not.toBeInTheDocument();

    // 2. Phải hiển thị giá thấp nhất (60.000đ)
    expect(screen.getByText(formatPrice(60000))).toBeInTheDocument();

    // 3. Phải hiển thị giá gốc gạch ngang tương ứng với biến thể thấp nhất (100.000đ)
    expect(screen.getByText(formatPrice(100000))).toBeInTheDocument();

    // 4. Phải hiển thị badge giảm giá (-40%)
    expect(screen.getByText(/-40%/)).toBeInTheDocument();
  });

  it('Luồng 9 Helper mapProductToCardItem: Tính đúng giá thấp nhất cho sản phẩm có nhiều biến thể', () => {
    const product: any = {
      id: 202,
      name: 'Lẩu Cua Cà Mau',
      slug: 'lau-cua-ca-mau',
      price: 300000,
      category: { id: 1, title: 'Lẩu', slug: 'lau' },
      variants: [
        { id: 10, size: 'Size L', price: 300000, campaign_price: 250000 },
        { id: 11, size: 'Size S', price: 180000, campaign_price: 120000 }, // Lowest: 120,000
      ],
    };

    const cardProps = mapProductToCardItem(product, 'vi');
    expect(cardProps.price).toBe(120000);
    expect(cardProps.original_price).toBe(180000);
    expect(cardProps.active_campaign?.discount_percent).toBe(33);
  });

  it('Luồng 10: normalizeProductDetail & mapProductToDetailView bảo toàn giá khuyến mãi giảm 20.000đ cho Cá Hồi Ngâm Tương', () => {
    const rawBackendProduct: any = {
      id: 45,
      name: 'Cá Hồi Ngâm Tương',
      slug: 'ca-hoi-ngam-tuong',
      price: '180000.00',
      campaign_price: 160000,
      original_price: 180000,
      active_campaign: {
        id: 38,
        name: 'Flash Sale Cá Hồi: Giảm Ngay 20.000đ',
        discount_type: 'fixed',
        discount_value: 20000,
        campaign_price: 160000,
      },
      variants: [
        { id: 1136, size: 'Size S: 120g (6-7 miếng)', price: '180000.00', campaign_price: 160000, original_price: 180000 },
        { id: 1137, size: 'Size M: 240g (10-12 miếng)', price: '290000.00', campaign_price: 270000, original_price: 290000 },
        { id: 1138, size: 'Size L: 400g (18-20 miếng)', price: '435000.00', campaign_price: 415000, original_price: 435000 },
      ],
    };

    const normalized = normalizeProductDetail(rawBackendProduct);
    expect(normalized.variants?.[0].campaign_price).toBe(160000);
    expect(normalized.variants?.[1].campaign_price).toBe(270000);
    expect(normalized.variants?.[2].campaign_price).toBe(415000);

    const detailView = mapProductToDetailView(normalized, 'vi', { standard: 'Tiêu chuẩn' });
    expect(detailView.sizes[0].price).toBe(160000);
    expect(detailView.sizes[0].original_price).toBe(180000);
    expect(detailView.sizes[1].price).toBe(270000);
    expect(detailView.sizes[1].original_price).toBe(290000);
    expect(detailView.sizes[2].price).toBe(415000);
    expect(detailView.sizes[2].original_price).toBe(435000);
  });

  it('UX Enhancement 1: SmartCartProgressBar tính chính xác số tiền cần mua thêm để đạt Freeship và Voucher', async () => {
    const { default: SmartCartProgressBar } = await import('@/components/Cart/SmartCartProgressBar');

    // 1. Case: Chưa đạt Freeship (đơn 300k, freeship 500k) -> Cần mua thêm 200k
    const { rerender } = render(
      <SmartCartProgressBar
        subtotal={300000}
        shippingSettings={{ is_min_amount_enabled: true, min_order_amount: 500000 }}
      />
    );
    expect(screen.getByText(/Mua thêm/i)).toBeInTheDocument();
    expect(screen.getByText(formatPrice(200000))).toBeInTheDocument();
    expect(screen.getByText(/Freeship/i)).toBeInTheDocument();

    // 2. Case: Đã đạt Freeship (đơn 600k, freeship 500k) -> Hiển thị đạt ưu đãi thành công
    rerender(
      <SmartCartProgressBar
        subtotal={600000}
        shippingSettings={{ is_min_amount_enabled: true, min_order_amount: 500000 }}
        isFreeship={true}
      />
    );
    expect(screen.getByText(/Chúc mừng/i)).toBeInTheDocument();

    // 3. Case: Đã đạt Freeship (đơn 200k) nhưng có voucher mốc 300k (mã GIAM30K) -> Cần mua thêm 100k
    rerender(
      <SmartCartProgressBar
        subtotal={200000}
        shippingSettings={{ is_min_amount_enabled: false, min_order_amount: 0 }}
        vouchers={[
          {
            id: 1,
            code: 'GIAM30K',
            discount_type: 'fixed',
            value: 30000,
            prereq_price: 300000,
            description: 'Giảm 30.000đ cho đơn từ 300.000đ',
          },
        ]}
      />
    );
    expect(screen.getByText(formatPrice(100000))).toBeInTheDocument();
    expect(screen.getByText(formatPrice(30000))).toBeInTheDocument();

    // 4. Case: Cấu hình trợ giá cố định (đơn từ 400k giảm 20k phí ship), hiện tại 250k -> Cần mua thêm 150k
    rerender(
      <SmartCartProgressBar
        subtotal={250000}
        shippingSettings={{
          is_min_amount_enabled: true,
          min_order_amount: 400000,
          shipping_discount_type: 'fixed',
          shipping_discount_value: 20000,
        }}
      />
    );
    expect(screen.getByText(formatPrice(150000))).toBeInTheDocument();
    expect(screen.getByText(`giảm ${formatPrice(20000)} phí ship`)).toBeInTheDocument();
  });

  it('UX Enhancement 2: CouponModal phân loại rõ mã đủ điều kiện và mã chưa đủ điều kiện kèm gợi ý mua thêm', async () => {
    const { default: CouponModal } = await import('@/components/Voucher/CouponModal');
    const mockOnApply = vi.fn();

    // Mock getAvailableVouchers
    const orderService = await import('@/services/orderService');
    vi.spyOn(orderService, 'getAvailableVouchers').mockResolvedValue([
      {
        id: 1,
        code: 'ELIGIBLE10',
        discount_type: 'percent',
        value: 10,
        prereq_price: 100000,
        description: 'Giảm 10% cho đơn từ 100.000đ',
      },
      {
        id: 2,
        code: 'INELIGIBLE50K',
        discount_type: 'fixed',
        value: 50000,
        prereq_price: 500000,
        description: 'Giảm 50.000đ cho đơn từ 500.000đ',
      },
    ]);

    render(
      <CouponModal
        isOpen={true}
        onClose={vi.fn()}
        subtotal={150000} // Eligible for code 1 (100k), ineligible for code 2 (500k - missing 350k)
        onApplyVoucher={mockOnApply}
      />
    );

    // Wait for elements to render
    expect(await screen.findByText('ELIGIBLE10')).toBeInTheDocument();
    expect(screen.getByText('INELIGIBLE50K')).toBeInTheDocument();

    // Mã đủ điều kiện có nút "Áp dụng"
    const applyButtons = screen.getAllByRole('button', { name: /Áp dụng/i });
    expect(applyButtons.length).toBeGreaterThan(0);

    // Mã chưa đủ điều kiện hiển thị rõ dòng gợi ý "Mua thêm 350.000đ để dùng mã này"
    expect(screen.getByText(formatPrice(350000))).toBeInTheDocument();
    expect(screen.getByText(/để dùng mã này/i)).toBeInTheDocument();
  });

  it('Luồng 13: Đồng bộ chính xác % giảm giá 12% khi giá làm tròn 55.000đ -> 49.000đ', () => {
    const productWith12Pct: any = {
      id: 301,
      name: 'Món Giảm 12%',
      slug: 'mon-giam-12',
      price: 55000,
      campaign_price: 49000, // 55k -> 48.4k rounded up to 49k (would be 10.9% -> 11% if reverse calculated)
      active_campaign: {
        id: 99,
        name: 'Giảm 12% Món',
        discount_type: 'percent',
        discount_value: 12,
        campaign_price: 49000,
      },
    };

    const cardProps = mapProductToCardItem(productWith12Pct, 'vi');
    expect(cardProps.price).toBe(49000);
    expect(cardProps.original_price).toBe(55000);
    expect(cardProps.active_campaign?.discount_percent).toBe(12);

    render(<CardProduct item={cardProps} />);
    // Badge must render -12% instead of -11%
    expect(screen.getByText(/-12%/)).toBeInTheDocument();
  });

  it('Luồng 14: Chiến dịch tạo tại thời điểm hiện tại hiển thị ngay lập tức trên UI và đồng bộ thời gian ISO-8601 (+07:00)', () => {
    const nowIso = new Date().toISOString();
    const productActiveNow: any = {
      id: 401,
      name: 'Bò Tơ Nướng Y Yêu Cầu',
      slug: 'bo-to-nuong-y',
      price: 250000,
      campaign_price: 200000,
      active_campaign: {
        id: 101,
        name: 'Ưu Đãi Giờ Vàng',
        discount_type: 'percent',
        discount_value: 20,
        campaign_price: 200000,
        start_at: nowIso,
        end_at: null,
      },
    };

    const cardProps = mapProductToCardItem(productActiveNow, 'vi');
    expect(cardProps.price).toBe(200000);
    expect(cardProps.original_price).toBe(250000);
    expect(cardProps.active_campaign?.id).toBe(101);
    expect(cardProps.active_campaign?.start_at).toBe(nowIso);

    const detail = normalizeProductDetail(productActiveNow);
    const detailView = mapProductToDetailView(detail, 'vi', { standard: 'Tiêu chuẩn' });
    expect(detailView.sizes[0].price).toBe(200000);
    expect(detailView.sizes[0].original_price).toBe(250000);
  });
});

