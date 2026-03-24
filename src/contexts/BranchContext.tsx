'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Branch } from '@/services/branchService';

const BranchContext = createContext<Branch[]>([]);

export function BranchProvider({
  branches,
  children,
}: {
  branches: Branch[];
  children: React.ReactNode;
}) {
  return (
    <BranchContext.Provider value={branches}>
      {children}
    </BranchContext.Provider>
  );
}

/**
 * Hook to access branches from any client component.
 */
export function useBranches() {
  return useContext(BranchContext);
}
