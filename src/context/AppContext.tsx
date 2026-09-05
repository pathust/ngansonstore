import React, { createContext, useContext, ReactNode } from 'react';
import { AppProviders } from './AppProviders';
import { useAppCompat, AppContextType } from './useAppCompat';

// File này CHỦ Ý chỉ còn là lớp tương thích ngược mỏng.
// Toàn bộ state/logic thật đã tách sang src/context/slices/* (state theo domain, tự memo hoá)
// và src/context/orchestrators/* (thao tác ghi xuyên domain: checkout, nhập kho, đồng bộ...).
// Xem chi tiết & lý do trong .claude/plans/calm-toasting-hickey.md và .claude/skills/refactor-roadmap.
//
// useApp() ở đây CỐ Ý giữ nguyên hành vi cũ (1 context lớn, re-render khi bất kỳ domain nào đổi) —
// đây là phần "compat shim" cho 42 component chưa migrate. Component mới nên dùng thẳng hook slice
// (useAuth/useCatalog/useOrdersCart/...) để chỉ re-render đúng phần dữ liệu mình cần.
const CompatContext = createContext<AppContextType | undefined>(undefined);

const CompatBridge: React.FC<{ children: ReactNode }> = ({ children }) => {
  const compat = useAppCompat();
  return <CompatContext.Provider value={compat}>{children}</CompatContext.Provider>;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AppProviders>
    <CompatBridge>{children}</CompatBridge>
  </AppProviders>
);

export const useApp = (): AppContextType => {
  const context = useContext(CompatContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
