import { describe, it, expect } from "vitest";
import { formatWardLabel, HCMC_WARD_OLD_NAME_MAP } from "../data/wardMapping";

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
    expect(commune).toBe("Xã Bình Chánh - Bình Chánh");
  });

  it("contains mapping entries for key HCMC wards for fuzzy search support", () => {
    expect(HCMC_WARD_OLD_NAME_MAP["An Hội Tây"]).toBe("P.14");
    expect(HCMC_WARD_OLD_NAME_MAP["Gia Định"]).toBe("P.1, P.2");
    expect(HCMC_WARD_OLD_NAME_MAP["Bàn Cờ"]).toBe("P.1, P.2, P.3");
    expect(HCMC_WARD_OLD_NAME_MAP["An Đông"]).toBe("P.9, P.10");
  });
});
