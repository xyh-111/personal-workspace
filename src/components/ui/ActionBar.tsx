import React from 'react';
import { SearchInput } from './SearchInput';
import { PlusIcon } from '../icons';

interface ActionBarProps {
  title: string;
  accentHue?: string;          // Logo 方块渐变色（CSS 值，如 'linear-gradient(...)'）
  logoEmoji?: React.ReactNode;
  searchProps?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  leftActions?: React.ReactNode;  // 管理按钮组
  primaryAction: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

/**
 * 顶部操作栏 — Logo + 标题 + 居中搜索 + 右侧按钮组 + 主按钮
 */
export function ActionBar({
  title,
  accentHue = 'linear-gradient(135deg, #1677ff, #4b6bff)',
  logoEmoji = '📮',
  searchProps,
  leftActions,
  primaryAction,
  className = '',
}: ActionBarProps) {
  return (
    <div className={`flex items-center gap-3 animate-fade-up ${className}`}>
      <div
        className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shrink-0"
        style={{ background: accentHue }}
      >
        <span className="text-sm leading-none">{logoEmoji}</span>
      </div>
      <h1 className="text-[18px] font-semibold text-[var(--text-1)] shrink-0">{title}</h1>

      {searchProps && (
        <SearchInput
          className="flex-1 max-w-md ml-2"
          value={searchProps.value}
          onChange={searchProps.onChange}
          placeholder={searchProps.placeholder}
        />
      )}

      {leftActions && (
        <div className="flex items-center gap-2 ml-auto">
          {leftActions}
        </div>
      )}

      <button onClick={primaryAction.onClick} className="ds-btn-primary h-9 shrink-0">
        {primaryAction.icon ?? <PlusIcon />}
        {primaryAction.label}
      </button>
    </div>
  );
}

export default ActionBar;
