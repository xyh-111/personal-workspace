// 知识库数据类型
export interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

// 学习记录数据类型
export interface StudySession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: number; // timestamp
  endTime: number; // timestamp
  duration: number; // 分钟
}

// 简历投递状态（string 类型以支持自定义）
export type JobStatus = string;

// 简历投递数据类型
export interface JobApplication {
  id: string;
  company: string;
  position: string;
  channel: string; // 投递渠道
  applyDate: string; // YYYY-MM-DD
  status: JobStatus;
  interviewDate?: string; // 面试时间
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// 知识库分类 — 预置为空，所有分类都由用户自定义
export const KNOWLEDGE_CATEGORIES: string[] = [];

// ===== 求职看板预置状态 =====
// 结构：key（内部标识）、label（显示名）、预置固定不可删
export interface PresetJobStatus { key: string; label: string }
export const PRESET_JOB_STATUSES: PresetJobStatus[] = [
  { key: 'applied',         label: '已投递' },
  { key: 'written',         label: '笔试' },
  { key: 'tech_interview',  label: '技术面试' },
  { key: 'hr_interview',    label: 'HR面试' },
  { key: 'offer',           label: 'Offer' },
  { key: 'rejected',        label: '拒绝' },
];

// 预置状态色板（按 key）
export const PRESET_STATUS_PALETTE: Record<string, { dot: string; bg: string; text: string; bar: string }> = {
  applied:        { dot: '#1677ff', bg: 'rgba(22,119,255,0.10)', text: '#1677ff', bar: '#1677ff' },
  written:        { dot: '#fa8c16', bg: 'rgba(250,140,22,0.12)', text: '#d46b08', bar: '#fa8c16' },
  tech_interview: { dot: '#722ed1', bg: 'rgba(114,46,209,0.12)', text: '#531dab', bar: '#722ed1' },
  hr_interview:   { dot: '#2f54eb', bg: 'rgba(47,84,235,0.12)', text: '#1d39c4', bar: '#2f54eb' },
  offer:          { dot: '#52c41a', bg: 'rgba(82,196,26,0.12)', text: '#389e0d', bar: '#52c41a' },
  rejected:       { dot: '#a6b0bf', bg: 'rgba(148,163,184,0.15)', text: '#475569', bar: '#a6b0bf' },
};

// ===== 简历投递渠道 =====
export const PRESET_JOB_CHANNELS: string[] = [
  'Boss直聘', '智联', '实习僧',
];

// 自定义状态/渠道共用调色板
const customStatusPalettePool = [
  { dot: '#13c2c2', bg: 'rgba(19,194,194,0.12)', text: '#08979c', bar: '#13c2c2' },
  { dot: '#1890ff', bg: 'rgba(24,144,255,0.10)', text: '#0958d9', bar: '#1890ff' },
  { dot: '#fa541c', bg: 'rgba(250,84,28,0.12)',  text: '#d4380d', bar: '#fa541c' },
  { dot: '#722ed1', bg: 'rgba(114,46,209,0.12)', text: '#531dab', bar: '#722ed1' },
  { dot: '#ff4d4f', bg: 'rgba(255,77,79,0.12)',  text: '#cf1322', bar: '#ff4d4f' },
  { dot: '#13a8a8', bg: 'rgba(19,168,168,0.12)', text: '#067272', bar: '#13a8a8' },
  { dot: '#52c41a', bg: 'rgba(82,196,26,0.12)',  text: '#389e0d', bar: '#52c41a' },
  { dot: '#eb2f96', bg: 'rgba(235,47,150,0.12)', text: '#c41d7f', bar: '#eb2f96' },
];
export function hashStatusPalette(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffffffff;
  return customStatusPalettePool[Math.abs(h) % customStatusPalettePool.length];
}
export function getStatusPalette(key: string) {
  return PRESET_STATUS_PALETTE[key] || hashStatusPalette(key);
}

// 状态配置（已废弃，保留引用）
export const JOB_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {};

// ========== 求职助手（后端） ==========
export interface ProjectExperience {
  id: number;
  title: string;
  role: string;
  start_date: string | null;   // ISO date
  end_date: string | null;
  description: string;
  tech_stack: string;
  highlights: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectExperienceCreate {
  title: string;
  role: string;
  start_date?: string | null;
  end_date?: string | null;
  description: string;
  tech_stack?: string;
  highlights?: string;
}

export interface JDRecord {
  id: number;
  company: string;
  position: string;
  source_text: string;
  raw_type: 'text' | 'image';
  raw_file_path: string | null;
  uploaded_at: string;
}

export interface GreetingVersion {
  style: string;
  content: string;
}

export interface GreetingResponse {
  results: GreetingVersion[];
  model_used: string;
  raw_used_jd: string;
}

export interface RewriteResult {
  experience_id: number;
  original_title: string;
  original: string;
  rewritten: string;
  match_score: number;
}

export interface RewriteResponse {
  results: RewriteResult[];
  model_used: string;
  raw_used_jd: string;
}
