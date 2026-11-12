/**
 * Helper loại bỏ tiền tố đơn vị hành chính không phân biệt hoa thường:
 * Phường, Xã, Thị trấn, Quận, Huyện, Thành phố, TP., TP, TT., TT, P., P, Q., Q, H., H, TX., TX.
 */
export function cleanAdministrativeUnitName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .replace(
      /^(?:(?:phường|xã|thị\s+trấn|quận|huyện|thành\s+phố)\s+|(?:tp|tt|tx|p|q|h)(?:\.\s*|\s+))/iu,
      ""
    )
    .trim();
}

/**
 * Format label:
 * [Tên Phường Mới]
 */
export function formatWardLabel(wardName: string, _district?: string, _oldWard?: string): string {
  if (!wardName) return "";
  const cleanWardName = wardName.trim();

  const hasPrefix =
    cleanWardName.startsWith("Phường") ||
    cleanWardName.startsWith("Xã") ||
    cleanWardName.startsWith("Thị trấn");
  const prefix = hasPrefix ? "" : "Phường ";

  return `${prefix}${cleanWardName}`;
}

/**
 * Loại bỏ các phần tử trùng lặp trong chuỗi địa chỉ giao hàng:
 * - Khử trùng lặp tên phường/xã và quận/huyện liền kề (VD: "Tân Sơn Nhất, Tân Sơn Nhất" -> "Tân Sơn Nhất")
 * - Khử trùng lặp khi một phần tử đã chứa trọn vẹn phần tử liền kề (VD: "64 Út Tịch, Tân Sơn Nhất", "Tân Sơn Nhất" -> "64 Út Tịch, Tân Sơn Nhất")
 */
export function cleanDuplicateAddressParts(fullAddress: string): string {
  if (!fullAddress) return "";
  const rawParts = fullAddress
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (rawParts.length <= 1) return fullAddress.trim();

  const result: string[] = [];

  for (let i = 0; i < rawParts.length; i++) {
    const current = rawParts[i];
    if (result.length === 0) {
      result.push(current);
      continue;
    }

    const prev = result[result.length - 1];
    const normPrev = cleanAdministrativeUnitName(prev).toLowerCase();
    const normCurrent = cleanAdministrativeUnitName(current).toLowerCase();

    // 1. Trùng lặp chính xác hoặc trùng sau khi bỏ tiền tố hành chính (VD: "Tân Sơn Nhất" vs "Tân Sơn Nhất")
    if (normCurrent && (normPrev === normCurrent || normCurrent === prev.toLowerCase())) {
      continue;
    }

    // 2. Nếu phần trước đã kết thúc bằng chính phần hiện tại
    if (normCurrent && (normPrev.endsWith(normCurrent) || prev.toLowerCase().endsWith(normCurrent))) {
      continue;
    }

    // 3. Nếu phần trước phân tách bởi dấu nối [-–] và phân đoạn cuối trùng với phần hiện tại
    const prevSubParts = prev
      .split(/[-–]/)
      .map((s) => cleanAdministrativeUnitName(s).toLowerCase())
      .filter(Boolean);
    const lastSubPart = prevSubParts[prevSubParts.length - 1] || "";
    if (normCurrent && (lastSubPart === normCurrent || lastSubPart.endsWith(normCurrent))) {
      continue;
    }

    result.push(current);
  }

  return result.join(", ");
}

/**
 * Ghép các thành phần địa chỉ (Số nhà tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành)
 * và tự động khử trùng lặp nếu tên Phường và Quận trùng nhau hoặc bị lặp.
 */
export function buildDeliveryAddress(
  streetAddress?: string | null,
  ward?: string | null,
  district?: string | null,
  province?: string | null
): string {
  const parts = [streetAddress, ward, district, province]
    .map((p) => (p || "").trim())
    .filter(Boolean);

  return cleanDuplicateAddressParts(parts.join(", "));
}

export {
  validateAddressWardMatch,
  verifyAddressViaMapApi,
  hasHouseNumberInAddress,
  HCMC_STREET_DIRECTORY,
  WARD_CANONICAL_DISTRICTS,
  normalizeDistrictName,
  findMatchingWardsFromCatalog,
  isKnownPostMerger94Ward,
} from "@/utils/addressValidation";
export type {
  AddressWardConflictType,
  AddressWardValidationParams,
  AddressWardValidationResult,
  WardCatalogEntry,
  StreetDirectoryEntry,
} from "@/utils/addressValidation";
