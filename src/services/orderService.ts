const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

export type DeliveryType = "delivery" | "pickup";

export interface CreateOrderItem {
  product_id: number;
  product_code: string;
  product_name: string;
  quantity: number;
  price: number;
  discount?: number;
  note?: string;
}

export interface CreateOrderPayload {
  idempotency_key?: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  delivery_type: DeliveryType;
  delivery?: {
    receiver?: string;
    contact_number?: string;
    address?: string;
    price?: number;
    expected_delivery?: string;
  } | null;
  items: CreateOrderItem[];
  discount?: number;
  description?: string;
  is_apply_voucher?: boolean;
  voucher?: {
    voucher_id: number;
    campaign_id: number;
    amount: number;
  } | null;
  voucher_code?: string;
  payment_method?: "COD" | "TRANSFER" | "CARD";
  branch_id?: number;
}

/** Thông tin QR + đơn hàng trả về sau khi initiate */
export interface OrderInitiated {
  order_code: string;
  status: string;
  payment_status: string;   // 'pending' | 'paid' | 'expired'
  subtotal: string;
  total: string;
  delivery_price: string;
  expire_at: string;        // ISO datetime
  qr_url: string;           // URL ảnh QR SePay
  qr_info: {
    bank_code: string;
    bank_account: string;
    amount: number;
    content: string;        // e.g. "TCTM ORD-20260602-ABCDEF"
  };
}

/** Trạng thái polling — FE gọi mỗi 3 giây */
export interface OrderStatus {
  order_code: string;
  status: string;           // pending_payment | pending_sync | synced | sync_failed
  payment_status: string;   // pending | paid | expired
  sync_status: string;      // pending | success | failed
  kiotviet_code: string | null;
  kiotviet_order_id: number | null;
  expire_at: string | null;
}

export interface Branch {
  id: number;
  branchName: string;
  address: string;
  contactNumber: string;
  isActive: boolean;
}

export interface OperatingHoursConfig {
  store_open: string;
  store_close: string;
  delivery_open: string;
  delivery_close: string;
  last_order_cutoff?: string;
  is_store_open: boolean;
  is_delivery_open: boolean;
  can_order_now?: boolean;
  current_time?: string;
  message?: string | null;
}

export interface CheckoutConfig {
  delivery_types: { value: DeliveryType; label: string }[];
  default_shipping_fee: string;
  branches: Branch[];
  operating_hours?: OperatingHoursConfig;
}

export class OrderApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(status: number, body: Record<string, unknown>) {
    const message =
      (typeof body.message === "string" && body.message) ||
      (typeof body.error === "string" && body.error) ||
      "Đặt hàng thất bại.";
    super(message);
    this.status = status;
    this.errors = body.errors as Record<string, string[]> | undefined;
  }
}

export async function getCheckoutConfig(): Promise<CheckoutConfig> {
  const res = await fetch(`${API_BASE}/orders/checkout-config`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`checkout-config: HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data as CheckoutConfig;
}

/** Tạo đơn hàng → trả về QR URL để hiển thị màn hình chờ thanh toán */
export async function createOrder(
  payload: CreateOrderPayload,
): Promise<{ data: OrderInitiated; message?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new OrderApiError(res.status, json);
  }

  return json;
}

/** Polling trạng thái đơn hàng (payment_status + KiotViet sync status) */
export async function getOrderStatus(orderCode: string): Promise<OrderStatus> {
  const res = await fetch(
    `${API_BASE}/orders/${encodeURIComponent(orderCode)}/status`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new OrderApiError(res.status, await res.json().catch(() => ({})));
  }

  const json = await res.json();
  return json.data as OrderStatus;
}

export async function getOrderByCode(
  orderCode: string,
  phone?: string,
): Promise<Record<string, unknown>> {
  const params = phone ? `?phone=${encodeURIComponent(phone)}` : "";
  const res = await fetch(
    `${API_BASE}/orders/${encodeURIComponent(orderCode)}${params}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    throw new OrderApiError(res.status, await res.json().catch(() => ({})));
  }

  const json = await res.json();
  return json.data as Record<string, unknown>;
}

/** subtotal + ship − discount */
export function calcOrderTotal(
  items: { price: number; quantity: number; discount?: number }[],
  deliveryType: DeliveryType,
  shippingFee: number,
  orderDiscount = 0,
): { subtotal: number; shipping: number; total: number } {
  const subtotal = items.reduce(
    (sum, line) =>
      sum + line.price * line.quantity - (line.discount ?? 0),
    0,
  );
  const shipping = deliveryType === "delivery" ? shippingFee : 0;
  const total = Math.max(0, subtotal - orderDiscount + shipping);
  return { subtotal, shipping, total };
}

export interface ValidateVoucherResult {
  valid: boolean;
  voucher?: {
    id: number;
    code: string;
    value: number;
    campaign_id: number;
    campaign_name: string;
    prereq_price?: number;
  };
  message: string;
}

export async function validateVoucher(code: string, subtotal?: number): Promise<ValidateVoucherResult> {
  const params = new URLSearchParams({ code });
  if (subtotal !== undefined) {
    params.append("subtotal", subtotal.toString());
  }

  const res = await fetch(`${API_BASE}/vouchers/validate?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok) {
    return {
      valid: false,
      message: json.message || "Mã giảm giá không hợp lệ.",
    };
  }

  return json as ValidateVoucherResult;
}

export interface AdministrativeWard {
  id: string;
  name: string;
  district?: string;
  province?: string;
  old_ward?: string;
}

export interface AdministrativeProvince {
  id: string;
  name: string;
  wards: AdministrativeWard[];
}

export async function getAdministrativeUnits(): Promise<AdministrativeProvince[]> {
  try {
    const res = await fetch(`${API_BASE}/administrative-units`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.data as AdministrativeProvince[];
  } catch (err) {
    console.error("Failed to fetch administrative units:", err);
    return [];
  }
}

export interface ShippingCalculationResult {
  shipping_fee: number;
  original_fee: number;
  is_freeship: boolean;
  freeship_reason?: string | null;
  is_deliverable: boolean;
  is_configured_area: boolean;
  branch_id?: number | null;
  branch_name?: string | null;
  message?: string | null;
}

export async function calculateShippingFee(params: {
  province?: string;
  district?: string;
  ward?: string;
  ward_id?: string;
  subtotal: number;
  voucher_code?: string;
}): Promise<ShippingCalculationResult> {
  try {
    const res = await fetch(`${API_BASE}/shipping/calculate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error("Không thể tính phí giao hàng.");
    }

    const json = await res.json();
    return json.data as ShippingCalculationResult;
  } catch (err) {
    console.error("Failed to calculate shipping fee:", err);
    return {
      shipping_fee: 50000,
      original_fee: 50000,
      is_freeship: false,
      is_deliverable: true,
      is_configured_area: false,
    };
  }
}

/** Hủy đơn hàng trực tiếp (dành cho đơn COD) */
export async function cancelOrderApi(
  orderCode: string,
  phone: string,
  reason?: string,
): Promise<{ message: string; data: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderCode)}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ phone, reason }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new OrderApiError(res.status, json);
  }

  return json;
}

/** Gửi yêu cầu hủy đơn hàng (dành cho đơn đã thanh toán Online) */
export async function requestCancelOrderApi(
  orderCode: string,
  phone: string,
  reason: string,
): Promise<{ message: string; data: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderCode)}/request-cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ phone, reason }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new OrderApiError(res.status, json);
  }

  return json;
}

