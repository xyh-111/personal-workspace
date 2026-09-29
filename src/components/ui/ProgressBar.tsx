export interface StatusPalette {
  dot?: string;
  bg: string;
  text: string;
  bar: string;
}

interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  palette: StatusPalette;
  active?: boolean;
  onClick?: () => void;
}

/**
 * 水平渐变进度条 — 状态分布统计
 * — 左侧标签 + 中间渐变条 + 右侧数字
 * — 可点击（active 时高亮）
 */
export function ProgressBar({ label, value, max, palette, active = false, onClick }: ProgressBarProps) {
  const barWidth = value > 0 ? Math.max(Math.round((value / (max || 1)) * 100), 6) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 text-left group"
    >
      <span
        className="w-[72px] shrink-0 text-xs transition-colors"
        style={{ color: active ? palette.text : 'var(--text-2)' }}
      >
        {label}
      </span>
      <span className="flex-1 h-[18px] bg-[var(--bg-hover)] rounded-full overflow-hidden relative">
        <span
          className="ds-progress-bar-fill absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${barWidth}%`,
            background: `linear-gradient(90deg, ${palette.bar}, ${palette.bar}cc)`,
            opacity: active ? 1 : value > 0 ? 0.85 : 0,
          }}
        />
      </span>
      <span
        className="w-10 text-right text-xs tabular-nums font-medium shrink-0"
        style={{ color: value > 0 ? palette.text : 'var(--text-4)' }}
      >
        {value}
      </span>
    </button>
  );
}

export default ProgressBar;
