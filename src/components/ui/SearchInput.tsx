import { SearchIcon } from '../icons';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

/**
 * 统一搜索框 — 左侧放大镜图标 + 输入 + 可选清除
 */
export function SearchInput({
  value,
  onChange,
  placeholder = '搜索...',
  className = '',
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-4)] pointer-events-none">
        <SearchIcon />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ds-input pl-9 h-9 text-sm"
      />
    </div>
  );
}

export default SearchInput;
