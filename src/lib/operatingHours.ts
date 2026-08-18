/**
 * Helper utility to calculate and validate operating hours (09:00 - 23:00) in Vietnam timezone (Asia/Ho_Chi_Minh).
 * Delivery slot locks to 10:00 - 23:00.
 * After 22:30 cutoff, immediate delivery is disabled and default date shifts to tomorrow.
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
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }
}

export function formatVietnameseDate(date: Date): string {
  try {
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayName = days[date.getDay()];
    const dd = date.getDate().toString().padStart(2, "0");
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dayName}, ${dd}/${mm}/${yyyy}`;
  } catch (err) {
    return date.toLocaleDateString("vi-VN");
  }
}

export function toISODateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export interface PreOrderNotice {
  title: string;
  message: string;
  targetDateISO: string;
  targetDateDisplay: string;
  slotInfo: string;
}

export interface OperatingCheckResult {
  isStoreOpen: boolean;
  isDeliveryOpen: boolean;
  canOrderNow: boolean;
  isAfterCutoff: boolean;
  isBeforeOpen: boolean;
  isAfterClose: boolean;
  currentTime: string;
  message: string | null;
  storeOpen: string;
  storeClose: string;
  deliveryOpen: string;
  deliveryClose: string;
  lastOrderCutoff: string;
  defaultDate: string;
  defaultDeliverySchedule: "now" | "schedule";
  notice: PreOrderNotice | null;
}

export function checkOperatingHours(operatingConfig?: {
  store_open?: string;
  store_close?: string;
  delivery_open?: string;
  delivery_close?: string;
  last_order_cutoff?: string;
  is_store_open?: boolean;
  is_delivery_open?: boolean;
}, referenceDate = new Date()): OperatingCheckResult {
  const storeOpenStr = operatingConfig?.store_open || "09:00";
  const storeCloseStr = operatingConfig?.store_close || "23:00";
  const deliveryOpenStr = operatingConfig?.delivery_open || "10:00";
  const deliveryCloseStr = operatingConfig?.delivery_close || "23:00";
  const lastOrderCutoffStr = operatingConfig?.last_order_cutoff || "22:30";

  const currentTime = getVietnamTimeString(referenceDate);

  const isStoreOpen = currentTime >= storeOpenStr && currentTime < storeCloseStr;
  const isDeliveryOpen = currentTime >= deliveryOpenStr && currentTime < deliveryCloseStr;
  const canOrderNow = currentTime >= storeOpenStr && currentTime < lastOrderCutoffStr;

  const isBeforeOpen = currentTime < storeOpenStr;
  const isAfterCutoff = currentTime >= lastOrderCutoffStr && currentTime < storeCloseStr;
  const isAfterClose = currentTime >= storeCloseStr;

  const today = new Date(referenceDate);
  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayISO = toISODateString(today);
  const tomorrowISO = toISODateString(tomorrow);

  const todayDisplay = formatVietnameseDate(today);
  const tomorrowDisplay = formatVietnameseDate(tomorrow);

  const formatShortDate = (d: Date, label: string) => {
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${label} (${dd}/${mm})`;
  };

  const todayShortDisplay = formatShortDate(today, "Hôm nay");
  const tomorrowShortDisplay = formatShortDate(tomorrow, "Ngày mai");

  let defaultDate = todayISO;
  let targetDateDisplay = todayShortDisplay;
  let defaultDeliverySchedule: "now" | "schedule" = canOrderNow ? "now" : "schedule";
  let notice: PreOrderNotice | null = null;
  let message: string | null = null;

  if (canOrderNow) {
    message = `Quán đang nhận đơn | Giao món từ ${deliveryOpenStr} - ${deliveryCloseStr} mỗi ngày.`;
    defaultDate = todayISO;
    targetDateDisplay = todayShortDisplay;
  } else {
    if (isBeforeOpen) {
      defaultDate = todayISO;
      targetDateDisplay = todayShortDisplay;
    } else {
      defaultDate = tomorrowISO;
      targetDateDisplay = tomorrowShortDisplay;
    }

    message = `Hiện quán đã ngưng nhận giao ngay | Bạn vẫn có thể Đặt trước (Hẹn giờ) để nhận món vào ${targetDateDisplay}.`;
    notice = {
      title: "Thông Báo Đặt Hàng Hẹn Giờ",
      message: `Bếp đã ngưng nhận đơn giao ngay sau ${lastOrderCutoffStr}. Quý khách vui lòng hẹn giờ nhận món từ ${deliveryOpenStr} (${targetDateDisplay}).`,
      targetDateISO: defaultDate,
      targetDateDisplay: targetDateDisplay,
      slotInfo: `${deliveryOpenStr} - ${deliveryCloseStr}`,
    };
  }

  return {
    isStoreOpen,
    isDeliveryOpen,
    canOrderNow,
    isAfterCutoff,
    isBeforeOpen,
    isAfterClose,
    currentTime,
    message,
    storeOpen: storeOpenStr,
    storeClose: storeCloseStr,
    deliveryOpen: deliveryOpenStr,
    deliveryClose: deliveryCloseStr,
    lastOrderCutoff: lastOrderCutoffStr,
    defaultDate,
    defaultDeliverySchedule,
    notice,
  };
}

/**
 * Generate 15-minute time slots between minTime (e.g. "10:00") and maxTime (e.g. "23:00").
 * Optionally filters out slots earlier than filterBeforeTime (HH:MM).
 */
export function generate15MinTimeSlots(
  minTime = "10:00",
  maxTime = "23:00",
  filterBeforeTime?: string
): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = [];
  const [minH, minM] = minTime.split(":").map(Number);
  const [maxH, maxM] = maxTime.split(":").map(Number);

  let currentMinutes = minH * 60 + minM;
  const endMinutes = maxH * 60 + maxM;

  let filterMinutes = -1;
  if (filterBeforeTime) {
    const [fH, fM] = filterBeforeTime.split(":").map(Number);
    filterMinutes = fH * 60 + fM;
  }

  while (currentMinutes <= endMinutes) {
    if (currentMinutes >= filterMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const hStr = h.toString().padStart(2, "0");
      const mStr = m.toString().padStart(2, "0");
      const timeVal = `${hStr}:${mStr}`;
      slots.push({
        value: timeVal,
        label: timeVal,
      });
    }
    currentMinutes += 15;
  }

  return slots;
}

