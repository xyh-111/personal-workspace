import React from 'react';

interface GlassSurfaceProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap: Record<NonNullable<GlassSurfaceProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * 厚玻璃容器（模态框 / 大面板用）
 * — 比 GlassCard 更厚的 opacity + 更大的 blur + 大阴影
 */
export function GlassSurface({
  children,
  className = '',
  padding = 'md',
}: GlassSurfaceProps) {
  return (
    <div className={`ds-glass-surface ${paddingMap[padding]} ${className}`}>
      {children}
    </div>
  );
}

export default GlassSurface;
