'use client';

import React, { createContext, useContext } from 'react';
import type { GeneralSettings } from '@/services/generalSettingService';

const GeneralSettingsContext = createContext<GeneralSettings | null>(null);

export function GeneralSettingsProvider({
  settings,
  children,
}: {
  settings: GeneralSettings | null;
  children: React.ReactNode;
}) {
  return (
    <GeneralSettingsContext.Provider value={settings}>
      {children}
    </GeneralSettingsContext.Provider>
  );
}

/**
 * Hook to access general settings from any client component.
 * Returns null if settings failed to load.
 */
export function useGeneralSettings() {
  return useContext(GeneralSettingsContext);
}
