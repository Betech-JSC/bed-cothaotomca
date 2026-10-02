import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  clearAllPromotionStorage,
  getStoredVoucherCodes,
  setStoredVoucherCodes,
  setStoredCampaignIds,
  PROMOTION_STORAGE_KEYS,
} from "@/utils/promotionStorage";

// Component test gọi useAuth() để kiểm tra logout() dọn dẹp localStorage
function TestAuthConsumer() {
  const { user, token, logout } = useAuth();
  return (
    <div>
      <div data-testid="user-status">{user ? `Logged in: ${user.name}` : "Not logged in"}</div>
      <div data-testid="token-status">{token ? "Has token" : "No token"}</div>
      <button data-testid="logout-btn" onClick={logout}>
        Đăng xuất
      </button>
    </div>
  );
}

describe("Promotion Storage Synchronization & Auth Logout", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("AuthContext logout() clears all promotion keys from localStorage immediately", async () => {
    // Giả lập trạng thái trước logout: có token và có đầy đủ 5 promotion keys
    localStorage.setItem("auth_token", "fake-jwt-token");
    setStoredVoucherCodes(["VOUCHER1", "SHIPFREE"]);
    setStoredCampaignIds([101, 102]);
    localStorage.setItem("active_voucher", "VOUCHER1");
    localStorage.setItem("active_shipping_voucher", "SHIPFREE");
    localStorage.setItem("active_campaign_ids", "[101, 102]");

    // Verify localStorage has promotions before logout
    expect(getStoredVoucherCodes()).toHaveLength(2);
    for (const key of PROMOTION_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).not.toBeNull();
    }

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    const logoutBtn = screen.getByTestId("logout-btn");

    // Click Logout
    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    // Toàn bộ 5 promotion keys phải bị xóa sạch khỏi localStorage
    for (const key of PROMOTION_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    expect(localStorage.getItem("auth_token")).toBeNull();
  });

  it("Cleans up promotion storage on successful order completion flow", () => {
    // Giả lập lưu voucher & campaign trước khi submit đơn hàng
    setStoredVoucherCodes(["VIP50K", "FREESHIP_EXTRA"]);
    setStoredCampaignIds(["promo_combo_1"]);

    expect(getStoredVoucherCodes()).toEqual(["VIP50K", "FREESHIP_EXTRA"]);

    // Giả lập logic khi createOrder thành công: gọi clearAllPromotionStorage()
    clearAllPromotionStorage();

    // Verify sạch 100%
    for (const key of PROMOTION_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
  });
});
