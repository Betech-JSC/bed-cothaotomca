export type PromotionType =
  | "order_discount"
  | "order_gift_discount"
  | "buy_x_get_y"
  | "same_price_discount";

export type DiscountType = "percent" | "fixed" | "custom";

export interface PromotionGiftItem {
  id: number;
  product_id: number;
  product_variant_id?: number | null;
  product_code: string;
  product_name: string;
  image: string;
  original_price: number;
  campaign_price: number;
  is_free: boolean;
  is_available?: boolean;
  disabled?: boolean;
  disabled_reason?: string;
  kiotviet_id?: number | null;
}

export interface CampaignSettings {
  buy_quantity?: number;
  gift_quantity?: number;
  get_quantity?: number;
  min_order_value?: number;
}

export interface ActivePromotion {
  id: number;
  name: string;
  description?: string | null;
  promotion_type: PromotionType;
  min_order_value: number;
  discount_type: DiscountType | string;
  discount_value: number;
  max_discount?: number | null;
  settings?: CampaignSettings;
  items: PromotionGiftItem[];
  applicable_product_ids?: number[];
  applicable_variant_ids?: number[];
  can_combine_with_promotions?: boolean;
  can_combine_with_freeship?: boolean;
}

export interface PublicCampaignItem {
  id: number | string;
  name: string;
  code?: string;
  special_note?: string;
  description?: string;
  banner?: string;
  promotion_type?: PromotionType;
  discount_type?: DiscountType;
  discount_value?: number;
  min_order_value?: number;
  max_discount?: number | null;
  can_combine_with_promotions?: boolean;
  can_combine_with_freeship?: boolean;
  settings?: CampaignSettings;
  items?: PromotionGiftItem[];
  applicable_product_ids?: number[];
  applicable_variant_ids?: number[];
  start_at?: string | null;
  end_at?: string | null;
}

export interface CampaignEligibilityResult {
  eligible: boolean;
  reason?: string;
  missingAmount?: number;
}

export interface CampaignLockResult {
  locked: boolean;
  reason?: string;
}

export interface CheckoutConfigDeliveryType {
  value: string;
  label: string;
}

export interface CheckoutConfigBranch {
  id: number;
  branchName: string;
  address: string;
  contactNumber: string;
  isActive: boolean;
}

export interface CheckoutConfigOperatingHours {
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

export interface CheckoutConfigData {
  delivery_types?: CheckoutConfigDeliveryType[];
  default_shipping_fee?: string;
  branches?: CheckoutConfigBranch[];
  operating_hours?: CheckoutConfigOperatingHours;
  active_promotions?: ActivePromotion[];
  payment_methods?: unknown[];
  delivery_services?: unknown[];
  shipping_settings?: unknown;
  maintenance?: unknown;
}
