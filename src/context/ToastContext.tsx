import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'stage';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (title: string, message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((title: string, message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { id, title, message, type };
    
    setToasts(prev => [...prev.slice(-4), newToast]); // Keep max 5 toasts

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={18} />;
      case 'warning':
        return <AlertCircle className="text-amber-500 flex-shrink-0" size={18} />;
      case 'stage':
        return <Sparkles className="text-blue-500 flex-shrink-0 animate-pulse" size={18} />;
      default:
        return <Info className="text-brand-red flex-shrink-0" size={18} />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'border-emerald-500/40 bg-slate-900/95 text-white';
      case 'warning': return 'border-amber-500/40 bg-slate-900/95 text-white';
      case 'stage': return 'border-blue-500/40 bg-slate-900/95 text-white';
      default: return 'border-rose-500/40 bg-slate-900/95 text-white';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Toast Banners Container (Top-Right) */}
      <div className="fixed top-20 right-5 z-[3000] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all transform animate-slideInRight ${getBorderColor(toast.type)}`}
          >
            {getToastIcon(toast.type)}

            <div className="flex-1 pr-2">
              <h4 className="text-xs font-extrabold tracking-tight text-white">{toast.title}</h4>
              <p className="text-[11px] text-slate-300 font-medium leading-tight mt-0.5">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent p-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
