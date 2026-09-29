import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const durationByType: Record<ToastType, number> = {
  success: 2400,
  error: 3000,
  info: 2200,
};

// 图标
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12l5 5 11-11" />
  </svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-6M12 8h.01" />
  </svg>
);

const paletteByType: Record<ToastType, { border: string; bg: string; text: string; accent: string; ring: string }> = {
  success: {
    border: 'border-[#b7eb8f]',
    bg: 'bg-[#f6ffed]/90',
    text: 'text-[#389e0d]',
    accent: 'bg-[#52c41a]',
    ring: 'shadow-[0_8px_24px_-6px_rgba(82,196,26,0.35)]',
  },
  error: {
    border: 'border-[#ffa39e]',
    bg: 'bg-[#fff1f0]/90',
    text: 'text-[#cf1322]',
    accent: 'bg-[#f53f3f]',
    ring: 'shadow-[0_8px_24px_-6px_rgba(245,63,63,0.35)]',
  },
  info: {
    border: 'border-[#91caff]',
    bg: 'bg-[#eaf3ff]/90',
    text: 'text-[#0958d9]',
    accent: 'bg-[#1677ff]',
    ring: 'shadow-[0_8px_24px_-6px_rgba(22,119,255,0.35)]',
  },
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const p = paletteByType[toast.type];
  useEffect(() => {
    const t1 = setTimeout(() => {
      // 先标记 exiting 做动画
    }, durationByType[toast.type]);
    const t2 = setTimeout(() => {
      onClose(toast.id);
    }, durationByType[toast.type] + 260);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, toast.type, onClose]);

  return (
    <div
      className={`group min-w-[260px] max-w-[380px] pl-4 pr-3 py-3 rounded-xl border backdrop-blur-lg ${p.bg} ${p.border} ${p.ring} text-[13px] text-[var(--text-1)] font-medium flex items-start gap-3 animate-slide-right ${
        toast.exiting ? 'opacity-0 translate-x-6 scale-95 transition-all duration-250' : ''
      }`}
      style={{ animationDuration: '0.35s' }}
    >
      <div className={`w-5 h-5 rounded-full ${p.accent} text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
        {toast.type === 'success' ? <CheckIcon /> : toast.type === 'error' ? <XIcon /> : <InfoIcon />}
      </div>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onClose(toast.id)}
        className="text-[var(--text-quaternary)] hover:text-[var(--text-1)] transition-colors shrink-0"
      >
        <XIcon />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const close = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const value: ToastContextValue = {
    showToast,
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast 容器 */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-3">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onClose={close} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
