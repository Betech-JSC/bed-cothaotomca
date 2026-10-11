export interface BranchLike {
  id?: number | string;
  code?: string;
  branchName?: string;
  name?: string;
  title?: string;
  address?: string;
  name_en?: string;
  address_en?: string;
  [key: string]: any;
}

export interface BrandBranchProfile {
  id: number;
  kiotvietId?: number;
  code: string;
  nameVi: string;
  addressVi: string;
  nameEn: string;
  addressEn: string;
  keywords: string[];
}

export const BRAND_BRANCHES: BrandBranchProfile[] = [
  {
    id: 1,
    kiotvietId: 1333367,
    code: "TDX",
    nameVi: "Chi nhánh Trần Đình Xu (Q.1)",
    addressVi: "42/2 Trần Đình Xu, Phường Cầu Ông Lãnh (Q.1 cũ), TP. Hồ Chí Minh",
    nameEn: "Tran Dinh Xu Branch (Dist. 1)",
    addressEn: "42/2 Tran Dinh Xu Street, Co Giang Ward, District 1",
    keywords: ["trần đình xu", "tran dinh xu", "cầu ông lãnh", "cau ong lanh"],
  },
  {
    id: 2, // CN 5 in brand order
    kiotvietId: 1000021173,
    code: "TB",
    nameVi: "Chi nhánh Tân Bình",
    addressVi: "39 Thân Nhân Trung, Phường 13, Quận Tân Bình, TP. Hồ Chí Minh",
    nameEn: "Tan Binh Branch",
    addressEn: "39 Than Nhan Trung Street, Ward 13, Tan Binh District",
    keywords: ["tân bình", "tan binh", "thân nhân trung", "than nhan trung"],
  },
  {
    id: 3,
    kiotvietId: 1363270,
    code: "TD",
    nameVi: "Chi nhánh TP. Thủ Đức",
    addressVi: "69A Trương Văn Thành, Phường Tăng Nhơn Phú, TP. Thủ Đức",
    nameEn: "Thu Duc Branch",
    addressEn: "69A Truong Van Thanh Street, Hiep Phu Ward, Thu Duc City",
    keywords: ["thủ đức", "thu duc", "trương văn thành", "truong van thanh", "tăng nhơn phú"],
  },
  {
    id: 4,
    kiotvietId: 1000000211,
    code: "HS",
    nameVi: "Chi nhánh Hoàng Sa (Q.1)",
    addressVi: "197 Hoàng Sa, Phường Tân Định (Q.1 cũ), TP. Hồ Chí Minh",
    nameEn: "Hoang Sa Branch (Dist. 1)",
    addressEn: "197 Hoang Sa Street, Tan Dinh Ward, District 1",
    keywords: ["hoàng sa", "hoang sa", "tân định", "tan dinh"],
  },
  {
    id: 5,
    kiotvietId: 1000021387,
    code: "GV",
    nameVi: "Chi nhánh Gò Vấp",
    addressVi: "1073 Phan Văn Trị, Phường Gò Vấp, TP. Hồ Chí Minh",
    nameEn: "Go Vap Branch",
    addressEn: "1073 Phan Van Tri, Go Vap District",
    keywords: ["gò vấp", "go vap", "phan văn trị", "phan van tri"],
  },
];

/**
 * Identify whether a given branch object matches one of the 5 brand branches.
 */
export function identifyBrandBranch(branch?: BranchLike | null): BrandBranchProfile | undefined {
  if (!branch) return undefined;

  const idNum = Number(branch.id);
  const code = (branch.code || "").toUpperCase();

  // 1. Direct match by KiotViet ID
  if (idNum) {
    const byKiotvietId = BRAND_BRANCHES.find((b) => b.kiotvietId === idNum);
    if (byKiotvietId) return byKiotvietId;
  }

  // 2. Direct match by code
  if (code) {
    const byCode = BRAND_BRANCHES.find((b) => b.code === code);
    if (byCode) return byCode;
  }

  // 3. Match by keywords in name, title, address
  const textCorpus = [
    branch.branchName,
    branch.title,
    branch.name,
    branch.address,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const b of BRAND_BRANCHES) {
    if (b.keywords.some((kw) => textCorpus.includes(kw))) {
      return b;
    }
  }

  return undefined;
}

/**
 * Formats standard branch display name for select dropdowns.
 * Eliminates artificial index numbers (index + 1).
 * Supports bilingual display for English and Vietnamese.
 */
export function formatBranchDisplayName(branch?: BranchLike | null, locale: string = "vi"): string {
  if (!branch) return "";

  const isEn = (locale || "vi").toLowerCase().startsWith("en");
  const matched = identifyBrandBranch(branch);

  if (matched) {
    if (isEn) {
      return `${matched.nameEn} - ${matched.addressEn}`;
    }
    const addr = branch.address || matched.addressVi;
    if (matched.nameVi.includes(addr)) {
      return matched.nameVi;
    }
    return `${matched.nameVi} - ${addr}`;
  }

  // Non-brand / custom fallback branches
  if (isEn) {
    if (branch.name_en) {
      const addr = branch.address_en || branch.address;
      return addr ? `${branch.name_en} - ${addr}` : branch.name_en;
    }
    const raw = branch.branchName || branch.title || branch.name || (branch.address ? branch.address : `Branch #${branch.id}`);
    const clean = raw.replace(/^Chi\s*nhánh/i, "Branch").trim();
    if (branch.address && !clean.includes(branch.address)) {
      return `${clean} - ${branch.address}`;
    }
    return clean;
  }

  // Vietnamese fallback
  const raw = branch.branchName || branch.title || branch.name || (branch.address ? branch.address : `Chi nhánh #${branch.id}`);
  if (branch.address && !raw.includes(branch.address)) {
    return `${raw} - ${branch.address}`;
  }
  return raw;
}
