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
  { id: "TTH", name: "Thông Tây Hội", district: "Thông Tây Hội", old_ward: "Phường 8, Phường 9, Phường 11" },
  { id: "GD", name: "Gia Định", district: "Gia Định" },
  { id: "PN", name: "Phú Nhuận", district: "Phú Nhuận" },
  { id: "DN", name: "Đức Nhuận", district: "Đức Nhuận" },
  { id: "TSH", name: "Tân Sơn Hòa", district: "Tân Sơn Hòa" },
  { id: "TSN", name: "Tân Sơn Nhất", district: "Tân Sơn Nhất" },
  { id: "AK", name: "An Khánh", district: "An Khánh" },
  { id: "PL", name: "Phước Long", district: "Phước Long" },
  { id: "BTH", name: "Bình Thạnh", district: "Bình Thạnh" },
  { id: "VL", name: "Vườn Lài", district: "Vườn Lài" },
  { id: "COL", name: "Cầu Ông Lãnh", district: "Cầu Ông Lãnh", old_ward: "Phường Cô Giang, Phường Cầu Kho, Phường Nguyễn Cư Trinh" },
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

  describe("1. TrackAsia chạm limit (provider='internal') hoặc lỗi mạng / API lỗi (Mục 4) -> Không tự cho đặt hàng, trả trạng thái api_error / unverifiable và yêu cầu Hotline hoặc Yêu cầu cửa hàng gọi lại", () => {
    it("Kịch bản 1A: Khi TrackAsia chạm limit hoặc không xác minh được (provider='internal', candidates=[]) -> trả verificationStatus='unverifiable', canOrder=false, requiresCallback=true (chỉ 1 lần fetch tới Backend)", async () => {
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
      expect(result.isValid).toBe(false);
      expect(result.canOrder).toBe(false);
      expect(result.requiresCallback).toBe(true);
      expect(result.verificationStatus).toBe("api_error");
    });

    it("Kịch bản 1B: Khi Backend lỗi mạng -> trả verificationStatus='api_error', canOrder=false, requiresCallback=true và KHÔNG gọi bất kỳ API bên ngoài nào khác (fetchSpy = 1)", async () => {
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
      expect(result.isValid).toBe(false);
      expect(result.canOrder).toBe(false);
      expect(result.requiresCallback).toBe(true);
      expect(result.verificationStatus).toBe("api_error");
    });

    it("Kịch bản 1C: Khi Backend trả verification_status='api_error' -> trả verificationStatus='api_error', canOrder=false, requiresCallback=true và không cache lỗi API", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
        createJsonResponse({
          success: true,
          data: {
            provider: "internal",
            cached: false,
            precision: "unknown",
            verification_status: "api_error",
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
      expect(result.canOrder).toBe(false);
      expect(result.requiresCallback).toBe(true);
      expect(result.verificationStatus).toBe("api_error");
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

  describe("3. Mục 3: API trả nhiều kết quả - Cùng 1 phường mới vs Nhiều phường mới khác nhau (cho phép chọn 1 trong các phường gợi ý, chặn nếu chọn ngoài danh sách)", () => {
    it("khi các kết quả hợp lệ trả về nhiều phường mới khác nhau (Xuân Hòa & Tân Định) -> cho phép đặt hàng nếu chọn Tân Định hoặc Xuân Hòa, chặn nếu chọn phường ngoài danh sách", async () => {
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

      // Khách chọn Phường Tân Định (nằm trong danh sách gợi ý) -> cho phép đặt hàng
      const borderMatched = await verifyAddressViaMapApi({
        streetAddress: "201 Hai Bà Trưng",
        selectedWard: "Phường Tân Định",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(borderMatched.isValid).toBe(true);
      expect(borderMatched.canOrder).toBe(true);
      expect(borderMatched.isWardMatched).toBe(true);
      expect(borderMatched.requiresCallback).toBe(false);
      expect(borderMatched.verificationStatus).toBe("verified_single_ward");
      expect(borderMatched.suggestedWards?.map((w) => w.name)).toEqual(["Xuân Hòa", "Tân Định"]);

      // Khách chọn Phường Sài Gòn (ngoài danh sách gợi ý) -> chặn đặt hàng, yêu cầu gọi lại
      const borderOutside = await verifyAddressViaMapApi({
        streetAddress: "201 Hai Bà Trưng",
        selectedWard: "Phường Sài Gòn",
        availableWards: MOCK_WARDS,
      });
      expect(borderOutside.isValid).toBe(false);
      expect(borderOutside.canOrder).toBe(false);
      expect(borderOutside.requiresCallback).toBe(true);
      expect(borderOutside.verificationStatus).toBe("ward_mismatch");
      expect(borderOutside.suggestedWards?.map((w) => w.name)).toEqual(["Xuân Hòa", "Tân Định"]);
    });

    it("BẮT LỖI chính xác khi candidates[0] khớp số nhà 380 tại Phường Xuân Hòa còn candidates[1] là số nhà 38 tại Phường Tân Định -> chỉ xác nhận 1 phường Xuân Hòa (ward_mismatch)", async () => {
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
      expect(farMismatch.verificationStatus).toBe("ward_mismatch");
      expect(farMismatch.conflictType).toBe("ward_conflict");
      expect(farMismatch.suggestedWard?.name).toBe("Xuân Hòa");
      expect(farMismatch.message).toContain("Phường Xuân Hòa");
    });

    it("khi các kết quả cùng thuộc 1 phường mới duy nhất -> verified_single_ward; khi khác phường mới hoặc thiếu số nhà -> chặn đặt hàng", () => {
      const missingHouseNumberRes = evaluateGeocodePayload(
        {
          provider: "trackasia",
          precision: "poi",
          candidates: [
            {
              formatted_address: "Cầu Kiệu, Phường Xuân Hòa, TP. Hồ Chí Minh",
              ward: "Phường Xuân Hòa",
              district: "Quận 3",
              distance_meters: 0,
            },
          ],
        },
        {
          streetAddress: "Tòa nhà giáp ranh",
          selectedWard: "Phường Tân Định",
          availableWards: MOCK_WARDS,
        }
      );
      expect(missingHouseNumberRes.isValid).toBe(false);
      expect(missingHouseNumberRes.verificationStatus).toBe("missing_house_number");

      const haversineAmbiguousPayload: GeocodeVerificationPayload = {
        provider: "trackasia",
        precision: "house_number",
        candidates: [
          {
            formatted_address: "100 Điện Biên Phủ, Phường Xuân Hòa, TP.HCM",
            ward: "Phường Xuân Hòa",
            district: "Quận 3",
            house_number: "100",
            lat: 10.789,
            lng: 106.688,
          },
          {
            formatted_address: "100 Điện Biên Phủ, Phường Tân Định, TP.HCM",
            ward: "Phường Tân Định",
            district: "Quận 1",
            house_number: "100",
            lat: 10.7898,
            lng: 106.6886,
          },
        ],
      };

      const matchedMultiWardRes = evaluateGeocodePayload(haversineAmbiguousPayload, {
        streetAddress: "100 Điện Biên Phủ",
        selectedWard: "Phường Tân Định",
        availableWards: MOCK_WARDS,
      });
      expect(matchedMultiWardRes.isValid).toBe(true);
      expect(matchedMultiWardRes.canOrder).toBe(true);
      expect(matchedMultiWardRes.verificationStatus).toBe("verified_single_ward");
      expect(matchedMultiWardRes.requiresCallback).toBe(false);

      const outsideMultiWardRes = evaluateGeocodePayload(haversineAmbiguousPayload, {
        streetAddress: "100 Điện Biên Phủ",
        selectedWard: "Phường Sài Gòn",
        availableWards: MOCK_WARDS,
      });
      expect(outsideMultiWardRes.isValid).toBe(false);
      expect(outsideMultiWardRes.canOrder).toBe(false);
      expect(outsideMultiWardRes.verificationStatus).toBe("ward_mismatch");
      expect(outsideMultiWardRes.requiresCallback).toBe(true);
    });
  });

  describe("4. Chế độ street_only của TrackAsia (Mục 4: Không xác minh được số nhà -> trả unverifiable, yêu cầu Hotline / Yêu cầu cửa hàng gọi lại)", () => {
    it("khi TrackAsia chỉ trả precision='street_only' (không khớp số nhà) -> trả verificationStatus='unverifiable', canOrder=false, requiresCallback=true", async () => {
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
      expect(result.isValid).toBe(false);
      expect(result.canOrder).toBe(false);
      expect(result.requiresCallback).toBe(true);
      expect(result.verificationStatus).toBe("unverifiable");
    });

    it("khi nhập '45 Nguyễn Văn Mai' nhưng TrackAsia chỉ trả street_only -> trả verificationStatus='unverifiable', canOrder=false, requiresCallback=true", async () => {
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

      const unverifiableResult = await verifyAddressViaMapApi({
        streetAddress: "45 Nguyễn Văn Mai",
        selectedWard: "Phường An Khánh",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(unverifiableResult.isValid).toBe(false);
      expect(unverifiableResult.canOrder).toBe(false);
      expect(unverifiableResult.requiresCallback).toBe(true);
      expect(unverifiableResult.verificationStatus).toBe("unverifiable");
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
      expect(result.verificationStatus).toBe("ward_mismatch");
      expect(result.suggestedWard?.name).toBe("Nhiêu Lộc");
      expect(result.message).toContain("Phường Nhiêu Lộc");
    });

    it("Edge Case #4: khi provider='internal' (không có kết quả từ TrackAsia) -> trả unverifiable và yêu cầu hỗ trợ gọi lại", async () => {
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
      expect(result.verificationStatus).toBe("api_error");
      expect(result.canOrder).toBe(false);
      expect(result.requiresCallback).toBe(true);
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

    it("Mục 3: khi số nhà lặp ở nhiều quận trên trục đường dài ('100 Phan Văn Trị' ở Quận 5 và Gò Vấp), gợi ý danh sách các phường để khách chọn 1 trong số đó đặt hàng; nếu chọn ngoài danh sách thì chặn đặt hàng và yêu cầu gọi lại", async () => {
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

      // Chưa chọn phường -> gợi ý danh sách các phường [Chợ Quán, Hạnh Thông], chưa cho đặt hàng cho tới khi chọn
      const unchosen = await verifyAddressViaMapApi({
        streetAddress: "100 Phan Văn Trị",
        selectedWard: "",
        availableWards: MOCK_WARDS,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(unchosen.isValid).toBe(true);
      expect(unchosen.canOrder).toBe(false);
      expect(unchosen.requiresCallback).toBe(false);
      expect(unchosen.verificationStatus).toBe("verified_single_ward");
      expect(unchosen.suggestedWard?.name).toBe("Chợ Quán");
      expect(unchosen.suggestedWards?.map((w) => w.name)).toEqual(["Chợ Quán", "Hạnh Thông"]);

      // Khách chọn Chợ Quán hoặc Hạnh Thông (nằm trong danh sách gợi ý) -> được phép đặt hàng
      const validChoQuan = await verifyAddressViaMapApi({
        streetAddress: "100 Phan Văn Trị",
        selectedWard: "Chợ Quán",
        availableWards: MOCK_WARDS,
      });
      expect(validChoQuan.isValid).toBe(true);
      expect(validChoQuan.canOrder).toBe(true);
      expect(validChoQuan.isWardMatched).toBe(true);
      expect(validChoQuan.requiresCallback).toBe(false);
      expect(validChoQuan.verificationStatus).toBe("verified_single_ward");

      const validHanhThong = await verifyAddressViaMapApi({
        streetAddress: "100 Phan Văn Trị",
        selectedWard: "Hạnh Thông",
        availableWards: MOCK_WARDS,
      });
      expect(validHanhThong.isValid).toBe(true);
      expect(validHanhThong.canOrder).toBe(true);
      expect(validHanhThong.isWardMatched).toBe(true);
      expect(validHanhThong.requiresCallback).toBe(false);
      expect(validHanhThong.verificationStatus).toBe("verified_single_ward");

      // Khách chọn Phường Sài Gòn (ngoài danh sách gợi ý) -> chặn đặt hàng, hiển thị Hotline / yêu cầu gọi lại
      const blockedOutside = await verifyAddressViaMapApi({
        streetAddress: "100 Phan Văn Trị",
        selectedWard: "Sài Gòn",
        availableWards: MOCK_WARDS,
      });
      expect(blockedOutside.isValid).toBe(false);
      expect(blockedOutside.canOrder).toBe(false);
      expect(blockedOutside.requiresCallback).toBe(true);
      expect(blockedOutside.verificationStatus).toBe("ward_mismatch");
      expect(blockedOutside.suggestedWards?.map((w) => w.name)).toEqual(["Chợ Quán", "Hạnh Thông"]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("STT 8: Loại bỏ resolveNewWardName ngầm trong code, vận hành theo 91 phường mới", () => {
      // Codebase vận hành theo 91 phường mới, không tự đoán số phường
      expect(MOCK_WARDS.some((w) => w.name === "Hạnh Thông")).toBe(true);
      expect(MOCK_WARDS.some((w) => w.name === "Gia Định")).toBe(true);
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
              ward: "Phường Thông Tây Hội",
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
        const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async () =>
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

        // Bước 1: Khách CHƯA chọn phường (selectedWard: "") -> gọi API lấy kết quả theo đúng số nhà
        const unchosenRes = await verifyAddressViaMapApi({
          streetAddress: tc.address,
          selectedWard: "",
          availableWards: MOCK_WARDS,
        });

        expect(fetchSpy).toHaveBeenCalledTimes(1);

        if (tc.expectedSuggestedWards && tc.expectedSuggestedWards.length > 1) {
          // Mục 3: Nhiều kết quả ở nhiều phường mới khác nhau -> gợi ý tất cả các phường trong danh sách để khách chọn 1 phường đặt hàng; chọn ngoài danh sách thì chặn
          expect(unchosenRes.isValid).toBe(true);
          expect(unchosenRes.canOrder).toBe(false);
          expect(unchosenRes.requiresCallback).toBe(false);
          expect(unchosenRes.verificationStatus).toBe("verified_single_ward");
          expect(unchosenRes.suggestedWard?.name).toBe(tc.expectedPrimaryWard);
          expect(unchosenRes.suggestedWards?.map((w) => w.name)).toEqual(tc.expectedSuggestedWards);

          for (const wardToPick of tc.expectedSuggestedWards) {
            const afterSelectRes = await verifyAddressViaMapApi({
              streetAddress: tc.address,
              selectedWard: `Phường ${wardToPick}`,
              availableWards: MOCK_WARDS,
            });
            expect(afterSelectRes.isValid).toBe(true);
            expect(afterSelectRes.canOrder).toBe(true);
            expect(afterSelectRes.isWardMatched).toBe(true);
            expect(afterSelectRes.requiresCallback).toBe(false);
            expect(afterSelectRes.verificationStatus).toBe("verified_single_ward");
          }

          const outsideSelectRes = await verifyAddressViaMapApi({
            streetAddress: tc.address,
            selectedWard: "Phường Sài Gòn",
            availableWards: MOCK_WARDS,
          });
          expect(outsideSelectRes.isValid).toBe(false);
          expect(outsideSelectRes.canOrder).toBe(false);
          expect(outsideSelectRes.requiresCallback).toBe(true);
          expect(outsideSelectRes.verificationStatus).toBe("ward_mismatch");
        } else {
          // Mục 1: Duy nhất 1 phường mới -> verified_single_ward, gợi ý đúng phường đó và cho phép đặt hàng khi bấm chọn
          expect(unchosenRes.isValid).toBe(true);
          expect(unchosenRes.verificationStatus).toBe("verified_single_ward");
          expect(unchosenRes.suggestedWard?.name).toBe(tc.expectedPrimaryWard);

          if (tc.forbiddenWrongWard) {
            expect(unchosenRes.suggestedWard?.name).not.toBe(tc.forbiddenWrongWard);
          }

          const afterSelectRes = await verifyAddressViaMapApi({
            streetAddress: tc.address,
            selectedWard: `Phường ${tc.expectedPrimaryWard}`,
            availableWards: MOCK_WARDS,
          });
          expect(afterSelectRes.isValid).toBe(true);
          expect(afterSelectRes.canOrder).toBe(true);
          expect(afterSelectRes.isWardMatched).toBe(true);
          expect(afterSelectRes.verificationStatus).toBe("verified_single_ward");
          expect(afterSelectRes.conflictType).toBeUndefined();
        }

        fetchSpy.mockRestore();
      }
    });
  });

  describe("6. Regression 14/11: old_ward trùng số phường ở quận khác không được bỏ qua cảnh báo", () => {
    const REAL_WARDS: WardCatalogEntry[] = [
      {
        id: "XH",
        name: "Xuân Hòa",
        district: "Quận 3",
        old_wards: "P. Võ Thị Sáu, P.6, P.7, P.8, một phần P.4",
      },
      {
        id: "TSN",
        name: "Tân Sơn Nhất",
        district: "Tân Bình",
        old_wards: "P.4, P.5, P.7",
      },
    ];

    const CASES: Array<{
      name: string;
      address: string;
      candidates: GeocodeVerificationPayload["candidates"];
    }> = [
      {
        name: "64 Út Tịch (old_ward Phường 4 - Tân Bình)",
        address: "64 Út Tịch",
        candidates: [
          {
            formatted_address:
              "64 Đường Út Tịch, Phường Tân Sơn Nhất, Thành phố Hồ Chí Minh",
            ward: "Phường Tân Sơn Nhất",
            old_ward: "Phường 4",
            district: "Quận Tân Bình",
            province: "Thành phố Hồ Chí Minh",
            house_number: "64",
            street: "Đường Út Tịch",
            distance_meters: 0,
          },
        ],
      },
      {
        name: "1000 Cách Mạng Tháng 8 (old_ward Phường 7 / Phường 5 - Tân Bình)",
        address: "1000 Cách Mạng Tháng 8",
        candidates: [
          {
            formatted_address:
              "1000 Đường Cách Mạng Tháng 8, Phường Tân Sơn Nhất, Thành phố Hồ Chí Minh",
            ward: "Phường Tân Sơn Nhất",
            old_ward: "Phường 7",
            district: "Quận Tân Bình",
            province: "Thành phố Hồ Chí Minh",
            house_number: "1000",
            street: "Đường Cách Mạng Tháng 8",
            distance_meters: 0,
          },
          {
            formatted_address:
              "1000 Đường Cách Mạng Tháng 8, Phường Tân Sơn Nhất, Thành phố Hồ Chí Minh",
            ward: "Phường Tân Sơn Nhất",
            old_ward: "Phường 5",
            district: "Quận Tân Bình",
            province: "Thành phố Hồ Chí Minh",
            house_number: "1000",
            street: "Đường Cách Mạng Tháng 8",
            distance_meters: 14,
          },
        ],
      },
    ];

    for (const tc of CASES) {
      it(`cảnh báo khi chọn Phường Xuân Hòa nhưng API trả Tân Sơn Nhất — ${tc.name}`, () => {
        const res = evaluateGeocodePayload(
          {
            provider: "trackasia",
            precision: "house_number",
            candidates: tc.candidates,
          },
          {
            streetAddress: tc.address,
            selectedWard: "Xuân Hòa",
            selectedWardId: "XH",
            selectedDistrict: "Quận 3",
            selectedProvince: "TP. Hồ Chí Minh",
            availableWards: REAL_WARDS,
          }
        );

        expect(res.isValid).toBe(false);
        expect(res.conflictType).toBe("ward_conflict");
        expect(res.detectedArea).toContain("Tân Sơn Nhất");
        expect(res.suggestedWard?.name).toBe("Tân Sơn Nhất");
      });
    }

    it("không nới lỏng cảnh báo đang đúng: 500 Quang Trung (Gò Vấp) & 200 Nguyễn Văn Trỗi (Phú Nhuận)", () => {
      const controlCases: Array<{
        address: string;
        candidates: GeocodeVerificationPayload["candidates"];
      }> = [
        {
          address: "500 Quang Trung",
          candidates: [
            {
              formatted_address:
                "500 Quang Trung, Phường Gò Vấp, Quận Gò Vấp, Thành phố Hồ Chí Minh",
              ward: "Phường Gò Vấp",
              old_ward: "Phường 10",
              district: "Quận Gò Vấp",
              province: "Thành phố Hồ Chí Minh",
              house_number: "500",
              street: "Quang Trung",
              distance_meters: 0,
            },
          ],
        },
        {
          address: "200 Nguyễn Văn Trỗi",
          candidates: [
            {
              formatted_address:
                "200 Nguyễn Văn Trỗi, Phường Phú Nhuận, Quận Phú Nhuận, Thành phố Hồ Chí Minh",
              ward: "Phường Phú Nhuận",
              old_ward: "Phường 10",
              district: "Quận Phú Nhuận",
              province: "Thành phố Hồ Chí Minh",
              house_number: "200",
              street: "Nguyễn Văn Trỗi",
              distance_meters: 0,
            },
          ],
        },
      ];

      for (const tc of controlCases) {
        const res = evaluateGeocodePayload(
          {
            provider: "trackasia",
            precision: "house_number",
            candidates: tc.candidates,
          },
          {
            streetAddress: tc.address,
            selectedWard: "Xuân Hòa",
            selectedWardId: "XH",
            selectedDistrict: "Quận 3",
            selectedProvince: "TP. Hồ Chí Minh",
            availableWards: REAL_WARDS,
          }
        );

        expect(res.isValid).toBe(false);
        expect(res.conflictType).toBe("ward_conflict");
      }
    });
  });

  describe("7. A04, A05, A06, A07 (Lô B5), C01, C05, C06, C07: Lọc chặt số nhà, tên đường, quận/huyện & nhận diện Lô B5", () => {
    it("A04 / C05: API trả 1 phường nhưng lệch số nhà hoặc candidate thiếu house_number -> trả unverifiable (nhánh D), KHÔNG fallback về parsedCandidates", () => {
      const mismatchedHouse = evaluateGeocodePayload(
        {
          provider: "trackasia",
          precision: "house_number",
          candidates: [
            {
              formatted_address: "999 Hoàng Sa, Phường Tân Định, Quận 1, TP. Hồ Chí Minh",
              ward: "Phường Tân Định",
              district: "Quận 1",
              house_number: "999",
              street: "Hoàng Sa",
            },
          ],
        },
        {
          streetAddress: "197 Hoàng Sa",
          selectedWard: "Phường Tân Định",
          availableWards: MOCK_WARDS,
        }
      );

      expect(mismatchedHouse.isValid).toBe(false);
      expect(mismatchedHouse.canOrder).toBe(false);
      expect(mismatchedHouse.requiresCallback).toBe(true);
      expect(mismatchedHouse.verificationStatus).toBe("unverifiable");

      const missingCandidateHouse = evaluateGeocodePayload(
        {
          provider: "trackasia",
          precision: "house_number",
          candidates: [
            {
              formatted_address: "Đường Hoàng Sa, Phường Tân Định, Quận 1, TP. Hồ Chí Minh",
              ward: "Phường Tân Định",
              district: "Quận 1",
              street: "Hoàng Sa",
            },
          ],
        },
        {
          streetAddress: "197 Hoàng Sa",
          selectedWard: "Phường Tân Định",
          availableWards: MOCK_WARDS,
        }
      );

      expect(missingCandidateHouse.isValid).toBe(false);
      expect(missingCandidateHouse.canOrder).toBe(false);
      expect(missingCandidateHouse.verificationStatus).toBe("unverifiable");
    });

    it("A05 / A06 / C06: Lệch tên đường trả unverifiable (nhánh D); khớp khi bỏ dấu, hoa/thường và viết tắt Đ. / Đường / Phố", () => {
      const mismatchedStreet = evaluateGeocodePayload(
        {
          provider: "trackasia",
          precision: "house_number",
          candidates: [
            {
              formatted_address: "197 Trường Sa, Phường Tân Định, Quận 1, TP. Hồ Chí Minh",
              ward: "Phường Tân Định",
              district: "Quận 1",
              house_number: "197",
              street: "Trường Sa",
            },
          ],
        },
        {
          streetAddress: "197 Hoàng Sa",
          selectedWard: "Phường Tân Định",
          availableWards: MOCK_WARDS,
        }
      );

      expect(mismatchedStreet.isValid).toBe(false);
      expect(mismatchedStreet.canOrder).toBe(false);
      expect(mismatchedStreet.requiresCallback).toBe(true);
      expect(mismatchedStreet.verificationStatus).toBe("unverifiable");

      const abbreviatedStreet = evaluateGeocodePayload(
        {
          provider: "trackasia",
          precision: "house_number",
          candidates: [
            {
              formatted_address: "197 Đường Hoàng Sa, Phường Tân Định, Quận 1, TP. Hồ Chí Minh",
              ward: "Phường Tân Định",
              district: "Quận 1",
              house_number: "197",
              street: "Đường Hoàng Sa",
            },
          ],
        },
        {
          streetAddress: "197 Đ. hoang sa",
          selectedWard: "Phường Tân Định",
          availableWards: MOCK_WARDS,
        }
      );

      expect(abbreviatedStreet.isValid).toBe(true);
      expect(abbreviatedStreet.canOrder).toBe(true);
      expect(abbreviatedStreet.verificationStatus).toBe("verified_single_ward");
    });

    it("A07: Nhận diện số nhà dạng Lô B5, Lô A12, Lo B5, 12/3, 12AB, 12-14 và khớp với candidate Lô B5 hoặc B5", () => {
      expect(hasHouseNumberInAddress("Lô B5 Hoàng Sa")).toBe(true);
      expect(hasHouseNumberInAddress("Lo B5 Hoàng Sa")).toBe(true);
      expect(hasHouseNumberInAddress("Lô A12 Nguyễn Văn Linh")).toBe(true);
      expect(hasHouseNumberInAddress("12/3 Hoàng Sa")).toBe(true);
      expect(hasHouseNumberInAddress("12AB Hoàng Sa")).toBe(true);
      expect(hasHouseNumberInAddress("12-14 Hoàng Sa")).toBe(true);
      expect(hasHouseNumberInAddress("Lô B5")).toBe(false);
      expect(extractLeadingHouseNumber("Lô B5 Hoàng Sa")).toBe("b5");
      expect(extractLeadingHouseNumber("Lo B5 Hoàng Sa")).toBe("b5");
      expect(extractLeadingHouseNumber("Lô A12 Nguyễn Văn Linh")).toBe("a12");

      const matchWithLo = evaluateGeocodePayload(
        {
          provider: "trackasia",
          precision: "house_number",
          candidates: [
            {
              formatted_address: "Lô B5 Hoàng Sa, Phường Tân Định, Quận 1, TP. Hồ Chí Minh",
              ward: "Phường Tân Định",
              district: "Quận 1",
              house_number: "Lô B5",
              street: "Hoàng Sa",
            },
          ],
        },
        {
          streetAddress: "Lô B5 Hoàng Sa",
          selectedWard: "Phường Tân Định",
          availableWards: MOCK_WARDS,
        }
      );
      expect(matchWithLo.isValid).toBe(true);
      expect(matchWithLo.canOrder).toBe(true);
      expect(matchWithLo.verificationStatus).toBe("verified_single_ward");

      const matchWithB5 = evaluateGeocodePayload(
        {
          provider: "trackasia",
          precision: "house_number",
          candidates: [
            {
              formatted_address: "B5 Hoàng Sa, Phường Tân Định, Quận 1, TP. Hồ Chí Minh",
              ward: "Phường Tân Định",
              district: "Quận 1",
              house_number: "B5",
              street: "Hoàng Sa",
            },
          ],
        },
        {
          streetAddress: "Lô B5 Hoàng Sa",
          selectedWard: "Phường Tân Định",
          availableWards: MOCK_WARDS,
        }
      );
      expect(matchWithB5.isValid).toBe(true);
      expect(matchWithB5.canOrder).toBe(true);
    });

    it("C01 / C05 / C06 / C07: 5 kết quả lọc theo số nhà + tên đường + quận/huyện còn 1 phường duy nhất -> verified_single_ward", () => {
      const res = evaluateGeocodePayload(
        {
          provider: "trackasia",
          precision: "house_number",
          verification_status: "ambiguous_multiple_wards",
          unique_wards: ["Xuân Hòa", "Tân Định", "Gia Định", "Nhiêu Lộc", "Bàn Cờ"],
          candidates: [
            // Sai số nhà (C05)
            {
              formatted_address: "999 Hai Bà Trưng, Phường Bàn Cờ, Quận 3, TP. Hồ Chí Minh",
              ward: "Phường Bàn Cờ",
              district: "Quận 3",
              house_number: "999",
              street: "Hai Bà Trưng",
            },
            // Sai tên đường (C06)
            {
              formatted_address: "201 Điện Biên Phủ, Phường Gia Định, Bình Thạnh, TP. Hồ Chí Minh",
              ward: "Phường Gia Định",
              district: "Bình Thạnh",
              house_number: "201",
              street: "Điện Biên Phủ",
            },
            // Thiếu house_number (C05)
            {
              formatted_address: "Hai Bà Trưng, Phường Nhiêu Lộc, Quận 3, TP. Hồ Chí Minh",
              ward: "Phường Nhiêu Lộc",
              district: "Quận 3",
              street: "Hai Bà Trưng",
            },
            // Khớp số nhà + đường nhưng khác quận (C07)
            {
              formatted_address: "201 Hai Bà Trưng, Phường Xuân Hòa, Quận 3, TP. Hồ Chí Minh",
              ward: "Phường Xuân Hòa",
              district: "Quận 3",
              house_number: "201",
              street: "Hai Bà Trưng",
            },
            // Khớp cả số nhà + tên đường + Quận 1 (C01)
            {
              formatted_address: "201 Hai Bà Trưng, Phường Tân Định, Quận 1, TP. Hồ Chí Minh",
              ward: "Phường Tân Định",
              district: "Quận 1",
              house_number: "201",
              street: "Hai Bà Trưng",
            },
          ],
        },
        {
          streetAddress: "201 Hai Bà Trưng, Q.1",
          selectedWard: "Phường Tân Định",
          availableWards: MOCK_WARDS,
        }
      );

      expect(res.isValid).toBe(true);
      expect(res.canOrder).toBe(true);
      expect(res.verificationStatus).toBe("verified_single_ward");
      expect(res.suggestedWard?.name).toBe("Tân Định");
    });
  });
});
