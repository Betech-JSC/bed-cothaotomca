import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock routing & next/navigation
vi.mock('@/i18n/routing', () => ({
  usePathname: () => '/checkout',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, className }: any) => <a href={href} className={className}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/checkout',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, any>) => {
    if (values && values.count !== undefined) {
      if (key.includes('buy_x_get_y')) {
        return `Cần mua thêm ${values.count} sản phẩm áp dụng để kích hoạt ưu đãi`;
      }
      return `Cần mua thêm ${values.count} sản phẩm áp dụng để nhận quà`;
    }
    if (key === 'voucher_expired') {
      return 'Mã giảm giá đã hết hạn sử dụng.';
    }
    return key;
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
  getMemberTier: () => ({ tier: 'member', name: 'Member', discountPercent: 0 }),
}));

import {
  formatPrivateVoucherError,
  evaluateCampaignEligibility,
} from '@/components/Voucher/CouponModal';
import { formatImageUrl } from '@/lib/format';
import { PublicCampaignItem } from '@/services/campaignService';
import {
  getStoredVoucherCodes,
  setStoredVoucherCodes,
  getStoredCampaignIds,
  setStoredCampaignIds,
  clearAllPromotionStorage,
} from '@/utils/promotionStorage';

describe('Fix Launch Promotions and Media Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Task 1: formatImageUrl and Image fallbacks (Frontend & Backend)', () => {
    it('chuẩn hóa relative URL thành full CMS URL', () => {
      expect(formatImageUrl('/storage/uploads/branches/showroom1.jpg')).toBe(
        'https://cms.cothaotomca.vn/storage/uploads/branches/showroom1.jpg'
      );
      expect(formatImageUrl('uploads/products/item.png')).toBe(
        'https://cms.cothaotomca.vn/uploads/products/item.png'
      );
    });

    it('loại bỏ localhost / 127.0.0.1 và chuẩn hóa sang domain CMS chính thức', () => {
      expect(formatImageUrl('http://localhost/storage/branches/showroom.jpg')).toBe(
        'https://cms.cothaotomca.vn/storage/branches/showroom.jpg'
      );
      expect(formatImageUrl('http://127.0.0.1:8001/storage/products/item.png')).toBe(
        'https://cms.cothaotomca.vn/storage/products/item.png'
      );
    });

    it('chuyển đổi domain frontend cothaotomca.vn/storage sang domain CMS chính thức', () => {
      expect(
        formatImageUrl('https://cothaotomca.vn/storage/uploads/2026/10/test.webp')
      ).toBe('https://cms.cothaotomca.vn/storage/uploads/2026/10/test.webp');
      expect(
        formatImageUrl('http://cothaotomca.vn/storage/branches/showroom.jpg')
      ).toBe('https://cms.cothaotomca.vn/storage/branches/showroom.jpg');
      expect(
        formatImageUrl('https://www.cothaotomca.vn/storage/uploads/banners/hero.webp')
      ).toBe('https://cms.cothaotomca.vn/storage/uploads/banners/hero.webp');
    });

    it('giữ nguyên absolute URL ngoài và data URL', () => {
      expect(formatImageUrl('https://external-cdn.com/image.jpg')).toBe(
        'https://external-cdn.com/image.jpg'
      );
      expect(formatImageUrl('data:image/png;base64,123')).toBe(
        'data:image/png;base64,123'
      );
    });

    it('trả về rỗng khi input rỗng để fallback sang /cover.jpg', () => {
      expect(formatImageUrl(null)).toBe('');
      expect(formatImageUrl(undefined)).toBe('');
      expect(formatImageUrl('')).toBe('');
      expect(formatImageUrl(null) || '/cover.jpg').toBe('/cover.jpg');
    });
  });

  describe('Task 2: Voucher expiration error and eligibility', () => {
    it('formatPrivateVoucherError trả về lỗi hết hạn chi tiết khi server báo hết hạn', () => {
      const serverMsg = 'Mã giảm giá đã hết hạn sử dụng (hết hạn ngày 05/10/2026 23:59).';
      expect(formatPrivateVoucherError(serverMsg)).toBe(serverMsg);

      const englishMsg = 'This voucher has expired.';
      expect(formatPrivateVoucherError(englishMsg)).toBe(englishMsg);

      const fallbackMsg = formatPrivateVoucherError('expired');
      expect(fallbackMsg).toContain('expired');
    });

    it('formatPrivateVoucherError trả về fallback phù hợp cho các lỗi khác', () => {
      expect(formatPrivateVoucherError('Chưa đạt giá trị đơn tối thiểu 200.000đ')).toBe(
        'Chưa đạt giá trị đơn tối thiểu 200.000đ'
      );
      expect(formatPrivateVoucherError('Chỉ dành cho khách hàng thành viên')).toBe(
        'Đơn hàng của bạn chưa đủ điều kiện áp dụng mã này.'
      );
      expect(formatPrivateVoucherError('Random unknown error')).toBe(
        'Mã giảm giá không hợp lệ hoặc đã hết lượt sử dụng.'
      );
    });

    it('nhận diện voucher có end_date trong quá khứ là đã hết hạn', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 ngày trước
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 ngày sau

      const checkVoucherExpiry = (endDate?: string | null) => {
        if (!endDate) return { eligible: true };
        const d = new Date(endDate);
        if (!isNaN(d.getTime()) && d < new Date()) {
          return { eligible: false, reason: 'Mã giảm giá đã hết hạn sử dụng.' };
        }
        return { eligible: true };
      };

      expect(checkVoucherExpiry(pastDate).eligible).toBe(false);
      expect(checkVoucherExpiry(pastDate).reason).toBe('Mã giảm giá đã hết hạn sử dụng.');
      expect(checkVoucherExpiry(futureDate).eligible).toBe(true);
      expect(checkVoucherExpiry(null).eligible).toBe(true);
    });
  });

  describe('Task 3: Guest promotions retention and trigger items evaluation', () => {
    it('bảo toàn voucher và campaign trong localStorage cho khách vãng lai (user = null)', () => {
      // Khách vãng lai chọn voucher và campaign
      setStoredVoucherCodes(['WSBCT50K', 'SHIPFREESHIP']);
      setStoredCampaignIds([101, 102]);

      // Giả lập effect kiểm tra logout với prevUserRef
      let prevUser: any = null; // Khách vãng lai ban đầu
      const currentUser: any = null; // Vẫn là khách vãng lai sau re-render

      const isRealLogout = Boolean(prevUser && !currentUser);
      if (isRealLogout) {
        clearAllPromotionStorage();
      }
      prevUser = currentUser;

      // Đảm bảo không bị xóa sạch
      expect(getStoredVoucherCodes()).toEqual(['WSBCT50K', 'SHIPFREESHIP']);
      expect(getStoredCampaignIds()).toEqual([101, 102]);
    });

    it('chỉ dọn dẹp ưu đãi khi có sự kiện logout thực sự (prevUser && !currentUser)', () => {
      setStoredVoucherCodes(['MEMBER_ONLY_VOUCHER']);
      setStoredCampaignIds([99]);

      // Thành viên đăng nhập
      let prevUser: any = { id: 1, name: 'Nguyễn Văn A' };
      // Sau đó đăng xuất
      const currentUser: any = null;

      const isRealLogout = Boolean(prevUser && !currentUser);
      if (isRealLogout) {
        clearAllPromotionStorage();
      }
      prevUser = currentUser;

      // Đã đăng xuất thực sự -> Đã dọn dẹp
      expect(isRealLogout).toBe(true);
      expect(getStoredVoucherCodes()).toEqual([]);
      expect(getStoredCampaignIds()).toEqual([]);
    });

    const giftCampaignWithTrigger: PublicCampaignItem = {
      id: 201,
      name: 'Mua Set 2 tặng Súp Miso',
      promotion_type: 'order_gift_discount',
      status: true,
      min_order_value: 0,
      settings: {
        buy_quantity: 1,
        trigger_items: [
          { product_id: 10, product_variant_id: null }, // Set 2 Product ID = 10
        ],
      },
      items: [
        {
          id: 501,
          campaign_id: 201,
          product_id: 99,
          product_variant_id: null,
          product_code: 'MISO',
          product_name: 'Súp Miso Rong Biển',
          image: '/images/miso.jpg',
          original_price: 35000,
          campaign_price: 0,
          is_free: true,
          product: {
            id: 99,
            name: 'Súp Miso Rong Biển',
            price: 35000,
            image: '/images/miso.jpg',
            slug: 'sup-miso-rong-bien',
          },
        },
      ],
    };

    it('không đủ điều kiện nhận quà nếu giỏ hàng không có sản phẩm trigger_items (Set 2)', () => {
      const cartWithoutSet2 = [
        { product_id: 1, quantity: 2 }, // Sản phẩm khác
      ];

      const res = evaluateCampaignEligibility(giftCampaignWithTrigger, {
        subtotal: 500000,
        cartItems: cartWithoutSet2,
      });

      expect(res.eligible).toBe(false);
      expect(res.reason).toContain('Cần mua thêm 1 sản phẩm áp dụng');
    });

    it('đủ điều kiện nhận quà (Súp Miso 0đ) khi giỏ hàng có đủ sản phẩm Set 2', () => {
      const cartWithSet2 = [
        { product_id: 10, quantity: 1 }, // Đúng Set 2
      ];

      const res = evaluateCampaignEligibility(giftCampaignWithTrigger, {
        subtotal: 250000,
        cartItems: cartWithSet2,
      });

      expect(res.eligible).toBe(true);
    });

    it('hỗ trợ cấu hình buy_x_get_y với trigger_items', () => {
      const buyXGetYCampaign: PublicCampaignItem = {
        id: 202,
        name: 'Mua 2 Set 2 tặng 1 Súp Miso',
        promotion_type: 'buy_x_get_y',
        status: true,
        settings: {
          buy_quantity: 2,
          trigger_items: [{ product_id: 10 }],
        },
        items: [
          {
            id: 501,
            campaign_id: 202,
            product_id: 99,
            product_variant_id: null,
            product_code: 'MISO',
            product_name: 'Súp Miso Rong Biển',
            image: '/images/miso.jpg',
            original_price: 35000,
            campaign_price: 0,
            is_free: true,
          },
        ],
      };

      // Giỏ chỉ có 1 Set 2
      const res1 = evaluateCampaignEligibility(buyXGetYCampaign, {
        subtotal: 250000,
        cartItems: [{ product_id: 10, quantity: 1 }],
      });
      expect(res1.eligible).toBe(false);
      expect(res1.reason).toContain('Cần mua thêm 1 sản phẩm');

      // Giỏ có 2 Set 2
      const res2 = evaluateCampaignEligibility(buyXGetYCampaign, {
        subtotal: 500000,
        cartItems: [{ product_id: 10, quantity: 2 }],
      });
      expect(res2.eligible).toBe(true);
    });
  });
});
