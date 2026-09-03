"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { AdministrativeWard } from "@/services/orderService";
import { formatWardLabel, HCMC_WARD_OLD_NAME_MAP } from "@/data/wardMapping";
import RequiredMark from "./RequiredMark";

interface WardSelectComboboxProps {
  wards: AdministrativeWard[];
  selectedWardId: string;
  selectedWardName: string;
  onSelectWard: (ward: AdministrativeWard | null) => void;
  hasError?: boolean;
  errorMessage?: string;
}

function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export default function WardSelectCombobox({
  wards,
  selectedWardId,
  selectedWardName,
  onSelectWard,
  hasError = false,
  errorMessage = "* Vui lòng chọn Phường / Xã (Khu vực giao).",
}: WardSelectComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Map and sort wards alphabetically A-Z by New Ward Name
  const sortedWards = useMemo(() => {
    return [...wards].sort((a, b) => {
      const cleanA = a.name.replace(/^(Phường|Xã|Thị trấn)\s+/i, "").trim();
      const cleanB = b.name.replace(/^(Phường|Xã|Thị trấn)\s+/i, "").trim();
      return cleanA.localeCompare(cleanB, "vi", { sensitivity: "base" });
    });
  }, [wards]);

  // Find currently selected ward object
  const currentSelectedObj = useMemo(() => {
    return (
      sortedWards.find(
        (w) => w.id === selectedWardId || w.name === selectedWardName
      ) || null
    );
  }, [sortedWards, selectedWardId, selectedWardName]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter wards with Fuzzy Search
  const filteredWards = useMemo(() => {
    if (!searchQuery.trim()) return sortedWards;

    const normalizedQuery = removeAccents(searchQuery.trim());

    return sortedWards.filter((w) => {
      const oldWard = w.old_ward || HCMC_WARD_OLD_NAME_MAP[w.name] || "";
      const nameMatch = removeAccents(w.name).includes(normalizedQuery);
      const districtMatch = w.district
        ? removeAccents(w.district).includes(normalizedQuery)
        : false;
      const oldWardMatch = oldWard
        ? removeAccents(oldWard).includes(normalizedQuery) ||
          removeAccents(oldWard.replace(/p\./gi, "phuong ")).includes(normalizedQuery)
        : false;

      return nameMatch || districtMatch || oldWardMatch;
    });
  }, [sortedWards, searchQuery]);

  const handleSelect = (ward: AdministrativeWard) => {
    onSelectWard(ward);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectWard(null);
    setSearchQuery("");
    if (inputRef.current) inputRef.current.focus();
  };

  const displayInputValue = isOpen
    ? searchQuery
    : currentSelectedObj
    ? formatWardLabel(
        currentSelectedObj.name,
        currentSelectedObj.district,
        currentSelectedObj.old_ward
      )
    : selectedWardName
    ? formatWardLabel(selectedWardName)
    : "";

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      <label className="text-sm font-serif font-semibold text-primary block">
        Phường / Xã (Khu vực giao)
        <RequiredMark />
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayInputValue}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchQuery("");
          }}
          placeholder="-- Gõ hoặc chọn Phường / Xã (VD: An Hội Tây, P.14, Gò Vấp) --"
          className={`w-full h-11 rounded-[4px] border px-[14px] pr-10 bg-white text-gray-900 focus:outline-none text-sm font-serif cursor-pointer transition-all ${
            hasError
              ? "border-red-500 ring-1 ring-red-500 bg-red-50/30"
              : "border-gray-300 focus:border-primary"
          }`}
        />

        {/* Clear/Dropdown Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-400">
          {(selectedWardId || selectedWardName || searchQuery) && (
            <button
              type="button"
              onClick={handleClear}
              className="hover:text-red-500 p-1 text-xs font-bold transition-colors"
              title="Xóa lựa chọn"
            >
              ✕
            </button>
          )}
          <span
            className={`transition-transform duration-200 pointer-events-none text-xs ${
              isOpen ? "rotate-180 text-primary" : ""
            }`}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Suggestion Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl divide-y divide-gray-100 text-sm font-serif animate-fade-in">
          {filteredWards.length > 0 ? (
            filteredWards.map((w) => {
              const label = formatWardLabel(w.name, w.district, w.old_ward);
              const isSelected =
                w.id === selectedWardId || w.name === selectedWardName;

              return (
                <div
                  key={w.id || w.name}
                  onClick={() => handleSelect(w)}
                  className={`px-4 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-gray-50 text-gray-800"
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <span className="block leading-snug">{label}</span>
                  </div>
                  {isSelected && (
                    <span className="text-primary font-bold text-base shrink-0">
                      ✓
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-4 py-3 text-gray-500 text-center italic text-xs">
              Không tìm thấy Phường/Xã phù hợp với &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      )}

      {/* Requirement 5: Inline Red Error Warning immediately below input */}
      {hasError && (
        <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
          <span className="text-red-600 font-bold">*</span>
          <span>{errorMessage}</span>
        </p>
      )}
    </div>
  );
}
