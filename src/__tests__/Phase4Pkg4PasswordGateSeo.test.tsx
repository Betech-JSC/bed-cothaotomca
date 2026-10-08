import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PasswordGate from '@/components/Common/PasswordGate';

describe('Phase 4 - Gói 4: SEO Noindex và Bảo Mật Màn Hình Khóa Password Gate', () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie.split(';').forEach((cookie) => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    // Clear localStorage
    localStorage.clear();
    // Reset head elements
    const existingRobots = document.head.querySelectorAll('meta[name="robots"]');
    existingRobots.forEach((el) => el.remove());
    document.title = 'Bếp Cô Thảo Tôm Cá - Hải sản tươi sống';
  });

  afterEach(() => {
    cleanup();
  });

  it('1. Trạng thái khóa (Locked): Phải có meta noindex, nofollow, title thử nghiệm nội bộ và CHẶN hoàn toàn children', () => {
    render(
      <PasswordGate>
        <div data-testid="storefront-content">
          <h1>Danh sách sản phẩm tôm cua cá đặc biệt</h1>
          <p>Giá khuyến mãi nháp: 199.000đ</p>
        </div>
      </PasswordGate>
    );

    // 1. Phải chặn hiển thị children
    expect(screen.queryByTestId('storefront-content')).toBeNull();
    expect(screen.queryByText(/Danh sách sản phẩm tôm cua cá đặc biệt/i)).toBeNull();

    // 2. Phải hiển thị màn hình khóa
    expect(screen.getByText(/TRANG WEB ĐANG TRONG GIAI ĐOẠN THỬ NGHIỆM NỘI BỘ/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Nhập mật mã.../i)).toBeDefined();

    // 3. Phải có thẻ meta robots noindex, nofollow
    const robotsMeta = document.querySelector('meta[name="robots"]');
    expect(robotsMeta).not.toBeNull();
    expect(robotsMeta?.getAttribute('content')).toBe('noindex, nofollow');

    // 4. Phải có tiêu đề an toàn cho môi trường thử nghiệm
    expect(document.title).toBe('Môi trường thử nghiệm nội bộ | Bếp Cô Thảo Tôm Cá');
  });

  it('2. Nhập sai mật khẩu: Báo lỗi, giữ nguyên khóa và duy trì meta noindex, nofollow', async () => {
    render(
      <PasswordGate>
        <div data-testid="storefront-content">Nội dung thương mại điện tử</div>
      </PasswordGate>
    );

    const input = screen.getByPlaceholderText(/Nhập mật mã.../i);
    const submitBtn = screen.getByRole('button', { name: /Mở khóa truy cập/i });

    // Nhập sai mật khẩu
    fireEvent.change(input, { target: { value: 'wrongpassword123' } });
    fireEvent.click(submitBtn);

    // Hiển thị thông báo lỗi
    await waitFor(() => {
      expect(screen.getByText(/Mật mã không chính xác. Vui lòng kiểm tra lại!/i)).toBeDefined();
    });

    // Vẫn chặn children
    expect(screen.queryByTestId('storefront-content')).toBeNull();

    // Thẻ meta robots vẫn là noindex, nofollow
    const robotsMeta = document.querySelector('meta[name="robots"]');
    expect(robotsMeta?.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('3. Nhập đúng mật mã: Lưu cookie/localStorage, mở khóa thành công, render children và gỡ bỏ meta noindex', async () => {
    render(
      <PasswordGate>
        <div data-testid="storefront-content">
          <h1>Chào mừng đến với Bếp Cô Thảo Tôm Cá</h1>
        </div>
      </PasswordGate>
    );

    const input = screen.getByPlaceholderText(/Nhập mật mã.../i);
    const submitBtn = screen.getByRole('button', { name: /Mở khóa truy cập/i });

    // Nhập đúng mật mã mặc định "cothaotomca2026"
    fireEvent.change(input, { target: { value: 'cothaotomca2026' } });
    fireEvent.click(submitBtn);

    // Sau khi mở khóa thành công:
    await waitFor(() => {
      expect(screen.getByTestId('storefront-content')).toBeDefined();
      expect(screen.getByText(/Chào mừng đến với Bếp Cô Thảo Tôm Cá/i)).toBeDefined();
    });

    // Màn hình khóa biến mất
    expect(screen.queryByText(/TRANG WEB ĐANG TRONG GIAI ĐOẠN THỬ NGHIỆM NỘI BỘ/i)).toBeNull();

    // Lưu trữ token vào cookie và localStorage
    expect(localStorage.getItem('site_access_token')).toBe('granted');
    expect(document.cookie).toContain('site_access_token=granted');

    // Thẻ meta noindex của PasswordGate bị gỡ bỏ khi đã mở khóa
    const robotsMeta = document.querySelector('meta[name="robots"]');
    expect(robotsMeta).toBeNull();
  });

  it('4. Đã có sẵn token mở khóa trong cookie/localStorage: Tự động cho phép truy cập ngay từ đầu', async () => {
    // Giả lập người dùng đã từng mở khóa
    localStorage.setItem('site_access_token', 'granted');

    render(
      <PasswordGate>
        <div data-testid="storefront-content">Nội dung đã được xác thực trước</div>
      </PasswordGate>
    );

    // Chờ useEffect đọc token và mở khóa
    await waitFor(() => {
      expect(screen.getByTestId('storefront-content')).toBeDefined();
    });

    // Không hiển thị màn hình khóa
    expect(screen.queryByText(/TRANG WEB ĐANG TRONG GIAI ĐOẠN THỬ NGHIỆM NỘI BỘ/i)).toBeNull();

    // Không chèn thẻ meta noindex
    const robotsMeta = document.querySelector('meta[name="robots"]');
    expect(robotsMeta).toBeNull();
  });
});
