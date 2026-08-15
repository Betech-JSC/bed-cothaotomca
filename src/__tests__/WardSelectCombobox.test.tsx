import { describe, it, expect } from "vitest";
import { formatWardLabel, HCMC_WARD_OLD_NAME_MAP } from "../data/wardMapping";

describe("WardSelectCombobox & Ward Mapping", () => {
  it("formats ward label matching requirement 3 examples", () => {
    // Example 1: Phường An Hội Tây - Gò Vấp (Cũ: P.14)
    const labelAnHoiTay = formatWardLabel("An Hội Tây", "Gò Vấp", "P.14");
    expect(labelAnHoiTay).toBe("Phường An Hội Tây - Gò Vấp (Cũ: P.14)");

    // Example 2: Phường Gia Định - Bình Thạnh (Cũ: P.1, P.2)
    const labelGiaDinh = formatWardLabel("Gia Định", "Bình Thạnh", "P.1, P.2");
    expect(labelGiaDinh).toBe("Phường Gia Định - Bình Thạnh (Cũ: P.1, P.2)");

    // Auto lookup from HCMC dictionary when oldWard is not explicitly passed
    const autoAnDong = formatWardLabel("An Đông", "Quận 5");
    expect(autoAnDong).toBe("Phường An Đông - Quận 5 (Cũ: P.9, P.10)");

    const autoBanCo = formatWardLabel("Bàn Cờ", "Quận 3");
    expect(autoBanCo).toBe("Phường Bàn Cờ - Quận 3 (Cũ: P.1, P.2, P.3)");
  });

  it("contains mapping entries for key HCMC wards", () => {
    expect(HCMC_WARD_OLD_NAME_MAP["An Hội Tây"]).toBe("P.14");
    expect(HCMC_WARD_OLD_NAME_MAP["Gia Định"]).toBe("P.1, P.2");
    expect(HCMC_WARD_OLD_NAME_MAP["Bàn Cờ"]).toBe("P.1, P.2, P.3");
    expect(HCMC_WARD_OLD_NAME_MAP["An Đông"]).toBe("P.9, P.10");
  });
});
