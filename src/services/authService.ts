/**
 * Authentication & Customer Profile API Service
 * Handles real-time availability checks, email verification, OTP reset,
 * password change, and customer address book CRUD.
 */

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
}

export interface AvailabilitySuggestion {
  text?: string;
  type?: string;
  url?: string;
  login_url?: string;
  forgot_url?: string;
}

export interface AvailabilityResponse {
  available: boolean;
  exists: boolean;
  message: string;
  suggestion?: AvailabilitySuggestion;
}

export interface CustomerAddress {
  id: number;
  user_id?: number;
  recipient_name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  ward_id?: string | null;
  street_address: string;
  full_address?: string;
  is_default: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Real-time availability check for phone or email
 */
export async function checkAvailability(
  type: "phone" | "email",
  value: string
): Promise<AvailabilityResponse> {
  const cleanVal = value.trim();
  if (!cleanVal) {
    return { available: true, exists: false, message: "" };
  }

  try {
    const res = await fetch(`${API_BASE}/auth/check-availability`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ type, value: cleanVal }),
    });

    const json = await res.json();

    if (json.data) {
      return {
        available: Boolean(json.data.available),
        exists: Boolean(json.data.exists),
        message: json.data.message || json.message || "",
        suggestion: json.data.suggestion,
      };
    }

    return {
      available: json.available !== undefined ? Boolean(json.available) : true,
      exists: json.exists !== undefined ? Boolean(json.exists) : false,
      message: json.message || "",
      suggestion: json.suggestion,
    };
  } catch (error) {
    console.warn("checkAvailability error:", error);
    // On network failure or offline, assume available to not block the user
    return { available: true, exists: false, message: "" };
  }
}

/**
 * Verify customer email via OTP code or email link token
 */
export async function verifyEmailApi(payload: {
  email?: string;
  otp_code?: string;
  token?: string;
}): Promise<{ user: any; token: string; message?: string }> {
  const res = await fetch(`${API_BASE}/auth/verify-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();

  if (!res.ok) {
    const errorMsg =
      body.errors ? Object.values(body.errors).flat().join("\n") : body.message || "Xác thực tài khoản thất bại.";
    throw new Error(errorMsg);
  }

  return {
    user: body.data?.user || body.user,
    token: body.data?.token || body.token,
    message: body.message,
  };
}

/**
 * Resend activation OTP / Link to pending customer email
 */
export async function resendActivationApi(
  email: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/resend-activation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email: email.trim() }),
  });

  const body = await res.json();

  if (!res.ok) {
    const errorMsg =
      body.errors ? Object.values(body.errors).flat().join("\n") : body.message || "Gửi lại mã kích hoạt thất bại.";
    throw new Error(errorMsg);
  }

  return { message: body.message || "Mã kích hoạt mới đã được gửi tới email của bạn." };
}

/**
 * Verify 6-digit OTP code for password reset
 */
export async function verifyResetOtpApi(
  email: string,
  otp_code: string
): Promise<{ token: string; message?: string }> {
  const res = await fetch(`${API_BASE}/auth/verify-reset-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email: email.trim(), otp_code: otp_code.trim() }),
  });

  const body = await res.json();

  if (!res.ok) {
    const errorMsg =
      body.errors ? Object.values(body.errors).flat().join("\n") : body.message || "Mã OTP không chính xác hoặc đã hết hạn.";
    throw new Error(errorMsg);
  }

  const resetToken = body.data?.reset_token || body.reset_token || body.token;
  return {
    token: resetToken,
    message: body.message,
  };
}

/**
 * Change password from customer profile
 */
export async function changePasswordApi(payload: {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}): Promise<{ message: string }> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Bạn chưa đăng nhập.");
  }

  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      current_password: payload.current_password,
      password: payload.new_password,
      password_confirmation: payload.new_password_confirmation,
    }),
  });

  const body = await res.json();

  if (!res.ok) {
    const errorMsg =
      body.errors ? Object.values(body.errors).flat().join("\n") : body.message || "Đổi mật khẩu thất bại.";
    throw new Error(errorMsg);
  }

  return { message: body.message || "Đổi mật khẩu thành công." };
}

/**
 * Get customer address list
 */
export async function getCustomerAddressesApi(): Promise<CustomerAddress[]> {
  const token = getAuthToken();
  if (!token) return [];

  try {
    let res = await fetch(`${API_BASE}/customer/addresses`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok && res.status === 404) {
      // Fallback to /user/addresses
      res = await fetch(`${API_BASE}/user/addresses`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }

    if (!res.ok) {
      console.warn("Failed to fetch customer addresses, status:", res.status);
      return [];
    }

    const body = await res.json();
    return (body.data || body) as CustomerAddress[];
  } catch (err) {
    console.error("getCustomerAddressesApi error:", err);
    return [];
  }
}

/**
 * Create new customer address
 */
export async function createCustomerAddressApi(
  data: Partial<CustomerAddress>
): Promise<CustomerAddress> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Bạn chưa đăng nhập.");
  }

  const res = await fetch(`${API_BASE}/customer/addresses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const body = await res.json();

  if (!res.ok) {
    const errorMsg =
      body.errors ? Object.values(body.errors).flat().join("\n") : body.message || "Thêm địa chỉ thất bại.";
    throw new Error(errorMsg);
  }

  return (body.data || body) as CustomerAddress;
}

/**
 * Update existing customer address
 */
export async function updateCustomerAddressApi(
  id: number,
  data: Partial<CustomerAddress>
): Promise<CustomerAddress> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Bạn chưa đăng nhập.");
  }

  const res = await fetch(`${API_BASE}/customer/addresses/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const body = await res.json();

  if (!res.ok) {
    const errorMsg =
      body.errors ? Object.values(body.errors).flat().join("\n") : body.message || "Cập nhật địa chỉ thất bại.";
    throw new Error(errorMsg);
  }

  return (body.data || body) as CustomerAddress;
}

/**
 * Delete customer address
 */
export async function deleteCustomerAddressApi(id: number): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Bạn chưa đăng nhập.");
  }

  const res = await fetch(`${API_BASE}/customer/addresses/${id}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errorMsg = body.message || "Xóa địa chỉ thất bại.";
    throw new Error(errorMsg);
  }
}

/**
 * Set customer address as default
 */
export async function setDefaultCustomerAddressApi(id: number): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Bạn chưa đăng nhập.");
  }

  const res = await fetch(`${API_BASE}/customer/addresses/${id}/default`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const errorMsg = body.message || "Đặt địa chỉ mặc định thất bại.";
    throw new Error(errorMsg);
  }
}

export interface GuestTierHint {
  tier: "member" | "gold" | "diamond";
  discountPercent: number;
  hasBenefit: boolean;
  isUpgradeCelebration?: boolean;
  celebrationTier?: "gold" | "diamond" | null;
}

/**
 * Check if a phone number belongs to a Gold or Diamond member (for guest checkout hint).
 * Returns null on network error or timeout — fail silently.
 */
export async function checkGuestTierByPhone(
  phone: string
): Promise<GuestTierHint | null> {
  const cleanPhone = phone.trim().replace(/\s/g, "");
  if (cleanPhone.length < 10) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(
      `${API_BASE}/auth/check-tier-by-phone?phone=${encodeURIComponent(cleanPhone)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const body = await res.json();
    const data = body?.data;
    if (!data) return null;

    return {
      tier: data.tier || "member",
      discountPercent: data.discount_percent ?? 0,
      hasBenefit: Boolean(data.has_benefit),
      isUpgradeCelebration: Boolean(data.is_upgrade_celebration),
      celebrationTier: data.celebration_tier ?? null,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
