/**
 * Helper utility to calculate and validate operating hours in Vietnam timezone (Asia/Ho_Chi_Minh).
 * Operating windows:
 * - 00:00 - 08:59: Early morning (pre-order available for today from 10:00, immediate disabled)
 * - 09:00 - 21:30: Active (both immediate & pre-order available)
 * - 21:31 - 22:30: Last call immediate (immediate available, pre-order locked for today -> shift to tomorrow)
 * - 22:31 - 23:59: Closed for day (immediate locked, pre-order for tomorrow from 10:00)
 */

export const DEFAULT_BUFFER_MINUTES = 90;
export const DEFAULT_SLOT_STEP = 15;
export const DEFAULT_STORE_OPEN = "09:00";
export const DEFAULT_STORE_CLOSE = "23:00";
export const DEFAULT_DELIVERY_OPEN = "10:00";
export const DEFAULT_DELIVERY_CLOSE = "23:00";
export const DEFAULT_PICKUP_OPEN = "09:00";
export const DEFAULT_PICKUP_CLOSE = "22:30";
export const DEFAULT_SCHEDULE_CUTOFF = "21:30";
export const DEFAULT_LAST_ORDER_CUTOFF = "22:30";

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

/**
 * Rounds total minutes up to the nearest multiple of 15 (ceiling step).
 * E.g., 755 (12:35) -> 765 (12:45).
 */
export function ceil15Minutes(totalMinutes: number): number {
  return Math.ceil(totalMinutes / 15) * 15;
}

/**
 * Calculates the earliest available slot string ("HH:mm") for pre-orders.
 * Formula: max(openTime, ceil15Minutes(now + bufferMinutes))
 */
export function getEarliestPreOrderSlot(
  referenceDate = new Date(),
  openTime = "10:00",
  bufferMinutes = DEFAULT_BUFFER_MINUTES
): string {
  const vnDate = getVietnamDate(referenceDate);
  const curMinutes = vnDate.getHours() * 60 + vnDate.getMinutes();
  const targetMinutes = curMinutes + bufferMinutes;
  const roundedTarget = ceil15Minutes(targetMinutes);

  const [openH, openM] = openTime.split(":").map(Number);
  const openMinutes = openH * 60 + (openM || 0);

  const earliestMinutes = Math.max(openMinutes, roundedTarget);
  const h = Math.floor(earliestMinutes / 60);
  const m = earliestMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Checks if today is out of schedule slots.
 * True if past scheduleCutoff (21:30) or if earliest slot exceeds deliveryClose.
 */
export function isTodayOutOfScheduleSlots(
  deliveryClose = DEFAULT_DELIVERY_CLOSE,
  referenceDate = new Date(),
  bufferMinutes = DEFAULT_BUFFER_MINUTES,
  scheduleCutoff = DEFAULT_SCHEDULE_CUTOFF
): boolean {
  const vnDate = getVietnamDate(referenceDate);
  const curTime = getVietnamTimeString(referenceDate);

  if (curTime > scheduleCutoff) {
    return true;
  }

  const curH = vnDate.getHours();
  const curM = vnDate.getMinutes();
  const curTotalMinutes = curH * 60 + curM + bufferMinutes;
  const roundedTarget = ceil15Minutes(curTotalMinutes);

  const [closeH, closeM] = deliveryClose.split(":").map(Number);
  const closeTotalMinutes = closeH * 60 + (closeM || 0);
  return roundedTarget > closeTotalMinutes;
}

export interface PreOrderNotice {
  title: string;
  message: string;
  targetDateISO: string;
  targetDateDisplay: string;
  slotInfo: string;
  cutoff?: string;
  openTime?: string;
  storeOpen?: string;
  todayDateDisplay?: string;
  nextOpenDate?: string;
  next_open_date?: string;
  nextOpenDateInSentence?: string;
  nextOpenDateDisplay?: string;
  expectedDateNote?: string;
}

export type OperatingWindow = "early_morning" | "active" | "last_call_immediate" | "closed_for_day";

export interface OperatingHoursConfig {
  store_open?: string;
  store_close?: string;
  delivery_open?: string;
  delivery_close?: string;
  pickup_open?: string;
  pickup_close?: string;
  last_order_cutoff?: string;
  schedule_cutoff?: string;
  buffer_minutes?: number;
  slot_step?: number;
  is_store_open?: boolean;
  is_delivery_open?: boolean;
  can_order_now?: boolean;
  can_schedule_today?: boolean;
  operating_window?: OperatingWindow;
}

export interface OperatingCheckResult {
  isStoreOpen: boolean;
  isDeliveryOpen: boolean;
  canOrderNow: boolean;
  canScheduleToday: boolean;
  isEarlyMorning: boolean;
  isAfterCutoff: boolean;
  isBeforeOpen: boolean;
  isAfterClose: boolean;
  isTodayOutOfSlots: boolean;
  operatingWindow: OperatingWindow;
  operating_window?: OperatingWindow;
  currentTime: string;
  message: string | null;
  storeOpen: string;
  storeClose: string;
  deliveryOpen: string;
  deliveryClose: string;
  pickupOpen: string;
  pickupClose: string;
  lastOrderCutoff: string;
  scheduleCutoff: string;
  bufferMinutes: number;
  slotStep: number;
  defaultDate: string;
  defaultDeliverySchedule: "now" | "schedule";
  notice: PreOrderNotice | null;
  expectedDateNote?: string;
}

export function checkOperatingHours(
  operatingConfig?: OperatingHoursConfig,
  referenceDate = new Date(),
  deliveryType: "delivery" | "pickup" = "delivery"
): OperatingCheckResult {
  const storeOpenStr = operatingConfig?.store_open || DEFAULT_STORE_OPEN;
  const storeCloseStr = operatingConfig?.store_close || DEFAULT_STORE_CLOSE;
  const deliveryOpenStr = operatingConfig?.delivery_open || DEFAULT_DELIVERY_OPEN;
  const deliveryCloseStr = operatingConfig?.delivery_close || DEFAULT_DELIVERY_CLOSE;
  const pickupOpenStr = operatingConfig?.pickup_open || DEFAULT_PICKUP_OPEN;
  const pickupCloseStr = operatingConfig?.pickup_close || DEFAULT_PICKUP_CLOSE;
  const lastOrderCutoffStr = operatingConfig?.last_order_cutoff || DEFAULT_LAST_ORDER_CUTOFF;
  const scheduleCutoffStr = operatingConfig?.schedule_cutoff || DEFAULT_SCHEDULE_CUTOFF;
  const bufferMinutes = operatingConfig?.buffer_minutes ?? DEFAULT_BUFFER_MINUTES;
  const slotStep = operatingConfig?.slot_step ?? DEFAULT_SLOT_STEP;

  const currentTime = getVietnamTimeString(referenceDate);

  // 4 operational windows
  let operatingWindow: OperatingWindow;
  if (currentTime < storeOpenStr) {
    // 00:00 - 08:59
    operatingWindow = "early_morning";
  } else if (currentTime <= scheduleCutoffStr) {
    // 09:00 - 21:30
    operatingWindow = "active";
  } else if (currentTime <= lastOrderCutoffStr) {
    // 21:31 - 22:30
    operatingWindow = "last_call_immediate";
  } else {
    // 22:31 - 23:59
    operatingWindow = "closed_for_day";
  }

  const effectiveCloseStr = deliveryType === "pickup" ? pickupCloseStr : deliveryCloseStr;
  const isTodayOutOfSlots = isTodayOutOfScheduleSlots(effectiveCloseStr, referenceDate, bufferMinutes, scheduleCutoffStr);

  const isStoreOpen = currentTime >= storeOpenStr && currentTime < storeCloseStr;
  const isDeliveryOpen = currentTime >= deliveryOpenStr && currentTime < deliveryCloseStr;

  // Immediate orders allowed between storeOpen (09:00) and lastOrderCutoff (22:30)
  const canOrderNow = currentTime >= storeOpenStr && currentTime <= lastOrderCutoffStr;

  // Pre-orders for today allowed during early morning and active window (if slots remain)
  const canScheduleToday = (operatingWindow === "early_morning" || operatingWindow === "active") && !isTodayOutOfSlots;

  const isEarlyMorning = operatingWindow === "early_morning";
  const isBeforeOpen = isEarlyMorning;
  const isAfterCutoff = currentTime > lastOrderCutoffStr && currentTime < storeCloseStr;
  const isAfterClose = currentTime >= storeCloseStr;

  const today = getVietnamDate(referenceDate);
  const tomorrow = getVietnamDate(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayISO = toISODateString(today);
  const tomorrowISO = toISODateString(tomorrow);

  const formatShortDate = (d: Date, label: string) => {
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${label} (${dd}/${mm})`;
  };

  const todayDD = today.getDate().toString().padStart(2, "0");
  const todayMM = (today.getMonth() + 1).toString().padStart(2, "0");
  const tomorrowDD = tomorrow.getDate().toString().padStart(2, "0");
  const tomorrowMM = (tomorrow.getMonth() + 1).toString().padStart(2, "0");

  const todayDateFormatted = `${todayDD}/${todayMM}`;
  const tomorrowDateFormatted = `${tomorrowDD}/${tomorrowMM}`;

  const todayShortDisplay = formatShortDate(today, "Hôm nay");
  const tomorrowShortDisplay = formatShortDate(tomorrow, "Ngày mai");

  const openTime = deliveryType === "pickup" ? storeOpenStr : deliveryOpenStr;

  let defaultDate = todayISO;
  let targetDateDisplay = todayShortDisplay;
  let defaultDeliverySchedule: "now" | "schedule" = canOrderNow ? "now" : "schedule";
  let notice: PreOrderNotice | null = null;
  let message: string | null = null;
  let expectedDateNote: string | undefined = undefined;

  if (canOrderNow) {
    message = "Quán đang nhận đơn | Bắt đầu nhận đơn từ 9:00 - 23:00 mỗi ngày.";
    defaultDate = isTodayOutOfSlots ? tomorrowISO : todayISO;
    targetDateDisplay = isTodayOutOfSlots ? tomorrowShortDisplay : todayShortDisplay;
  } else {
    // Logic xác định {next_open_date}:
    // Sáng sớm (00:00 -> 08:59): Là hôm nay -> "hôm nay DD/MM" trong câu
    // Đêm muộn (từ 22:31 đến 23:59): Là ngày mai -> "mai DD/MM" trong câu
    const nextOpenDateInSentence = isBeforeOpen
      ? `hôm nay ${todayDateFormatted}`
      : `mai ${tomorrowDateFormatted}`;
    const nextOpenDateDisplay = isBeforeOpen
      ? `Hôm nay ${todayDateFormatted}`
      : `Ngày mai ${tomorrowDateFormatted}`;

    defaultDate = isBeforeOpen ? todayISO : tomorrowISO;
    targetDateDisplay = nextOpenDateDisplay;

    const line1 = `Quán ngưng nhận đơn từ ${lastOrderCutoffStr} - ${storeOpenStr} | Đặt trước từ ${openTime} ngày ${nextOpenDateInSentence} (hoặc đặt món sau ${storeOpenStr} sáng).`;
    const line2 = `*Ngày nhận món dự kiến: ${nextOpenDateDisplay}`;
    message = `${line1}\n${line2}`;
    expectedDateNote = line2;

    notice = {
      title: "Thông Báo Đặt Hàng Hẹn Giờ",
      message: message,
      targetDateISO: defaultDate,
      targetDateDisplay: nextOpenDateDisplay,
      slotInfo: `${openTime} - ${effectiveCloseStr}`,
      cutoff: lastOrderCutoffStr,
      openTime: openTime,
      storeOpen: storeOpenStr,
      todayDateDisplay: isBeforeOpen ? todayDateFormatted : tomorrowDateFormatted,
      nextOpenDate: nextOpenDateInSentence,
      next_open_date: nextOpenDateInSentence,
      nextOpenDateInSentence: nextOpenDateInSentence,
      nextOpenDateDisplay: nextOpenDateDisplay,
      expectedDateNote: expectedDateNote,
    };
  }

  return {
    isStoreOpen,
    isDeliveryOpen,
    canOrderNow,
    canScheduleToday,
    isEarlyMorning,
    isAfterCutoff,
    isBeforeOpen,
    isAfterClose,
    isTodayOutOfSlots,
    operatingWindow,
    operating_window: operatingWindow,
    currentTime,
    message,
    storeOpen: storeOpenStr,
    storeClose: storeCloseStr,
    deliveryOpen: deliveryOpenStr,
    deliveryClose: deliveryCloseStr,
    pickupOpen: pickupOpenStr,
    pickupClose: pickupCloseStr,
    lastOrderCutoff: lastOrderCutoffStr,
    scheduleCutoff: scheduleCutoffStr,
    bufferMinutes,
    slotStep,
    defaultDate,
    defaultDeliverySchedule,
    notice,
    expectedDateNote,
  };
}

/**
 * Generate 15-minute time slots between minTime (e.g. "10:00") and maxTime (e.g. "23:00").
 * If deliveryType is 'pickup', maxTime is capped at 22:30.
 * Optionally filters out slots earlier than filterBeforeTime (HH:MM).
 */
export function generate15MinTimeSlots(
  minTime = DEFAULT_DELIVERY_OPEN,
  maxTime = DEFAULT_DELIVERY_CLOSE,
  filterBeforeTime?: string,
  deliveryType?: "delivery" | "pickup"
): { value: string; label: string }[] {
  let effectiveMaxTime = maxTime;
  if (deliveryType === "pickup" && effectiveMaxTime > DEFAULT_PICKUP_CLOSE) {
    effectiveMaxTime = DEFAULT_PICKUP_CLOSE;
  }

  const slots: { value: string; label: string }[] = [];
  const [minH, minM] = minTime.split(":").map(Number);
  const [maxH, maxM] = effectiveMaxTime.split(":").map(Number);

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
