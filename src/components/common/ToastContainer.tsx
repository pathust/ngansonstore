import React from 'react';
import { useToast } from '../../context/slices/ToastContext';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = 'bg-slate-900 text-white border-slate-700';
          let Icon = Info;
          let iconColor = 'text-blue-400';

          if (toast.type === 'success') {
            bgColor = 'bg-emerald-900/95 text-emerald-50 border-emerald-700 shadow-emerald-950/20';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-400';
          } else if (toast.type === 'error') {
            bgColor = 'bg-rose-900/95 text-rose-50 border-rose-700 shadow-rose-950/20';
            Icon = XCircle;
            iconColor = 'text-rose-400';
          } else if (toast.type === 'warning') {
            bgColor = 'bg-amber-900/95 text-amber-50 border-amber-700 shadow-amber-950/20';
            Icon = AlertTriangle;
            iconColor = 'text-amber-400';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg backdrop-blur-sm ${bgColor}`}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
              <div className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 hover:bg-white/20 rounded transition-colors text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
