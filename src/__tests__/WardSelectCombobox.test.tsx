import { describe, it, expect } from "vitest";
import {
  formatWardLabel,
  HCMC_WARD_OLD_NAME_MAP,
  cleanAdministrativeUnitName,
  cleanDuplicateAddressParts,
  buildDeliveryAddress,
} from "../data/wardMapping";

describe("WardSelectCombobox & Ward Mapping", () => {
  it("formats ward label cleanly without old ward string", () => {
    // Example 1: Phường An Hội Tây - Gò Vấp (even if old ward passed)
    const labelAnHoiTay = formatWardLabel("An Hội Tây", "Gò Vấp", "P.14");
    expect(labelAnHoiTay).toBe("Phường An Hội Tây - Gò Vấp");

    // Example 2: Phường Gia Định - Bình Thạnh
    const labelGiaDinh = formatWardLabel("Gia Định", "Bình Thạnh", "P.1, P.2");
    expect(labelGiaDinh).toBe("Phường Gia Định - Bình Thạnh");

    // Pure standard format without old ward
    const autoAnDong = formatWardLabel("An Đông", "Quận 5");
    expect(autoAnDong).toBe("Phường An Đông - Quận 5");

    const autoBanCo = formatWardLabel("Bàn Cờ", "Quận 3");
    expect(autoBanCo).toBe("Phường Bàn Cờ - Quận 3");

    // Already prefixed
    const prefixed = formatWardLabel("Phường 14", "Quận 3");
    expect(prefixed).toBe("Phường 14 - Quận 3");

    const commune = formatWardLabel("Xã Bình Chánh", "Bình Chánh");
    expect(commune).toBe("Xã Bình Chánh");
  });

  it("deduplicates ward and district when names are identical after cleaning administrative prefixes", () => {
    // Trùng tên không có tiền tố -> Tự động thêm "Phường " và không lặp lại tên Quận
    expect(formatWardLabel("Bình Lợi", "Bình Lợi")).toBe("Phường Bình Lợi");
    expect(formatWardLabel("Bình Phú", "Bình Phú")).toBe("Phường Bình Phú");

    // Đã có tiền tố Phường và trùng tên Quận -> Giữ nguyên, không lặp lại "- Bình Tân"
    expect(formatWardLabel("Phường Bình Tân", "Bình Tân")).toBe("Phường Bình Tân");
    expect(formatWardLabel("Phường Bình Tân", "Quận Bình Tân")).toBe("Phường Bình Tân");

    // Khác tên Quận và Phường -> Ghép đầy đủ "[Tiền tố][Tên Phường] - [Quận]"
    expect(formatWardLabel("An Hội Tây", "Gò Vấp")).toBe("Phường An Hội Tây - Gò Vấp");
    expect(formatWardLabel("Gia Định", "Quận Bình Thạnh")).toBe("Phường Gia Định - Quận Bình Thạnh");
  });

  it("contains mapping entries for key HCMC wards for fuzzy search support", () => {
    expect(HCMC_WARD_OLD_NAME_MAP["An Hội Tây"]).toBe("P.14");
    expect(HCMC_WARD_OLD_NAME_MAP["Gia Định"]).toBe("P.1, P.2");
    expect(HCMC_WARD_OLD_NAME_MAP["Bàn Cờ"]).toBe("P.1, P.2, P.3");
    expect(HCMC_WARD_OLD_NAME_MAP["An Đông"]).toBe("P.9, P.10");
  });

  describe("Address Deduplication (cleanDuplicateAddressParts & buildDeliveryAddress)", () => {
    it("fixes duplicated ward name when ward and district share identical names", () => {
      // Bug từ hình ảnh: "64 Út Tịch, Tân Sơn Nhất, Tân Sơn Nhất, TP. Hồ Chí Minh"
      const result = cleanDuplicateAddressParts("64 Út Tịch, Tân Sơn Nhất, Tân Sơn Nhất, TP. Hồ Chí Minh");
      expect(result).toBe("64 Út Tịch, Tân Sơn Nhất, TP. Hồ Chí Minh");

      const built = buildDeliveryAddress("64 Út Tịch", "Tân Sơn Nhất", "Tân Sơn Nhất", "TP. Hồ Chí Minh");
      expect(built).toBe("64 Út Tịch, Tân Sơn Nhất, TP. Hồ Chí Minh");
    });

    it("deduplicates when ward and district have administrative prefixes but same name", () => {
      const built = buildDeliveryAddress("64 Út Tịch", "Phường Tân Sơn Nhất", "Quận Tân Sơn Nhất", "TP. Hồ Chí Minh");
      expect(built).toBe("64 Út Tịch, Phường Tân Sơn Nhất, TP. Hồ Chí Minh");

      const commune = buildDeliveryAddress("10 Nguyễn Hữu Trí", "Xã Bình Chánh", "Huyện Bình Chánh", "TP. Hồ Chí Minh");
      expect(commune).toBe("10 Nguyễn Hữu Trí, Xã Bình Chánh, TP. Hồ Chí Minh");
    });

    it("deduplicates when street address already ends with ward name", () => {
      const built = buildDeliveryAddress("64 Út Tịch, Tân Sơn Nhất", "Tân Sơn Nhất", "Tân Bình", "TP. Hồ Chí Minh");
      expect(built).toBe("64 Út Tịch, Tân Sơn Nhất, Tân Bình, TP. Hồ Chí Minh");
    });

    it("preserves standard addresses with different ward and district", () => {
      const built = buildDeliveryAddress("64 Út Tịch", "Tân Sơn Nhất", "Tân Bình", "TP. Hồ Chí Minh");
      expect(built).toBe("64 Út Tịch, Tân Sơn Nhất, Tân Bình, TP. Hồ Chí Minh");
    });

    it("correctly cleans administrative prefixes like P., P, Q., Q, TT., TX.", () => {
      expect(cleanAdministrativeUnitName("P. Tân Sơn Nhất")).toBe("Tân Sơn Nhất");
      expect(cleanAdministrativeUnitName("P Tân Sơn Nhất")).toBe("Tân Sơn Nhất");
      expect(cleanAdministrativeUnitName("Phường Tân Sơn Nhất")).toBe("Tân Sơn Nhất");
      expect(cleanAdministrativeUnitName("Q. Tân Bình")).toBe("Tân Bình");
      expect(cleanAdministrativeUnitName("Q Tân Bình")).toBe("Tân Bình");
      expect(cleanAdministrativeUnitName("TT. Củ Chi")).toBe("Củ Chi");
      expect(cleanAdministrativeUnitName("TX. Bến Cát")).toBe("Bến Cát");
      expect(cleanAdministrativeUnitName("TP. Hồ Chí Minh")).toBe("Hồ Chí Minh");
    });

    it("deduplicates when street address contains ward name after hyphen or comma", () => {
      const hyphenBuilt = buildDeliveryAddress("64 Út Tịch - Tân Sơn Nhất", "Tân Sơn Nhất", "Tân Bình", "TP. Hồ Chí Minh");
      expect(hyphenBuilt).toBe("64 Út Tịch - Tân Sơn Nhất, Tân Bình, TP. Hồ Chí Minh");

      const commaBuilt = buildDeliveryAddress("64 Út Tịch, Phường Tân Sơn Nhất", "Tân Sơn Nhất", "Tân Bình", "TP. Hồ Chí Minh");
      expect(commaBuilt).toBe("64 Út Tịch, Phường Tân Sơn Nhất, Tân Bình, TP. Hồ Chí Minh");
    });
  });
});

