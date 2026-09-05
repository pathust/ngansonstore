import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { Branch } from '../../types';
import { LOCAL_STORAGE_PREFIX, safeStorageGet } from '../shared/storage';

const DEFAULT_BRANCH: Branch = { id: 'ngan-son-store', name: 'Cửa hàng Ngân Sơn', address: '318 Vũ Quang', phone: '0912.345.678', is_default: true };

interface UiShellContextType {
  currentView: string;
  setCurrentView: (view: string) => void;
  currentBranch: Branch;
  setCurrentBranch: React.Dispatch<React.SetStateAction<Branch>>;
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  voiceAssistantRequest: { mode: 'POS_ORDER' | 'STOCK_IN' | 'UPDATE_ORDER'; nonce: number } | null;
  requestVoiceAssistant: (mode: 'POS_ORDER' | 'STOCK_IN' | 'UPDATE_ORDER') => void;
  clearVoiceAssistantRequest: () => void;
}

const UiShellContext = createContext<UiShellContextType | undefined>(undefined);

export const UiShellProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const v = params.get('view');
        if (v) return v;
      } catch (e) {}
    }
    return 'products';
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    const parsed = safeStorageGet<Branch[]>(LOCAL_STORAGE_PREFIX + 'branches', []);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return [DEFAULT_BRANCH];
  });

  const [currentBranch, setCurrentBranch] = useState<Branch>(() => {
    const parsed = safeStorageGet<Branch | null>(LOCAL_STORAGE_PREFIX + 'current_branch', null);
    if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
    return DEFAULT_BRANCH;
  });

  const [searchQuery, setSearchQuery] = useState<string>('');

  const [voiceAssistantRequest, setVoiceAssistantRequest] = useState<{ mode: 'POS_ORDER' | 'STOCK_IN' | 'UPDATE_ORDER'; nonce: number } | null>(null);
  const requestVoiceAssistant = (mode: 'POS_ORDER' | 'STOCK_IN' | 'UPDATE_ORDER') => {
    setVoiceAssistantRequest({ mode, nonce: Date.now() });
  };
  const clearVoiceAssistantRequest = () => setVoiceAssistantRequest(null);

  const value = useMemo<UiShellContextType>(
    () => ({
      currentView,
      setCurrentView,
      currentBranch,
      setCurrentBranch,
      branches,
      setBranches,
      searchQuery,
      setSearchQuery,
      voiceAssistantRequest,
      requestVoiceAssistant,
      clearVoiceAssistantRequest,
    }),
    [currentView, currentBranch, branches, searchQuery, voiceAssistantRequest]
  );

  return <UiShellContext.Provider value={value}>{children}</UiShellContext.Provider>;
};

export const useUiShell = (): UiShellContextType => {
  const context = useContext(UiShellContext);
  if (!context) {
    throw new Error('useUiShell must be used within a UiShellProvider');
  }
  return context;
};
