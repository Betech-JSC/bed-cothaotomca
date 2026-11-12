"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  getHcmcWardMapping,
  type HcmcWardMappingResponse,
  type AdministrativeWard,
} from "@/services/orderService";
import { cleanAdministrativeUnitName, formatWardLabel } from "@/data/wardMapping";

export interface WardLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWard: (wardName: string) => void;
  availableWards?: AdministrativeWard[];
  zIndex?: string;
}

function removeAccents(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export default function WardLookupModal({
  isOpen,
  onClose,
  onSelectWard,
  availableWards = [],
  zIndex = "z-50",
}: WardLookupModalProps) {
  const t = useTranslations("checkout");
  const [data, setData] = useState<HcmcWardMappingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch dynamic ward mapping from backend
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    getHcmcWardMapping()
      .then((res) => {
        if (isMounted && res) {
          setData(res);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Extract unique sorted districts
  const districtList = useMemo(() => {
    if (!data?.old_to_new) return [];
    const set = new Set<string>();
    for (const item of data.old_to_new) {
      if (item.d) set.add(item.d);
    }
    return Array.from(set).sort((a, b) => {
      // Natural sorting (Quận 1, Quận 2, ..., Quận 12, Bình Thạnh...)
      return a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" });
    });
  }, [data]);

  // Filter old_to_new items based on selected district and search query
  const filteredItems = useMemo(() => {
    if (!data?.old_to_new) return [];

    const normQuery = removeAccents(searchQuery);

    return data.old_to_new.filter((item) => {
      // District filter
      if (selectedDistrict !== "all" && item.d !== selectedDistrict) {
        return false;
      }

      // Search query filter
      if (!normQuery) return true;

      const normOld = removeAccents(item.o);
      const normDist = removeAccents(item.d);
      const normNewList = item.n.map((nw) => removeAccents(nw)).join(" ");

      return (
        normOld.includes(normQuery) ||
        normDist.includes(normQuery) ||
        normNewList.includes(normQuery)
      );
    });
  }, [data, selectedDistrict, searchQuery]);

  const handleSelectNewWard = (wardName: string) => {
    onSelectWard(wardName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ward-lookup-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl flex flex-col border border-gray-100 overflow-hidden font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔍</span>
              <h3
                id="ward-lookup-title"
                className="text-base sm:text-lg font-bold font-serif text-primary leading-tight"
              >
                {t("ward_lookup_title")}
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {t("ward_lookup_desc")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-full transition-colors ml-2"
            aria-label={t("ward_lookup_close")}
          >
            ✕
          </button>
        </div>

        {/* Filters & Search Row */}
        <div className="p-4 bg-gray-50/80 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-12 gap-2.5 shrink-0">
          {/* District Select */}
          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t("ward_lookup_filter_district")}
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="all">{t("ward_lookup_all_districts")}</option>
              {districtList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="sm:col-span-7">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t("ward_lookup_col_old")}
            </label>
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("ward_lookup_search_placeholder")}
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 pr-8 text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold p-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span>{t("ward_lookup_loading")}</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm space-y-1">
              <p className="font-medium">{t("ward_lookup_empty")}</p>
              <p className="text-xs text-gray-400">
                Hãy thử chọn &quot;{t("ward_lookup_all_districts")}&quot; hoặc gõ tên không dấu.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredItems.map((item, idx) => {
                const isPartial = Boolean(item.p);
                return (
                  <div
                    key={`${item.d}-${item.o}-${idx}`}
                    className="py-3 px-2 rounded-xl hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Old ward info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {item.o}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                          {item.d}
                        </span>
                        {isPartial && (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium"
                            title={t("ward_lookup_partial_note")}
                          >
                            ⚠️ 1 phần
                          </span>
                        )}
                      </div>
                      {isPartial && (
                        <p className="text-[11px] text-amber-700 mt-0.5 italic">
                          {t("ward_lookup_partial_note")}
                        </p>
                      )}
                    </div>

                    {/* Arrow & Target New Ward(s) + Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap sm:justify-end">
                      <span className="text-gray-400 hidden sm:inline">➔</span>
                      {item.n.map((newWard) => {
                        const label = formatWardLabel(newWard);
                        return (
                          <button
                            key={newWard}
                            type="button"
                            data-testid={`select-new-ward-${newWard}`}
                            onClick={() => handleSelectNewWard(newWard)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/90 active:scale-95 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                          >
                            <span>✓</span>
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500 shrink-0">
          <span>
            {data?.nguon || "Nghị quyết 1685/NQ-UBTVQH15, hiệu lực 01/07/2025"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-medium transition-colors cursor-pointer self-end sm:self-auto"
          >
            {t("ward_lookup_close")}
          </button>
        </div>
      </div>
    </div>
  );
}
