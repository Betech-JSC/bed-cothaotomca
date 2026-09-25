import { describe, it, expect } from 'vitest';

describe('Loyalty Points Calculation & Display Tests (10.000 VNĐ = 1 điểm, Math.floor)', () => {
  const calculateLoyaltyPoints = (total: number): number => {
    return Math.floor(total / 10000);
  };

  const formatLoyaltyPointsText = (total: number): string => {
    const points = calculateLoyaltyPoints(total);
    return `Đơn hàng này sẽ tích lũy thêm ${points} điểm`;
  };

  it('Quy đổi chuẩn 470.000 VNĐ -> 47 điểm', () => {
    const total = 470000;
    expect(calculateLoyaltyPoints(total)).toBe(47);
    expect(formatLoyaltyPointsText(total)).toBe('Đơn hàng này sẽ tích lũy thêm 47 điểm');
  });

  it('Quy đổi 478.000 VNĐ -> 47 điểm (không làm tròn lên 48)', () => {
    const total = 478000;
    expect(calculateLoyaltyPoints(total)).toBe(47);
    expect(formatLoyaltyPointsText(total)).toBe('Đơn hàng này sẽ tích lũy thêm 47 điểm');
  });

  it('Quy đổi 479.999 VNĐ -> 47 điểm (bỏ phần lẻ dưới 10.000đ)', () => {
    const total = 479999;
    expect(calculateLoyaltyPoints(total)).toBe(47);
    expect(formatLoyaltyPointsText(total)).toBe('Đơn hàng này sẽ tích lũy thêm 47 điểm');
  });

  it('Quy đổi 1.000.000 VNĐ -> 100 điểm theo đúng tài liệu thương hiệu', () => {
    const total = 1000000;
    expect(calculateLoyaltyPoints(total)).toBe(100);
    expect(formatLoyaltyPointsText(total)).toBe('Đơn hàng này sẽ tích lũy thêm 100 điểm');
  });

  it('Đơn dưới 10.000 VNĐ -> 0 điểm', () => {
    expect(calculateLoyaltyPoints(9999)).toBe(0);
    expect(calculateLoyaltyPoints(0)).toBe(0);
  });

  it('Chuỗi hiển thị không chứa ký tự ngã ~, dấu trừ -, hoặc dấu chấm than !', () => {
    const text = formatLoyaltyPointsText(470000);
    expect(text).not.toContain('~');
    expect(text).not.toContain('-');
    expect(text).not.toContain('!');
    expect(text).toMatch(/^Đơn hàng này sẽ tích lũy thêm \d+ điểm$/);
  });
});
