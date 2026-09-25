import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import VoucherTicketBar, {
  formatVoucherBadgeText,
  FoodTicketBadge,
  FreeshipTicketBadge,
  CampaignTicketBadge,
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
  it('1. Trạng thái chưa chọn mã -> Tiêu đề ngoài khung, khung capsule rounded-full, placeholder "Chọn hoặc nhập mã ưu đãi", nút "Chọn mã"', () => {
    const handleClick = vi.fn();
    const handleRemove = vi.fn();

    const { container } = render(
      <VoucherTicketBar
        appliedVoucher={null}
        appliedShippingVoucher={null}
        onClick={handleClick}
        onRemove={handleRemove}
      />
    );

    // 1. Tiêu đề nằm độc lập phía trên khung với font-display, font-bold, text-primary
    const titleLabel = screen.getByText('Mã giảm giá (Voucher)');
    expect(titleLabel).toBeInTheDocument();
    expect(titleLabel.className).toContain('text-primary');
    expect(titleLabel.className).toContain('font-bold');
    expect(titleLabel.className).toContain('font-display');

    // 2. Khung capsule có class rounded-full border border-gray-300 py-2.5 px-3.5 min-h-[46px]
    const capsule = container.querySelector('.rounded-full.border.border-gray-300');
    expect(capsule).toBeInTheDocument();
    expect(capsule?.className).toContain('rounded-full');
    expect(capsule?.className).toContain('border-gray-300');
    expect(capsule?.className).toContain('py-2.5');
    expect(capsule?.className).toContain('px-3.5');
    expect(capsule?.className).toContain('min-h-[46px]');

    // 3. Văn bản placeholder khi chưa có mã
    expect(screen.getByText('Chọn hoặc nhập mã ưu đãi')).toBeInTheDocument();

    // 4. Nút "Chọn mã" hiển thị với px-4 py-1.5, nút "Xóa" KHÔNG hiển thị
    const selectBtn = screen.getByRole('button', { name: 'Chọn mã' });
    expect(selectBtn).toBeInTheDocument();
    expect(selectBtn.className).toContain('px-4');
    expect(selectBtn.className).toContain('py-1.5');
    expect(screen.queryByRole('button', { name: 'Xóa' })).not.toBeInTheDocument();

    // 5. Click nút "Chọn mã" kích hoạt callback onClick
    fireEvent.click(selectBtn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // 6. Chưa có mã thì không hiển thị dòng thông báo thành công
    expect(screen.queryByText(/Đã áp dụng thành công/i)).not.toBeInTheDocument();
  });

  it('2. Trạng thái đã áp dụng 1 mã món ăn -> Hiển thị Pill Chip Cam Brand #CD4829, nút Xóa, và dòng trạng thái 1 ưu đãi', () => {
    const handleClick = vi.fn();
    const handleRemove = vi.fn();
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
        onRemove={handleRemove}
      />
    );

    // Chip món ăn xuất hiện với số tiền giảm -76,6kđ
    const foodBadge = screen.getByTestId('food-ticket-badge');
    expect(foodBadge).toBeInTheDocument();
    expect(foodBadge).toHaveTextContent('-76,6kđ');

    // Màu Cam Brand: nền #FDF0ED, viền #CD4829, chữ #CD4829, rounded-full
    expect(foodBadge.className).toContain('text-[#CD4829]');
    expect(foodBadge.className).toContain('bg-[#FDF0ED]');
    expect(foodBadge.className).toContain('border-[#CD4829]');
    expect(foodBadge.className).toContain('rounded-full');

    // Không còn placeholder
    expect(screen.queryByText('Chọn hoặc nhập mã ưu đãi')).not.toBeInTheDocument();

    // Cả 2 nút "Chọn mã" và "Xóa" đều hiển thị
    const selectBtn = screen.getByRole('button', { name: 'Chọn mã' });
    const removeBtn = screen.getByRole('button', { name: 'Xóa' });
    expect(selectBtn).toBeInTheDocument();
    expect(removeBtn).toBeInTheDocument();

    // Click nút Xóa gọi onRemove
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledTimes(1);

    // Dòng trạng thái bên dưới hiển thị thành công 1 ưu đãi
    expect(screen.getByText('Đã áp dụng thành công 1 ưu đãi!')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('3. Trạng thái đã áp dụng mã Freeship -> Hiển thị Pill Chip Xanh Brand #142A68 và text "FREESHIP"', () => {
    const handleClick = vi.fn();
    const handleRemove = vi.fn();
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
        onRemove={handleRemove}
      />
    );

    // Chip Freeship xuất hiện với text "FREESHIP"
    const shipBadge = screen.getByTestId('freeship-ticket-badge');
    expect(shipBadge).toBeInTheDocument();
    expect(shipBadge).toHaveTextContent('FREESHIP');

    // Màu Xanh Brand: nền #EBF0FA, viền #142A68, chữ #142A68, rounded-full
    expect(shipBadge.className).toContain('text-[#142A68]');
    expect(shipBadge.className).toContain('bg-[#EBF0FA]');
    expect(shipBadge.className).toContain('border-[#142A68]');
    expect(shipBadge.className).toContain('rounded-full');

    // Dòng trạng thái thành công 1 ưu đãi
    expect(screen.getByText('Đã áp dụng thành công 1 ưu đãi!')).toBeInTheDocument();
  });

  it('4. Trạng thái áp dụng đồng thời cả 2 mã (Món + Freeship) -> Hiển thị song song 2 Pill Chips và đếm 2 ưu đãi', () => {
    const handleClick = vi.fn();
    const handleRemove = vi.fn();
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
        onRemove={handleRemove}
      />
    );

    // Cả 2 badge đều xuất hiện đồng thời
    const foodBadge = screen.getByTestId('food-ticket-badge');
    const shipBadge = screen.getByTestId('freeship-ticket-badge');

    expect(foodBadge).toBeInTheDocument();
    expect(foodBadge).toHaveTextContent('-100.000đ');

    expect(shipBadge).toBeInTheDocument();
    expect(shipBadge).toHaveTextContent('FREESHIP');

    // Dòng thông báo hiển thị đúng 2 ưu đãi
    expect(screen.getByText('Đã áp dụng thành công 2 ưu đãi!')).toBeInTheDocument();
  });

  it('5. Trạng thái áp dụng 3 ưu đãi (Món + Freeship + Chiến dịch) -> Hiển thị cả 3 Chip với màu Vàng kem #8A5800 cho chiến dịch', () => {
    const handleClick = vi.fn();
    const handleRemove = vi.fn();
    const appliedFood = {
      id: 12,
      code: 'GIAM50K',
      value: 50000,
      discountAmount: 50000,
      discountType: 'fixed' as const,
      isFreeship: false,
    };
    const appliedShip = {
      id: 22,
      code: 'FREESHIP',
      value: 20000,
      discountAmount: 20000,
      discountType: 'freeship' as const,
      isFreeship: true,
    };

    render(
      <VoucherTicketBar
        appliedVoucher={appliedFood}
        appliedShippingVoucher={appliedShip}
        activeCampaignName="Ưu đãi hè giảm 5%"
        onClick={handleClick}
        onRemove={handleRemove}
      />
    );

    const foodBadge = screen.getByTestId('food-ticket-badge');
    const shipBadge = screen.getByTestId('freeship-ticket-badge');
    const campaignBadge = screen.getByTestId('campaign-ticket-badge');

    expect(foodBadge).toBeInTheDocument();
    expect(shipBadge).toBeInTheDocument();
    expect(campaignBadge).toBeInTheDocument();
    expect(campaignBadge).toHaveTextContent('Ưu đãi hè giảm 5%');

    // Màu Vàng kem Brand: text-[#8A5800], bg-[#FEF9E7], border-[#F5D585]
    expect(campaignBadge.className).toContain('text-[#8A5800]');
    expect(campaignBadge.className).toContain('bg-[#FEF9E7]');
    expect(campaignBadge.className).toContain('border-[#F5D585]');

    // Dòng thông báo hiển thị đúng 3 ưu đãi
    expect(screen.getByText('Đã áp dụng thành công 3 ưu đãi!')).toBeInTheDocument();
  });

  it('6. Helper formatVoucherBadgeText định dạng chính xác các trường hợp tiền giảm', () => {
    // 76.600đ lẻ nghìn -> -76,6kđ
    expect(formatVoucherBadgeText({ discountAmount: 76600 })).toBe('-76,6kđ');

    // 100.000đ chẵn nghìn -> -100.000đ
    expect(formatVoucherBadgeText({ discountAmount: 100000 })).toBe('-100.000đ');

    // Giảm theo % -> -15%
    expect(formatVoucherBadgeText({ discountType: 'percent', value: 15 })).toBe('-15%');

    // Chưa có discountAmount nhưng có value chẵn -> -50.000đ
    expect(formatVoucherBadgeText({ value: 50000 })).toBe('-50.000đ');

    // Fallback code
    expect(formatVoucherBadgeText({ code: 'SAVE10' })).toBe('-SAVE10');
  });

  it('7. Voucher vận chuyển có short_name -> Pill chip ưu tiên hiển thị nội dung short_name', () => {
    const appliedShip = {
      id: 30,
      code: 'TEST_SHIP_30K',
      short_name: 'Giảm 30K Ship',
      value: 30000,
      discountType: 'fixed',
      isFreeship: true,
    };

    render(
      <VoucherTicketBar
        appliedVoucher={null}
        appliedShippingVoucher={appliedShip}
        onClick={vi.fn()}
      />
    );

    const shipBadge = screen.getByTestId('freeship-ticket-badge');
    expect(shipBadge).toBeInTheDocument();
    expect(shipBadge).toHaveTextContent('Giảm 30K Ship');
  });

  it('8. Voucher vận chuyển có maxDiscount > 0 KHÔNG có short_name -> Pill chip hiển thị "GIẢM SHIP"', () => {
    const appliedShip = {
      id: 31,
      code: 'TEST_SHIP_30K',
      value: 30000,
      maxDiscount: 25000,
      discountType: 'fixed',
      isFreeship: true,
    };

    render(
      <VoucherTicketBar
        appliedVoucher={null}
        appliedShippingVoucher={appliedShip}
        onClick={vi.fn()}
      />
    );

    const shipBadge = screen.getByTestId('freeship-ticket-badge');
    expect(shipBadge).toBeInTheDocument();
    expect(shipBadge).toHaveTextContent('GIẢM SHIP');
    expect(shipBadge).not.toHaveTextContent('FREESHIP');
  });

  it('9. Voucher vận chuyển Freeship 100% (không có maxDiscount) KHÔNG có short_name -> Pill chip hiển thị "FREESHIP"', () => {
    const appliedShip = {
      id: 32,
      code: 'FREESHIP100',
      discountType: 'freeship',
      isFreeship: true,
    };

    render(
      <VoucherTicketBar
        appliedVoucher={null}
        appliedShippingVoucher={appliedShip}
        onClick={vi.fn()}
      />
    );

    const shipBadge = screen.getByTestId('freeship-ticket-badge');
    expect(shipBadge).toBeInTheDocument();
    expect(shipBadge).toHaveTextContent('FREESHIP');
  });

  it('10. Voucher món ăn có short_name -> Pill chip ưu tiên hiển thị nội dung short_name', () => {
    const appliedFood = {
      id: 33,
      code: 'FOOD50K',
      short_name: 'Giảm 50K Món',
      value: 50000,
      discountType: 'fixed',
      isFreeship: false,
    };

    render(
      <VoucherTicketBar
        appliedVoucher={appliedFood}
        appliedShippingVoucher={null}
        onClick={vi.fn()}
      />
    );

    const foodBadge = screen.getByTestId('food-ticket-badge');
    expect(foodBadge).toBeInTheDocument();
    expect(foodBadge).toHaveTextContent('Giảm 50K Món');
  });
});
