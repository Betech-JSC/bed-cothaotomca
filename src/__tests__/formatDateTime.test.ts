import { describe, it, expect } from "vitest";
import { formatDate, formatVietnamDateTime, isCodPayment } from "@/lib/format";

describe("formatDate", () => {
  it("formats CMS blog timestamps in Asia/Ho_Chi_Minh (GMT+7) as DD Month YYYY with capitalized month for all 12 months in English", () => {
    // 2026-08-09T17:07:19.000000Z UTC is 2026-08-10 00:07:19 in Vietnam (GMT+7)
    expect(formatDate("2026-08-09T17:07:19.000000Z", "en")).toBe("10 August 2026");
    expect(formatDate("2026-08-09T17:07:19.000000Z", "vi")).toBe("10/08/2026");
    expect(formatDate("2026-08-10", "en")).toBe("10 August 2026");
    expect(formatDate("2026-08-10", "vi")).toBe("10/08/2026");
    const expectedMonths = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    expectedMonths.forEach((m, idx) => {
      const mm = String(idx + 1).padStart(2, "0");
      expect(formatDate(`2026-${mm}-09T17:07:19.000000Z`, "en")).toBe(`10 ${m} 2026`);
    });
  });
});

describe("formatVietnamDateTime", () => {
  it("formats ISO UTC string to Asia/Ho_Chi_Minh (GMT+7) date-time", () => {
    // 07:30 UTC is 14:30 in GMT+7
    const result = formatVietnamDateTime("2026-10-06T07:30:00Z");
    expect(result).toBe("14:30 06/10/2026");
  });

  it("formats with seconds when includeSeconds is true", () => {
    const result = formatVietnamDateTime("2026-10-06T07:30:45Z", true);
    expect(result).toBe("14:30:45 06/10/2026");
  });

  it("handles day rollover across midnight in GMT+7", () => {
    // 17:15 UTC on Oct 5 is 00:15 on Oct 6 in GMT+7
    const result = formatVietnamDateTime("2026-10-05T17:15:00Z");
    expect(result).toBe("00:15 06/10/2026");
  });

  it("handles Date instance and timestamp number", () => {
    const dateObj = new Date("2026-10-06T03:00:00Z"); // 10:00 GMT+7
    expect(formatVietnamDateTime(dateObj)).toBe("10:00 06/10/2026");
    expect(formatVietnamDateTime(dateObj.getTime())).toBe("10:00 06/10/2026");
  });

  it("safely handles null, undefined, empty string, and invalid dates", () => {
    expect(formatVietnamDateTime(null)).toBe("");
    expect(formatVietnamDateTime(undefined)).toBe("");
    expect(formatVietnamDateTime("")).toBe("");
    expect(formatVietnamDateTime("not-a-valid-date")).toBe("");
  });
});

describe("isCodPayment helper", () => {
  it("identifies is_cod: true from backend resource", () => {
    expect(isCodPayment({ is_cod: true })).toBe(true);
  });

  it("identifies payment.method === 'CASH' or 'COD'", () => {
    expect(isCodPayment({ payment: { method: "CASH" } })).toBe(true);
    expect(isCodPayment({ payment: { method: "cash" } })).toBe(true);
    expect(isCodPayment({ payment: { method: "COD" } })).toBe(true);
    expect(isCodPayment({ payment: { method: "cod" } })).toBe(true);
  });

  it("identifies payment_method === 'CASH' or 'COD'", () => {
    expect(isCodPayment({ payment_method: "CASH" })).toBe(true);
    expect(isCodPayment({ payment_method: "COD" })).toBe(true);
  });

  it("returns false for non-COD payment methods", () => {
    expect(isCodPayment({ payment: { method: "TRANSFER" } })).toBe(false);
    expect(isCodPayment({ payment: { method: "CARD" } })).toBe(false);
    expect(isCodPayment({ payment_method: "VNPAY" })).toBe(false);
    expect(isCodPayment(null)).toBe(false);
    expect(isCodPayment(undefined)).toBe(false);
    expect(isCodPayment({})).toBe(false);
  });
});
