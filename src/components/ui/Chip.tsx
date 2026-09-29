import React from 'react';
import type { StatusPalette } from './ProgressBar';

interface ChipProps {
  children: React.ReactNode;
  active?: boolean;
  palette?: StatusPalette;
  onClick?: () => void;
  className?: string;
}

/**
 * 筛选胶囊按钮
 * — 非激活：灰边浅字
 * — 激活：状态色背景 + 状态色边框 + 状态色文字
 */
export function Chip({ children, active = false, palette, onClick, className = '' }: ChipProps) {
  const activeStyle: React.CSSProperties | undefined = active && palette
    ? { background: palette.bg, borderColor: palette.bar, color: palette.text }
    : undefined;

  return (
    <button
      onClick={onClick}
      className={`ds-segment ${active ? 'ds-segment-active' : ''} ${className}`}
      style={activeStyle}
    >
      {children}
    </button>
  );
}

export default Chip;
