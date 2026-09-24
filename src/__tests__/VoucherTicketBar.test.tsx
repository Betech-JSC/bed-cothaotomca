import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import VoucherTicketBar, {
  formatVoucherBadgeText,
  FoodTicketBadge,
  FreeshipTicketBadge,
} from '@/components/Checkout/VoucherTicketBar';
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

    return t;
  },
}));

describe('VoucherTicketBar Component Tests', () => {
  it('1. Trạng thái chưa chọn mã -> Hiển thị Brand Ticket icon, Tiêu đề và placeholder thanh lịch "Chọn hoặc nhập mã ›"', () => {
    const handleClick = vi.fn();
    render(
      <VoucherTicketBar
        appliedVoucher={null}
        appliedShippingVoucher={null}
        onClick={handleClick}
      />
    );

    // Tiêu đề chuẩn nhận diện
    expect(screen.getByText('Mã giảm giá (Voucher)')).toBeInTheDocument();

    // Placeholder
    expect(screen.getByText('Chọn hoặc nhập mã')).toBeInTheDocument();
    expect(screen.getByText('›')).toBeInTheDocument();

    // Brand Ticket SVG Icon hiện diện
    const svgIcon = document.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();

    // Thao tác 1 chạm: Click vào thanh kích hoạt callback mở modal
    const bar = screen.getByRole('button');
    fireEvent.click(bar);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('2. Trạng thái đã áp dụng 1 mã món ăn -> Hiển thị Ticket Badge món ăn màu cam đỏ #CD4829 và số tiền giảm', () => {
    const handleClick = vi.fn();
    const appliedFood = {
      id: 10,
      code: 'DISCOUNT76K',
      value: 76600,
      discountAmount: 76600,
      discountType: 'fixed' as const,
      isFreeship: false,
    };

    render(
      <VoucherTicketBar
        appliedVoucher={appliedFood}
        appliedShippingVoucher={null}
        onClick={handleClick}
      />
    );

    // Badge món ăn xuất hiện với số tiền giảm -76,6kđ
    const foodBadge = screen.getByTestId('food-ticket-badge');
    expect(foodBadge).toBeInTheDocument();
    expect(foodBadge).toHaveTextContent('-76,6kđ');

    // Chữ màu #CD4829, nền #FFF5F2
    expect(foodBadge.className).toContain('text-[#CD4829]');
    expect(foodBadge.className).toContain('bg-[#FFF5F2]');

    // Không còn placeholder
    expect(screen.queryByText('Chọn hoặc nhập mã')).not.toBeInTheDocument();

    // Click vẫn gọi onClick
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('3. Trạng thái đã áp dụng 1 mã Freeship -> Hiển thị Ticket Badge Freeship màu xanh ngọc #00BFA5', () => {
    const handleClick = vi.fn();
    const appliedShip = {
      id: 20,
      code: 'FREESHIPMAX',
      value: 30000,
      discountAmount: 30000,
      discountType: 'freeship' as const,
      isFreeship: true,
    };

    render(
      <VoucherTicketBar
        appliedVoucher={null}
        appliedShippingVoucher={appliedShip}
        onClick={handleClick}
      />
    );

    // Badge Freeship xuất hiện với text "Miễn Phí Vận Chuyển"
    const shipBadge = screen.getByTestId('freeship-ticket-badge');
    expect(shipBadge).toBeInTheDocument();
    expect(shipBadge).toHaveTextContent('Miễn Phí Vận Chuyển');

    // Chữ màu #00BFA5, nền #F0FDF9
    expect(shipBadge.className).toContain('text-[#00BFA5]');
    expect(shipBadge.className).toContain('bg-[#F0FDF9]');

    // Click gọi onClick
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('4. Trạng thái áp dụng đồng thời cả 2 mã (Món + Freeship) -> Hiển thị song song 2 Ticket Badges độc lập', () => {
    const handleClick = vi.fn();
    const appliedFood = {
      id: 11,
      code: 'GIAM100K',
      value: 100000,
      discountAmount: 100000,
      discountType: 'fixed' as const,
      isFreeship: false,
    };
    const appliedShip = {
      id: 21,
      code: 'SHIPFREE',
      value: 25000,
      discountAmount: 25000,
      discountType: 'freeship' as const,
      isFreeship: true,
    };

    render(
      <VoucherTicketBar
        appliedVoucher={appliedFood}
        appliedShippingVoucher={appliedShip}
        onClick={handleClick}
      />
    );

    // Cả 2 badge đều xuất hiện đồng thời
    const foodBadge = screen.getByTestId('food-ticket-badge');
    const shipBadge = screen.getByTestId('freeship-ticket-badge');

    expect(foodBadge).toBeInTheDocument();
    expect(foodBadge).toHaveTextContent('-100.000đ');

    expect(shipBadge).toBeInTheDocument();
    expect(shipBadge).toHaveTextContent('Miễn Phí Vận Chuyển');

    // Có mũi tên › ở cuối
    expect(screen.getByText('›')).toBeInTheDocument();
  });

  it('5. Helper formatVoucherBadgeText định dạng chính xác các trường hợp tiền giảm', () => {
    // 76.600đ lẻ nghìn -> -76,6kđ
    expect(formatVoucherBadgeText({ discountAmount: 76600 })).toBe('-76,6kđ');

    // 100.000đ chẵn nghìn -> -100.000đ
    expect(formatVoucherBadgeText({ discountAmount: 100000 })).toBe('-100.000đ');

    // Giảm theo % -> -15%
    expect(formatVoucherBadgeText({ discountType: 'percent', value: 15 })).toBe('-15%');

    // Chưa có discountAmount nhưng có value chẵn -> -50.000đ
    expect(formatVoucherBadgeText({ value: 50000 })).toBe('-50.000đ');
  });
});
