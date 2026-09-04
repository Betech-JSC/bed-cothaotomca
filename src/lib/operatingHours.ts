/**
 * Helper utility to calculate and validate operating hours (09:00 - 23:00) in Vietnam timezone (Asia/Ho_Chi_Minh).
 * Delivery slot locks to 10:00 - 23:00.
 * After 22:30 cutoff, immediate delivery is disabled and default date shifts to tomorrow.
 */

export function getVietnamDateParts(date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        map[part.type] = parseInt(part.value, 10);
      }
    }
    return {
      year: map.year,
      month: map.month,
      day: map.day,
      hour: map.hour === 24 ? 0 : (map.hour ?? 0),
      minute: map.minute ?? 0,
      second: map.second ?? 0,
    };
  } catch (err) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    };
  }
}

export function getVietnamDate(date = new Date()): Date {
  try {
    const parts = getVietnamDateParts(date);
    return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  } catch (err) {
    return new Date(date);
  }
}

export function getVietnamTimeString(date = new Date()): string {
  try {
    const parts = getVietnamDateParts(date);
    const hours = parts.hour.toString().padStart(2, "0");
    const minutes = parts.minute.toString().padStart(2, "0");
    return `${hours}:${minutes}`;
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

export function isTodayOutOfScheduleSlots(
  deliveryClose = "23:00",
  referenceDate = new Date(),
  bufferMinutes = 120
): boolean {
  const vnDate = getVietnamDate(referenceDate);
  const curH = vnDate.getHours();
  const curM = vnDate.getMinutes();
  const curTotalMinutes = curH * 60 + curM + bufferMinutes;
  const [closeH, closeM] = deliveryClose.split(":").map(Number);
  const closeTotalMinutes = closeH * 60 + (closeM || 0);
  return curTotalMinutes > closeTotalMinutes;
}

export interface PreOrderNotice {
  title: string;
  message: string;
  targetDateISO: string;
  targetDateDisplay: string;
  slotInfo: string;
  cutoff?: string;
  openTime?: string;
  todayDateDisplay?: string;
  nextOpenDate?: string;
  next_open_date?: string;
}

export interface OperatingCheckResult {
  isStoreOpen: boolean;
  isDeliveryOpen: boolean;
  canOrderNow: boolean;
  isAfterCutoff: boolean;
  isBeforeOpen: boolean;
  isAfterClose: boolean;
  isTodayOutOfSlots: boolean;
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
  const isTodayOutOfSlots = isTodayOutOfScheduleSlots(deliveryCloseStr, referenceDate, 120);

  const today = getVietnamDate(referenceDate);
  const tomorrow = getVietnamDate(referenceDate);
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

  const todayDD = today.getDate().toString().padStart(2, "0");
  const todayMM = (today.getMonth() + 1).toString().padStart(2, "0");
  const todayDateFormatted = `${todayDD}/${todayMM}`;

  const todayShortDisplay = formatShortDate(today, "Hôm nay");
  const tomorrowShortDisplay = formatShortDate(tomorrow, "Ngày mai");

  let defaultDate = todayISO;
  let targetDateDisplay = todayShortDisplay;
  let defaultDeliverySchedule: "now" | "schedule" = canOrderNow ? "now" : "schedule";
  let notice: PreOrderNotice | null = null;
  let message: string | null = null;

  if (canOrderNow) {
    message = "Quán đang nhận đơn | Bắt đầu nhận đơn từ 9:00 - 23:00 mỗi ngày.";
    defaultDate = isTodayOutOfSlots ? tomorrowISO : todayISO;
    targetDateDisplay = isTodayOutOfSlots ? tomorrowShortDisplay : todayShortDisplay;
  } else {
    // Calculate next open date: after 0h (midnight to 09:00) is "Hôm nay", before 0h (22:30 to 23:59) is "Ngày mai"
    const nextOpenDate = isBeforeOpen ? "Hôm nay" : "Ngày mai";
    const dateFormatted = isBeforeOpen
      ? todayDateFormatted
      : `${tomorrow.getDate().toString().padStart(2, "0")}/${(tomorrow.getMonth() + 1).toString().padStart(2, "0")}`;

    if (isBeforeOpen) {
      defaultDate = todayISO;
      targetDateDisplay = todayShortDisplay;
    } else {
      defaultDate = tomorrowISO;
      targetDateDisplay = tomorrowShortDisplay;
    }

    message = `Hiện quán đã ngưng nhận giao ngay | Bạn vẫn có thể Đặt trước (Hẹn giờ) để nhận món vào ${nextOpenDate}.`;
    notice = {
      title: "Thông Báo Đặt Hàng Hẹn Giờ",
      message: `Bếp đã dừng nhận đơn giao ngay sau ${lastOrderCutoffStr}. Bạn vẫn có thể đặt trước và chọn khung giờ nhận món từ ${deliveryOpenStr} ${nextOpenDate.toLowerCase()} (${dateFormatted}).`,
      targetDateISO: defaultDate,
      targetDateDisplay: targetDateDisplay,
      slotInfo: `${deliveryOpenStr} - ${deliveryCloseStr}`,
      cutoff: lastOrderCutoffStr,
      openTime: deliveryOpenStr,
      todayDateDisplay: dateFormatted,
      nextOpenDate: nextOpenDate,
      next_open_date: nextOpenDate,
    };
  }

  return {
    isStoreOpen,
    isDeliveryOpen,
    canOrderNow,
    isAfterCutoff,
    isBeforeOpen,
    isAfterClose,
    isTodayOutOfSlots,
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

