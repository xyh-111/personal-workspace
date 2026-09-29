import React, { useEffect } from 'react';
import { GlassSurface } from './GlassSurface';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;  // Tailwind class 如 'max-w-lg' | 'max-w-md'
  closable?: boolean;
  footer?: React.ReactNode;
}

/**
 * 通用模态框 — 覆盖层 + 厚玻璃面板 + scale-in 动画 + ESC 关闭
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  closable = true,
  footer,
}: ModalProps) {
  // ESC 关闭
  useEffect(() => {
    if (!open || !closable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // 禁止背景滚动
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, closable, onClose]);

  if (!open) return null;

  return (
    <div
      className="ds-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => closable && onClose()}
    >
      <div
        className={`ds-modal ${maxWidth} w-full max-h-[90vh] overflow-auto shadow-[var(--shadow-lg)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <GlassSurface padding="md">
          {title && (
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-medium text-[var(--text-1)]">{title}</h3>
              {closable && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)] transition-colors"
                  aria-label="关闭"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
            </div>
          )}
          {children}
          {footer && (
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--border)]">
              {footer}
            </div>
          )}
        </GlassSurface>
      </div>
    </div>
  );
}

export default Modal;
