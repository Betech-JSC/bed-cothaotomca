import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import WardLookupModal from '@/components/Checkout/WardLookupModal';
import WardSelectCombobox from '@/components/Checkout/WardSelectCombobox';
import * as orderService from '@/services/orderService';
import viMessages from '@/i18n/locales/vi.json';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => {
    return (key: string, values?: Record<string, any>) => {
      const parts = key.split('.');
      let current: any = viMessages.checkout;
      for (const p of parts) {
        if (current && typeof current === 'object' && p in current) {
          current = current[p];
        }
      }
      let text = typeof current === 'string' ? current : key;
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return text;
    };
  },
}));

const mockMappingData: orderService.HcmcWardMappingResponse = {
  old_to_new: [
    {
      o: 'Phường Bến Nghé',
      d: 'Quận 1',
      n: ['Phường Sài Gòn'],
      p: false,
    },
    {
      o: 'Phường 14',
      d: 'Quận 3',
      n: ['Phường Nhiêu Lộc'],
      p: false,
    },
    {
      o: 'Xã Bà Điểm',
      d: 'Huyện Hóc Môn',
      n: ['Xã Bà Điểm'],
      p: false,
    },
    {
      o: 'Phường Đa Kao',
      d: 'Quận 1',
      n: ['Phường Sài Gòn', 'Phường Tân Định'],
      p: true,
    },
  ],
  new_wards: [
    {
      n: 'Phường Sài Gòn',
      d: 'Quận 1',
      olds: ['Bến Nghé', 'Đa Kao (một phần)'],
    },
    {
      n: 'Phường Nhiêu Lộc',
      d: 'Quận 3',
      olds: ['Phường 14'],
    },
    {
      n: 'Xã Bà Điểm',
      d: 'Huyện Hóc Môn',
      olds: ['Xã Bà Điểm'],
    },
  ],
  nguon: 'Nghị quyết 1685/NQ-UBTVQH15, hiệu lực 01/07/2025',
};

const mockAvailableWards: orderService.AdministrativeWard[] = [
  { id: 'w_sai_gon', name: 'Phường Sài Gòn', district: 'Quận 1' },
  { id: 'w_nhieu_loc', name: 'Phường Nhiêu Lộc', district: 'Quận 3' },
  { id: 'w_ba_diem', name: 'Xã Bà Điểm', district: 'Huyện Hóc Môn' },
];

describe('HCMC New Wards & Dynamic Lookup Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(orderService, 'getHcmcWardMapping').mockResolvedValue(mockMappingData);
  });

  describe('1. WardLookupModal Component', () => {
    it('1.1 Hiển thị đầy đủ tiêu đề, bộ lọc Quận/Huyện cũ, ô tìm kiếm và danh sách mapping từ BE', async () => {
      render(
        <WardLookupModal
          isOpen={true}
          onClose={vi.fn()}
          onSelectWard={vi.fn()}
          availableWards={mockAvailableWards}
        />
      );

      // Header
      expect(screen.getByText(viMessages.checkout.ward_lookup_title)).toBeInTheDocument();
      expect(screen.getByText(viMessages.checkout.ward_lookup_desc)).toBeInTheDocument();

      // Dữ liệu mapping tải từ API BE
      await waitFor(() => {
        expect(screen.getByText('Phường Bến Nghé')).toBeInTheDocument();
        expect(screen.getAllByText('Phường Sài Gòn')[0]).toBeInTheDocument();
      });

      // Kiểm tra nhãn partial (một phần)
      expect(screen.getByText('Phường Đa Kao')).toBeInTheDocument();
      expect(screen.getByText(/1 phần/i)).toBeInTheDocument();
      expect(screen.getByText(viMessages.checkout.ward_lookup_partial_note)).toBeInTheDocument();
    });

    it('1.2 Lọc theo Quận/Huyện cũ', async () => {
      render(
        <WardLookupModal
          isOpen={true}
          onClose={vi.fn()}
          onSelectWard={vi.fn()}
          availableWards={mockAvailableWards}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Phường Bến Nghé')).toBeInTheDocument();
      });

      // Lọc chọn Huyện Hóc Môn
      const districtSelect = screen.getByRole('combobox');
      fireEvent.change(districtSelect, { target: { value: 'Huyện Hóc Môn' } });

      await waitFor(() => {
        expect(screen.getAllByText('Xã Bà Điểm')[0]).toBeInTheDocument();
        expect(screen.queryByText('Phường Bến Nghé')).not.toBeInTheDocument();
      });
    });

    it('1.3 Tìm kiếm theo tên phường cũ và bấm chọn thì gọi onSelectWard với tên phường mới', async () => {
      const mockOnSelect = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <WardLookupModal
          isOpen={true}
          onClose={mockOnClose}
          onSelectWard={mockOnSelect}
          availableWards={mockAvailableWards}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Phường Bến Nghé')).toBeInTheDocument();
      });

      // Gõ tìm "Bến Nghé"
      const searchInput = screen.getByPlaceholderText(viMessages.checkout.ward_lookup_search_placeholder);
      fireEvent.change(searchInput, { target: { value: 'ben nghe' } });

      // Nút Chọn Phường Sài Gòn
      const selectBtn = screen.getByTestId('select-new-ward-Phường Sài Gòn');
      expect(selectBtn).toBeInTheDocument();

      fireEvent.click(selectBtn);

      expect(mockOnSelect).toHaveBeenCalledWith('Phường Sài Gòn');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('2. WardSelectCombobox UI Integration', () => {
    it('2.1 Hiển thị đúng tiêu đề, placeholder, note sáp nhập và link mở modal tra cứu', async () => {
      render(
        <WardSelectCombobox
          wards={mockAvailableWards}
          selectedWardId=""
          selectedWardName=""
          onSelectWard={vi.fn()}
        />
      );

      // Label & Placeholder
      expect(screen.getByText(/Phường \/ Xã \(Khu vực giao\)/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(viMessages.checkout.ward_select_placeholder)).toBeInTheDocument();

      // Dòng note dưới ô
      expect(screen.getByText(viMessages.checkout.ward_merger_note)).toBeInTheDocument();

      // Link tra cứu
      const lookupBtn = screen.getByTestId('open-ward-lookup-modal-btn');
      expect(lookupBtn).toBeInTheDocument();
      expect(lookupBtn.textContent).toContain(viMessages.checkout.ward_lookup_link);

      // Click link mở Modal tra cứu
      fireEvent.click(lookupBtn);
      await waitFor(() => {
        expect(screen.getByText(viMessages.checkout.ward_lookup_title)).toBeInTheDocument();
      });
    });
  });
});
