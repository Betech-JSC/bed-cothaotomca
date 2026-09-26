import { describe, it, expect } from "vitest";
import {
  ceil15Minutes,
  getEarliestPreOrderSlot,
  isTodayOutOfScheduleSlots,
  checkOperatingHours,
  generate15MinTimeSlots,
  DEFAULT_BUFFER_MINUTES,
  DEFAULT_PICKUP_CLOSE,
  DEFAULT_DELIVERY_CLOSE,
  DEFAULT_SCHEDULE_CUTOFF,
} from "@/lib/operatingHours";
import viMessages from "@/i18n/locales/vi.json";
import enMessages from "@/i18n/locales/en.json";

describe("Operating Hours Refinement & Pickup Hours (Change: refine-delivery-schedule-and-pickup-hours)", () => {
  describe("1. DEFAULT CONSTANTS", () => {
    it("should have correct default constants", () => {
      expect(DEFAULT_BUFFER_MINUTES).toBe(90);
      expect(DEFAULT_PICKUP_CLOSE).toBe("22:30");
      expect(DEFAULT_DELIVERY_CLOSE).toBe("23:00");
      expect(DEFAULT_SCHEDULE_CUTOFF).toBe("21:30");
    });
  });

  describe("2. ceil15Minutes algorithm", () => {
    it("rounds up total minutes to next 15-minute step (ceiling)", () => {
      // 11:05 + 90' = 12:35 (755 min) -> 12:45 (765 min)
      expect(ceil15Minutes(11 * 60 + 5 + 90)).toBe(12 * 60 + 45);

      // 09:00 + 90' = 10:30 (630 min) -> already divisible by 15 -> 10:30 (630 min)
      expect(ceil15Minutes(9 * 60 + 0 + 90)).toBe(10 * 60 + 30);

      // 09:10 + 90' = 10:40 (640 min) -> 10:45 (645 min)
      expect(ceil15Minutes(9 * 60 + 10 + 90)).toBe(10 * 60 + 45);

      // 08:00 + 90' = 09:30 (570 min) -> 09:30 (570 min)
      expect(ceil15Minutes(8 * 60 + 0 + 90)).toBe(9 * 60 + 30);
    });
  });

  describe("3. getEarliestPreOrderSlot calculation", () => {
    it("computes max(openTime, ceil15Minutes(now + 90')) accurately", () => {
      // 08:00 sáng (sáng sớm trước giờ giao hàng 10:00) -> 08:00 + 90' = 09:30 -> max(10:00, 09:30) = "10:00"
      const date0800 = new Date("2026-09-26T08:00:00+07:00");
      expect(getEarliestPreOrderSlot(date0800, "10:00", 90)).toBe("10:00");

      // 09:00 sáng -> 09:00 + 90' = 10:30 -> "10:30"
      const date0900 = new Date("2026-09-26T09:00:00+07:00");
      expect(getEarliestPreOrderSlot(date0900, "10:00", 90)).toBe("10:30");

      // 09:10 sáng -> 09:10 + 90' = 10:40 -> ceil15 = 10:45
      const date0910 = new Date("2026-09-26T09:10:00+07:00");
      expect(getEarliestPreOrderSlot(date0910, "10:00", 90)).toBe("10:45");

      // 11:05 trưa -> 11:05 + 90' = 12:35 -> ceil15 = 12:45
      const date1105 = new Date("2026-09-26T11:05:00+07:00");
      expect(getEarliestPreOrderSlot(date1105, "10:00", 90)).toBe("12:45");

      // 21:00 tối -> 21:00 + 90' = 22:30
      const date2100 = new Date("2026-09-26T21:00:00+07:00");
      expect(getEarliestPreOrderSlot(date2100, "10:00", 90)).toBe("22:30");

      // 21:30 tối (slot cuối cùng giao trong ngày) -> 21:30 + 90' = 23:00
      const date2130 = new Date("2026-09-26T21:30:00+07:00");
      expect(getEarliestPreOrderSlot(date2130, "10:00", 90)).toBe("23:00");

      // Pickup lúc 08:00 sáng (openTime = "09:00") -> 08:00 + 90' = 09:30 -> max(09:00, 09:30) = "09:30"
      expect(getEarliestPreOrderSlot(date0800, "09:00", 90)).toBe("09:30");
    });
  });

  describe("4. isTodayOutOfScheduleSlots", () => {
    it("returns false at or before 21:30 when slot 23:00 is reachable", () => {
      const date2130 = new Date("2026-09-26T21:30:00+07:00");
      expect(isTodayOutOfScheduleSlots("23:00", date2130, 90, "21:30")).toBe(false);
    });

    it("returns true after 21:30 cutoff for today delivery schedule", () => {
      const date2131 = new Date("2026-09-26T21:31:00+07:00");
      expect(isTodayOutOfScheduleSlots("23:00", date2131, 90, "21:30")).toBe(true);

      const date2200 = new Date("2026-09-26T22:00:00+07:00");
      expect(isTodayOutOfScheduleSlots("23:00", date2200, 90, "21:30")).toBe(true);
    });

    it("handles pickup cutoff at 22:30 (slots run out after 21:00)", () => {
      const date2100 = new Date("2026-09-26T21:00:00+07:00");
      // 21:00 + 90' = 22:30 -> still fits in 22:30
      expect(isTodayOutOfScheduleSlots("22:30", date2100, 90, "21:30")).toBe(false);

      const date2105 = new Date("2026-09-26T21:05:00+07:00");
      // 21:05 + 90' = 22:35 -> ceil15 = 22:45 > 22:30 -> out of slots
      expect(isTodayOutOfScheduleSlots("22:30", date2105, 90, "21:30")).toBe(true);
    });
  });

  describe("5. checkOperatingHours 4 Operational Windows", () => {
    const config = {
      store_open: "09:00",
      store_close: "23:00",
      delivery_open: "10:00",
      delivery_close: "23:00",
      pickup_open: "09:00",
      pickup_close: "22:30",
      last_order_cutoff: "22:30",
      schedule_cutoff: "21:30",
      buffer_minutes: 90,
      slot_step: 15,
    };

    it("Khung 1: 00:00 - 08:59 (early_morning) - canOrderNow=false, canScheduleToday=true, defaultDate=today", () => {
      const res0730 = checkOperatingHours(config, new Date("2026-09-26T07:30:00+07:00"), "delivery");
      expect(res0730.operatingWindow).toBe("early_morning");
      expect(res0730.canOrderNow).toBe(false);
      expect(res0730.canScheduleToday).toBe(true);
      expect(res0730.isEarlyMorning).toBe(true);
      expect(res0730.isBeforeOpen).toBe(true);
      expect(res0730.isAfterCutoff).toBe(false);
      expect(res0730.defaultDeliverySchedule).toBe("schedule");
      expect(res0730.defaultDate).toBe("2026-09-26");
      expect(res0730.notice).not.toBeNull();
    });

    it("Khung 2: 09:00 - 21:30 (active) - canOrderNow=true, canScheduleToday=true, defaultDate=today", () => {
      const res1400 = checkOperatingHours(config, new Date("2026-09-26T14:00:00+07:00"), "delivery");
      expect(res1400.operatingWindow).toBe("active");
      expect(res1400.canOrderNow).toBe(true);
      expect(res1400.canScheduleToday).toBe(true);
      expect(res1400.isEarlyMorning).toBe(false);
      expect(res1400.isAfterCutoff).toBe(false);
      expect(res1400.defaultDeliverySchedule).toBe("now");
      expect(res1400.defaultDate).toBe("2026-09-26");
      expect(res1400.notice).toBeNull();
    });

    it("Khung 3: 21:31 - 22:30 (last_call_immediate) - canOrderNow=true, canScheduleToday=false, defaultDate=tomorrow", () => {
      const res2145 = checkOperatingHours(config, new Date("2026-09-26T21:45:00+07:00"), "delivery");
      expect(res2145.operatingWindow).toBe("last_call_immediate");
      expect(res2145.canOrderNow).toBe(true);
      expect(res2145.canScheduleToday).toBe(false);
      expect(res2145.isEarlyMorning).toBe(false);
      expect(res2145.isAfterCutoff).toBe(false);
      expect(res2145.defaultDeliverySchedule).toBe("now");
      expect(res2145.defaultDate).toBe("2026-09-27");
      expect(res2145.notice).toBeNull();
    });

    it("Khung 4: 22:31 - 23:59 (closed_for_day) - canOrderNow=false, canScheduleToday=false, defaultDate=tomorrow", () => {
      const res2245 = checkOperatingHours(config, new Date("2026-09-26T22:45:00+07:00"), "delivery");
      expect(res2245.operatingWindow).toBe("closed_for_day");
      expect(res2245.canOrderNow).toBe(false);
      expect(res2245.canScheduleToday).toBe(false);
      expect(res2245.isEarlyMorning).toBe(false);
      expect(res2245.isAfterCutoff).toBe(true);
      expect(res2245.defaultDeliverySchedule).toBe("schedule");
      expect(res2245.defaultDate).toBe("2026-09-27");
      expect(res2245.notice).not.toBeNull();
    });
  });

  describe("6. generate15MinTimeSlots", () => {
    it("generates slots up to 23:00 for delivery", () => {
      const slots = generate15MinTimeSlots("10:00", "23:00", undefined, "delivery");
      expect(slots[0].value).toBe("10:00");
      expect(slots[slots.length - 1].value).toBe("23:00");
      expect(slots.some((s) => s.value === "22:45")).toBe(true);
      expect(slots.some((s) => s.value === "23:00")).toBe(true);
    });

    it("caps slots at 22:30 for pickup", () => {
      const slots = generate15MinTimeSlots("09:00", "23:00", undefined, "pickup");
      expect(slots[0].value).toBe("09:00");
      expect(slots[slots.length - 1].value).toBe("22:30");
      expect(slots.some((s) => s.value === "22:45")).toBe(false);
      expect(slots.some((s) => s.value === "23:00")).toBe(false);
    });

    it("filters out slots before filterBeforeTime", () => {
      const slots = generate15MinTimeSlots("10:00", "23:00", "12:45", "delivery");
      expect(slots[0].value).toBe("12:45");
      expect(slots.some((s) => s.value === "12:30")).toBe(false);
    });
  });

  describe("7. i18n Translation Keys & Microcopy", () => {
    it("contains all 5 standardized microcopies and 22:30 pickup hours in vi.json", () => {
      const checkout = viMessages.checkout;
      expect(checkout.microcopy_early_morning).toBe(
        "🌙 Bếp mở cửa lúc 09:00. Bạn vui lòng chọn hẹn giờ nhận món từ 10:00 hôm nay nhé!"
      );
      expect(checkout.microcopy_delivery_now).toBe("Dự kiến giao sau 45 - 90 phút.");
      expect(checkout.microcopy_schedule).toBe(
        "Đơn đặt trước nhận sớm nhất sau 90 phút để bếp kịp chuẩn bị chỉn chu."
      );
      expect(checkout.microcopy_schedule_cutoff).toBe(
        "Hôm nay đã hết khung giờ đặt trước. Quý khách vui lòng chọn hẹn giờ nhận món từ ngày mai."
      );
      expect(checkout.microcopy_closed_today).toBe(
        "🌙 Bếp đã ngưng nhận đơn hôm nay. Bạn vui lòng chọn hẹn giờ nhận món từ 10:00 ngày mai nhé!"
      );

      expect(checkout.pickup_time_notice).toContain("09:00 - 22:30");
      expect(checkout.pickup_time_notice_out_hours).toContain("09:00 - 22:30");
    });

    it("contains English versions in en.json", () => {
      const checkout = enMessages.checkout;
      expect(checkout.microcopy_early_morning).toBeDefined();
      expect(checkout.microcopy_delivery_now).toBeDefined();
      expect(checkout.microcopy_schedule).toBeDefined();
      expect(checkout.microcopy_schedule_cutoff).toBeDefined();
      expect(checkout.microcopy_closed_today).toBeDefined();
      expect(checkout.pickup_time_notice).toContain("09:00 - 22:30");
    });
  });

  describe("8. Defensive UI Lock & Date Array Generation (Change: simplify-checkout-delivery-schedule-ui)", () => {
    it("startOffset is 1 and excludes 'Hôm nay' when after cutoff or out of slots today", () => {
      const config = {
        store_open: "09:00",
        store_close: "23:00",
        delivery_open: "10:00",
        delivery_close: "23:00",
        pickup_open: "09:00",
        pickup_close: "22:30",
        last_order_cutoff: "22:30",
        schedule_cutoff: "21:30",
        buffer_minutes: 90,
      };

      // Test case 1: 21:45 (after 21:30 cutoff, last_call_immediate)
      const refDate2145 = new Date("2026-09-26T21:45:00+07:00");
      const op2145 = checkOperatingHours(config, refDate2145, "delivery");
      const outOfSlotsToday2145 = isTodayOutOfScheduleSlots("23:00", refDate2145, op2145.bufferMinutes || 90, op2145.scheduleCutoff || "21:30");
      const startOffset2145 = (!op2145.canOrderNow && (op2145.isAfterCutoff || op2145.isAfterClose)) || outOfSlotsToday2145 || !op2145.canScheduleToday ? 1 : 0;
      expect(outOfSlotsToday2145).toBe(true);
      expect(startOffset2145).toBe(1);

      // Generating dates with startOffset = 1
      const dates: { iso: string; label: string }[] = [];
      for (let i = startOffset2145; i < startOffset2145 + 5; i++) {
        const d = new Date(refDate2145);
        d.setDate(d.getDate() + i);
        let label = `Day +${i}`;
        if (i === 0) label = `Hôm nay (${label})`;
        else if (i === 1) label = `Ngày mai (${label})`;
        dates.push({ iso: d.toISOString().split("T")[0], label });
      }
      expect(dates[0].label).toContain("Ngày mai");
      expect(dates.some((d) => d.label.includes("Hôm nay"))).toBe(false);

      // Test case 2: 14:00 (during daytime)
      const refDate1400 = new Date("2026-09-26T14:00:00+07:00");
      const op1400 = checkOperatingHours(config, refDate1400, "delivery");
      const outOfSlotsToday1400 = isTodayOutOfScheduleSlots("23:00", refDate1400, op1400.bufferMinutes || 90, op1400.scheduleCutoff || "21:30");
      const startOffset1400 = (!op1400.canOrderNow && (op1400.isAfterCutoff || op1400.isAfterClose)) || outOfSlotsToday1400 || !op1400.canScheduleToday ? 1 : 0;
      expect(outOfSlotsToday1400).toBe(false);
      expect(startOffset1400).toBe(0);

      const dates1400: { iso: string; label: string }[] = [];
      for (let i = startOffset1400; i < startOffset1400 + 5; i++) {
        const d = new Date(refDate1400);
        d.setDate(d.getDate() + i);
        let label = `Day +${i}`;
        if (i === 0) label = `Hôm nay (${label})`;
        else if (i === 1) label = `Ngày mai (${label})`;
        dates1400.push({ iso: d.toISOString().split("T")[0], label });
      }
      expect(dates1400[0].label).toContain("Hôm nay");
    });
  });
});
