import React from 'react';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  label: string;
  value: number | string;
  accent: string;   // 数字颜色（十六进制）
  sub?: string;
  icon?: React.ReactNode | string;
  delay?: number;   // 动画延迟 ms
}

/**
 * 统计卡（4 张一组的顶部 KPI 卡片）
 */
export function StatCard({ label, value, accent, sub, icon, delay = 0 }: StatCardProps) {
  return (
    <GlassCard
      className="animate-fade-up relative"
      padding="md"
      hoverable
      hoverGlow
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-3)]">{label}</p>
        {icon && (
          <span className="text-base opacity-60 leading-none">{icon}</span>
        )}
      </div>
      <p
        className="text-[28px] font-semibold mt-1 tabular-nums leading-none"
        style={{ color: accent, animationDelay: `${delay}ms` }}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-[var(--text-4)] mt-2">{sub}</p>}
    </GlassCard>
  );
}

export default StatCard;
