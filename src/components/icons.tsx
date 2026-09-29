// 统一 SVG 图标库（线性 2px 描边）

const base = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const ClockIcon = () => (
  <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const ChartIcon = () => (
  <svg {...base}>
    <path d="M3 21h18" />
    <rect x="5" y="12" width="3.5" height="7" rx="1" />
    <rect x="10.5" y="8" width="3.5" height="11" rx="1" />
    <rect x="16" y="4" width="3.5" height="15" rx="1" />
  </svg>
);
export const CalendarCheckIcon = () => (
  <svg {...base}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18" />
    <path d="M9.5 15.5l2 2 3.5-3.5" />
  </svg>
);
export const BookIcon = () => (
  <svg {...base}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </svg>
);
export const BriefcaseIcon = () => (
  <svg {...base}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M3 12h18" />
  </svg>
);
export const ArrowRightIcon = () => (
  <svg {...base}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);
export const PlusIcon = () => (
  <svg {...base}><path d="M12 5v14M5 12h14" /></svg>
);
export const PlayIcon = () => (
  <svg {...base}><path d="M7 4l13 8-13 8V4z" /></svg>
);
export const PauseIcon = () => (
  <svg {...base}><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
);
export const SaveIcon = () => (
  <svg {...base}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
  </svg>
);
export const RotateIcon = () => (
  <svg {...base}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);
export const TrashIcon = () => (
  <svg {...base}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </svg>
);
export const EditIcon = () => (
  <svg {...base}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);
export const ChevronDownIcon = ({ className = '' }: { className?: string }) => (
  <svg {...base} className={className}><path d="M6 9l6 6 6-6" /></svg>
);
export const ChevronUpIcon = ({ className = '' }: { className?: string }) => (
  <svg {...base} className={className}><path d="M18 15l-6-6-6 6" /></svg>
);
export const ChevronLeftIcon = () => (
  <svg {...base}><path d="M15 18l-6-6 6-6" /></svg>
);
export const ChevronRightIcon = () => (
  <svg {...base}><path d="M9 18l6-6-6-6" /></svg>
);
export const SettingsIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
