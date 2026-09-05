import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { ToastNotification } from '../../types';

interface ToastContextType {
  toasts: ToastNotification[];
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newToast: ToastNotification = { id, message, type, timestamp: Date.now() };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      removeToast(id);
    }, 3800);
  }, [removeToast]);

  const value = useMemo<ToastContextType>(() => ({ toasts, showToast, removeToast }), [toasts, showToast, removeToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
