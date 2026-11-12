"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { AdministrativeWard } from "@/services/orderService";
import { cleanAdministrativeUnitName, formatWardLabel } from "@/data/wardMapping";
import { SPECIFIC_WARD_ALIASES } from "@/utils/addressValidation";
import RequiredMark from "./RequiredMark";
import WardLookupModal from "./WardLookupModal";

interface WardSelectComboboxProps {
  wards: AdministrativeWard[];
  selectedWardId: string;
  selectedWardName: string;
  onSelectWard: (ward: AdministrativeWard | null) => void;
  hasError?: boolean;
  errorMessage?: string;
  dataTestId?: string;
  id?: string;
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
  errorMessage,
  dataTestId,
  id,
}: WardSelectComboboxProps) {
  const t = useTranslations("checkout");
  const defaultErrorMessage = t("validation.ward_required");
  const activeErrorMessage = errorMessage || defaultErrorMessage;
  const [isOpen, setIsOpen] = useState(false);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
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
      const oldWard = w.old_ward || "";
      const nameMatch = removeAccents(w.name).includes(normalizedQuery);
      const districtMatch = w.district
        ? removeAccents(w.district).includes(normalizedQuery)
        : false;
      const oldWardMatch = oldWard
        ? removeAccents(oldWard).includes(normalizedQuery) ||
          removeAccents(oldWard.replace(/p\./gi, "phuong ")).includes(normalizedQuery)
        : false;

      const oldWardsList = (w as any).old_wards;
      const oldWardsListMatch = Array.isArray(oldWardsList)
        ? oldWardsList.some((ow: string) => removeAccents(ow).includes(normalizedQuery))
        : false;

      const aliasMatch = SPECIFIC_WARD_ALIASES.some((entry) => {
        const cleanEntryTarget = cleanAdministrativeUnitName(entry.targetWard).toLowerCase();
        const cleanCurrentName = cleanAdministrativeUnitName(w.name).toLowerCase();
        if (cleanEntryTarget !== cleanCurrentName) return false;
        return entry.keywords.some((kw) => {
          const normKw = removeAccents(kw);
          return normKw.includes(normalizedQuery) || normalizedQuery.includes(normKw);
        });
      });

      return nameMatch || districtMatch || oldWardMatch || oldWardsListMatch || aliasMatch;
    });
  }, [sortedWards, searchQuery]);

  const handleSelect = (ward: AdministrativeWard) => {
    onSelectWard(ward);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleSelectFromModal = (wardName: string) => {
    const normTarget = cleanAdministrativeUnitName(wardName).toLowerCase();
    const matched = sortedWards.find((w) => {
      const cleanW = cleanAdministrativeUnitName(w.name).toLowerCase();
      return cleanW === normTarget || w.name.toLowerCase() === wardName.toLowerCase();
    });

    if (matched) {
      onSelectWard(matched);
    } else {
      onSelectWard({
        id: "",
        name: wardName,
      });
    }
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
    <div className="space-y-2 relative" ref={containerRef} data-testid={dataTestId}>
      <label className="text-sm font-serif font-semibold text-primary block">
        {t("ward_select_label")}
        <RequiredMark />
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          data-testid={dataTestId ? `${dataTestId}-input` : undefined}
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
          placeholder={t("ward_select_placeholder")}
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
              className="hover:text-red-500 p-1 text-xs font-bold transition-colors cursor-pointer"
              title={t("ward_select_clear")}
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
              const oldWardHint = w.old_ward?.trim() || "";
              const isSelected =
                w.id === selectedWardId || w.name === selectedWardName;

              return (
                <div
                  key={w.id || w.name}
                  data-testid={dataTestId ? `${dataTestId}-option-${w.id || w.name}` : undefined}
                  onClick={() => handleSelect(w)}
                  className={`px-4 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-gray-50 text-gray-800"
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <span className="block leading-snug">{label}</span>
                    {oldWardHint && (
                      <span className="block text-xs text-gray-500 font-normal mt-0.5">
                        ({oldWardHint} cũ)
                      </span>
                    )}
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
              {t("ward_select_not_found", { query: searchQuery })}
            </div>
          )}
        </div>
      )}

      {/* Merger Note & Standalone Lookup Modal Link */}
      <div className="flex items-center justify-between flex-wrap gap-1.5 text-xs text-gray-500 pt-0.5">
        <span className="leading-snug">{t("ward_merger_note")}</span>
        <button
          type="button"
          onClick={() => setIsLookupModalOpen(true)}
          data-testid="open-ward-lookup-modal-btn"
          className="inline-flex items-center gap-1 text-primary hover:text-secondary font-semibold underline underline-offset-2 transition-colors cursor-pointer shrink-0"
        >
          <span>🔍</span>
          <span>{t("ward_lookup_link")}</span>
        </button>
      </div>

      {/* Requirement 5: Inline Red Error Warning immediately below input */}
      {hasError && (
        <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
          <span className="text-red-600 font-bold">*</span>
          <span>{activeErrorMessage}</span>
        </p>
      )}

      {/* Standalone Ward Lookup Modal */}
      <WardLookupModal
        isOpen={isLookupModalOpen}
        onClose={() => setIsLookupModalOpen(false)}
        onSelectWard={handleSelectFromModal}
        availableWards={wards}
      />
    </div>
  );
}
