import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  hoverGlow?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const paddingMap: Record<NonNullable<GlassCardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

/**
 * 液态玻璃卡片（核心原子组件）
 * — 半透明白底 + backdrop-blur + 顶部高光 + hover 上浮 + 渐变发光边缘
 * — 不使用 ::before 状态竖条（用户要求移除）
 */
export function GlassCard({
  children,
  className = '',
  hoverable = true,
  hoverGlow = false,
  padding = 'md',
  onClick,
}: GlassCardProps) {
  const classes = [
    'ds-card',
    paddingMap[padding],
    hoverGlow ? 'ds-card-hover-glow' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
      data-hover-glow={hoverGlow || undefined}
      style={!hoverable ? { cursor: onClick ? 'pointer' : 'default' } : undefined}
    >
      {children}
    </div>
  );
}

export default GlassCard;
