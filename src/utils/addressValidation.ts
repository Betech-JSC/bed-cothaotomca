import type { AdministrativeWard } from "@/services/orderService";
import {
  cleanAdministrativeUnitName,
  formatWardLabel,
  HCMC_WARD_OLD_NAME_MAP,
  resolveNewWardName,
} from "@/data/wardMapping";

export type AddressWardConflictType =
  | "district_conflict"
  | "ward_conflict"
  | "street_conflict"
  | "province_conflict";

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
  "Xuân Hòa": ["Quận 1", "Quận 3"],
  "Diên Hồng": ["Quận 1", "Quận 10"],

  // Quận 3
  "Bàn Cờ": ["Quận 3"],
  "Nhiêu Lộc": ["Quận 3"],
  "Hòa Hưng": ["Quận 3", "Quận 10"],

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
  "Phú Định": ["Quận 6", "Quận 8"],

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
  "Vườn Lài": ["Tân Phú", "Quận 10"],
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
  "Hiệp Bình": ["Gò Vấp", "TP. Thủ Đức"],

  // Bình Thạnh
  "Gia Định": ["Bình Thạnh"],
  "Cầu Kiệu": ["Bình Thạnh", "Phú Nhuận"],
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

interface WardAliasEntry {
  keywords: string[];
  requirePrefix?: boolean;
  targetWard: string;
  targetDistrict: string;
  displayLabel: string;
}

/**
 * Specific Ward / Old Ward alias dictionary for unambiguous ward-level detection
 */
const SPECIFIC_WARD_ALIASES: WardAliasEntry[] = [
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

  // Quận 3
  { keywords: ["ban co"], requirePrefix: true, targetWard: "Bàn Cờ", targetDistrict: "Quận 3", displayLabel: "Phường Bàn Cờ" },
  { keywords: ["nhieu loc"], requirePrefix: true, targetWard: "Nhiêu Lộc", targetDistrict: "Quận 3", displayLabel: "Phường Nhiêu Lộc" },
  { keywords: ["hoa hung"], requirePrefix: true, targetWard: "Hòa Hưng", targetDistrict: "Quận 3", displayLabel: "Phường Hòa Hưng" },
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
  { keywords: ["cau kieu"], targetWard: "Cầu Kiệu", targetDistrict: "Bình Thạnh", displayLabel: "Phường Cầu Kiệu" },
  { keywords: ["binh loi trung"], targetWard: "Bình Lợi Trung", targetDistrict: "Bình Thạnh", displayLabel: "Phường Bình Lợi Trung" },
  { keywords: ["thanh my tay"], targetWard: "Thạnh Mỹ Tây", targetDistrict: "Bình Thạnh", displayLabel: "Phường Thạnh Mỹ Tây" },
  { keywords: ["binh thanh"], requirePrefix: true, targetWard: "Bình Thạnh", targetDistrict: "Bình Thạnh", displayLabel: "Phường Bình Thạnh" },
  { keywords: ["phu nhuan"], requirePrefix: true, targetWard: "Phú Nhuận", targetDistrict: "Phú Nhuận", displayLabel: "Phường Phú Nhuận" },
  { keywords: ["duc nhuan"], requirePrefix: true, targetWard: "Đức Nhuận", targetDistrict: "Phú Nhuận", displayLabel: "Phường Đức Nhuận" },

  // Tân Bình
  { keywords: ["tan son nhat"], requirePrefix: true, targetWard: "Tân Sơn Nhất", targetDistrict: "Tân Bình", displayLabel: "Phường Tân Sơn Nhất" },
  { keywords: ["tan son hoa"], targetWard: "Tân Sơn Hòa", targetDistrict: "Tân Bình", displayLabel: "Phường Tân Sơn Hòa" },
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
    preferredWards: ["Thủ Đức", "Linh Xuân", "Hiệp Bình"],
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
    districts: ["Gò Vấp", "Huyện Hóc Môn", "TP. Thủ Đức"],
    preferredWards: ["Gò Vấp", "An Hội Tây", "Hạnh Thông", "Thông Tây Hội", "An Hội Đông"],
  },
  {
    displayName: "Phan Văn Trị",
    keywords: ["phan van tri"],
    districts: ["Gò Vấp", "Bình Thạnh"],
    preferredWards: ["Gò Vấp", "Hạnh Thông", "An Hội Tây", "Bình Lợi Trung", "Gia Định"],
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
    preferredWards: ["Cầu Kiệu", "Phú Nhuận", "Gia Định"],
  },
  {
    displayName: "Huỳnh Văn Bánh",
    keywords: ["huynh van banh"],
    districts: ["Phú Nhuận", "Quận 3"],
    preferredWards: ["Phú Nhuận", "Đức Nhuận", "Cầu Kiệu"],
  },
  {
    displayName: "Nguyễn Trọng Tuyển",
    keywords: ["nguyen trong tuyen"],
    districts: ["Phú Nhuận", "Tân Bình"],
    preferredWards: ["Phú Nhuận", "Đức Nhuận", "Tân Sơn Hòa"],
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
    districts: ["Phú Nhuận", "Tân Bình"],
    preferredWards: ["Phú Nhuận", "Đức Nhuận", "Tân Sơn Hòa", "Tân Sơn Nhất"],
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
    districts: ["Quận 7", "Huyện Bình Chánh"],
    preferredWards: ["Tân Hưng", "Tân Mỹ", "Phú Thuận", "Bình Hưng"],
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
    districts: ["Tân Bình"],
    preferredWards: ["Tân Bình", "Tân Sơn Nhất", "Bảy Hiền", "Tân Sơn Hòa"],
  },
  {
    displayName: "Út Tịch",
    keywords: ["ut tich"],
    districts: ["Tân Bình"],
    preferredWards: ["Tân Sơn Nhất", "Tân Sơn Hòa", "Tân Bình"],
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
    districts: ["Tân Phú"],
    preferredWards: ["Phú Thạnh", "Tân Phú", "Vườn Lài", "Tân Sơn Nhì"],
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
    districts: ["Bình Tân"],
    preferredWards: ["Bình Trị Đông", "Bình Tân"],
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
    districts: ["Quận 10", "Quận 3", "Tân Phú"],
    preferredWards: ["Hòa Hưng", "Vườn Lài", "Bàn Cờ"],
  },
  {
    displayName: "Cách Mạng Tháng 8",
    keywords: ["cach mang thang 8", "cach mang thang tam", "cmt8"],
    districts: ["Quận 1", "Quận 3", "Quận 10", "Tân Bình"],
    preferredWards: ["Xuân Hòa", "Bàn Cờ", "Nhiêu Lộc", "Hòa Hưng", "Bảy Hiền", "Bến Thành"],
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

  // 1b. Match by old_ward or HCMC_WARD_OLD_NAME_MAP containing candidate ward name
  for (const candName of candidateWardNames) {
    const normCand = normalizeText(cleanAdministrativeUnitName(candName));
    if (!normCand) continue;
    for (const w of availableWards) {
      const cleanW = cleanAdministrativeUnitName(w.name);
      const oldWardStr = w.old_ward || HCMC_WARD_OLD_NAME_MAP[w.name] || HCMC_WARD_OLD_NAME_MAP[cleanW] || "";
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

  // 2. Directly scan all availableWards (the 94 post-merger wards) when explicitly prefixed with Phường / P. / Xã
  if (availableWards && availableWards.length > 0) {
    const sortedWards = [...availableWards].sort(
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

  // 3. Check numbered old wards (e.g. "Phường 14, Gò Vấp" or "P.14, Quận 3") when district context is known
  const numWardMatch = norm.match(/(?:^|[\s,.\-/(])(?:phuong|p\.?)\s*0?(\d{1,2})(?=$|[\s,.\-/)])/);
  if (numWardMatch && explicitDistrictCanon) {
    const wardToken = `P.${parseInt(numWardMatch[1], 10)}`;
    const resolved = resolveNewWardName(wardToken, explicitDistrictCanon, text);
    if (resolved) {
      return {
        targetWard: resolved,
        targetDistrict: explicitDistrictCanon,
        displayLabel: `Phường ${resolved}`,
      };
    }
  }

  return null;
}

/**
 * Detect street or landmark from HCMC_STREET_DIRECTORY
 */
function detectStreetInText(text: string): StreetDirectoryEntry | null {
  const norm = normalizeText(text);
  if (!norm) return null;

  for (const entry of HCMC_STREET_DIRECTORY) {
    for (const kw of entry.keywords) {
      const regex = new RegExp(`(?:^|[\\s,./\\-(])${kw}(?=$|[\\s,./\\-)])`, "i");
      if (regex.test(norm)) {
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
    return {
      isValid: true,
      detectedArea:
        explicitWard?.displayLabel ||
        (suggestions[0] ? formatWardLabel(suggestions[0].name) : undefined),
      suggestedWard: suggestions[0] || null,
      suggestedWards: suggestions,
    };
  }

  // 1. Check Province Conflict (e.g. typing Bình Dương / Đồng Nai while selecting TP. Hồ Chí Minh)
  if (explicitDistOrProv && explicitDistOrProv.type === "province") {
    return {
      isValid: false,
      conflictType: "province_conflict",
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
      const isKnownPostMergerWard = Boolean(HCMC_WARD_OLD_NAME_MAP[explicitWard.targetWard]);
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
          detectedArea: areaLabel,
          message: `Địa chỉ bạn nhập thuộc khu vực ${areaLabel}, không khớp với ${selectedWardDisplay} đang chọn. Vui lòng đổi về đúng Phường/Xã để tính chính xác phí vận chuyển.${suggestionHint}`,
          suggestedWard: suggestions[0] || null,
          suggestedWards: suggestions,
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
        detectedArea: areaLabel,
        message: `Địa chỉ bạn nhập thuộc khu vực ${areaLabel}, không khớp với ${selectedWardDisplay} đang chọn. Vui lòng đổi về đúng Phường/Xã để tính chính xác phí vận chuyển.${suggestionHint}`,
        suggestedWard: suggestions[0] || null,
        suggestedWards: suggestions,
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
        detectedArea: areaLabel,
        message: `Địa chỉ bạn nhập (Đường ${matchedStreet.displayName}) thuộc khu vực ${areaLabel}, không khớp với ${selectedWardDisplay} đang chọn. Vui lòng đổi về đúng Phường/Xã để tính chính xác phí vận chuyển.${suggestionHint}`,
        suggestedWard: suggestions[0] || null,
        suggestedWards: suggestions,
      };
    }
  }

  return { isValid: true };
}

// In-memory cache for Map Geocoding API lookups
const mapLookupCache = new Map<string, string>();

/**
 * Asynchronous Map Geocoding / Autocomplete Check (Goong API with OpenStreetMap Nominatim fallback).
 * Enriches the streetAddress with geocoded suburb/district details and runs validateAddressWardMatch.
 */
export async function verifyAddressViaMapApi(
  params: ValidateAddressWardParams & { timeoutMs?: number }
): Promise<AddressWardValidationResult> {
  // 1. Run synchronous validation first
  const syncResult = validateAddressWardMatch(params);
  if (!syncResult.isValid || syncResult.suggestedWard) {
    return syncResult;
  }

  const rawStreet = (params.streetAddress || "").trim();
  if (rawStreet.length < 5) {
    return syncResult;
  }

  const cacheKey = normalizeText(`${rawStreet}|${params.selectedProvince || "HCM"}`);
  let geocodedText = mapLookupCache.get(cacheKey);

  if (geocodedText === undefined) {
    const timeoutMs = params.timeoutMs ?? 2500;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const goongKey =
        typeof process !== "undefined" ? process.env.NEXT_PUBLIC_GOONG_API_KEY : undefined;
      const query = `${rawStreet}, ${params.selectedProvince || "TP. Hồ Chí Minh"}`;

      if (goongKey) {
        const url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${encodeURIComponent(
          goongKey
        )}&input=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
          signal: controller?.signal,
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          const firstDesc = data?.predictions?.[0]?.description || "";
          geocodedText = firstDesc;
          mapLookupCache.set(cacheKey, geocodedText || "");
        }
      } else {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=vn&limit=1&q=${encodeURIComponent(
          query
        )}`;
        const res = await fetch(url, {
          signal: controller?.signal,
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const item = data[0];
            const addr = item.address || {};
            const parts = [
              item.display_name,
              addr.suburb,
              addr.quarter,
              addr.city_district,
              addr.county,
              addr.town,
            ].filter(Boolean);
            geocodedText = parts.join(", ");
            mapLookupCache.set(cacheKey, geocodedText);
          } else {
            mapLookupCache.set(cacheKey, "");
          }
        }
      }
    } catch {
      // Network error or timeout: fail open gracefully without blocking user
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  if (geocodedText) {
    return validateAddressWardMatch({
      ...params,
      streetAddress: `${rawStreet}, ${geocodedText}`,
    });
  }

  return syncResult;
}
