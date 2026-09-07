import React, { createContext, useContext, useMemo, useState, useEffect, useCallback, ReactNode } from 'react';
import { Branch } from '../../types';
import { LOCAL_STORAGE_PREFIX, safeStorageGet } from '../shared/storage';

const DEFAULT_BRANCH: Branch = { id: 'ngan-son-store', name: 'Cửa hàng Ngân Sơn', address: '318 Vũ Quang', phone: '0912.345.678', is_default: true };

const DEFAULT_VIEW = 'products';

/** Read view name from current URL hash (#view) or query param (?view=) */
function readViewFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // Prefer hash: /#/products
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash) return hash;
    // Fallback: ?view=products (backward compat)
    const params = new URLSearchParams(window.location.search);
    return params.get('view');
  } catch {
    return null;
  }
}

/** Update URL hash without triggering page reload */
function writeViewToUrl(view: string) {
  if (typeof window === 'undefined') return;
  const newHash = `#/${view}`;
  if (window.location.hash !== newHash) {
    window.history.pushState({ view }, '', newHash);
  }
}

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
  const [currentView, _setCurrentView] = useState<string>(() => {
    return readViewFromUrl() || DEFAULT_VIEW;
  });

  // Wrap setCurrentView to also update URL hash
  const setCurrentView = useCallback((view: string) => {
    _setCurrentView(view);
    writeViewToUrl(view);
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const view = e.state?.view || readViewFromUrl() || DEFAULT_VIEW;
      _setCurrentView(view);
    };
    window.addEventListener('popstate', handlePopState);

    // Set initial hash if not present (e.g. first visit at /)
    if (!window.location.hash || window.location.hash === '#') {
      window.history.replaceState({ view: currentView }, '', `#/${currentView}`);
    }

    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
