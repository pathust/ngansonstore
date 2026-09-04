import React from 'react';
import { RotateCw } from 'lucide-react';
import { SyncState } from '../../types/index';

interface GlobalLoadingBarProps {
  isLoading: boolean;
  syncState: SyncState;
  loadingMessage?: string;
}

export const GlobalLoadingBar: React.FC<GlobalLoadingBarProps> = ({
  isLoading,
  syncState,
  loadingMessage,
}) => {
  return (
    <>
      {/* Top indeterminate progress bar when network is active */}
      {(isLoading || syncState === 'SYNCING') && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-blue-100 overflow-hidden">
          <div className="h-full bg-blue-600 animate-pulse w-full origin-left"></div>
        </div>
      )}

      {/* Floating subtle Sync Status / Loading Indicator Toast at top right */}
      {syncState === 'SYNCING' && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs shadow-lg backdrop-blur-sm border border-slate-700 animate-fade-in pointer-events-none">
          <RotateCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          <span>{loadingMessage || 'Đang đồng bộ dữ liệu với máy chủ...'}</span>
        </div>
      )}
    </>
  );
};
