/**
 * Helper utility to calculate and validate operating hours (10:00 - 23:00) in Vietnam timezone (Asia/Ho_Chi_Minh).
 */

export function getVietnamTimeString(date = new Date()): string {
  try {
    return date.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (err) {
    // Fallback if localeTimeString with timezone is not supported
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }
}

export interface OperatingCheckResult {
  isStoreOpen: boolean;
  isDeliveryOpen: boolean;
  currentTime: string;
  message: string | null;
  storeOpen: string;
  storeClose: string;
}

export function checkOperatingHours(operatingConfig?: {
  store_open?: string;
  store_close?: string;
  delivery_open?: string;
  delivery_close?: string;
  is_store_open?: boolean;
  is_delivery_open?: boolean;
}): OperatingCheckResult {
  const storeOpenStr = operatingConfig?.store_open || "10:00";
  const storeCloseStr = operatingConfig?.store_close || "23:00";
  const deliveryOpenStr = operatingConfig?.delivery_open || "10:00";
  const deliveryCloseStr = operatingConfig?.delivery_close || "23:00";

  const currentTime = getVietnamTimeString();

  const isStoreOpen = currentTime >= storeOpenStr && currentTime < storeCloseStr;
  const isDeliveryOpen = currentTime >= deliveryOpenStr && currentTime < deliveryCloseStr;

  let message: string | null = null;
  if (!isStoreOpen) {
    message = `Quán chỉ nhận đơn từ ${storeOpenStr} đến ${storeCloseStr}. Vui lòng quay trở lại đặt sau vì chưa đến giờ!`;
  } else if (!isDeliveryOpen) {
    message = `Quán chỉ nhận đơn giao hàng từ ${deliveryOpenStr} đến ${deliveryCloseStr}. Vui lòng quay trở lại đặt sau vì chưa đến giờ!`;
  }

  return {
    isStoreOpen,
    isDeliveryOpen,
    currentTime,
    message,
    storeOpen: storeOpenStr,
    storeClose: storeCloseStr,
  };
}
