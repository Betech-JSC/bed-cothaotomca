import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  verifyAddressViaMapApi,
  evaluateGeocodePayload,
  clearAddressGeocodeCache,
  extractLeadingHouseNumber,
  hasHouseNumberInAddress,
  HCMC_STREET_DIRECTORY,
  type WardCatalogEntry,
  type GeocodeVerificationPayload,
} from "@/utils/addressValidation";
import { resolveNewWardName } from "@/data/wardMapping";

const MOCK_WARDS: WardCatalogEntry[] = [
  { id: "SG", name: "Sài Gòn", district: "Sài Gòn" },
  { id: "BT", name: "Bến Thành", district: "Bến Thành" },
  { id: "TD_Q1", name: "Tân Định", district: "Tân Định" },
  { id: "XH", name: "Xuân Hòa", district: "Xuân Hòa" },
  { id: "NL", name: "Nhiêu Lộc", district: "Nhiêu Lộc" },
  { id: "BC", name: "Bàn Cờ", district: "Bàn Cờ" },
  { id: "CQ", name: "Chợ Quán", district: "Chợ Quán" },
  { id: "HT", name: "Hạnh Thông", district: "Hạnh Thông" },
  { id: "GV", name: "Gò Vấp", district: "Gò Vấp" },
  { id: "TTH", name: "Thông Tây Hội", district: "Thông Tây Hội" },
  { id: "GD", name: "Gia Định", district: "Gia Định" },
  { id: "PN", name: "Phú Nhuận", district: "Phú Nhuận" },
  { id: "DN", name: "Đức Nhuận", district: "Đức Nhuận" },
  { id: "TSH", name: "Tân Sơn Hòa", district: "Tân Sơn Hòa" },
  { id: "TSN", name: "Tân Sơn Nhất", district: "Tân Sơn Nhất" },
  { id: "AK", name: "An Khánh", district: "An Khánh" },
  { id: "PL", name: "Phước Long", district: "Phước Long" },
  { id: "BTH", name: "Bình Thạnh", district: "Bình Thạnh" },
  { id: "VL", name: "Vườn Lài", district: "Vườn Lài" },
  { id: "COL", name: "Cầu Ông Lãnh", district: "Cầu Ông Lãnh" },
  { id: "CK", name: "Cầu Kiệu", district: "Cầu Kiệu" },
];

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Kiểm thử độc lập TrackAsia Geocode + Cơ chế Nội bộ Fallback (street_only vs house_number & 250m border tolerance)", () => {
  beforeEach(() => {
    clearAddressGeocodeCache();
  });

  afterEach(() => {
    clearAddressGeocodeCache();
    vi.restoreAllMocks();
  });

  describe("1. TrackAsia chạm limit (provider='internal') hoặc lỗi mạng -> Rơi 100% về cơ chế nội bộ, tuyệt đối KHÔNG gọi Goong hay Nominatim", () => {
    it("Kịch bản 1A: Khi TrackAsia chạm limit (provider='internal', candidates=[]) -> '197 hoàng sa' + 'Phường Tân Định' trả isValid === true nhờ HCMC_STREET_DIRECTORY nội bộ (chỉ 1 lần fetch tới Backend)", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            provider: "internal",
            cached: false,
            precision: "unknown",
            candidates: [],
          },
        })
      );

      const result = await verifyAddressViaMapApi({
        streetAddress: "197 hoàng sa",
        selectedWard: "Phường Tân Định",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(String(fetchSpy.mock.calls[0][0])).toContain("/shipping/verify-address");
      expect(result.isValid).toBe(true);
      expect(result.conflictType).toBeUndefined();
      expect(result.suggestedWard).toBeUndefined();
    });

    it("Kịch bản 1B: Khi Backend lỗi mạng -> rơi về cơ chế nội bộ cho '197 hoàng sa' + 'Phường Tân Định' (isValid === true) và KHÔNG gọi bất kỳ API bên ngoài nào khác (fetchSpy = 1)", async () => {
      const fetchSpy = vi
        .spyOn(global, "fetch")
        .mockRejectedValueOnce(new TypeError("Failed to fetch backend"));

      const result = await verifyAddressViaMapApi({
        streetAddress: "197 hoàng sa",
        selectedWard: "Phường Tân Định",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(String(fetchSpy.mock.calls[0][0])).toContain("/shipping/verify-address");
      expect(result.isValid).toBe(true);
      expect(result.conflictType).toBeUndefined();
    });

    it("Kịch bản 1C: Khi TrackAsia chạm limit -> '45 Trần Quang Diệu' + 'Phường Tân Định' rơi về cơ chế nội bộ bắt lỗi (isValid === false) và gợi ý 'Phường Nhiêu Lộc' (chỉ 1 lần fetch tới Backend)", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
        createJsonResponse({
          success: true,
          data: {
            provider: "internal",
            cached: false,
            precision: "unknown",
            candidates: [],
          },
        })
      );

      const result = await verifyAddressViaMapApi({
        streetAddress: "45 Trần Quang Diệu",
        selectedWard: "Phường Tân Định",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.isValid).toBe(false);
      expect(result.conflictType).toBe("street_conflict");
      expect(result.suggestedWard?.name).toBe("Nhiêu Lộc");
      expect(result.message).toContain("Phường Nhiêu Lộc");
    });
  });

  describe("2. TrackAsia hoạt động bình thường (provider='trackasia') - Phân biệt chính xác số nhà trên cùng trục đường dài & Cache 0ms", () => {
    it("cho phép '197 hoàng sa' + 'Phường Tân Định' khi TrackAsia trả về precision='house_number' tại Phường Tân Định", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            provider: "trackasia",
            cached: false,
            precision: "house_number",
            candidates: [
              {
                formatted_address:
                  "197 Hoàng Sa, Phường Tân Định, Quận 1, Thành phố Hồ Chí Minh",
                ward: "Phường Tân Định",
                old_ward: "Phường Tân Định",
                district: "Quận 1",
                province: "Thành phố Hồ Chí Minh",
                house_number: "197",
                street: "Hoàng Sa",
                distance_meters: 0,
              },
            ],
          },
        })
      );

      const result = await verifyAddressViaMapApi({
        streetAddress: "197 hoàng sa",
        selectedWard: "Phường Tân Định",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.isValid).toBe(true);
      expect(result.conflictType).toBeUndefined();
    });

    it("chặn gian lận khi nhập '1250 Hoàng Sa' (Tân Sơn Hòa - Tân Bình) nhưng chọn 'Phường Tân Định' (20k), và cho phép ngay trong 0ms (1 lần fetch duy nhất) khi đổi sang 'Phường Tân Sơn Hòa'", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
        createJsonResponse({
          success: true,
          data: {
            provider: "trackasia",
            precision: "house_number",
            candidates: [
              {
                formatted_address:
                  "1250 Hoàng Sa, Phường Tân Sơn Hòa, TP. Hồ Chí Minh",
                ward: "Phường Tân Sơn Hòa",
                old_ward: "Phường 5",
                district: "Tân Bình",
                house_number: "1250",
                distance_meters: 0,
              },
            ],
          },
        })
      );

      // Lần 1: Khách cố tình chọn Phường Tân Định (20k) cho địa chỉ 1250 Hoàng Sa
      const fraudResult = await verifyAddressViaMapApi({
        streetAddress: "1250 Hoàng Sa",
        selectedWard: "Phường Tân Định",
        availableWards: MOCK_WARDS,
      });

      expect(fraudResult.isValid).toBe(false);
      expect(fraudResult.conflictType).toBe("ward_conflict");
      expect(["Tân Sơn Hòa", "Phường Tân Sơn Hòa"]).toContain(
        fraudResult.suggestedWard?.name
      );
      expect(fraudResult.message).toContain("Phường Tân Sơn Hòa");
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Lần 2: Khách bấm đổi sang Phường Tân Sơn Hòa -> pass ngay lập tức từ mapLookupCache mà không gọi fetch lần 2
      const validAfterSwitch = await verifyAddressViaMapApi({
        streetAddress: "1250 Hoàng Sa",
        selectedWard: "Phường Tân Sơn Hòa",
        availableWards: MOCK_WARDS,
      });

      expect(validAfterSwitch.isValid).toBe(true);
      expect(validAfterSwitch.conflictType).toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("3. Dung sai giáp ranh <= 250m (house_number / poi sát mép ranh giới 2 phường)", () => {
    it("KHÔNG chặn oan khi candidates[0] thuộc Phường Xuân Hòa (0m) nhưng candidates[1] thuộc Phường Tân Định cách 120m (<= 250m)", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            provider: "trackasia",
            precision: "house_number",
            candidates: [
              {
                formatted_address:
                  "201 Hai Bà Trưng, Phường Xuân Hòa, TP. Hồ Chí Minh",
                ward: "Phường Xuân Hòa",
                old_ward: "Phường Võ Thị Sáu",
                district: "Quận 3",
                house_number: "201",
                distance_meters: 0,
              },
              {
                formatted_address:
                  "201 Hai Bà Trưng, Phường Tân Định, TP. Hồ Chí Minh",
                ward: "Phường Tân Định",
                old_ward: "Phường Tân Định",
                district: "Quận 1",
                house_number: "201",
                distance_meters: 120,
              },
            ],
          },
        })
      );

      const borderValid = await verifyAddressViaMapApi({
        streetAddress: "201 Hai Bà Trưng",
        selectedWard: "Phường Tân Định",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(borderValid.isValid).toBe(true);
      expect(borderValid.conflictType).toBeUndefined();
    });

    it("BẮT LỖI chính xác khi candidates[1] thuộc Phường Tân Định cách xa 1800m (> 250m)", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            provider: "trackasia",
            precision: "house_number",
            candidates: [
              {
                formatted_address:
                  "380 Hai Bà Trưng, Phường Xuân Hòa, TP. Hồ Chí Minh",
                ward: "Phường Xuân Hòa",
                old_ward: "Phường Võ Thị Sáu",
                district: "Quận 3",
                house_number: "380",
                distance_meters: 0,
              },
              {
                formatted_address:
                  "38 Hai Bà Trưng, Phường Tân Định, TP. Hồ Chí Minh",
                ward: "Phường Tân Định",
                old_ward: "Phường Tân Định",
                district: "Quận 1",
                house_number: "38",
                distance_meters: 1800,
              },
            ],
          },
        })
      );

      const farMismatch = await verifyAddressViaMapApi({
        streetAddress: "380 Hai Bà Trưng",
        selectedWard: "Phường Tân Định",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(farMismatch.isValid).toBe(false);
      expect(farMismatch.conflictType).toBe("ward_conflict");
      expect(farMismatch.suggestedWard?.name).toBe("Xuân Hòa");
      expect(farMismatch.message).toContain("Phường Xuân Hòa");
    });

    it("kiểm chứng ranh giới chính xác tại ngưỡng 250m vs 251m và tự động tính khoảng cách Haversine từ lat/lng", () => {
      const payloadAt250m: GeocodeVerificationPayload = {
        provider: "trackasia",
        precision: "poi",
        candidates: [
          {
            formatted_address: "Cầu Kiệu, Phường Xuân Hòa, TP. Hồ Chí Minh",
            ward: "Phường Xuân Hòa",
            district: "Quận 3",
            distance_meters: 0,
          },
          {
            formatted_address: "Cầu Kiệu, Phường Tân Định, TP. Hồ Chí Minh",
            ward: "Phường Tân Định",
            district: "Quận 1",
            distance_meters: 250,
          },
        ],
      };

      const payloadAt251m: GeocodeVerificationPayload = {
        ...payloadAt250m,
        candidates: [
          payloadAt250m.candidates[0],
          { ...payloadAt250m.candidates[1], distance_meters: 251 },
        ],
      };

      expect(
        evaluateGeocodePayload(payloadAt250m, {
          streetAddress: "Tòa nhà giáp ranh",
          selectedWard: "Phường Tân Định",
          availableWards: MOCK_WARDS,
        }).isValid
      ).toBe(true);

      expect(
        evaluateGeocodePayload(payloadAt251m, {
          streetAddress: "Tòa nhà quá 250m",
          selectedWard: "Phường Tân Định",
          availableWards: MOCK_WARDS,
        }).isValid
      ).toBe(false);

      // Tự tính Haversine khi raw candidates chỉ có lat/lng (~111m <= 250m)
      const haversineNearbyPayload: GeocodeVerificationPayload = {
        provider: "trackasia",
        precision: "house_number",
        candidates: [
          {
            formatted_address: "100 Điện Biên Phủ, Phường Xuân Hòa, TP.HCM",
            ward: "Phường Xuân Hòa",
            district: "Quận 3",
            lat: 10.789,
            lng: 106.688,
          },
          {
            formatted_address: "100 Điện Biên Phủ, Phường Tân Định, TP.HCM",
            ward: "Phường Tân Định",
            district: "Quận 1",
            lat: 10.7898,
            lng: 106.6886,
          },
        ],
      };

      expect(
        evaluateGeocodePayload(haversineNearbyPayload, {
          streetAddress: "100 Điện Biên Phủ",
          selectedWard: "Phường Tân Định",
          availableWards: MOCK_WARDS,
        }).isValid
      ).toBe(true);
    });
  });

  describe("4. Chế độ street_only của TrackAsia (Không chặn oan đường liên phường & bắt dính đường nhỏ ngoài từ điển)", () => {
    it("KHÔNG chặn oan khi TrackAsia trả precision='street_only' trên trục Hoàng Sa có Võ Thị Sáu (Quận 3) đứng đầu và Tân Định đứng sau", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            provider: "trackasia",
            cached: false,
            precision: "street_only",
            candidates: [
              {
                formatted_address:
                  "Đường Hoàng Sa, Phường Võ Thị Sáu, Quận 3, Thành phố Hồ Chí Minh",
                ward: "Phường Võ Thị Sáu",
                old_ward: "Phường Võ Thị Sáu",
                district: "Quận 3",
                province: "Thành phố Hồ Chí Minh",
                street: "Đường Hoàng Sa",
              },
              {
                formatted_address:
                  "Đường Hoàng Sa, Phường Tân Định, Quận 1, Thành phố Hồ Chí Minh",
                ward: "Phường Tân Định",
                old_ward: "Phường Tân Định",
                district: "Quận 1",
                province: "Thành phố Hồ Chí Minh",
                street: "Đường Hoàng Sa",
              },
            ],
          },
        })
      );

      const result = await verifyAddressViaMapApi({
        streetAddress: "197 hoàng sa",
        selectedWard: "Phường Tân Định",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.isValid).toBe(true);
      expect(result.conflictType).toBeUndefined();
    });

    it("bắt lỗi chính xác khi nhập '45 Nguyễn Văn Mai' (đường nhánh không nằm trong HCMC_STREET_DIRECTORY, TrackAsia trả street_only thuộc Quận 3) nhưng chọn 'Phường An Khánh' (TP. Thủ Đức)", async () => {
      const inHardcodedDict = HCMC_STREET_DIRECTORY.some((entry) =>
        entry.keywords.some((kw) => kw.includes("nguyen van mai"))
      );
      expect(inHardcodedDict).toBe(false);

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            provider: "trackasia",
            cached: false,
            precision: "street_only",
            candidates: [
              {
                formatted_address:
                  "Đường Nguyễn Văn Mai, Phường Nhiêu Lộc, Quận 3, Thành phố Hồ Chí Minh",
                ward: "Phường Nhiêu Lộc",
                old_ward: "Phường 14",
                district: "Quận 3",
                province: "Thành phố Hồ Chí Minh",
                street: "Đường Nguyễn Văn Mai",
              },
              {
                formatted_address:
                  "Đường Nguyễn Văn Mai, Phường Xuân Hòa, Quận 3, Thành phố Hồ Chí Minh",
                ward: "Phường Xuân Hòa",
                old_ward: "Phường Võ Thị Sáu",
                district: "Quận 3",
                province: "Thành phố Hồ Chí Minh",
                street: "Đường Nguyễn Văn Mai",
              },
            ],
          },
        })
      );

      const mismatchResult = await verifyAddressViaMapApi({
        streetAddress: "45 Nguyễn Văn Mai",
        selectedWard: "Phường An Khánh",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(mismatchResult.isValid).toBe(false);
      expect(mismatchResult.conflictType).toBe("ward_conflict");
      expect(["Nhiêu Lộc", "Xuân Hòa"]).toContain(
        mismatchResult.suggestedWard?.name
      );
      expect(mismatchResult.message).toContain("Phường Nhiêu Lộc");
      expect(mismatchResult.message).toContain("Phường An Khánh");

      // Khi khách đổi về Phường Nhiêu Lộc (Quận 3) -> hợp lệ ngay từ cache
      const validResult = await verifyAddressViaMapApi({
        streetAddress: "45 Nguyễn Văn Mai",
        selectedWard: "Phường Nhiêu Lộc",
        availableWards: MOCK_WARDS,
      });

      expect(validResult.isValid).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("trích xuất đúng số nhà đầu chuỗi (extractLeadingHouseNumber) kể cả tiền tố Hẻm/Ngõ/Ngách/Kiệt nhiều cấp xuyệt mà không nhầm tên đường số hoặc tòa nhà", () => {
      expect(extractLeadingHouseNumber("197 hoàng sa")).toBe("197");
      expect(extractLeadingHouseNumber("197/12A Hoàng Sa")).toBe("197");
      expect(extractLeadingHouseNumber("Số 1250B Hoàng Sa")).toBe("1250");
      expect(extractLeadingHouseNumber("Hẻm 451/23/8 Hai Bà Trưng")).toBe("451");
      expect(extractLeadingHouseNumber("Ngõ 12/3A Lê Văn Sỹ")).toBe("12");
      expect(extractLeadingHouseNumber("H. 88/4/2 Điện Biên Phủ")).toBe("88");
      expect(extractLeadingHouseNumber("Đường số 7")).toBeNull();
      expect(extractLeadingHouseNumber("Landmark 81")).toBeNull();
    });

    it("Edge Case #2: khi chọn Phường Tân Định và nhập '284/5/12 Lê Văn Sỹ' (đường liên quận có số nhà), gọi TrackAsia để gợi ý thẳng 'Phường Nhiêu Lộc' ngay 1-Click thay vì 'Phường Xuân Hòa'", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            provider: "trackasia",
            cached: false,
            precision: "house_number",
            candidates: [
              {
                formatted_address:
                  "284 Lê Văn Sỹ, Phường Nhiêu Lộc, Quận 3, Thành phố Hồ Chí Minh",
                ward: "Phường Nhiêu Lộc",
                old_ward: "Phường 14",
                district: "Quận 3",
                province: "Thành phố Hồ Chí Minh",
                house_number: "284",
                street: "Lê Văn Sỹ",
                distance_meters: 0,
              },
            ],
          },
        })
      );

      const result = await verifyAddressViaMapApi({
        streetAddress: "284/5/12 Lê Văn Sỹ",
        selectedWard: "Phường Tân Định",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.isValid).toBe(false);
      expect(result.suggestedWard?.name).toBe("Nhiêu Lộc");
      expect(result.message).toContain("Phường Nhiêu Lộc");
    });

    it("Edge Case #4: khử ký tự chữ cái lặp liền kề khi gõ dư phím ('197 Hoàng Saa' khi chọn Phường An Khánh -> phát hiện Đường Hoàng Sa và gợi ý Phường Tân Định)", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            provider: "internal",
            cached: false,
            precision: "unknown",
            candidates: [],
          },
        })
      );

      const result = await verifyAddressViaMapApi({
        streetAddress: "197 Hoàng Saa",
        selectedWard: "Phường An Khánh",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.isValid).toBe(false);
      expect(result.conflictType).toBe("street_conflict");
      expect(result.suggestedWard?.name).toBe("Tân Định");
      expect(result.message).toContain("Đường Hoàng Sa");
      expect(result.message).toContain("Phường Tân Định");
    });
  });

  describe("5. Fix 6 vấn đề kiểm tra địa chỉ & phường/xã (Nghị quyết 1685/NQ-UBTVQH15, gợi ý có số nhà khi chưa chọn phường, trùng số nhà liên quận)", () => {
    it("Vấn đề #1 & #2: khi CHƯA chọn phường nhưng địa chỉ có số nhà ('100 Cách Mạng Tháng 8'), luôn gọi API để gợi ý đúng Phường Xuân Hòa thay vì trả sớm preferredWards[0] (Bến Thành)", async () => {
      expect(hasHouseNumberInAddress("100 Cách Mạng Tháng 8")).toBe(true);

      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            provider: "trackasia",
            cached: false,
            precision: "house_number",
            candidates: [
              {
                formatted_address:
                  "100 Cách Mạng Tháng 8, Phường Xuân Hòa, Quận 3, Thành phố Hồ Chí Minh",
                ward: "Phường Xuân Hòa",
                old_ward: "Phường Võ Thị Sáu",
                district: "Quận 3",
                province: "Thành phố Hồ Chí Minh",
                house_number: "100",
                street: "Cách Mạng Tháng 8",
                distance_meters: 0,
              },
            ],
          },
        })
      );

      // Bước 1: Khách chưa chọn phường -> gọi API trả gợi ý Phường Xuân Hòa
      const suggestResult = await verifyAddressViaMapApi({
        streetAddress: "100 Cách Mạng Tháng 8",
        selectedWard: "",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(suggestResult.isValid).toBe(true);
      expect(suggestResult.suggestedWard?.name).toBe("Xuân Hòa");

      // Bước 2: Khách bấm chọn Phường Xuân Hòa từ gợi ý -> hợp lệ ngay từ cache, không tự mâu thuẫn
      const verifyAfterClick = await verifyAddressViaMapApi({
        streetAddress: "100 Cách Mạng Tháng 8",
        selectedWard: "Xuân Hòa",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(verifyAfterClick.isValid).toBe(true);
      expect(verifyAfterClick.conflictType).toBeUndefined();
    });

    it("Vấn đề #3: khi số nhà lặp ở nhiều quận trên trục đường dài ('100 Phan Văn Trị' ở Quận 5 và Gò Vấp), trả đầy đủ suggestedWards và chấp nhận cả 2 phường hợp lệ", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
        createJsonResponse({
          success: true,
          data: {
            provider: "trackasia",
            cached: false,
            precision: "house_number",
            candidates: [
              {
                formatted_address:
                  "100 Phan Văn Trị, Phường Chợ Quán, Quận 5, Thành phố Hồ Chí Minh",
                ward: "Phường Chợ Quán",
                old_ward: "Phường 2",
                district: "Quận 5",
                province: "Thành phố Hồ Chí Minh",
                house_number: "100",
                street: "Phan Văn Trị",
                distance_meters: 0,
              },
              {
                formatted_address:
                  "100 Phan Văn Trị, Phường Hạnh Thông, Quận Gò Vấp, Thành phố Hồ Chí Minh",
                ward: "Phường Hạnh Thông",
                old_ward: "Phường 7",
                district: "Quận Gò Vấp",
                province: "Thành phố Hồ Chí Minh",
                house_number: "100",
                street: "Phan Văn Trị",
                distance_meters: 6800,
              },
            ],
          },
        })
      );

      // Chưa chọn phường -> gợi ý cả Chợ Quán và Hạnh Thông
      const unchosen = await verifyAddressViaMapApi({
        streetAddress: "100 Phan Văn Trị",
        selectedWard: "",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(unchosen.suggestedWards?.map((w) => w.name)).toEqual([
        "Chợ Quán",
        "Hạnh Thông",
      ]);

      // Chọn Chợ Quán -> Hợp lệ
      const validChoQuan = await verifyAddressViaMapApi({
        streetAddress: "100 Phan Văn Trị",
        selectedWard: "Chợ Quán",
        availableWards: MOCK_WARDS,
      });
      expect(validChoQuan.isValid).toBe(true);

      // Chọn Hạnh Thông (Gò Vấp, cách 6800m nhưng trùng số nhà 100) -> Hợp lệ
      const validHanhThong = await verifyAddressViaMapApi({
        streetAddress: "100 Phan Văn Trị",
        selectedWard: "Hạnh Thông",
        availableWards: MOCK_WARDS,
      });
      expect(validHanhThong.isValid).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("Vấn đề #5: resolveNewWardName ánh xạ chính xác Phường cũ -> Phường mới theo Nghị quyết 1685/NQ-UBTVQH15 có kèm Quận", () => {
      expect(resolveNewWardName("Phường 1", "Quận Gò Vấp")).toBe("Hạnh Thông");
      expect(resolveNewWardName("Phường 7", "Quận Gò Vấp")).toBe("Hạnh Thông");
      expect(resolveNewWardName("Phường 10", "Quận Gò Vấp")).toBe("Gò Vấp");
      expect(resolveNewWardName("Phường 17", "Quận Gò Vấp")).toBe("Gò Vấp");
      expect(resolveNewWardName("Phường 8", "Quận Gò Vấp")).toBe("Thông Tây Hội");
      expect(resolveNewWardName("Phường 4", "Quận Tân Bình")).toBe("Tân Sơn Nhất");
      expect(resolveNewWardName("Phường 1", "Quận Bình Thạnh")).toBe("Gia Định");
    });

    it("Bảng test 14 địa chỉ thực tế (Feedback phí ship - Bảng test địa chỉ.csv): gợi ý chuẩn 14/14 khi chưa chọn phường (selectedWard='') và 0% tự mâu thuẫn khi bấm chọn phường gợi ý", async () => {
      const CSV_14_CASES: Array<{
        stt: number;
        address: string;
        expectedPrimaryWard: string;
        expectedSuggestedWards?: string[];
        forbiddenWrongWard?: string;
        candidates: GeocodeVerificationPayload["candidates"];
      }> = [
        {
          stt: 1,
          address: "64 Út Tịch",
          expectedPrimaryWard: "Tân Sơn Nhất",
          candidates: [
            {
              formatted_address: "64 Út Tịch, Phường Tân Sơn Nhất, Thành phố Hồ Chí Minh",
              ward: "Phường Tân Sơn Nhất",
              old_ward: "Phường 4",
              district: "Quận Tân Bình",
              house_number: "64",
              street: "Út Tịch",
              distance_meters: 0,
            },
          ],
        },
        {
          stt: 2,
          address: "1000 Cách Mạng Tháng 8",
          expectedPrimaryWard: "Tân Sơn Nhất",
          forbiddenWrongWard: "Xuân Hòa",
          candidates: [
            {
              formatted_address: "1000 Cách Mạng Tháng 8, Phường 7, Quận Tân Bình, Thành phố Hồ Chí Minh",
              ward: "Phường 7",
              old_ward: "Phường 7",
              district: "Quận Tân Bình",
              house_number: "1000",
              street: "Cách Mạng Tháng 8",
              distance_meters: 0,
            },
          ],
        },
        {
          stt: 3,
          address: "50 Cách Mạng Tháng 8",
          expectedPrimaryWard: "Bàn Cờ",
          forbiddenWrongWard: "Xuân Hòa",
          candidates: [
            {
              formatted_address: "50 Cách Mạng Tháng 8, Phường 5, Quận 3, Thành phố Hồ Chí Minh",
              ward: "Phường Bàn Cờ",
              old_ward: "Phường 5",
              district: "Quận 3",
              house_number: "50",
              street: "Cách Mạng Tháng 8",
              distance_meters: 0,
            },
          ],
        },
        {
          stt: 4,
          address: "500 Lê Văn Sỹ",
          expectedPrimaryWard: "Nhiêu Lộc",
          forbiddenWrongWard: "Xuân Hòa",
          candidates: [
            {
              formatted_address: "500 Lê Văn Sỹ, Phường 14, Quận 3, Thành phố Hồ Chí Minh",
              ward: "Phường Nhiêu Lộc",
              old_ward: "Phường 14",
              district: "Quận 3",
              house_number: "500",
              street: "Lê Văn Sỹ",
              distance_meters: 0,
            },
          ],
        },
        {
          stt: 5,
          address: "200 Lê Văn Sỹ",
          expectedPrimaryWard: "Phú Nhuận",
          forbiddenWrongWard: "Xuân Hòa",
          candidates: [
            {
              formatted_address: "200 Lê Văn Sỹ, Phường 10, Quận Phú Nhuận, Thành phố Hồ Chí Minh",
              ward: "Phường Phú Nhuận",
              old_ward: "Phường 10",
              district: "Quận Phú Nhuận",
              house_number: "200",
              street: "Lê Văn Sỹ",
              distance_meters: 0,
            },
          ],
        },
        {
          stt: 6,
          address: "1073 Phan Văn Trị",
          expectedPrimaryWard: "Gò Vấp",
          candidates: [
            {
              formatted_address: "1073 Phan Văn Trị, Phường 10, Quận Gò Vấp, Thành phố Hồ Chí Minh",
              ward: "Phường Gò Vấp",
              old_ward: "Phường 10",
              district: "Quận Gò Vấp",
              house_number: "1073",
              street: "Phan Văn Trị",
              distance_meters: 0,
            },
          ],
        },
        {
          stt: 7,
          address: "100 Phan Văn Trị",
          expectedPrimaryWard: "Bình Thạnh",
          expectedSuggestedWards: ["Bình Thạnh", "Hạnh Thông"],
          candidates: [
            {
              formatted_address: "100 Phan Văn Trị, Phường 12, Quận Bình Thạnh, Thành phố Hồ Chí Minh",
              ward: "Phường Bình Thạnh",
              old_ward: "Phường 12",
              district: "Quận Bình Thạnh",
              house_number: "100",
              street: "Phan Văn Trị",
              distance_meters: 0,
            },
            {
              formatted_address: "100 Phan Văn Trị, Phường 7, Quận Gò Vấp, Thành phố Hồ Chí Minh",
              ward: "Phường Hạnh Thông",
              old_ward: "Phường 7",
              district: "Quận Gò Vấp",
              house_number: "100",
              street: "Phan Văn Trị",
              distance_meters: 2400,
            },
          ],
        },
        {
          stt: 8,
          address: "500 Quang Trung",
          expectedPrimaryWard: "Gò Vấp",
          candidates: [
            {
              formatted_address: "500 Quang Trung, Phường 10, Quận Gò Vấp, Thành phố Hồ Chí Minh",
              ward: "Phường Gò Vấp",
              old_ward: "Phường 10",
              district: "Quận Gò Vấp",
              house_number: "500",
              street: "Quang Trung",
              distance_meters: 0,
            },
          ],
        },
        {
          stt: 9,
          address: "1000 Quang Trung",
          expectedPrimaryWard: "Thông Tây Hội",
          forbiddenWrongWard: "Gò Vấp",
          candidates: [
            {
              formatted_address: "1000 Quang Trung, Phường 8, Quận Gò Vấp, Thành phố Hồ Chí Minh",
              ward: "Phường 8",
              old_ward: "Phường 8",
              district: "Quận Gò Vấp",
              house_number: "1000",
              street: "Quang Trung",
              distance_meters: 0,
            },
          ],
        },
        {
          stt: 10,
          address: "100 Nguyễn Văn Trỗi",
          expectedPrimaryWard: "Phú Nhuận",
          candidates: [
            {
              formatted_address: "100 Nguyễn Văn Trỗi, Phường 8, Quận Phú Nhuận, Thành phố Hồ Chí Minh",
              ward: "Phường Phú Nhuận",
              old_ward: "Phường 8",
              district: "Quận Phú Nhuận",
              house_number: "100",
              street: "Nguyễn Văn Trỗi",
              distance_meters: 0,
            },
          ],
        },
        {
          stt: 11,
          address: "300 Nguyễn Văn Trỗi",
          expectedPrimaryWard: "Tân Sơn Hòa",
          forbiddenWrongWard: "Phú Nhuận",
          candidates: [
            {
              formatted_address: "300 Nguyễn Văn Trỗi, Phường 1, Quận Tân Bình, Thành phố Hồ Chí Minh",
              ward: "Phường Tân Sơn Hòa",
              old_ward: "Phường 1",
              district: "Quận Tân Bình",
              house_number: "300",
              street: "Nguyễn Văn Trỗi",
              distance_meters: 0,
            },
          ],
        },
        {
          stt: 12,
          address: "200 Điện Biên Phủ",
          expectedPrimaryWard: "Gia Định",
          expectedSuggestedWards: ["Gia Định", "Xuân Hòa"],
          forbiddenWrongWard: "Tân Định",
          candidates: [
            {
              formatted_address: "200 Điện Biên Phủ, Phường 17, Quận Bình Thạnh, Thành phố Hồ Chí Minh",
              ward: "Phường Gia Định",
              old_ward: "Phường 17",
              district: "Quận Bình Thạnh",
              house_number: "200",
              street: "Điện Biên Phủ",
              distance_meters: 0,
            },
            {
              formatted_address: "200 Điện Biên Phủ, Phường Võ Thị Sáu, Quận 3, Thành phố Hồ Chí Minh",
              ward: "Phường Xuân Hòa",
              old_ward: "Phường Võ Thị Sáu",
              district: "Quận 3",
              house_number: "200",
              street: "Điện Biên Phủ",
              distance_meters: 2300,
            },
          ],
        },
        {
          stt: 13,
          address: "600 Điện Biên Phủ",
          expectedPrimaryWard: "Vườn Lài",
          forbiddenWrongWard: "Tân Định",
          candidates: [
            {
              formatted_address: "600 Điện Biên Phủ, Phường 11, Quận 10, Thành phố Hồ Chí Minh",
              ward: "Phường Vườn Lài",
              old_ward: "Phường 11",
              district: "Quận 10",
              house_number: "600",
              street: "Điện Biên Phủ",
              distance_meters: 0,
            },
          ],
        },
        {
          stt: 14,
          address: "300 Võ Văn Kiệt",
          expectedPrimaryWard: "Cầu Ông Lãnh",
          forbiddenWrongWard: "Sài Gòn",
          candidates: [
            {
              formatted_address: "300 Võ Văn Kiệt, Phường Cô Giang, Quận 1, Thành phố Hồ Chí Minh",
              ward: "Phường Cô Giang",
              old_ward: "Phường Cô Giang",
              district: "Quận 1",
              house_number: "300",
              street: "Võ Văn Kiệt",
              distance_meters: 0,
            },
          ],
        },
      ];

      for (const tc of CSV_14_CASES) {
        clearAddressGeocodeCache();
        const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce(
          createJsonResponse({
            success: true,
            data: {
              provider: "trackasia",
              cached: false,
              precision: "house_number",
              candidates: tc.candidates,
            },
          })
        );

        // Bước 1: Khách CHƯA chọn phường (selectedWard: "") -> gọi API lấy gợi ý theo đúng số nhà
        const unchosenRes = await verifyAddressViaMapApi({
          streetAddress: tc.address,
          selectedWard: "",
          availableWards: MOCK_WARDS,
        });

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(unchosenRes.isValid).toBe(true);
        expect(unchosenRes.suggestedWard?.name).toBe(tc.expectedPrimaryWard);

        if (tc.forbiddenWrongWard) {
          expect(unchosenRes.suggestedWard?.name).not.toBe(tc.forbiddenWrongWard);
        }

        if (tc.expectedSuggestedWards) {
          expect(unchosenRes.suggestedWards?.map((w) => w.name)).toEqual(
            tc.expectedSuggestedWards
          );
        }

        // Bước 2 (Vấn đề #2): Ngay sau khi khách bấm chọn phường được gợi ý, kết quả kiểm tra luôn isValid === true (0% tự mâu thuẫn)
        const targetWardsToVerify = tc.expectedSuggestedWards || [tc.expectedPrimaryWard];
        for (const wardToPick of targetWardsToVerify) {
          const afterSelectRes = await verifyAddressViaMapApi({
            streetAddress: tc.address,
            selectedWard: `Phường ${wardToPick}`,
            availableWards: MOCK_WARDS,
          });
          expect(afterSelectRes.isValid).toBe(true);
          expect(afterSelectRes.conflictType).toBeUndefined();
        }

        fetchSpy.mockRestore();
      }
    });
  });
});
