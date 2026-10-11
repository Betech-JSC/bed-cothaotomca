import { describe, it, expect } from "vitest";
import {
  formatBranchDisplayName,
  identifyBrandBranch,
  BRAND_BRANCHES,
} from "@/lib/branchHelper";

describe("BranchHelper - formatBranchDisplayName (STT 9)", () => {
  describe("1. Identification of 5 Brand Branches", () => {
    it("identifies Tran Dinh Xu branch by KiotViet ID or keyword", () => {
      const b1 = { id: 1333367, branchName: "Chi nhánh Trần Đình Xu (Q.1)" };
      const matched = identifyBrandBranch(b1);
      expect(matched?.code).toBe("TDX");
      expect(matched?.nameEn).toBe("Tran Dinh Xu Branch (Dist. 1)");
    });

    it("identifies Tan Binh branch by KiotViet ID or address keyword", () => {
      const b2 = { id: 1000021173, branchName: "Chi nhánh Tân Bình" };
      const matched = identifyBrandBranch(b2);
      expect(matched?.code).toBe("TB");
      expect(matched?.nameEn).toBe("Tan Binh Branch");

      const bFallback = { id: 2, title: "Chi nhánh 2", address: "39 Thân Nhân Trung, Phường 13, Quận Tân Bình, TP. Hồ Chí Minh" };
      const matchedFallback = identifyBrandBranch(bFallback);
      expect(matchedFallback?.code).toBe("TB");
    });

    it("identifies Thu Duc branch", () => {
      const b3 = { id: 1363270, branchName: "Chi nhánh TP. Thủ Đức" };
      const matched = identifyBrandBranch(b3);
      expect(matched?.code).toBe("TD");
      expect(matched?.nameEn).toBe("Thu Duc Branch");
    });

    it("identifies Hoang Sa branch", () => {
      const b4 = { id: 1000000211, branchName: "Chi nhánh Hoàng Sa (Q.1)" };
      const matched = identifyBrandBranch(b4);
      expect(matched?.code).toBe("HS");
      expect(matched?.nameEn).toBe("Hoang Sa Branch (Dist. 1)");
    });

    it("identifies Go Vap branch", () => {
      const b5 = { id: 1000021387, branchName: "Chi nhánh Gò Vấp" };
      const matched = identifyBrandBranch(b5);
      expect(matched?.code).toBe("GV");
      expect(matched?.nameEn).toBe("Go Vap Branch");
    });
  });

  describe("2. Elimination of Artificial 'index + 1' Labeling", () => {
    it("never prefixes Tan Binh branch with artificial index like 'Chi nhánh 2'", () => {
      // Regardless of array index, Tan Binh should never become 'Chi nhánh 2'
      const tanBinhBranch = {
        id: 1000021173,
        branchName: "Chi nhánh Tân Bình",
        address: "39 Thân Nhân Trung, Phường 13, Quận Tân Bình, TP. Hồ Chí Minh",
      };

      const resultVi = formatBranchDisplayName(tanBinhBranch, "vi");
      expect(resultVi).toContain("Chi nhánh Tân Bình");
      expect(resultVi).not.toContain("Chi nhánh 2");
      expect(resultVi).toContain("39 Thân Nhân Trung");
    });
  });

  describe("3. English Localization for 5 Brand Branches", () => {
    it("renders official English name and address for Tran Dinh Xu Branch", () => {
      const branch = { id: 1333367, branchName: "Chi nhánh Trần Đình Xu (Q.1)" };
      expect(formatBranchDisplayName(branch, "en")).toBe(
        "Tran Dinh Xu Branch (Dist. 1) - 42/2 Tran Dinh Xu Street, Co Giang Ward, District 1"
      );
    });

    it("renders official English name and address for Tan Binh Branch", () => {
      const branch = { id: 1000021173, branchName: "Chi nhánh Tân Bình" };
      expect(formatBranchDisplayName(branch, "en")).toBe(
        "Tan Binh Branch - 39 Than Nhan Trung Street, Ward 13, Tan Binh District"
      );
    });

    it("renders official English name and address for Thu Duc Branch", () => {
      const branch = { id: 1363270, branchName: "Chi nhánh TP. Thủ Đức" };
      expect(formatBranchDisplayName(branch, "en")).toBe(
        "Thu Duc Branch - 69A Truong Van Thanh Street, Hiep Phu Ward, Thu Duc City"
      );
    });

    it("renders official English name and address for Hoang Sa Branch", () => {
      const branch = { id: 1000000211, branchName: "Chi nhánh Hoàng Sa (Q.1)" };
      expect(formatBranchDisplayName(branch, "en")).toBe(
        "Hoang Sa Branch (Dist. 1) - 197 Hoang Sa Street, Tan Dinh Ward, District 1"
      );
    });

    it("renders official English name and address for Go Vap Branch", () => {
      const branch = { id: 1000021387, branchName: "Chi nhánh Gò Vấp" };
      expect(formatBranchDisplayName(branch, "en")).toBe(
        "Go Vap Branch - 1073 Phan Van Tri, Go Vap District"
      );
    });
  });

  describe("4. Non-brand and Fallback Branches", () => {
    it("formats custom non-brand branch in Vietnamese", () => {
      const customBranch = { id: 99, branchName: "Chi nhánh Khác", address: "123 Đường Lạ" };
      expect(formatBranchDisplayName(customBranch, "vi")).toBe("Chi nhánh Khác - 123 Đường Lạ");
    });

    it("formats custom non-brand branch in English", () => {
      const customBranch = { id: 99, branchName: "Chi nhánh Khác", address: "123 Strange Street" };
      expect(formatBranchDisplayName(customBranch, "en")).toBe("Branch Khác - 123 Strange Street");
    });

    it("returns empty string on null or undefined branch", () => {
      expect(formatBranchDisplayName(null)).toBe("");
      expect(formatBranchDisplayName(undefined)).toBe("");
    });
  });
});
