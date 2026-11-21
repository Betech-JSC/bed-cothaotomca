import type { AdministrativeWard } from "@/services/orderService";
import { getApiBaseUrl } from "@/services/apiService";
import {
  cleanAdministrativeUnitName,
  formatWardLabel,
} from "@/data/wardMapping";

export type AddressWardConflictType =
  | "district_conflict"
  | "ward_conflict"
  | "street_conflict"
  | "province_conflict"
  | "ambiguous_multiple_wards"
  | "missing_house_number"
  | "unverifiable"
  | "api_error";

export type AddressVerificationStatus =
  | "verified_single_ward"
  | "ward_mismatch"
  | "ambiguous_multiple_wards"
  | "missing_house_number"
  | "unverifiable"
  | "api_error";

export type WardCatalogEntry = AdministrativeWard;

export interface AddressWardValidationParams {
  streetAddress: string;
  note?: string;
  selectedWard?: string;
  selectedWardId?: string;
  selectedDistrict?: string;
  selectedProvince?: string;
  availableWards: AdministrativeWard[];
}

export type ValidateAddressWardParams = AddressWardValidationParams;

export interface AddressWardValidationResult {
  isValid: boolean;
  conflictType?: AddressWardConflictType;
  detectedArea?: string;
  message?: string;
  suggestedWard?: AdministrativeWard | null;
  suggestedWards?: AdministrativeWard[];
  verificationStatus?: AddressVerificationStatus;
  verifiedWard?: string | null;
  isWardMatched?: boolean;
  canOrder?: boolean;
  requiresCallback?: boolean;
}

export type GeocodeProvider =
  | "trackasia"
  | "internal"
  | "none";

export type GeocodePrecision =
  | "house_number"
  | "poi"
  | "street_only"
  | "unknown";

export interface GeocodeCandidate {
  formatted_address: string;
  ward?: string;
  new_ward?: string;
  old_ward?: string;
  district?: string;
  province?: string;
  house_number?: string;
  street?: string;
  lat?: number;
  lng?: number;
  distance_meters?: number;
}

export interface GeocodeVerificationPayload {
  provider: GeocodeProvider;
  cached?: boolean;
  precision: GeocodePrecision;
  candidates: GeocodeCandidate[];
  verification_status?: AddressVerificationStatus;
  can_order?: boolean;
  is_ward_matched?: boolean;
  verified_ward?: string | null;
  suggested_ward?: string | null;
  unique_wards?: string[];
}

export function normalizeText(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Canonical district names in HCMC (post-merger & pre-merger compatible)
 */
export function normalizeDistrictName(rawDistrict?: string | null): string {
  if (!rawDistrict) return "";
  const norm = normalizeText(rawDistrict);
  if (!norm) return "";

  // TP. Thủ Đức (includes old Quận 2, Quận 9, Quận Thủ Đức)
  if (
    norm.includes("thu duc") ||
    /\b(quan|q\.?)\s*0?[29]\b/.test(norm) ||
    norm === "2" ||
    norm === "9"
  ) {
    return "TP. Thủ Đức";
  }

  const numMatch = norm.match(/\b(?:quan|q\.?)?\s*0?(10|11|12|[1-8])\b/);
  if (numMatch && (norm.startsWith("quan") || norm.startsWith("q") || /^\d+$/.test(norm))) {
    return `Quận ${parseInt(numMatch[1], 10)}`;
  }

  if (norm.includes("go vap")) return "Gò Vấp";
  if (norm.includes("binh thanh")) return "Bình Thạnh";
  if (norm.includes("phu nhuan")) return "Phú Nhuận";
  if (norm.includes("tan binh")) return "Tân Bình";
  if (norm.includes("tan phu")) return "Tân Phú";
  if (norm.includes("binh tan")) return "Bình Tân";
  if (norm.includes("binh chanh")) return "Huyện Bình Chánh";
  if (norm.includes("hoc mon")) return "Huyện Hóc Môn";
  if (norm.includes("nha be")) return "Huyện Nhà Bè";
  if (norm.includes("cu chi")) return "Huyện Củ Chi";
  if (norm.includes("can gio")) return "Huyện Cần Giờ";

  return rawDistrict.trim();
}

/**
 * Maps each HCMC Ward (post-merger & common pre-merger names) to its valid canonical district(s).
 * Includes both geographical district and brand-sheet district where border wards were grouped.
 */
export const WARD_CANONICAL_DISTRICTS: Record<string, string[]> = {
  // Quận 1
  "Sài Gòn": ["Quận 1"],
  "Bến Nghé": ["Quận 1"],
  "Bến Thành": ["Quận 1"],
  "Phạm Ngũ Lão": ["Quận 1"],
  "Tân Định": ["Quận 1"],
  "Đa Kao": ["Quận 1"],
  "Cầu Ông Lãnh": ["Quận 1"],
  "Cô Giang": ["Quận 1"],
  "Nguyễn Cư Trinh": ["Quận 1"],
  "Nguyễn Thái Bình": ["Quận 1"],
  "Xuân Hòa": ["Quận 3", "Quận 1"],
  "Diên Hồng": ["Quận 10", "Quận 1"],

  // Quận 3
  "Bàn Cờ": ["Quận 3"],
  "Nhiêu Lộc": ["Quận 3"],
  "Hòa Hưng": ["Quận 10", "Quận 3"],

  // Quận 4
  "Khánh Hội": ["Quận 4"],
  "Vĩnh Hội": ["Quận 4"],
  "Xóm Chiếu": ["Quận 4"],

  // Quận 5
  "An Đông": ["Quận 5"],
  "Chợ Quán": ["Quận 5"],
  "Chợ Lớn": ["Quận 5", "Quận 6"],

  // Quận 6
  "Bình Tây": ["Quận 6"],
  "Bình Phú": ["Quận 6"],
  "Bình Tiên": ["Quận 6"],
  "Phú Lâm": ["Quận 6"],
  "Phú Định": ["Quận 8", "Quận 6"],

  // Quận 7
  "Tân Hưng": ["Quận 7"],
  "Tân Phong": ["Quận 7"],
  "Tân Mỹ": ["Quận 7"],
  "Tân Thuận": ["Quận 7"],
  "Phú Thuận": ["Quận 7"],
  "Phú Mỹ": ["Quận 7"],

  // Quận 8
  "Chánh Hưng": ["Quận 8"],
  "Bình Đông": ["Quận 8"],

  // Quận 10 / 11
  "Vườn Lài": ["Quận 10", "Tân Phú"],
  "Minh Phụng": ["Quận 11"],
  "Hòa Bình": ["Quận 11", "Tân Phú"],
  "Bình Thới": ["Quận 11"],
  "Phú Thọ": ["Quận 11"],

  // Quận 12
  "An Phú Đông": ["Quận 12"],
  "Đông Hưng Thuận": ["Quận 12"],
  "Thạnh Xuân": ["Quận 12"],
  "Thới An": ["Quận 12"],
  "Trung Mỹ Tây": ["Quận 12"],
  "Tân Thới Hiệp": ["Quận 12"],

  // Gò Vấp
  "An Hội Tây": ["Gò Vấp"],
  "An Hội Đông": ["Gò Vấp"],
  "An Nhơn": ["Gò Vấp"],
  "Gò Vấp": ["Gò Vấp"],
  "Hạnh Thông": ["Gò Vấp"],
  "Thông Tây Hội": ["Gò Vấp"],
  "Hiệp Bình": ["TP. Thủ Đức", "Gò Vấp"],

  // Bình Thạnh
  "Gia Định": ["Bình Thạnh"],
  "Cầu Kiệu": ["Phú Nhuận", "Bình Thạnh"],
  "Bình Lợi Trung": ["Bình Thạnh"],
  "Bình Quới": ["Bình Thạnh"],
  "Thạnh Mỹ Tây": ["Bình Thạnh"],
  "Bình Thạnh": ["Bình Thạnh"],
  "Bình Lợi": ["TP. Thủ Đức", "Bình Thạnh"],

  // Phú Nhuận
  "Phú Nhuận": ["Phú Nhuận"],
  "Đức Nhuận": ["Phú Nhuận"],

  // Tân Bình
  "Bảy Hiền": ["Tân Bình"],
  "Tân Bình": ["Tân Bình"],
  "Tân Hòa": ["Tân Bình"],
  "Tân Sơn": ["Tân Bình", "Gò Vấp"],
  "Tân Sơn Hòa": ["Tân Bình"],
  "Tân Sơn Nhất": ["Tân Bình"],

  // Tân Phú
  "Phú Thạnh": ["Tân Phú"],
  "Phú Thọ Hòa": ["Tân Phú"],
  "Tân Phú": ["Tân Phú"],
  "Tân Sơn Nhì": ["Tân Phú"],
  "Tây Thạnh": ["Tân Phú"],

  // TP. Thủ Đức
  "An Khánh": ["TP. Thủ Đức"],
  "Cát Lái": ["TP. Thủ Đức"],
  "Cát Lái (TĐ)": ["TP. Thủ Đức"],
  "Bình Chiểu": ["TP. Thủ Đức"],
  "Bình Trưng": ["TP. Thủ Đức"],
  "Linh Xuân": ["TP. Thủ Đức"],
  "Long Bình": ["TP. Thủ Đức"],
  "Long Phước": ["TP. Thủ Đức"],
  "Long Trường": ["TP. Thủ Đức"],
  "Phước Long": ["TP. Thủ Đức"],
  "Tam Bình": ["TP. Thủ Đức"],
  "Thủ Đức": ["TP. Thủ Đức"],
  "Tăng Nhơn Phú": ["TP. Thủ Đức"],

  // Bình Tân
  "An Lạc": ["Bình Tân"],
  "Bình Hưng Hòa": ["Bình Tân"],
  "Bình Trị Đông": ["Bình Tân"],
  "Bình Tân": ["Bình Tân"],
  "Tân Tạo": ["Bình Tân"],

  // Huyện Bình Chánh
  "Bình Chánh": ["Huyện Bình Chánh"],
  "Bình Hưng": ["Huyện Bình Chánh"],
  "Hưng Long": ["Huyện Bình Chánh"],
  "Tân Nhựt": ["Huyện Bình Chánh"],
  "Tân Vĩnh Lộc": ["Huyện Bình Chánh"],
  "Vĩnh Lộc": ["Huyện Bình Chánh"],

  // Huyện Hóc Môn
  "Bà Điểm": ["Huyện Hóc Môn"],
  "Đông Thạnh": ["Huyện Hóc Môn"],
  "Hóc Môn": ["Huyện Hóc Môn"],
  "Xuân Thới Sơn": ["Huyện Hóc Môn"],

  // Huyện Nhà Bè
  "Hiệp Phước": ["Huyện Nhà Bè"],
  "Nhà Bè": ["Huyện Nhà Bè"],
};

/**
 * Default preferred post-merger wards for each canonical district
 */
const DISTRICT_DEFAULT_WARDS: Record<string, string[]> = {
  "Quận 1": ["Sài Gòn", "Bến Thành", "Tân Định", "Cầu Ông Lãnh", "Xuân Hòa", "Diên Hồng"],
  "Quận 3": ["Bàn Cờ", "Nhiêu Lộc", "Hòa Hưng", "Xuân Hòa"],
  "Quận 4": ["Khánh Hội", "Vĩnh Hội", "Xóm Chiếu"],
  "Quận 5": ["An Đông", "Chợ Quán", "Chợ Lớn"],
  "Quận 6": ["Bình Phú", "Bình Tây", "Bình Tiên", "Phú Lâm", "Chợ Lớn"],
  "Quận 7": ["Tân Hưng", "Tân Mỹ", "Tân Thuận", "Phú Thuận"],
  "Quận 8": ["Chánh Hưng", "Bình Đông"],
  "Quận 10": ["Hòa Hưng", "Diên Hồng", "Vườn Lài"],
  "Quận 11": ["Bình Thới", "Hòa Bình", "Minh Phụng", "Phú Thọ"],
  "Quận 12": ["Đông Hưng Thuận", "Tân Thới Hiệp", "Trung Mỹ Tây", "An Phú Đông", "Thạnh Xuân", "Thới An"],
  "Gò Vấp": ["An Hội Tây", "Gò Vấp", "Hạnh Thông", "An Nhơn", "An Hội Đông", "Thông Tây Hội"],
  "Bình Thạnh": ["Gia Định", "Bình Thạnh", "Cầu Kiệu", "Bình Lợi Trung", "Thạnh Mỹ Tây", "Bình Quới"],
  "Phú Nhuận": ["Phú Nhuận", "Đức Nhuận", "Cầu Kiệu"],
  "Tân Bình": ["Tân Sơn Nhất", "Tân Bình", "Bảy Hiền", "Tân Sơn Hòa", "Tân Hòa", "Tân Sơn"],
  "Tân Phú": ["Tân Phú", "Tân Sơn Nhì", "Phú Thạnh", "Tây Thạnh", "Phú Thọ Hòa", "Vườn Lài"],
  "Bình Tân": ["Bình Trị Đông", "An Lạc", "Bình Hưng Hòa", "Bình Tân", "Tân Tạo"],
  "TP. Thủ Đức": ["Thủ Đức", "Tăng Nhơn Phú", "An Khánh", "Linh Xuân", "Phước Long", "Hiệp Bình", "Bình Trưng", "Cát Lái", "Long Bình"],
  "Huyện Bình Chánh": ["Bình Hưng", "Bình Chánh", "Vĩnh Lộc", "Tân Vĩnh Lộc", "Tân Nhựt", "Hưng Long"],
  "Huyện Hóc Môn": ["Hóc Môn", "Bà Điểm", "Đông Thạnh", "Xuân Thới Sơn"],
  "Huyện Nhà Bè": ["Nhà Bè", "Hiệp Phước"],
};

export interface WardAliasEntry {
  keywords: string[];
  requirePrefix?: boolean;
  targetWard: string;
  targetDistrict: string;
  displayLabel: string;
}

/**
 * Specific Ward / Old Ward alias dictionary for unambiguous ward-level detection
 */
export const SPECIFIC_WARD_ALIASES: WardAliasEntry[] = [
  // TP. Thủ Đức (Quận 2, Quận 9, Thủ Đức)
  { keywords: ["thao dien"], targetWard: "An Khánh", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường An Khánh" },
  { keywords: ["an phu", "binh an", "an khanh"], requirePrefix: true, targetWard: "An Khánh", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường An Khánh" },
  { keywords: ["thanh my loi", "cat lai"], targetWard: "Cát Lái", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Cát Lái" },
  { keywords: ["binh trung dong", "binh trung tay", "binh trung"], targetWard: "Bình Trưng", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Bình Trưng" },
  { keywords: ["hiep binh chanh", "hiep binh phuoc"], targetWard: "Hiệp Bình", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Hiệp Bình" },
  { keywords: ["linh xuan", "linh trung"], targetWard: "Linh Xuân", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Linh Xuân" },
  { keywords: ["linh chieu", "linh dong", "linh tay"], targetWard: "Thủ Đức", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Thủ Đức" },
  { keywords: ["thu duc"], requirePrefix: true, targetWard: "Thủ Đức", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Thủ Đức" },
  { keywords: ["tang nhon phu a", "tang nhon phu b", "tang nhon phu", "hiep phu"], targetWard: "Tăng Nhơn Phú", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Tăng Nhơn Phú" },
  { keywords: ["phuoc long a", "phuoc long b", "phuoc long", "phuoc binh"], targetWard: "Phước Long", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Phước Long" },
  { keywords: ["long truong", "truong thanh", "phu huu"], targetWard: "Long Trường", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Long Trường" },
  { keywords: ["long thanh my", "long binh"], requirePrefix: true, targetWard: "Long Bình", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Long Bình" },
  { keywords: ["long phuoc"], targetWard: "Long Phước", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Long Phước" },
  { keywords: ["tam binh", "tam phu"], targetWard: "Tam Bình", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Tam Bình" },
  { keywords: ["binh chieu"], targetWard: "Bình Chiểu", targetDistrict: "TP. Thủ Đức", displayLabel: "Phường Bình Chiểu" },

  // Quận 7
  { keywords: ["tan phong", "tan kieng", "tan quy"], targetWard: "Tân Hưng", targetDistrict: "Quận 7", displayLabel: "Phường Tân Hưng" },
  { keywords: ["tan hung"], requirePrefix: true, targetWard: "Tân Hưng", targetDistrict: "Quận 7", displayLabel: "Phường Tân Hưng" },
  { keywords: ["tan thuan tay", "binh thuan"], requirePrefix: true, targetWard: "Tân Mỹ", targetDistrict: "Quận 7", displayLabel: "Phường Tân Mỹ" },
  { keywords: ["tan thuan dong"], targetWard: "Tân Thuận", targetDistrict: "Quận 7", displayLabel: "Phường Tân Thuận" },
  { keywords: ["phu thuan", "phu my"], requirePrefix: true, targetWard: "Phú Thuận", targetDistrict: "Quận 7", displayLabel: "Phường Phú Thuận" },

  // Quận 1
  { keywords: ["ben nghe"], targetWard: "Sài Gòn", targetDistrict: "Quận 1", displayLabel: "Phường Sài Gòn" },
  { keywords: ["sai gon"], requirePrefix: true, targetWard: "Sài Gòn", targetDistrict: "Quận 1", displayLabel: "Phường Sài Gòn" },
  { keywords: ["ben thanh", "pham ngu lao"], requirePrefix: true, targetWard: "Bến Thành", targetDistrict: "Quận 1", displayLabel: "Phường Bến Thành" },
  { keywords: ["da kao", "tan dinh"], requirePrefix: true, targetWard: "Tân Định", targetDistrict: "Quận 1", displayLabel: "Phường Tân Định" },
  { keywords: ["cau ong lanh", "co giang", "nguyen cu trinh"], requirePrefix: true, targetWard: "Cầu Ông Lãnh", targetDistrict: "Quận 1", displayLabel: "Phường Cầu Ông Lãnh" },

  // Quận 3 & Quận 10
  { keywords: ["ban co"], requirePrefix: true, targetWard: "Bàn Cờ", targetDistrict: "Quận 3", displayLabel: "Phường Bàn Cờ" },
  { keywords: ["nhieu loc"], requirePrefix: true, targetWard: "Nhiêu Lộc", targetDistrict: "Quận 3", displayLabel: "Phường Nhiêu Lộc" },
  { keywords: ["hoa hung"], requirePrefix: true, targetWard: "Hòa Hưng", targetDistrict: "Quận 10", displayLabel: "Phường Hòa Hưng" },
  { keywords: ["dien hong"], requirePrefix: true, targetWard: "Diên Hồng", targetDistrict: "Quận 10", displayLabel: "Phường Diên Hồng" },
  { keywords: ["vuon lai"], requirePrefix: true, targetWard: "Vườn Lài", targetDistrict: "Quận 10", displayLabel: "Phường Vườn Lài" },
  { keywords: ["xuan hoa", "vo thi sau"], requirePrefix: true, targetWard: "Xuân Hòa", targetDistrict: "Quận 3", displayLabel: "Phường Xuân Hòa" },

  // Gò Vấp
  { keywords: ["an hoi tay"], targetWard: "An Hội Tây", targetDistrict: "Gò Vấp", displayLabel: "Phường An Hội Tây" },
  { keywords: ["an hoi dong"], targetWard: "An Hội Đông", targetDistrict: "Gò Vấp", displayLabel: "Phường An Hội Đông" },
  { keywords: ["hanh thong"], targetWard: "Hạnh Thông", targetDistrict: "Gò Vấp", displayLabel: "Phường Hạnh Thông" },
  { keywords: ["thong tay hoi"], targetWard: "Thông Tây Hội", targetDistrict: "Gò Vấp", displayLabel: "Phường Thông Tây Hội" },
  { keywords: ["an nhon"], requirePrefix: true, targetWard: "An Nhơn", targetDistrict: "Gò Vấp", displayLabel: "Phường An Nhơn" },
  { keywords: ["go vap"], requirePrefix: true, targetWard: "Gò Vấp", targetDistrict: "Gò Vấp", displayLabel: "Phường Gò Vấp" },

  // Bình Thạnh & Phú Nhuận
  { keywords: ["gia dinh"], requirePrefix: true, targetWard: "Gia Định", targetDistrict: "Bình Thạnh", displayLabel: "Phường Gia Định" },
  { keywords: ["cau kieu"], targetWard: "Cầu Kiệu", targetDistrict: "Phú Nhuận", displayLabel: "Phường Cầu Kiệu" },
  { keywords: ["binh loi trung"], targetWard: "Bình Lợi Trung", targetDistrict: "Bình Thạnh", displayLabel: "Phường Bình Lợi Trung" },
  { keywords: ["thanh my tay"], targetWard: "Thạnh Mỹ Tây", targetDistrict: "Bình Thạnh", displayLabel: "Phường Thạnh Mỹ Tây" },
  { keywords: ["binh quoi"], requirePrefix: true, targetWard: "Bình Quới", targetDistrict: "Bình Thạnh", displayLabel: "Phường Bình Quới" },
  { keywords: ["binh thanh"], requirePrefix: true, targetWard: "Bình Thạnh", targetDistrict: "Bình Thạnh", displayLabel: "Phường Bình Thạnh" },
  { keywords: ["phu nhuan"], requirePrefix: true, targetWard: "Phú Nhuận", targetDistrict: "Phú Nhuận", displayLabel: "Phường Phú Nhuận" },
  { keywords: ["duc nhuan"], requirePrefix: true, targetWard: "Đức Nhuận", targetDistrict: "Phú Nhuận", displayLabel: "Phường Đức Nhuận" },

  // Tân Bình
  { keywords: ["tan son nhat"], requirePrefix: true, targetWard: "Tân Sơn Nhất", targetDistrict: "Tân Bình", displayLabel: "Phường Tân Sơn Nhất" },
  { keywords: ["tan son hoa"], targetWard: "Tân Sơn Hòa", targetDistrict: "Tân Bình", displayLabel: "Phường Tân Sơn Hòa" },
  { keywords: ["tan hoa"], requirePrefix: true, targetWard: "Tân Hòa", targetDistrict: "Tân Bình", displayLabel: "Phường Tân Hòa" },
  { keywords: ["tan son"], requirePrefix: true, targetWard: "Tân Sơn", targetDistrict: "Tân Bình", displayLabel: "Phường Tân Sơn" },
  { keywords: ["bay hien"], targetWard: "Bảy Hiền", targetDistrict: "Tân Bình", displayLabel: "Phường Bảy Hiền" },
  { keywords: ["tan binh"], requirePrefix: true, targetWard: "Tân Bình", targetDistrict: "Tân Bình", displayLabel: "Phường Tân Bình" },

  // Tân Phú
  { keywords: ["tay thanh"], targetWard: "Tây Thạnh", targetDistrict: "Tân Phú", displayLabel: "Phường Tây Thạnh" },
  { keywords: ["tan son nhi"], requirePrefix: true, targetWard: "Tân Sơn Nhì", targetDistrict: "Tân Phú", displayLabel: "Phường Tân Sơn Nhì" },
  { keywords: ["phu tho hoa"], requirePrefix: true, targetWard: "Phú Thọ Hòa", targetDistrict: "Tân Phú", displayLabel: "Phường Phú Thọ Hòa" },
  { keywords: ["phu thanh"], requirePrefix: true, targetWard: "Phú Thạnh", targetDistrict: "Tân Phú", displayLabel: "Phường Phú Thạnh" },
  { keywords: ["tan phu"], requirePrefix: true, targetWard: "Tân Phú", targetDistrict: "Tân Phú", displayLabel: "Phường Tân Phú" },

  // Bình Tân
  { keywords: ["binh hung hoa", "binh hung hoa a", "binh hung hoa b"], targetWard: "Bình Hưng Hòa", targetDistrict: "Bình Tân", displayLabel: "Phường Bình Hưng Hòa" },
  { keywords: ["binh tri dong", "binh tri dong a", "binh tri dong b"], targetWard: "Bình Trị Đông", targetDistrict: "Bình Tân", displayLabel: "Phường Bình Trị Đông" },
  { keywords: ["an lac", "an lac a"], requirePrefix: true, targetWard: "An Lạc", targetDistrict: "Bình Tân", displayLabel: "Phường An Lạc" },
  { keywords: ["tan tao", "tan tao a"], requirePrefix: true, targetWard: "Tân Tạo", targetDistrict: "Bình Tân", displayLabel: "Phường Tân Tạo" },
  { keywords: ["binh tan"], requirePrefix: true, targetWard: "Bình Tân", targetDistrict: "Bình Tân", displayLabel: "Phường Bình Tân" },

  // Huyện Bình Chánh, Hóc Môn, Nhà Bè (Phường/Xã trùng tên Huyện cũ)
  { keywords: ["binh chanh"], requirePrefix: true, targetWard: "Bình Chánh", targetDistrict: "Huyện Bình Chánh", displayLabel: "Phường Bình Chánh" },
  { keywords: ["hoc mon"], requirePrefix: true, targetWard: "Hóc Môn", targetDistrict: "Huyện Hóc Môn", displayLabel: "Phường Hóc Môn" },
  { keywords: ["nha be"], requirePrefix: true, targetWard: "Nhà Bè", targetDistrict: "Huyện Nhà Bè", displayLabel: "Phường Nhà Bè" },

  // Quận 12
  { keywords: ["an phu dong"], targetWard: "An Phú Đông", targetDistrict: "Quận 12", displayLabel: "Phường An Phú Đông" },
  { keywords: ["dong hung thuan", "tan hung thuan"], targetWard: "Đông Hưng Thuận", targetDistrict: "Quận 12", displayLabel: "Phường Đông Hưng Thuận" },
  { keywords: ["thanh xuan", "thanh loc"], requirePrefix: true, targetWard: "Thạnh Xuân", targetDistrict: "Quận 12", displayLabel: "Phường Thạnh Xuân" },
  { keywords: ["thoi an"], requirePrefix: true, targetWard: "Thới An", targetDistrict: "Quận 12", displayLabel: "Phường Thới An" },
  { keywords: ["trung my tay"], targetWard: "Trung Mỹ Tây", targetDistrict: "Quận 12", displayLabel: "Phường Trung Mỹ Tây" },
  { keywords: ["tan thoi hiep"], targetWard: "Tân Thới Hiệp", targetDistrict: "Quận 12", displayLabel: "Phường Tân Thới Hiệp" },
];

export interface StreetDirectoryEntry {
  displayName: string;
  keywords: string[];
  districts: string[];
  preferredWards: string[];
}

/**
 * Curated dictionary of major HCMC streets & residential landmarks mapped to valid districts & wards.
 */
export const HCMC_STREET_DIRECTORY: StreetDirectoryEntry[] = [
  // TP. Thủ Đức (Quận 2, Quận 9, Thủ Đức)
  {
    displayName: "Lê Văn Việt",
    keywords: ["le van viet"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["Tăng Nhơn Phú", "Thủ Đức", "Long Bình", "An Khánh"],
  },
  {
    displayName: "Đỗ Xuân Hợp",
    keywords: ["do xuan hop"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["Phước Long", "An Khánh", "Bình Trưng", "Tăng Nhơn Phú"],
  },
  {
    displayName: "Nguyễn Xiển",
    keywords: ["nguyen xien"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["Long Bình", "Long Trường", "Tăng Nhơn Phú"],
  },
  {
    displayName: "Vinhomes Grand Park",
    keywords: ["vinhomes grand park", "vinhome grand park"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["Long Bình", "Long Trường", "Tăng Nhơn Phú"],
  },
  {
    displayName: "Võ Văn Ngân",
    keywords: ["vo van ngan"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["Thủ Đức", "Linh Xuân", "Tăng Nhơn Phú"],
  },
  {
    displayName: "Kha Vạn Cân",
    keywords: ["kha van can"],
    districts: ["TP. Thủ Đức", "Gò Vấp"],
    preferredWards: ["Thủ Đức", "Linh Xuân", "Hiệp Bình", "Bình Lợi"],
  },
  {
    displayName: "Đặng Văn Bi",
    keywords: ["dang van bi"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["Thủ Đức", "Phước Long"],
  },
  {
    displayName: "Hoàng Diệu 2",
    keywords: ["hoang dieu 2"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["Linh Xuân", "Thủ Đức"],
  },
  {
    displayName: "Xuân Thủy",
    keywords: ["xuan thuy"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["An Khánh"],
  },
  {
    displayName: "Quốc Hương",
    keywords: ["quoc huong"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["An Khánh"],
  },
  {
    displayName: "Nguyễn Văn Hưởng",
    keywords: ["nguyen van huong"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["An Khánh"],
  },
  {
    displayName: "Trần Não",
    keywords: ["tran nao"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["An Khánh"],
  },
  {
    displayName: "Mai Chí Thọ",
    keywords: ["mai chi tho"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["An Khánh", "Cát Lái", "Bình Trưng"],
  },
  {
    displayName: "Nguyễn Thị Định",
    keywords: ["nguyen thi dinh"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["Cát Lái", "Bình Trưng", "An Khánh"],
  },
  {
    displayName: "Đồng Văn Cống",
    keywords: ["dong van cong"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["Cát Lái", "Bình Trưng"],
  },
  {
    displayName: "Nguyễn Duy Trinh",
    keywords: ["nguyen duy trinh"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["Bình Trưng", "Long Trường", "Phước Long"],
  },
  {
    displayName: "Lã Xuân Oai",
    keywords: ["la xuan oai"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["Tăng Nhơn Phú", "Long Trường"],
  },
  {
    displayName: "Trương Văn Thành",
    keywords: ["truong van thanh"],
    districts: ["TP. Thủ Đức"],
    preferredWards: ["Tăng Nhơn Phú", "Thủ Đức"],
  },

  // Gò Vấp
  {
    displayName: "Quang Trung",
    keywords: ["quang trung"],
    districts: ["Gò Vấp", "Quận 12", "Huyện Hóc Môn", "TP. Thủ Đức"],
    preferredWards: ["Hạnh Thông", "Gò Vấp", "Thông Tây Hội", "An Hội Tây", "An Hội Đông", "An Nhơn", "Đông Hưng Thuận", "Trung Mỹ Tây", "Hóc Môn", "Tăng Nhơn Phú"],
  },
  {
    displayName: "Phan Văn Trị",
    keywords: ["phan van tri"],
    districts: ["Gò Vấp", "Bình Thạnh", "Quận 5"],
    preferredWards: ["Hạnh Thông", "Gò Vấp", "An Nhơn", "Thông Tây Hội", "An Hội Tây", "Bình Lợi Trung", "Bình Thạnh", "Gia Định", "Chợ Quán", "An Đông"],
  },
  {
    displayName: "Nguyễn Oanh",
    keywords: ["nguyen oanh"],
    districts: ["Gò Vấp"],
    preferredWards: ["Gò Vấp", "An Nhơn", "Hạnh Thông", "An Hội Tây"],
  },
  {
    displayName: "Nguyễn Văn Lượng",
    keywords: ["nguyen van luong"],
    districts: ["Gò Vấp"],
    preferredWards: ["Gò Vấp", "An Nhơn", "Thông Tây Hội", "An Hội Tây"],
  },
  {
    displayName: "Lê Đức Thọ",
    keywords: ["le duc tho"],
    districts: ["Gò Vấp"],
    preferredWards: ["An Hội Đông", "An Hội Tây", "An Nhơn", "Gò Vấp"],
  },
  {
    displayName: "Phạm Văn Chiêu",
    keywords: ["pham van chieu"],
    districts: ["Gò Vấp"],
    preferredWards: ["An Hội Tây", "An Hội Đông", "Thông Tây Hội"],
  },
  {
    displayName: "Phan Huy Ích",
    keywords: ["phan huy ich"],
    districts: ["Gò Vấp", "Tân Bình"],
    preferredWards: ["An Hội Tây", "Tân Sơn"],
  },
  {
    displayName: "Dương Quảng Hàm",
    keywords: ["duong quang ham"],
    districts: ["Gò Vấp"],
    preferredWards: ["Gò Vấp", "An Nhơn", "Hạnh Thông", "An Hội Tây"],
  },

  // Bình Thạnh
  {
    displayName: "Xô Viết Nghệ Tĩnh",
    keywords: ["xo viet nghe tinh"],
    districts: ["Bình Thạnh"],
    preferredWards: ["Gia Định", "Thạnh Mỹ Tây", "Bình Thạnh"],
  },
  {
    displayName: "Ung Văn Khiêm",
    keywords: ["ung van khiem"],
    districts: ["Bình Thạnh"],
    preferredWards: ["Thạnh Mỹ Tây", "Gia Định", "Bình Thạnh"],
  },
  {
    displayName: "Vinhomes Central Park / Landmark 81",
    keywords: ["vinhomes central park", "vinhome central park", "landmark 81", "tan cang"],
    districts: ["Bình Thạnh"],
    preferredWards: ["Thạnh Mỹ Tây", "Gia Định", "Bình Thạnh"],
  },
  {
    displayName: "Nguyễn Hữu Cảnh",
    keywords: ["nguyen huu canh"],
    districts: ["Bình Thạnh", "Quận 1"],
    preferredWards: ["Thạnh Mỹ Tây", "Gia Định", "Sài Gòn"],
  },
  {
    displayName: "Đinh Bộ Lĩnh",
    keywords: ["dinh bo linh"],
    districts: ["Bình Thạnh"],
    preferredWards: ["Gia Định", "Bình Lợi Trung", "Bình Thạnh"],
  },
  {
    displayName: "Nơ Trang Long",
    keywords: ["no trang long"],
    districts: ["Bình Thạnh"],
    preferredWards: ["Gia Định", "Bình Lợi Trung", "Bình Thạnh"],
  },
  {
    displayName: "Nguyễn Văn Đậu",
    keywords: ["nguyen van dau"],
    districts: ["Bình Thạnh", "Phú Nhuận"],
    preferredWards: ["Bình Lợi Trung", "Gia Định", "Đức Nhuận", "Phú Nhuận"],
  },

  // Phú Nhuận
  {
    displayName: "Phan Xích Long",
    keywords: ["phan xich long"],
    districts: ["Phú Nhuận", "Bình Thạnh"],
    preferredWards: ["Cầu Kiệu", "Phú Nhuận", "Đức Nhuận", "Gia Định", "Bình Thạnh"],
  },
  {
    displayName: "Huỳnh Văn Bánh",
    keywords: ["huynh van banh"],
    districts: ["Phú Nhuận", "Quận 3"],
    preferredWards: ["Phú Nhuận", "Đức Nhuận", "Cầu Kiệu", "Nhiêu Lộc", "Xuân Hòa"],
  },
  {
    displayName: "Nguyễn Trọng Tuyển",
    keywords: ["nguyen trong tuyen"],
    districts: ["Phú Nhuận", "Tân Bình"],
    preferredWards: ["Phú Nhuận", "Đức Nhuận", "Cầu Kiệu", "Tân Sơn Hòa", "Tân Sơn Nhất"],
  },
  {
    displayName: "Phổ Quang",
    keywords: ["pho quang"],
    districts: ["Tân Bình", "Phú Nhuận"],
    preferredWards: ["Tân Sơn Hòa", "Tân Sơn Nhất", "Đức Nhuận", "Phú Nhuận"],
  },
  {
    displayName: "Nguyễn Văn Trỗi",
    keywords: ["nguyen van troi"],
    districts: ["Phú Nhuận", "Tân Bình", "Quận 3"],
    preferredWards: ["Phú Nhuận", "Đức Nhuận", "Cầu Kiệu", "Tân Sơn Hòa", "Tân Sơn Nhất", "Tân Bình"],
  },

  // Quận 7 / Nhà Bè
  {
    displayName: "Nguyễn Thị Thập",
    keywords: ["nguyen thi thap"],
    districts: ["Quận 7"],
    preferredWards: ["Tân Hưng", "Tân Mỹ", "Tân Thuận", "Phú Thuận"],
  },
  {
    displayName: "Nguyễn Văn Linh",
    keywords: ["nguyen van linh"],
    districts: ["Quận 7", "Quận 8", "Huyện Bình Chánh"],
    preferredWards: ["Tân Hưng", "Tân Mỹ", "Phú Thuận", "Bình Hưng", "Chánh Hưng", "Bình Đông"],
  },
  {
    displayName: "Huỳnh Tấn Phát",
    keywords: ["huynh tan phat"],
    districts: ["Quận 7", "Huyện Nhà Bè"],
    preferredWards: ["Tân Thuận", "Phú Thuận", "Tân Mỹ", "Nhà Bè"],
  },
  {
    displayName: "Lê Văn Lương",
    keywords: ["le van luong"],
    districts: ["Quận 7", "Huyện Nhà Bè"],
    preferredWards: ["Tân Hưng", "Nhà Bè", "Hiệp Phước"],
  },
  {
    displayName: "Phú Mỹ Hưng",
    keywords: ["phu my hung"],
    districts: ["Quận 7"],
    preferredWards: ["Tân Mỹ", "Phú Thuận", "Tân Hưng"],
  },
  {
    displayName: "Lâm Văn Bền",
    keywords: ["lam van ben"],
    districts: ["Quận 7"],
    preferredWards: ["Tân Hưng", "Tân Thuận", "Tân Mỹ"],
  },
  {
    displayName: "Trần Xuân Soạn",
    keywords: ["tran xuan soan"],
    districts: ["Quận 7"],
    preferredWards: ["Tân Hưng", "Tân Thuận"],
  },

  // Tân Bình
  {
    displayName: "Cộng Hòa",
    keywords: ["cong hoa"],
    districts: ["Tân Bình", "TP. Thủ Đức"],
    preferredWards: ["Tân Bình", "Tân Sơn Nhất", "Bảy Hiền", "Tân Sơn Hòa"],
  },
  {
    displayName: "Út Tịch",
    keywords: ["ut tich"],
    districts: ["Tân Bình"],
    preferredWards: ["Tân Sơn Nhất", "Tân Sơn Hòa", "Bảy Hiền", "Tân Bình"],
  },
  {
    displayName: "Thân Nhân Trung",
    keywords: ["than nhan trung"],
    districts: ["Tân Bình"],
    preferredWards: ["Tân Bình", "Bảy Hiền", "Tân Sơn Nhất"],
  },
  {
    displayName: "Bàu Cát",
    keywords: ["bau cat"],
    districts: ["Tân Bình"],
    preferredWards: ["Tân Bình", "Bảy Hiền", "Tân Hòa"],
  },

  // Tân Phú
  {
    displayName: "Lũy Bán Bích",
    keywords: ["luy ban bich"],
    districts: ["Tân Phú", "Quận 11", "Tân Bình"],
    preferredWards: ["Phú Thạnh", "Tân Phú", "Vườn Lài", "Tân Sơn Nhì", "Hòa Bình"],
  },
  {
    displayName: "Âu Cơ",
    keywords: ["au co"],
    districts: ["Tân Phú", "Tân Bình", "Quận 11"],
    preferredWards: ["Tân Phú", "Tân Sơn Nhì", "Tân Hòa", "Bình Thới"],
  },
  {
    displayName: "Tân Kỳ Tân Quý",
    keywords: ["tan ky tan quy"],
    districts: ["Tân Phú", "Bình Tân", "Tân Bình"],
    preferredWards: ["Tân Sơn Nhì", "Tân Phú", "Bình Hưng Hòa"],
  },
  {
    displayName: "Lê Trọng Tấn",
    keywords: ["le trong tan"],
    districts: ["Tân Phú", "Bình Tân"],
    preferredWards: ["Tây Thạnh", "Tân Sơn Nhì", "Bình Hưng Hòa"],
  },
  {
    displayName: "Aeon Mall Tân Phú / Celadon",
    keywords: ["aeon mall tan phu", "aeon tan phu", "celadon city", "bo bao tan thang"],
    districts: ["Tân Phú"],
    preferredWards: ["Tân Sơn Nhì", "Tây Thạnh"],
  },

  // Bình Tân
  {
    displayName: "Kinh Dương Vương",
    keywords: ["kinh duong vuong"],
    districts: ["Bình Tân", "Quận 6"],
    preferredWards: ["An Lạc", "Phú Lâm", "Bình Phú"],
  },
  {
    displayName: "Tên Lửa",
    keywords: ["ten lua", "aeon mall binh tan", "aeon binh tan"],
    districts: ["Bình Tân"],
    preferredWards: ["Bình Trị Đông", "An Lạc", "Bình Tân"],
  },
  {
    displayName: "Mã Lò",
    keywords: ["ma lo"],
    districts: ["Bình Tân"],
    preferredWards: ["Bình Trị Đông", "Bình Hưng Hòa"],
  },
  {
    displayName: "Hương Lộ 2",
    keywords: ["huong lo 2"],
    districts: ["Bình Tân", "Tân Phú"],
    preferredWards: ["Bình Trị Đông", "Bình Tân", "Phú Thạnh"],
  },

  // Quận 10 / Quận 3
  {
    displayName: "Rạch Bùng Binh",
    keywords: ["rach bung binh"],
    districts: ["Quận 3"],
    preferredWards: ["Nhiêu Lộc", "Hòa Hưng", "Bàn Cờ", "Xuân Hòa"],
  },
  {
    displayName: "Sư Vạn Hạnh",
    keywords: ["su van hanh"],
    districts: ["Quận 10", "Quận 3", "Quận 5", "Quận 1", "Tân Phú"],
    preferredWards: ["Hòa Hưng", "Diên Hồng", "Vườn Lài", "An Đông", "Bàn Cờ"],
  },
  {
    displayName: "Thành Thái",
    keywords: ["thanh thai"],
    districts: ["Quận 10", "Quận 3", "Quận 1", "Tân Phú"],
    preferredWards: ["Hòa Hưng", "Diên Hồng", "Vườn Lài", "Bàn Cờ"],
  },
  {
    displayName: "Tô Hiến Thành",
    keywords: ["to hien thanh"],
    districts: ["Quận 10", "Quận 3", "Tân Phú", "Quận 11"],
    preferredWards: ["Hòa Hưng", "Vườn Lài", "Bàn Cờ", "Phú Thọ"],
  },
  {
    displayName: "Cách Mạng Tháng 8",
    keywords: ["cach mang thang 8", "cach mang thang tam", "cmt8"],
    districts: ["Quận 1", "Quận 3", "Quận 10", "Tân Bình", "Tân Phú"],
    preferredWards: ["Hòa Hưng", "Xuân Hòa", "Bàn Cờ", "Nhiêu Lộc", "Diên Hồng", "Vườn Lài", "Tân Hòa", "Bảy Hiền", "Tân Sơn Nhất", "Tân Sơn Hòa", "Bến Thành"],
  },

  // Quận 8
  {
    displayName: "Tạ Quang Bửu",
    keywords: ["ta quang buu"],
    districts: ["Quận 8"],
    preferredWards: ["Chánh Hưng", "Bình Đông"],
  },
  {
    displayName: "Phạm Thế Hiển",
    keywords: ["pham the hien"],
    districts: ["Quận 8"],
    preferredWards: ["Chánh Hưng", "Bình Đông"],
  },
  {
    displayName: "Dương Bá Trạc",
    keywords: ["duong ba trac"],
    districts: ["Quận 8"],
    preferredWards: ["Chánh Hưng"],
  },

  // Quận 4
  {
    displayName: "Đoàn Văn Bơ",
    keywords: ["doan van bo"],
    districts: ["Quận 4"],
    preferredWards: ["Xóm Chiếu", "Khánh Hội", "Vĩnh Hội"],
  },
  {
    displayName: "Tôn Đản",
    keywords: ["ton dan"],
    districts: ["Quận 4"],
    preferredWards: ["Khánh Hội", "Vĩnh Hội", "Xóm Chiếu"],
  },
  {
    displayName: "Bến Vân Đồn",
    keywords: ["ben van don"],
    districts: ["Quận 4"],
    preferredWards: ["Khánh Hội", "Vĩnh Hội", "Xóm Chiếu"],
  },

  // Quận 1
  {
    displayName: "Nguyễn Huệ",
    keywords: ["nguyen hue"],
    districts: ["Quận 1"],
    preferredWards: ["Sài Gòn", "Bến Thành"],
  },
  {
    displayName: "Đồng Khởi",
    keywords: ["dong khoi"],
    districts: ["Quận 1"],
    preferredWards: ["Sài Gòn"],
  },
  {
    displayName: "Hàm Nghi",
    keywords: ["ham nghi"],
    districts: ["Quận 1"],
    preferredWards: ["Sài Gòn", "Bến Thành"],
  },
  {
    displayName: "Trần Đình Xu",
    keywords: ["tran dinh xu"],
    districts: ["Quận 1"],
    preferredWards: ["Cầu Ông Lãnh", "Bến Thành", "Sài Gòn"],
  },

  // Trục đường liên quận trung tâm & huyết mạch TP.HCM
  {
    displayName: "Hoàng Sa",
    keywords: ["hoang sa"],
    districts: ["Quận 1", "Quận 3", "Phú Nhuận", "Tân Bình"],
    preferredWards: ["Tân Định", "Xuân Hòa", "Nhiêu Lộc", "Cầu Kiệu", "Tân Sơn Hòa", "Tân Sơn Nhất"],
  },
  {
    displayName: "Trường Sa",
    keywords: ["truong sa"],
    districts: ["Quận 1", "Bình Thạnh", "Quận 3", "Phú Nhuận", "Tân Bình"],
    preferredWards: ["Tân Định", "Gia Định", "Xuân Hòa", "Nhiêu Lộc", "Cầu Kiệu", "Tân Sơn Hòa", "Tân Sơn Nhất"],
  },
  {
    displayName: "Điện Biên Phủ",
    keywords: ["dien bien phu"],
    districts: ["Quận 1", "Quận 3", "Bình Thạnh", "Quận 10"],
    preferredWards: ["Tân Định", "Sài Gòn", "Xuân Hòa", "Bàn Cờ", "Vườn Lài", "Diên Hồng", "Gia Định", "Thạnh Mỹ Tây", "Bình Thạnh"],
  },
  {
    displayName: "Võ Thị Sáu",
    keywords: ["vo thi sau"],
    districts: ["Quận 1", "Quận 3"],
    preferredWards: ["Tân Định", "Xuân Hòa", "Bàn Cờ", "Nhiêu Lộc"],
  },
  {
    displayName: "Hai Bà Trưng",
    keywords: ["hai ba trung"],
    districts: ["Quận 1", "Quận 3"],
    preferredWards: ["Sài Gòn", "Tân Định", "Xuân Hòa"],
  },
  {
    displayName: "Nam Kỳ Khởi Nghĩa",
    keywords: ["nam ky khoi nghia"],
    districts: ["Quận 1", "Quận 3", "Phú Nhuận"],
    preferredWards: ["Sài Gòn", "Bến Thành", "Xuân Hòa", "Phú Nhuận"],
  },
  {
    displayName: "Nguyễn Thị Minh Khai",
    keywords: ["nguyen thi minh khai"],
    districts: ["Quận 1", "Quận 3"],
    preferredWards: ["Sài Gòn", "Bến Thành", "Xuân Hòa", "Bàn Cờ"],
  },
  {
    displayName: "Nguyễn Đình Chiểu",
    keywords: ["nguyen dinh chieu"],
    districts: ["Quận 1", "Quận 3"],
    preferredWards: ["Tân Định", "Sài Gòn", "Xuân Hòa", "Bàn Cờ"],
  },
  {
    displayName: "Lê Văn Sỹ",
    keywords: ["le van sy", "le van si"],
    districts: ["Quận 3", "Phú Nhuận", "Tân Bình"],
    preferredWards: ["Nhiêu Lộc", "Xuân Hòa", "Phú Nhuận", "Đức Nhuận", "Tân Sơn Hòa", "Tân Sơn Nhất"],
  },
  {
    displayName: "Trần Quang Diệu",
    keywords: ["tran quang dieu"],
    districts: ["Quận 3", "Phú Nhuận"],
    preferredWards: ["Nhiêu Lộc", "Xuân Hòa", "Phú Nhuận"],
  },
  {
    displayName: "Phan Đăng Lưu",
    keywords: ["phan dang luu"],
    districts: ["Bình Thạnh", "Phú Nhuận"],
    preferredWards: ["Gia Định", "Cầu Kiệu", "Phú Nhuận", "Đức Nhuận"],
  },
  {
    displayName: "Bạch Đằng",
    keywords: ["bach dang"],
    districts: ["Bình Thạnh", "Tân Bình"],
    preferredWards: ["Gia Định", "Bình Thạnh", "Tân Sơn Hòa", "Tân Sơn Nhất"],
  },
  {
    displayName: "Phạm Văn Đồng",
    keywords: ["pham van dong"],
    districts: ["Gò Vấp", "Bình Thạnh", "TP. Thủ Đức", "Tân Bình"],
    preferredWards: ["Hạnh Thông", "Bình Lợi Trung", "Hiệp Bình", "Linh Xuân", "Thủ Đức", "Tân Sơn Hòa"],
  },
  {
    displayName: "Võ Văn Kiệt",
    keywords: ["vo van kiet"],
    districts: ["Quận 1", "Quận 5", "Quận 6", "Quận 8", "Bình Tân"],
    preferredWards: ["Sài Gòn", "Cầu Ông Lãnh", "Bến Thành", "Chợ Quán", "An Đông", "Chợ Lớn", "Bình Tiên", "Bình Tây", "Bình Phú", "Phú Lâm", "Phú Định", "Chánh Hưng", "Bình Đông", "An Lạc"],
  },
];

/**
 * Find best matching AdministrativeWard(s) from availableWards given candidate ward names & districts
 */
export function findMatchingWardsFromCatalog(
  availableWards: AdministrativeWard[],
  candidateWardNames: string[],
  candidateDistricts: string[]
): AdministrativeWard[] {
  if (!availableWards || availableWards.length === 0) return [];

  const matched: AdministrativeWard[] = [];
  const addedIds = new Set<string>();

  const addWard = (w: AdministrativeWard) => {
    const key = w.id || w.name;
    if (!addedIds.has(key)) {
      addedIds.add(key);
      matched.push(w);
    }
  };

  // 1a. Priority match by exact candidate ward name
  for (const candName of candidateWardNames) {
    const normCand = normalizeText(cleanAdministrativeUnitName(candName));
    if (!normCand) continue;
    for (const w of availableWards) {
      const normW = normalizeText(cleanAdministrativeUnitName(w.name));
      if (normW === normCand) {
        addWard(w);
      }
    }
  }

  // 1b. Match by old_ward or old_wards containing candidate ward name
  for (const candName of candidateWardNames) {
    const normCand = normalizeText(cleanAdministrativeUnitName(candName));
    if (!normCand) continue;
    for (const w of availableWards) {
      const oldWardStr =
        w.old_ward ||
        w.old_wards ||
        "";
      if (oldWardStr && normalizeText(oldWardStr).includes(normCand)) {
        addWard(w);
      }
    }
  }

  // 2. Match by default wards for candidate districts
  for (const dist of candidateDistricts) {
    const canonDist = normalizeDistrictName(dist);
    const defaultWards = DISTRICT_DEFAULT_WARDS[canonDist] || [];
    for (const defWard of defaultWards) {
      const normDef = normalizeText(defWard);
      for (const w of availableWards) {
        const normW = normalizeText(cleanAdministrativeUnitName(w.name));
        if (normW === normDef) {
          addWard(w);
        }
      }
    }
  }

  // 3. Match by ward's district field or canonical district mapping
  for (const dist of candidateDistricts) {
    const canonDist = normalizeDistrictName(dist);
    if (!canonDist) continue;
    for (const w of availableWards) {
      const cleanW = cleanAdministrativeUnitName(w.name);
      const wDist = w.district ? normalizeDistrictName(w.district) : "";
      const mappedDists = WARD_CANONICAL_DISTRICTS[cleanW] || [];
      if (wDist === canonDist || mappedDists.includes(canonDist)) {
        addWard(w);
      }
    }
  }

  return matched;
}

/**
 * Detect explicit district or province keywords mentioned in free-text address
 */
function detectExplicitDistrictOrProvince(text: string): {
  type: "province" | "district";
  canonicalName: string;
  rawLabel: string;
} | null {
  const norm = normalizeText(text);
  if (!norm) return null;

  // Check other provinces (avoid false positive on "Xa lộ Hà Nội", "Đường Bình Dương", or new 2-tier wards prefixed with Phường/Xã)
  const textWithoutHighways = norm
    .replace(/xa\s*lo\s*ha\s*noi/g, "")
    .replace(/duong\s*(ha\s*noi|binh\s*duong|dong\s*nai|long\s*an)/g, "")
    .replace(/(?:phuong|p\.?|xa)\s*(di\s*an|thuan\s*an|thu\s*dau\s*mot|binh\s*duong)/g, "");

  if (/\b(di\s*an|thuan\s*an|thu\s*dau\s*mot|tinh\s*binh\s*duong|binh\s*duong)\b/.test(textWithoutHighways)) {
    return { type: "province", canonicalName: "Bình Dương", rawLabel: "Bình Dương" };
  }
  if (/\b(bien\s*hoa|tinh\s*dong\s*nai|dong\s*nai)\b/.test(textWithoutHighways)) {
    return { type: "province", canonicalName: "Đồng Nai", rawLabel: "Đồng Nai" };
  }
  if (/\b(tinh\s*long\s*an|ben\s*luc|duc\s*hoa|long\s*an)\b/.test(textWithoutHighways)) {
    return { type: "province", canonicalName: "Long An", rawLabel: "Long An" };
  }
  if (/\b(tp\.?\s*ha\s*noi|thanh\s*pho\s*ha\s*noi|ha\s*noi)\b/.test(textWithoutHighways)) {
    return { type: "province", canonicalName: "Hà Nội", rawLabel: "Hà Nội" };
  }

  // Named districts in HCMC
  if (/\b(tp\.?\s*thu\s*duc|thanh\s*pho\s*thu\s*duc|quan\s*thu\s*duc|thu\s*duc)\b/.test(norm)) {
    return { type: "district", canonicalName: "TP. Thủ Đức", rawLabel: "TP. Thủ Đức" };
  }
  if (/\b(go\s*vap|q\.?\s*gv)\b/.test(norm)) {
    return { type: "district", canonicalName: "Gò Vấp", rawLabel: "Gò Vấp" };
  }
  if (/\b(binh\s*thanh|q\.?\s*bt)\b/.test(norm)) {
    return { type: "district", canonicalName: "Bình Thạnh", rawLabel: "Bình Thạnh" };
  }
  if (/\b(phu\s*nhuan|q\.?\s*pn)\b/.test(norm)) {
    return { type: "district", canonicalName: "Phú Nhuận", rawLabel: "Phú Nhuận" };
  }
  if (/\b(tan\s*binh|q\.?\s*tb)\b/.test(norm)) {
    return { type: "district", canonicalName: "Tân Bình", rawLabel: "Tân Bình" };
  }
  if (/\b(tan\s*phu|q\.?\s*tp)\b/.test(norm)) {
    return { type: "district", canonicalName: "Tân Phú", rawLabel: "Tân Phú" };
  }
  if (/\b(binh\s*tan)\b/.test(norm)) {
    return { type: "district", canonicalName: "Bình Tân", rawLabel: "Bình Tân" };
  }
  if (/\b(binh\s*chanh)\b/.test(norm)) {
    return { type: "district", canonicalName: "Huyện Bình Chánh", rawLabel: "Huyện Bình Chánh" };
  }
  if (/\b(hoc\s*mon)\b/.test(norm)) {
    return { type: "district", canonicalName: "Huyện Hóc Môn", rawLabel: "Huyện Hóc Môn" };
  }
  if (/\b(nha\s*be)\b/.test(norm)) {
    return { type: "district", canonicalName: "Huyện Nhà Bè", rawLabel: "Huyện Nhà Bè" };
  }
  if (/\b(cu\s*chi)\b/.test(norm)) {
    return { type: "district", canonicalName: "Huyện Củ Chi", rawLabel: "Huyện Củ Chi" };
  }
  if (/\b(can\s*gio)\b/.test(norm)) {
    return { type: "district", canonicalName: "Huyện Cần Giờ", rawLabel: "Huyện Cần Giờ" };
  }

  // Numbered districts: Quận 1..12, Q.1..Q.12, Q1..Q12
  const numDistMatch = norm.match(/(?:^|[\s,.\-/(])(?:quan|q\.?)\s*0?(10|11|12|[1-9])(?=$|[\s,.\-/)])/);
  if (numDistMatch) {
    const dNum = parseInt(numDistMatch[1], 10);
    if (dNum === 2 || dNum === 9) {
      return {
        type: "district",
        canonicalName: "TP. Thủ Đức",
        rawLabel: `Quận ${dNum} (TP. Thủ Đức)`,
      };
    }
    return {
      type: "district",
      canonicalName: `Quận ${dNum}`,
      rawLabel: `Quận ${dNum}`,
    };
  }

  return null;
}

/**
 * Detect explicit Ward / Old Ward mentioned in free-text address
 */
function detectExplicitWardInText(
  text: string,
  explicitDistrictCanon?: string,
  availableWards: AdministrativeWard[] = []
): { targetWard: string; targetDistrict: string; displayLabel: string } | null {
  const norm = normalizeText(text);
  if (!norm) return null;

  // 1. Check specific named ward aliases
  for (const entry of SPECIFIC_WARD_ALIASES) {
    for (const kw of entry.keywords) {
      if (entry.requirePrefix) {
        const prefixedRegex = new RegExp(`(?:^|[\\s,.-])(?:phuong|p\\.?|xa)\\s+${kw}(?=$|[\\s,.-])`, "i");
        if (prefixedRegex.test(norm)) {
          return {
            targetWard: entry.targetWard,
            targetDistrict: entry.targetDistrict,
            displayLabel: entry.displayLabel,
          };
        }
      } else {
        // Match either with prefix OR after a comma/hyphen OR standalone word (not preceded by "duong ")
        const regex = new RegExp(`(?:^|[\\s,.-])(?!duong\\s+)(?:(?:phuong|p\\.?|xa)\\s+)?${kw}(?=$|[\\s,.-])`, "i");
        const duongRegex = new RegExp(`\\bduong\\s+${kw}\\b`, "i");
        if (regex.test(norm) && !duongRegex.test(norm)) {
          return {
            targetWard: entry.targetWard,
            targetDistrict: entry.targetDistrict,
            displayLabel: entry.displayLabel,
          };
        }
      }
    }
  }

  // 2. Directly scan all availableWards & canonical post-merger wards when explicitly prefixed with Phường / P. / Xã / Thị trấn
  const candidateWardPool: Array<{ name: string; district?: string }> = [
    ...(availableWards || []),
    ...Object.entries(DISTRICT_DEFAULT_WARDS).flatMap(([dist, wards]) =>
      wards.map((wName) => ({ name: wName, district: dist }))
    ),
  ];

  if (candidateWardPool.length > 0) {
    const sortedWards = [...candidateWardPool].sort(
      (a, b) =>
        cleanAdministrativeUnitName(b.name).length -
        cleanAdministrativeUnitName(a.name).length
    );
    for (const w of sortedWards) {
      const cleanW = cleanAdministrativeUnitName(w.name);
      const normW = normalizeText(cleanW);
      if (!normW || normW.length < 2 || /^\d+$/.test(normW)) continue;
      const escapedKw = normW.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const prefixedRegex = new RegExp(
        `(?:^|[\\s,.\\-/(])(?:phuong|p\\.?|xa|thi\\s*tran|tt\\.?)\\s+${escapedKw}(?=$|[\\s,.\\-/)])`,
        "i"
      );
      if (prefixedRegex.test(norm)) {
        const mappedDist = WARD_CANONICAL_DISTRICTS[cleanW]?.[0] || w.district || cleanW;
        return {
          targetWard: cleanW,
          targetDistrict: mappedDist,
          displayLabel: formatWardLabel(w.name),
        };
      }
    }
  }

  return null;
}

export function collapseRepeatedLetters(str: string): string {
  if (!str) return "";
  return str.replace(/([a-z])\1+/g, "$1");
}

/**
 * Detect street or landmark from HCMC_STREET_DIRECTORY
 */
function detectStreetInText(text: string): StreetDirectoryEntry | null {
  const norm = normalizeText(text);
  if (!norm) return null;
  const collapsedNorm = collapseRepeatedLetters(norm);

  for (const entry of HCMC_STREET_DIRECTORY) {
    for (const kw of entry.keywords) {
      const collapsedKw = collapseRepeatedLetters(kw);
      const regex = new RegExp(`(?:^|[\\s,./\\-(])${kw}(?=$|[\\s,./\\-)])`, "i");
      const collapsedRegex = new RegExp(
        `(?:^|[\\s,./\\-(])${collapsedKw}(?=$|[\\s,./\\-)])`,
        "i"
      );
      if (regex.test(norm) || collapsedRegex.test(collapsedNorm)) {
        return entry;
      }
    }
  }
  return null;
}

/**
 * Synchronous cross-validation between free-text streetAddress/note and selectedWard/selectedDistrict.
 * Also provides smart ward suggestions even when selectedWard is empty.
 */
export function validateAddressWardMatch(
  params: ValidateAddressWardParams
): AddressWardValidationResult {
  const {
    streetAddress,
    note,
    selectedWard = "",
    selectedWardId = "",
    selectedDistrict = "",
    selectedProvince = "TP. Hồ Chí Minh",
    availableWards = [],
  } = params;

  const combinedText = [streetAddress, note].filter(Boolean).join(", ").trim();
  if (!streetAddress || !streetAddress.trim()) {
    return { isValid: true };
  }

  // Only enforce HCMC rules when province is HCMC (or empty default)
  const normProv = normalizeText(selectedProvince);
  const isHcmc = !normProv || normProv.includes("ho chi minh") || normProv.includes("hcm") || normProv.includes("sai gon");
  if (!isHcmc) {
    return { isValid: true };
  }

  // Locate selected ward in availableWards
  const currentWardObj = availableWards.find(
    (w) =>
      (selectedWardId && w.id === selectedWardId) ||
      (selectedWard &&
        normalizeText(cleanAdministrativeUnitName(w.name)) ===
          normalizeText(cleanAdministrativeUnitName(selectedWard)))
  );

  const cleanSelectedWard = cleanAdministrativeUnitName(
    currentWardObj?.name || selectedWard || ""
  );
  const hasWardSelected = Boolean(cleanSelectedWard || selectedWardId);

  // Build set of valid canonical districts for the currently selected ward
  const selectedValidDistricts = new Set<string>();
  if (currentWardObj?.district) {
    const normDist = normalizeDistrictName(currentWardObj.district);
    if (normDist in DISTRICT_DEFAULT_WARDS) {
      selectedValidDistricts.add(normDist);
    }
  }
  if (selectedDistrict) {
    const normDist = normalizeDistrictName(selectedDistrict);
    if (normDist in DISTRICT_DEFAULT_WARDS) {
      selectedValidDistricts.add(normDist);
    }
  }
  if (cleanSelectedWard) {
    const mapped = WARD_CANONICAL_DISTRICTS[cleanSelectedWard];
    if (mapped) {
      mapped.forEach((d) => selectedValidDistricts.add(normalizeDistrictName(d)));
    }
    // Also search case/accent-insensitively in WARD_CANONICAL_DISTRICTS
    const normSel = normalizeText(cleanSelectedWard);
    for (const [wKey, dists] of Object.entries(WARD_CANONICAL_DISTRICTS)) {
      if (normalizeText(wKey) === normSel) {
        dists.forEach((d) => selectedValidDistricts.add(normalizeDistrictName(d)));
      }
    }
  }

  const selectedWardDisplay = cleanSelectedWard
    ? formatWardLabel(currentWardObj?.name || selectedWard)
    : "Phường/Xã đang chọn";

  const explicitDistOrProv = detectExplicitDistrictOrProvince(combinedText);
  const explicitWard = detectExplicitWardInText(
    combinedText,
    explicitDistOrProv?.type === "district" ? explicitDistOrProv.canonicalName : undefined,
    availableWards
  );
  const matchedStreet = detectStreetInText(streetAddress);

  // If no ward is selected yet, return suggestion if we detected a specific ward or primary street ward
  if (!hasWardSelected) {
    const candWards: string[] = [];
    const candDistricts: string[] = [];

    if (explicitWard) {
      candWards.push(explicitWard.targetWard);
      candDistricts.push(explicitWard.targetDistrict);
    } else if (matchedStreet && matchedStreet.preferredWards.length > 0) {
      candWards.push(matchedStreet.preferredWards[0]);
    } else if (explicitDistOrProv?.type === "district") {
      candDistricts.push(explicitDistOrProv.canonicalName);
    }

    const suggestions = findMatchingWardsFromCatalog(availableWards, candWards, candDistricts);
    const singleSuggested = suggestions.length === 1 ? suggestions[0] : (suggestions[0] || null);
    return {
      isValid: true,
      verificationStatus: singleSuggested ? "verified_single_ward" : undefined,
      verifiedWard: singleSuggested?.name || null,
      isWardMatched: false,
      canOrder: false,
      requiresCallback: false,
      detectedArea:
        explicitWard?.displayLabel ||
        (suggestions[0] ? formatWardLabel(suggestions[0].name) : undefined),
      suggestedWard: suggestions[0] || null,
      suggestedWards: suggestions[0] ? [suggestions[0]] : [],
    };
  }

  // 1. Check Province Conflict (e.g. typing Bình Dương / Đồng Nai while selecting TP. Hồ Chí Minh)
  if (explicitDistOrProv && explicitDistOrProv.type === "province") {
    return {
      isValid: false,
      conflictType: "province_conflict",
      verificationStatus: "unverifiable",
      verifiedWard: null,
      isWardMatched: false,
      canOrder: false,
      requiresCallback: true,
      detectedArea: explicitDistOrProv.rawLabel,
      message: `Địa chỉ bạn nhập thuộc khu vực ${explicitDistOrProv.rawLabel}, không khớp với ${selectedWardDisplay} (TP. Hồ Chí Minh). Vui lòng kiểm tra lại Tỉnh/Thành hoặc Phường/Xã để tính chính xác phí vận chuyển.`,
      suggestedWard: null,
      suggestedWards: [],
    };
  }

  // 2. Check Explicit Ward Conflict (e.g. typing "Thảo Điền" or "Hiệp Bình Chánh" or "Phường Thủ Đức" while selecting another ward)
  if (explicitWard) {
    const normTargetWard = normalizeText(explicitWard.targetWard);
    const normSelectedWard = normalizeText(cleanSelectedWard);

    if (normTargetWard !== normSelectedWard) {
      // Check if targetWard exists in availableWards or is a known post-merger ward
      const exactWardInCatalog = availableWards.some(
        (w) => normalizeText(cleanAdministrativeUnitName(w.name)) === normTargetWard
      );
      const isKnownPostMergerWard = Boolean(WARD_CANONICAL_DISTRICTS[explicitWard.targetWard]);
      const targetCanonDist = normalizeDistrictName(explicitWard.targetDistrict);
      const isSameDistrictWhenWardNotInCatalog =
        !exactWardInCatalog && !isKnownPostMergerWard && selectedValidDistricts.has(targetCanonDist);

      if (!isSameDistrictWhenWardNotInCatalog) {
        const rawSuggestions = findMatchingWardsFromCatalog(
          availableWards,
          [explicitWard.targetWard],
          exactWardInCatalog ? [explicitWard.targetDistrict] : []
        ).filter((w) => normalizeText(cleanAdministrativeUnitName(w.name)) !== normSelectedWard);
        const fallbackWard: AdministrativeWard | null =
          rawSuggestions[0] ||
          (isKnownPostMergerWard
            ? {
                id: explicitWard.targetWard,
                name: explicitWard.targetWard,
                district: explicitWard.targetWard,
              }
            : null);
        const suggestions =
          rawSuggestions.length > 0
            ? rawSuggestions
            : fallbackWard
              ? [fallbackWard]
              : [];
        const areaLabel = suggestions[0]
          ? formatWardLabel(suggestions[0].name)
          : explicitWard.displayLabel;
        const suggestionHint = suggestions[0]
          ? ` Gợi ý: ${formatWardLabel(suggestions[0].name)}.`
          : "";
        return {
          isValid: false,
          conflictType: "ward_conflict",
          verificationStatus: "ward_mismatch",
          verifiedWard: suggestions[0]?.name || explicitWard.targetWard,
          isWardMatched: false,
          canOrder: false,
          requiresCallback: true,
          detectedArea: areaLabel,
          message: `Địa chỉ bạn nhập thuộc khu vực ${areaLabel}, không khớp với ${selectedWardDisplay} đang chọn. Vui lòng đổi về đúng Phường/Xã để tính chính xác phí vận chuyển.${suggestionHint}`,
          suggestedWard: suggestions[0] || null,
          suggestedWards: suggestions[0] ? [suggestions[0]] : [],
        };
      }
    }
  }

  // 3. Check Explicit District Conflict (e.g. typing "Gò Vấp", "Quận 7", "Thủ Đức", "Q9" while selecting "Sài Gòn")
  if (explicitDistOrProv && explicitDistOrProv.type === "district") {
    const detectedCanonDist = explicitDistOrProv.canonicalName;
    if (selectedValidDistricts.size > 0 && !selectedValidDistricts.has(detectedCanonDist)) {
      const candWards = [
        ...(explicitWard ? [explicitWard.targetWard] : []),
        ...(matchedStreet && matchedStreet.districts.includes(detectedCanonDist)
          ? matchedStreet.preferredWards
          : []),
      ];
      const suggestions = findMatchingWardsFromCatalog(
        availableWards,
        candWards,
        [detectedCanonDist]
      );
      const areaLabel = suggestions[0]
        ? formatWardLabel(suggestions[0].name)
        : explicitDistOrProv.rawLabel;
      const suggestionHint = suggestions[0]
        ? ` Gợi ý: ${formatWardLabel(suggestions[0].name)}.`
        : "";
      return {
        isValid: false,
        conflictType: "district_conflict",
        verificationStatus: "ward_mismatch",
        verifiedWard: suggestions[0]?.name || null,
        isWardMatched: false,
        canOrder: false,
        requiresCallback: true,
        detectedArea: areaLabel,
        message: `Địa chỉ bạn nhập thuộc khu vực ${areaLabel}, không khớp với ${selectedWardDisplay} đang chọn. Vui lòng đổi về đúng Phường/Xã để tính chính xác phí vận chuyển.${suggestionHint}`,
        suggestedWard: suggestions[0] || null,
        suggestedWards: suggestions[0] ? [suggestions[0]] : [],
      };
    }
  }

  // 4. Check Street-to-District/Ward Dictionary Conflict (e.g. typing "123 Lê Văn Việt" while selecting "Phường Sài Gòn")
  if (matchedStreet) {
    const normSelectedWard = normalizeText(cleanSelectedWard);
    const wardMatchesPreferred = matchedStreet.preferredWards.some(
      (pw) => normalizeText(pw) === normSelectedWard
    );
    const districtMatchesValid = matchedStreet.districts.some((d) =>
      selectedValidDistricts.has(normalizeDistrictName(d))
    );

    if (!wardMatchesPreferred && (selectedValidDistricts.size === 0 || !districtMatchesValid)) {
      const suggestions = findMatchingWardsFromCatalog(
        availableWards,
        matchedStreet.preferredWards,
        matchedStreet.districts
      );
      const areaLabel = suggestions[0]
        ? formatWardLabel(suggestions[0].name)
        : matchedStreet.districts.join(" / ");
      const suggestionHint = suggestions[0]
        ? ` Gợi ý: ${formatWardLabel(suggestions[0].name)}.`
        : "";
      return {
        isValid: false,
        conflictType: "street_conflict",
        verificationStatus: "ward_mismatch",
        verifiedWard: suggestions[0]?.name || null,
        isWardMatched: false,
        canOrder: false,
        requiresCallback: true,
        detectedArea: areaLabel,
        message: `Địa chỉ bạn nhập (Đường ${matchedStreet.displayName}) thuộc khu vực ${areaLabel}, không khớp với ${selectedWardDisplay} đang chọn. Vui lòng đổi về đúng Phường/Xã để tính chính xác phí vận chuyển.${suggestionHint}`,
        suggestedWard: suggestions[0] || null,
        suggestedWards: suggestions[0] ? [suggestions[0]] : [],
      };
    }
  }

  const hasHouseNum = hasHouseNumberInAddress(streetAddress);
  return {
    isValid: true,
    verificationStatus: hasHouseNum ? "verified_single_ward" : "missing_house_number",
    verifiedWard: hasHouseNum ? cleanSelectedWard || null : null,
    isWardMatched: Boolean(hasHouseNum && hasWardSelected),
    canOrder: Boolean(hasHouseNum && hasWardSelected),
    requiresCallback: false,
  };
}

// In-memory cache for Map Geocoding API lookups (keyed by normalized "rawStreet|province")
const mapLookupCache = new Map<string, GeocodeVerificationPayload>();

export function clearAddressGeocodeCache(): void {
  mapLookupCache.clear();
}

/**
 * Extract leading house number base digits from user's raw street input
 * Examples:
 * - "197 hoàng sa" -> "197"
 * - "197/12A Hoàng Sa" -> "197"
 * - "197A Hoàng Sa" -> "197"
 * - "Số 197-199 Hoàng Sa" -> "197"
 * - "Landmark 81" -> null
 * - "Đường số 7" -> null
 */
export function extractLeadingHouseNumber(rawStreet: string): string | null {
  const norm = normalizeText(rawStreet);
  if (!norm) return null;
  const loMatch = norm.match(
    /^(?:(?:so\s+nha|so|sn\.?|hem|ngo|ngach|kiet|h\.)\s+)*lo\s+([a-z]{1,2}\d+[a-z]{0,2}|\d+[a-z]{0,2})(?=$|[\s,/.\-])/i
  );
  if (loMatch) return loMatch[1].toLowerCase();
  const match = norm.match(
    /^(?:(?:so\s+nha|so|sn\.?|hem|ngo|ngach|kiet|h\.)\s+)*(\d+)(?:[a-z]{0,2})(?=$|[\s,/.\-])/i
  );
  return match ? match[1] : null;
}

export function hasHouseNumberInAddress(streetAddress: string): boolean {
  const raw = (streetAddress || "").trim();
  if (!raw) return false;
  if (extractLeadingHouseNumber(raw) === null) return false;
  return /^(?:(?:số\s+nhà|so\s+nha|số|so|sn\.?|hẻm|hem|ngõ|ngo|ngách|ngach|kiệt|kiet|h\.)\s+)*(?:\d+[a-zA-Z]{0,2}(?:[\/\-]\d+[a-zA-Z]{0,2})*|(?:lô|lo)\s+(?:[a-zA-Z]{1,2}\d+[a-zA-Z]{0,2}|\d+[a-zA-Z]{0,2})(?:[\/\-]\d+[a-zA-Z]{0,2})*)(?:,\s*|\s+)\S+/iu.test(
    raw
  );
}

function calculateHaversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function attachHaversineDistances(
  candidates: GeocodeCandidate[]
): GeocodeCandidate[] {
  if (!candidates || candidates.length === 0) return [];
  const first = candidates[0];
  const hasOrigin =
    typeof first.lat === "number" &&
    Number.isFinite(first.lat) &&
    typeof first.lng === "number" &&
    Number.isFinite(first.lng);

  return candidates.map((cand, index) => {
    if (typeof cand.distance_meters === "number" && Number.isFinite(cand.distance_meters)) {
      return cand;
    }
    if (index === 0) {
      return hasOrigin ? { ...cand, distance_meters: 0 } : { ...cand };
    }
    if (
      hasOrigin &&
      typeof cand.lat === "number" &&
      Number.isFinite(cand.lat) &&
      typeof cand.lng === "number" &&
      Number.isFinite(cand.lng)
    ) {
      return {
        ...cand,
        distance_meters: calculateHaversineMeters(
          first.lat!,
          first.lng!,
          cand.lat,
          cand.lng
        ),
      };
    }
    return { ...cand };
  });
}

function formatCandidateWardForDetection(rawWard?: string): string {
  const trimmed = (rawWard || "").trim();
  if (!trimmed) return "";
  if (/^(quận|q\.?\s*\d|q\.\s|huyện|thành\s*phố|tp\.?\s|tỉnh)\b/i.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{1,2}$/.test(trimmed)) {
    return `Phường ${trimmed}`;
  }
  if (/^(phường|p\.?\s*\d|p\.\s|xã|thị\s*trấn|tt\.)\b/i.test(trimmed)) {
    return trimmed;
  }
  return formatWardLabel(trimmed);
}

function formatCandidateDistrictForDetection(rawDistrict?: string): string {
  const trimmed = (rawDistrict || "").trim();
  if (!trimmed) return "";
  if (/^\d{1,2}$/.test(trimmed)) {
    return `Quận ${trimmed}`;
  }
  return trimmed;
}

function extractAdminSegmentsFromFormatted(
  formattedAddress?: string,
  street?: string
): string {
  if (!formattedAddress) return "";
  const streetNorm = street
    ? normalizeText(street.replace(/^(đường|duong)\s+/i, ""))
    : "";

  const segments = formattedAddress
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const kept: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const normSeg = normalizeText(seg);
    if (!normSeg || /^\d{5,6}$/.test(normSeg) || normSeg === "viet nam" || normSeg === "vietnam") {
      continue;
    }

    const hasExplicitAdminPrefix =
      /^(phuong|p\.?\s*\d|p\.\s|xa|thi\s*tran|tt\.|quan|q\.?\s*\d|q\.\s|huyen|thanh\s*pho|tp\.?\s|tinh)\b/i.test(
        normSeg
      );

    if (hasExplicitAdminPrefix) {
      kept.push(seg);
      continue;
    }

    // Segment 0 without explicit admin prefix is the house number / street / building name -> skip to avoid street-name noise
    if (i === 0) {
      continue;
    }

    // Skip street/house/building segments at later positions
    if (
      /^(\d+|so\s+\d+|duong\b|hem\b|ngo\b|ngach\b|khu\s+pho\b|kp\.?\b|ap\b|chung\s*cu\b|toa\b)\b/i.test(
        normSeg
      )
    ) {
      continue;
    }

    if (streetNorm && (normSeg === streetNorm || normSeg === `duong ${streetNorm}`)) {
      continue;
    }

    kept.push(seg);
  }

  return kept.join(", ");
}

export function isKnownPostMerger94Ward(
  wardName: string,
  availableWards: AdministrativeWard[] = []
): boolean {
  const norm = normalizeText(cleanAdministrativeUnitName(wardName));
  if (!norm) return false;
  if (
    availableWards.some(
      (w) => normalizeText(cleanAdministrativeUnitName(w.name)) === norm
    )
  ) {
    return true;
  }
  return Object.values(DISTRICT_DEFAULT_WARDS).some((wards) =>
    wards.some((w) => normalizeText(cleanAdministrativeUnitName(w)) === norm)
  );
}

interface ParsedGeocodeCandidateAdmin {
  candidate: GeocodeCandidate;
  otherProvince: string | null;
  canonicalWard: string | null;
  wardDisplayLabel: string | null;
  explicitDistrict: string | null;
  isOldWardOnly: boolean;
  hasResolvedHcmcArea: boolean;
}

const RESOLUTION_1685_NUMBERED_OLD_WARD_MAP: Record<string, Record<number, string>> = {
  "Gò Vấp": {
    1: "Hạnh Thông",
    3: "Hạnh Thông",
    4: "Hạnh Thông",
    5: "An Nhơn",
    6: "An Nhơn",
    7: "Hạnh Thông",
    8: "Thông Tây Hội",
    9: "Thông Tây Hội",
    10: "Gò Vấp",
    11: "Thông Tây Hội",
    12: "An Hội Tây",
    13: "An Hội Đông",
    14: "An Hội Tây",
    15: "An Hội Đông",
    16: "An Hội Đông",
    17: "Gò Vấp",
  },
  "Tân Bình": {
    1: "Tân Sơn Hòa",
    2: "Tân Sơn Hòa",
    3: "Tân Sơn Hòa",
    4: "Tân Sơn Nhất",
    5: "Tân Sơn Nhất",
    6: "Tân Hòa",
    7: "Tân Sơn Nhất",
    8: "Tân Hòa",
    9: "Tân Hòa",
    10: "Bảy Hiền",
    11: "Bảy Hiền",
    12: "Bảy Hiền",
    13: "Tân Bình",
    14: "Tân Bình",
    15: "Tân Sơn",
  },
  "Phú Nhuận": {
    1: "Cầu Kiệu",
    2: "Cầu Kiệu",
    3: "Đức Nhuận",
    4: "Đức Nhuận",
    5: "Đức Nhuận",
    7: "Cầu Kiệu",
    8: "Phú Nhuận",
    9: "Đức Nhuận",
    10: "Phú Nhuận",
    11: "Phú Nhuận",
    13: "Phú Nhuận",
    15: "Phú Nhuận",
  },
  "Quận 3": {
    1: "Bàn Cờ",
    2: "Bàn Cờ",
    3: "Bàn Cờ",
    4: "Bàn Cờ",
    5: "Bàn Cờ",
    6: "Xuân Hòa",
    7: "Xuân Hòa",
    8: "Xuân Hòa",
    9: "Nhiêu Lộc",
    10: "Hòa Hưng",
    11: "Nhiêu Lộc",
    12: "Nhiêu Lộc",
    13: "Hòa Hưng",
    14: "Nhiêu Lộc",
  },
  "Quận 10": {
    1: "Vườn Lài",
    2: "Vườn Lài",
    4: "Vườn Lài",
    5: "Diên Hồng",
    6: "Diên Hồng",
    7: "Diên Hồng",
    8: "Diên Hồng",
    9: "Vườn Lài",
    10: "Vườn Lài",
    11: "Diên Hồng",
    12: "Hòa Hưng",
    13: "Hòa Hưng",
    14: "Hòa Hưng",
    15: "Hòa Hưng",
  },
  "Bình Thạnh": {
    1: "Gia Định",
    2: "Gia Định",
    3: "Gia Định",
    5: "Bình Lợi Trung",
    6: "Bình Lợi Trung",
    7: "Bình Lợi Trung",
    11: "Bình Lợi Trung",
    12: "Bình Thạnh",
    13: "Bình Lợi Trung",
    14: "Bình Thạnh",
    15: "Gia Định",
    17: "Gia Định",
    19: "Thạnh Mỹ Tây",
    21: "Thạnh Mỹ Tây",
    22: "Thạnh Mỹ Tây",
    25: "Thạnh Mỹ Tây",
    26: "Bình Thạnh",
    27: "Bình Quới",
    28: "Bình Quới",
  },
  "Quận 5": {
    1: "Chợ Quán",
    2: "Chợ Quán",
    3: "Chợ Quán",
    4: "Chợ Quán",
    5: "An Đông",
    7: "An Đông",
    8: "An Đông",
    9: "An Đông",
    11: "Chợ Lớn",
    12: "Chợ Lớn",
    13: "Chợ Lớn",
    14: "Chợ Lớn",
  },
};

function resolveNumberedOldWardByDistrict(
  rawWard?: string | null,
  canonicalDistrict?: string | null
): string | null {
  if (!rawWard || !canonicalDistrict) return null;
  const distMap = RESOLUTION_1685_NUMBERED_OLD_WARD_MAP[canonicalDistrict];
  if (!distMap) return null;
  const clean = cleanAdministrativeUnitName(rawWard);
  const numMatch = clean.match(/^0*(\d{1,2})$/);
  if (!numMatch) return null;
  const num = parseInt(numMatch[1], 10);
  return distMap[num] || null;
}

function parseGeocodeCandidateAdmin(
  candidate: GeocodeCandidate,
  availableWards: AdministrativeWard[]
): ParsedGeocodeCandidateAdmin {
  const adminFromFormatted = extractAdminSegmentsFromFormatted(
    candidate.formatted_address,
    candidate.street
  );

  const adminText = [
    formatCandidateWardForDetection(candidate.new_ward),
    formatCandidateWardForDetection(candidate.ward),
    formatCandidateWardForDetection(candidate.old_ward),
    formatCandidateDistrictForDetection(candidate.district),
    (candidate.province || "").trim(),
    adminFromFormatted,
  ]
    .filter(Boolean)
    .join(", ");

  const distOrProv = detectExplicitDistrictOrProvince(adminText);
  const provCheck = candidate.province
    ? detectExplicitDistrictOrProvince(candidate.province)
    : null;

  const otherProvince =
    provCheck?.type === "province"
      ? provCheck.rawLabel
      : distOrProv?.type === "province"
        ? distOrProv.rawLabel
        : null;

  let explicitDistrict: string | null = null;
  if (candidate.district) {
    const normCandDist = normalizeDistrictName(
      formatCandidateDistrictForDetection(candidate.district)
    );
    if (
      normCandDist in DISTRICT_DEFAULT_WARDS ||
      normCandDist === "Huyện Củ Chi" ||
      normCandDist === "Huyện Cần Giờ"
    ) {
      explicitDistrict = normCandDist;
    }
  }
  if (!explicitDistrict && distOrProv?.type === "district") {
    explicitDistrict = distOrProv.canonicalName;
  }

  let canonicalWard: string | null = null;
  let wardDisplayLabel: string | null = null;
  let hasDirectPostMergerWard = false;

  // Priority 0: Explicit new_ward from Backend
  const directWardCandidate = candidate.new_ward || candidate.ward;
  if (
    !otherProvince &&
    directWardCandidate &&
    !/^(quận|q\.|huyện|thành\s*phố|tp\.|tỉnh)\b/i.test(directWardCandidate.trim()) &&
    isKnownPostMerger94Ward(directWardCandidate, availableWards)
  ) {
    const directClean = cleanAdministrativeUnitName(directWardCandidate);
    const normDirect = normalizeText(directClean);
    const isOldTanPhuInThuDuc =
      explicitDistrict === "TP. Thủ Đức" && normDirect === "tan phu";
    if (!isOldTanPhuInThuDuc) {
      const matchedObj = availableWards.find(
        (w) => normalizeText(cleanAdministrativeUnitName(w.name)) === normDirect
      );
      const matchedKey =
        matchedObj?.name ||
        Object.values(DISTRICT_DEFAULT_WARDS)
          .flat()
          .find((k) => normalizeText(cleanAdministrativeUnitName(k)) === normDirect) ||
        directClean;
      const mappedDists = (WARD_CANONICAL_DISTRICTS[matchedKey] || []).map(
        normalizeDistrictName
      );
      const isDistCompatible =
        !explicitDistrict ||
        mappedDists.length === 0 ||
        mappedDists.includes(explicitDistrict);
      if (isDistCompatible) {
        canonicalWard = matchedKey;
        wardDisplayLabel = formatWardLabel(matchedKey);
        hasDirectPostMergerWard = true;
      }
    }
  }

  // Priority 1a: Resolution 1685 numbered old ward + district mapping
  if (!canonicalWard && !otherProvince && explicitDistrict) {
    const numberedMapped =
      resolveNumberedOldWardByDistrict(candidate.old_ward, explicitDistrict) ||
      resolveNumberedOldWardByDistrict(candidate.ward, explicitDistrict);
    if (numberedMapped) {
      canonicalWard = numberedMapped;
      wardDisplayLabel = formatWardLabel(numberedMapped);
    }
  }

  // Priority 1b: Match candidate.ward / old_ward against old_ward / old_wards in availableWards (with district check)
  if (!canonicalWard && !otherProvince && (candidate.ward || candidate.old_ward) && availableWards.length > 0) {
    const wardToMatch = candidate.old_ward || candidate.ward || "";
    const targetKey = toOldWardKey(wardToMatch);
    if (targetKey && !/^\d+$/.test(targetKey)) {
      const matchingOldWardInCatalog = availableWards.find((w) => {
        const oldKeys = parseOldWardKeys(w.old_ward || w.old_wards);
        return oldKeys.has(targetKey);
      });
      if (matchingOldWardInCatalog) {
        canonicalWard = cleanAdministrativeUnitName(matchingOldWardInCatalog.name);
        wardDisplayLabel = formatWardLabel(matchingOldWardInCatalog.name);
      }
    }
  }

  // Priority 2: Fallback to analyzing old_ward + district + formatted_address
  if (!canonicalWard && !otherProvince) {
    const detectedWard = detectExplicitWardInText(
      adminText,
      explicitDistrict || undefined,
      availableWards
    );
    if (detectedWard) {
      canonicalWard = detectedWard.targetWard;
      wardDisplayLabel = detectedWard.displayLabel;
    }
  }

  if (!explicitDistrict && canonicalWard) {
    const mapped = WARD_CANONICAL_DISTRICTS[canonicalWard];
    if (mapped && mapped.length > 0) {
      explicitDistrict = normalizeDistrictName(mapped[0]);
    }
  }

  if (!hasDirectPostMergerWard && adminFromFormatted) {
    const wardSegs = adminFromFormatted
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^(phường|p\.\s|xã|thị\s*trấn|tt\.)\b/i.test(s));
    if (wardSegs.some((ws) => isKnownPostMerger94Ward(ws, availableWards))) {
      hasDirectPostMergerWard = true;
    }
  }

  const isOldWardOnly = Boolean(canonicalWard && !hasDirectPostMergerWard);
  const hasResolvedHcmcArea = Boolean(!otherProvince && (canonicalWard || explicitDistrict));

  return {
    candidate,
    otherProvince,
    canonicalWard,
    wardDisplayLabel,
    explicitDistrict,
    isOldWardOnly,
    hasResolvedHcmcArea,
  };
}

/** Chuẩn hoá một mục old_ward ("P.4", "Phường Võ Thị Sáu", "một phần P.4") thành key so khớp. */
function toOldWardKey(raw?: string | null): string {
  if (!raw) return "";
  return normalizeText(
    cleanAdministrativeUnitName(
      raw.replace(/^(?:một|mot)\s+phần?\s+/i, "").replace(/^phần?\s+/i, "")
    )
  );
}

/** Danh sách key old ward của một phường (tách theo dấu phẩy). */
function parseOldWardKeys(raw?: string | null): Set<string> {
  const keys = new Set<string>();
  if (!raw) return keys;
  raw.split(/[,;]/).forEach((part) => {
    const key = toOldWardKey(part);
    if (key) keys.add(key);
  });
  return keys;
}

function resolveWardCatalogEntry(
  wardName: string,
  availableWards: AdministrativeWard[],
  fallbackDistrict?: string | null
): AdministrativeWard {
  const cleanName = cleanAdministrativeUnitName(wardName);
  const norm = normalizeText(cleanName);
  const matched = availableWards.find(
    (w) => normalizeText(cleanAdministrativeUnitName(w.name)) === norm
  );
  if (matched) return matched;
  return {
    id: cleanName,
    name: cleanName,
    district: fallbackDistrict || cleanName,
  };
}

function normalizeStreetForComparison(rawStreet?: string | null): string {
  let norm = normalizeText(rawStreet || "");
  if (!norm) return "";
  norm = norm
    .replace(/^(?:hem|ngo|ngach|kiet|h\.)\s+\d+(?:[\/\-]\d+[a-z]{0,2})*\s+/i, "")
    .replace(/^(?:duong\s+|d\.\s*|pho\s+)/i, "")
    .replace(/\s+/g, " ")
    .trim();
  norm = norm
    .replace(/\bcmt8\b/g, "cach mang thang 8")
    .replace(/\bcach mang thang tam\b/g, "cach mang thang 8")
    .replace(/\ble van si\b/g, "le van sy")
    .replace(/\b3\/2\b/g, "3 thang 2")
    .replace(/\bba thang hai\b/g, "3 thang 2");
  return norm;
}

function extractInputStreetName(rawStreetAddress: string): string {
  const segments = (rawStreetAddress || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return "";

  const stripHousePrefix = (seg: string) =>
    normalizeText(seg)
      .replace(
        /^(?:(?:so\s+nha|so|sn\.?|hem|ngo|ngach|kiet|h\.)\s+)*(?:\d+[a-z]{0,2}(?:[\/\-]\d+[a-z]{0,2})*|lo\s+(?:[a-z]{1,2}\d+[a-z]{0,2}|\d+[a-z]{0,2})(?:[\/\-]\d+[a-z]{0,2})*)(?=[\s,.\-]|$)[\s,.\-]*/i,
        ""
      )
      .trim();

  let streetPart = stripHousePrefix(segments[0]);
  if (!streetPart && segments.length > 1) {
    streetPart = stripHousePrefix(segments[1]);
  }
  if (!streetPart) return "";

  streetPart = streetPart
    .replace(
      /\s+(?:phuong|p\.|xa|thi\s*tran|tt\.|quan|q\.|huyen|tp\.|thanh\s*pho|tinh)(?=\s|\d).*$/i,
      ""
    )
    .replace(/\s+[pq]\d+\b.*$/i, "")
    .trim();

  return normalizeStreetForComparison(streetPart);
}

function candidateMatchesInputStreet(
  cand: GeocodeCandidate,
  normInputStreet: string
): boolean {
  if (!normInputStreet) return true;
  if (cand.street) {
    const normCandStreet = normalizeStreetForComparison(cand.street);
    if (normCandStreet) {
      return normCandStreet === normInputStreet;
    }
  }
  const segments = (cand.formatted_address || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (let i = 0; i < Math.min(segments.length, 2); i++) {
    const stripped = normalizeText(segments[i]).replace(
      /^(?:(?:so\s+nha|so|sn\.?|hem|ngo|ngach|kiet|h\.)\s+)*(?:\d+[a-z]{0,2}(?:[\/\-]\d+[a-z]{0,2})*|lo\s+(?:[a-z]{1,2}\d+[a-z]{0,2}|\d+[a-z]{0,2})(?:[\/\-]\d+[a-z]{0,2})*)(?=[\s,.\-]|$)[\s,.\-]*/i,
      ""
    );
    if (normalizeStreetForComparison(stripped) === normInputStreet) {
      return true;
    }
  }
  return false;
}

/**
 * Evaluate a structured GeocodeVerificationPayload against user's selected Ward / Province
 * according to the 7 strict address & ward verification requirements:
 * - Mục 1: verified_single_ward (1 unique ward verified; if ward not selected -> suggest; if matched -> canOrder = true)
 * - Mục 2: ward_mismatch (1 unique ward verified != selectedWard -> suggest 1-click switch + Hotline + Callback; canOrder = false)
 * - Mục 3: ambiguous_multiple_wards (>1 unique new wards -> Hotline + Callback, NO manual ward selection list; canOrder = false)
 * - Mục 4: missing_house_number | unverifiable | api_error (cannot order; Hotline + Callback for unverifiable/api_error)
 */
export function evaluateGeocodePayload(
  payload: GeocodeVerificationPayload,
  params: ValidateAddressWardParams
): AddressWardValidationResult {
  const {
    streetAddress = "",
    selectedWard = "",
    selectedWardId = "",
    selectedProvince = "TP. Hồ Chí Minh",
    availableWards = [],
  } = params;

  const normProv = normalizeText(selectedProvince);
  const isHcmc =
    !normProv ||
    normProv.includes("ho chi minh") ||
    normProv.includes("hcm") ||
    normProv.includes("sai gon");
  if (!isHcmc) {
    return {
      isValid: true,
      verificationStatus: "verified_single_ward",
      isWardMatched: true,
      canOrder: true,
      requiresCallback: false,
    };
  }

  if (
    payload?.verification_status === "missing_house_number" ||
    (streetAddress.trim().length > 0 && !hasHouseNumberInAddress(streetAddress))
  ) {
    return {
      isValid: false,
      conflictType: "missing_house_number",
      verificationStatus: "missing_house_number",
      verifiedWard: null,
      isWardMatched: false,
      canOrder: false,
      requiresCallback: false,
      message: "Vui lòng nhập đầy đủ số nhà và tên đường để hệ thống xác minh địa chỉ giao hàng.",
      suggestedWard: null,
      suggestedWards: [],
    };
  }

  if (
    !payload ||
    payload.verification_status === "api_error" ||
    payload.provider === "internal" ||
    payload.provider === "none"
  ) {
    return {
      isValid: false,
      conflictType: "api_error",
      verificationStatus: "api_error",
      verifiedWard: null,
      isWardMatched: false,
      canOrder: false,
      requiresCallback: true,
      message:
        'Hệ thống chưa thể xác minh tự động địa chỉ này lúc này. Vui lòng liên hệ Hotline hoặc bấm "Yêu cầu cửa hàng gọi lại" để nhân viên hỗ trợ đặt đơn.',
      suggestedWard: null,
      suggestedWards: [],
    };
  }

  if (
    payload.verification_status === "unverifiable" ||
    !Array.isArray(payload.candidates) ||
    payload.candidates.length === 0 ||
    payload.precision === "unknown" ||
    payload.precision === "street_only"
  ) {
    return {
      isValid: false,
      conflictType: "unverifiable",
      verificationStatus: "unverifiable",
      verifiedWard: null,
      isWardMatched: false,
      canOrder: false,
      requiresCallback: true,
      message:
        'Hệ thống chưa thể xác minh chính xác Phường/Xã cho địa chỉ này. Vui lòng kiểm tra lại số nhà, tên đường hoặc bấm "Yêu cầu cửa hàng gọi lại" để nhân viên hỗ trợ.',
      suggestedWard: null,
      suggestedWards: [],
    };
  }

  const currentWardObj = availableWards.find(
    (w) =>
      (selectedWardId && w.id === selectedWardId) ||
      (selectedWard &&
        normalizeText(cleanAdministrativeUnitName(w.name)) ===
          normalizeText(cleanAdministrativeUnitName(selectedWard)))
  );

  const cleanSelectedWard = cleanAdministrativeUnitName(
    currentWardObj?.name || selectedWard || ""
  );
  const normSelectedWard = normalizeText(cleanSelectedWard);
  const hasWardSelected = Boolean(cleanSelectedWard || selectedWardId);
  const selectedWardDisplay = cleanSelectedWard
    ? formatWardLabel(currentWardObj?.name || selectedWard)
    : "Phường/Xã đang chọn";

  const buildUnverifiableResult = (): AddressWardValidationResult => ({
    isValid: false,
    conflictType: "unverifiable",
    verificationStatus: "unverifiable",
    verifiedWard: null,
    isWardMatched: false,
    canOrder: false,
    requiresCallback: true,
    message:
      'Hệ thống chưa thể xác minh chính xác Phường/Xã cho địa chỉ này. Vui lòng kiểm tra lại số nhà, tên đường hoặc bấm "Yêu cầu cửa hàng gọi lại" để nhân viên hỗ trợ.',
    suggestedWard: null,
    suggestedWards: [],
  });

  const candidatesWithDistances = attachHaversineDistances(payload.candidates);
  const parsedCandidates = candidatesWithDistances.map((cand) =>
    parseGeocodeCandidateAdmin(cand, availableWards)
  );

  const inputHouseNumber = extractLeadingHouseNumber(streetAddress);
  const normInputHouse = inputHouseNumber ? normalizeText(inputHouseNumber) : "";

  const candidatesMatchingHouse = parsedCandidates.filter((p) => {
    if (!normInputHouse) return true;
    if (!p.candidate.house_number) return false;
    const candHouse = normalizeText(String(p.candidate.house_number));
    const extractedCandHouse = extractLeadingHouseNumber(
      String(p.candidate.house_number)
    );
    return (
      candHouse === normInputHouse ||
      (extractedCandHouse !== null &&
        normalizeText(extractedCandHouse) === normInputHouse)
    );
  });

  if (normInputHouse && candidatesMatchingHouse.length === 0) {
    return buildUnverifiableResult();
  }

  const normInputStreet = extractInputStreetName(streetAddress);
  const candidatesMatchingStreet = candidatesMatchingHouse.filter((p) =>
    candidateMatchesInputStreet(p.candidate, normInputStreet)
  );

  if (normInputStreet && candidatesMatchingStreet.length === 0) {
    return buildUnverifiableResult();
  }

  const explicitInputArea = detectExplicitDistrictOrProvince(streetAddress);
  const activeCandidates = candidatesMatchingStreet.filter((p) => {
    if (!explicitInputArea) return true;
    if (explicitInputArea.type === "province") {
      return false;
    }
    if (explicitInputArea.type === "district" && p.explicitDistrict) {
      return p.explicitDistrict === explicitInputArea.canonicalName;
    }
    return true;
  });

  // Check if all candidates belong to another province outside HCMC
  const hcmcCandidates = activeCandidates.filter((p) => p.hasResolvedHcmcArea);
  if (hcmcCandidates.length === 0) {
    return buildUnverifiableResult();
  }

  const didFilterCandidates = hcmcCandidates.length < parsedCandidates.length;
  const uniqueWardMap = new Map<string, { name: string; district: string | null }>();

  if (
    !didFilterCandidates &&
    Array.isArray(payload.unique_wards) &&
    payload.unique_wards.length > 0
  ) {
    for (const uw of payload.unique_wards) {
      const cleanUw = cleanAdministrativeUnitName(uw);
      const normUw = normalizeText(cleanUw);
      if (normUw && !uniqueWardMap.has(normUw)) {
        uniqueWardMap.set(normUw, {
          name: cleanUw,
          district: hcmcCandidates[0]?.explicitDistrict || null,
        });
      }
    }
  } else {
    for (const p of hcmcCandidates) {
      let resolvedName = p.canonicalWard;
      if (!resolvedName && p.explicitDistrict) {
        const fallbackFromCatalog = findMatchingWardsFromCatalog(
          availableWards,
          [],
          [p.explicitDistrict]
        )[0];
        resolvedName =
          fallbackFromCatalog?.name ||
          DISTRICT_DEFAULT_WARDS[p.explicitDistrict]?.[0] ||
          null;
      }
      if (resolvedName) {
        const cleanW = cleanAdministrativeUnitName(resolvedName);
        const normW = normalizeText(cleanW);
        if (normW && !uniqueWardMap.has(normW)) {
          uniqueWardMap.set(normW, {
            name: cleanW,
            district: p.explicitDistrict,
          });
        }
      }
    }
  }

  const uniqueWardsList = Array.from(uniqueWardMap.values());

  if (uniqueWardsList.length === 0) {
    return buildUnverifiableResult();
  }

  // Mục 3: Nhiều phường mới khác nhau -> Cho phép khách chọn 1 trong các phường được API gợi ý để đặt hàng;
  // Nếu khách chọn phường nằm ngoài danh sách API gợi ý -> Chặn đặt hàng, hiển thị Hotline hoặc Yêu cầu gọi lại
  if (uniqueWardsList.length > 1) {
    const matchedWardObjs: AdministrativeWard[] = [];
    const seenWardKeys = new Set<string>();
    for (const uw of uniqueWardsList) {
      const entry = resolveWardCatalogEntry(uw.name, availableWards, uw.district);
      const key = normalizeText(cleanAdministrativeUnitName(entry.name));
      if (key && !seenWardKeys.has(key)) {
        seenWardKeys.add(key);
        matchedWardObjs.push(entry);
      }
    }

    const areaLabels = matchedWardObjs.map((w) => formatWardLabel(w.name)).join(", ");
    const matchedSelectedWardObj = hasWardSelected
      ? matchedWardObjs.find(
          (w) => normalizeText(cleanAdministrativeUnitName(w.name)) === normSelectedWard
        ) || null
      : null;

    if (matchedSelectedWardObj) {
      const matchedLabel = formatWardLabel(matchedSelectedWardObj.name);
      return {
        isValid: true,
        verificationStatus: "verified_single_ward",
        verifiedWard: matchedSelectedWardObj.name,
        isWardMatched: true,
        canOrder: true,
        requiresCallback: false,
        detectedArea: matchedLabel,
        suggestedWard: matchedSelectedWardObj,
        suggestedWards: matchedWardObjs,
      };
    }

    if (!hasWardSelected) {
      return {
        isValid: true,
        verificationStatus: "verified_single_ward",
        verifiedWard: null,
        isWardMatched: false,
        canOrder: false,
        requiresCallback: false,
        detectedArea: areaLabels,
        suggestedWard: matchedWardObjs[0] || null,
        suggestedWards: matchedWardObjs,
      };
    }

    return {
      isValid: false,
      conflictType: "ward_conflict",
      verificationStatus: "ward_mismatch",
      verifiedWard: null,
      isWardMatched: false,
      canOrder: false,
      requiresCallback: true,
      detectedArea: areaLabels,
      message: `Địa chỉ thuộc khu vực ${areaLabels}, không khớp với ${selectedWardDisplay} bạn đang chọn. Vui lòng chọn một trong các phường được gợi ý bên dưới, liên hệ Hotline hoặc yêu cầu quán gọi lại.`,
      suggestedWard: matchedWardObjs[0] || null,
      suggestedWards: matchedWardObjs,
    };
  }

  // Mục 1 & Mục 2: Xác minh được duy nhất 1 phường mới
  const singleVerified = uniqueWardsList[0];
  const matchedWardObj = resolveWardCatalogEntry(
    (!didFilterCandidates && payload.verified_ward) || singleVerified.name,
    availableWards,
    singleVerified.district
  );
  const normVerifiedWard = normalizeText(cleanAdministrativeUnitName(matchedWardObj.name));
  const areaLabel = formatWardLabel(matchedWardObj.name);

  if (!hasWardSelected) {
    // Mục 1a: Khách chưa chọn phường -> hiển thị gợi ý 1 phường duy nhất
    return {
      isValid: true,
      verificationStatus: "verified_single_ward",
      verifiedWard: matchedWardObj.name,
      isWardMatched: false,
      canOrder: false,
      requiresCallback: false,
      detectedArea: areaLabel,
      suggestedWard: matchedWardObj,
      suggestedWards: [matchedWardObj],
    };
  }

  const isMatched = normVerifiedWard === normSelectedWard;
  if (isMatched) {
    // Mục 1b: Khách đã chọn đúng phường xác minh -> cho phép đặt hàng
    return {
      isValid: true,
      verificationStatus: "verified_single_ward",
      verifiedWard: matchedWardObj.name,
      isWardMatched: true,
      canOrder: true,
      requiresCallback: false,
      detectedArea: areaLabel,
      suggestedWard: matchedWardObj,
      suggestedWards: [matchedWardObj],
    };
  }

  // Mục 2: Khách chọn sai phường -> cảnh báo + nút đổi sang phường gợi ý + Hotline + Yêu cầu gọi lại, khóa đặt hàng
  return {
    isValid: false,
    conflictType: "ward_conflict",
    verificationStatus: "ward_mismatch",
    verifiedWard: matchedWardObj.name,
    isWardMatched: false,
    canOrder: false,
    requiresCallback: true,
    detectedArea: areaLabel,
    message: `Địa chỉ giao hàng thuộc ${areaLabel}, không khớp với ${selectedWardDisplay} bạn đang chọn. Vui lòng đổi sang ${areaLabel} hoặc yêu cầu cửa hàng gọi lại hỗ trợ. Gợi ý: ${areaLabel}.`,
    suggestedWard: matchedWardObj,
    suggestedWards: [matchedWardObj],
  };
}

/**
 * Asynchronous TrackAsia Address Verification via Backend Proxy:
 * - Requires house number in address (returns missing_house_number if missing).
 * - Calls POST ${API_BASE}/shipping/verify-address.
 * - Caches valid TrackAsia responses by normalized "rawStreet|province|selectedWard".
 * - Never caches API errors (provider === "internal" / verification_status === "api_error" / network error).
 */
export async function verifyAddressViaMapApi(
  params: ValidateAddressWardParams & { timeoutMs?: number }
): Promise<AddressWardValidationResult> {
  const rawStreet = (params.streetAddress || "").trim();
  const hasLeadingHouseNumber = hasHouseNumberInAddress(rawStreet);

  if (!rawStreet || rawStreet.length < 4 || !hasLeadingHouseNumber) {
    return {
      isValid: false,
      conflictType: "missing_house_number",
      verificationStatus: "missing_house_number",
      verifiedWard: null,
      isWardMatched: false,
      canOrder: false,
      requiresCallback: false,
      message: "Vui lòng nhập đầy đủ số nhà và tên đường để hệ thống xác minh địa chỉ giao hàng.",
      suggestedWard: null,
      suggestedWards: [],
    };
  }

  const provinceName = params.selectedProvince || "TP. Hồ Chí Minh";
  const normProv = normalizeText(provinceName);
  const isHcmc =
    !normProv ||
    normProv.includes("ho chi minh") ||
    normProv.includes("hcm") ||
    normProv.includes("sai gon");
  if (!isHcmc) {
    return {
      isValid: true,
      verificationStatus: "verified_single_ward",
      isWardMatched: true,
      canOrder: true,
      requiresCallback: false,
    };
  }

  const hasWardSelected = Boolean((params.selectedWard || "").trim() || params.selectedWardId);
  const cacheKey = normalizeText(`${rawStreet}|${provinceName}|${params.selectedWard || ""}`);
  const streetOnlyCacheKey = normalizeText(`${rawStreet}|${provinceName}`);
  let payload = mapLookupCache.get(cacheKey);
  if (payload === undefined) {
    const streetCached = mapLookupCache.get(streetOnlyCacheKey);
    if (
      streetCached &&
      streetCached.provider === "trackasia" &&
      streetCached.verification_status !== "api_error"
    ) {
      const cachedStatus = evaluateGeocodePayload(streetCached, params).verificationStatus;
      if (
        !hasWardSelected ||
        cachedStatus === "verified_single_ward" ||
        cachedStatus === "ward_mismatch" ||
        cachedStatus === "ambiguous_multiple_wards"
      ) {
        payload = streetCached;
      }
    }
  }

  if (payload === undefined) {
    const timeoutMs = params.timeoutMs ?? 3000;
    const apiBase = getApiBaseUrl();

    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      const res = await fetch(`${apiBase}/shipping/verify-address`, {
        method: "POST",
        signal: controller?.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          address: rawStreet,
          province: provinceName,
          ward: params.selectedWard || undefined,
          ward_id: params.selectedWardId || undefined,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const data = json?.data;
        if (data && typeof data === "object") {
          const provider = (data.provider as GeocodeProvider) || "none";
          const candidates = Array.isArray(data.candidates)
            ? attachHaversineDistances(data.candidates)
            : [];
          const verificationStatus = data.verification_status as
            | AddressVerificationStatus
            | undefined;

          payload = {
            provider,
            cached: Boolean(data.cached),
            precision: (data.precision as GeocodePrecision) || "unknown",
            candidates,
            verification_status: verificationStatus,
            can_order: data.can_order,
            is_ward_matched: data.is_ward_matched,
            verified_ward: data.verified_ward ?? null,
            suggested_ward: data.suggested_ward ?? null,
            unique_wards: Array.isArray(data.unique_wards)
              ? data.unique_wards
              : undefined,
          };

          if (provider === "trackasia" && verificationStatus !== "api_error") {
            mapLookupCache.set(cacheKey, payload);
            mapLookupCache.set(streetOnlyCacheKey, payload);
          }
        }
      } else {
        console.warn(`[verifyAddressViaMapApi] HTTP ${res.status} when verifying "${rawStreet}"`);
      }
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        console.warn("[verifyAddressViaMapApi] Request failed:", err);
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  if (payload) {
    return evaluateGeocodePayload(payload, params);
  }

  return {
    isValid: false,
    conflictType: "api_error",
    verificationStatus: "api_error",
    verifiedWard: null,
    isWardMatched: false,
    canOrder: false,
    requiresCallback: true,
    message:
      'Hệ thống chưa thể xác minh tự động địa chỉ này lúc này. Vui lòng liên hệ Hotline hoặc bấm "Yêu cầu cửa hàng gọi lại" để nhân viên hỗ trợ đặt đơn.',
    suggestedWard: null,
    suggestedWards: [],
  };
}
