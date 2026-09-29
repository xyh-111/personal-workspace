// localStorage 存储工具
import type { KnowledgeItem, StudySession, JobApplication } from '../types';

const STORAGE_KEYS = {
  KNOWLEDGE: 'personal_workspace_knowledge',
  STUDY_SESSIONS: 'personal_workspace_study_sessions',
  JOB_APPLICATIONS: 'personal_workspace_job_applications',
  STUDY_TIMER: 'personal_workspace_study_timer',
  CUSTOM_CATEGORIES: 'personal_workspace_custom_categories',
  CUSTOM_JOB_STATUSES: 'personal_workspace_custom_job_statuses',
  CUSTOM_JOB_CHANNELS: 'personal_workspace_custom_job_channels',
} as const;

// 生成唯一 ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
};

// 通用存储读取
function loadData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

// 通用存储写入
function saveData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

// ========== 知识库 ==========
export function loadKnowledge() {
  return loadData<KnowledgeItem[]>(STORAGE_KEYS.KNOWLEDGE, []);
}

export function saveKnowledge(items: KnowledgeItem[]) {
  saveData(STORAGE_KEYS.KNOWLEDGE, items);
}

// ========== 学习记录 ==========
export function loadStudySessions() {
  return loadData<StudySession[]>(STORAGE_KEYS.STUDY_SESSIONS, []);
}

export function saveStudySessions(sessions: StudySession[]) {
  saveData(STORAGE_KEYS.STUDY_SESSIONS, sessions);
}

// 学习计时器状态（用于页面刷新恢复）
export interface StudyTimerState {
  isRunning: boolean;
  startTime: number | null;
  accumulatedSeconds: number;
}

export function loadStudyTimer(): StudyTimerState {
  return loadData<StudyTimerState>(STORAGE_KEYS.STUDY_TIMER, {
    isRunning: false,
    startTime: null,
    accumulatedSeconds: 0,
  });
}

export function saveStudyTimer(state: StudyTimerState) {
  saveData(STORAGE_KEYS.STUDY_TIMER, state);
}

// ========== 初始化标记 ==========
// 以前用 "数据为空" 当首次运行判断 → 全部删完也会重新塞默认数据
// 现在用独立 flag，一次初始化过就永远是用户的真实数据
const INIT_FLAG_KEY = 'personal_workspace_initialized_v1';

export function isFirstRun(): boolean {
  return !localStorage.getItem(INIT_FLAG_KEY);
}

export function markInitialized(): void {
  localStorage.setItem(INIT_FLAG_KEY, '1');
}

// ========== 简历投递 ==========
export function loadJobApplications() {
  return loadData<JobApplication[]>(STORAGE_KEYS.JOB_APPLICATIONS, []);
}

export function saveJobApplications(applications: JobApplication[]) {
  saveData(STORAGE_KEYS.JOB_APPLICATIONS, applications);
}

// 日期工具
export function formatDate(date: Date | number | string = new Date()): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTime(date: Date | number): string {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDurationShort(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`;
}

// ========== 自定义分类 ==========
export function loadCustomCategories(): string[] {
  return loadData<string[]>(STORAGE_KEYS.CUSTOM_CATEGORIES, []);
}
export function saveCustomCategories(categories: string[]) {
  saveData(STORAGE_KEYS.CUSTOM_CATEGORIES, categories);
}

// ========== 求职看板 · 自定义状态 ==========
export function loadCustomJobStatuses(): string[] {
  return loadData<string[]>(STORAGE_KEYS.CUSTOM_JOB_STATUSES, []);
}
export function saveCustomJobStatuses(statuses: string[]) {
  saveData(STORAGE_KEYS.CUSTOM_JOB_STATUSES, statuses);
}

// ========== 求职看板 · 自定义渠道 ==========
export function loadCustomJobChannels(): string[] {
  return loadData<string[]>(STORAGE_KEYS.CUSTOM_JOB_CHANNELS, []);
}
export function saveCustomJobChannels(channels: string[]) {
  saveData(STORAGE_KEYS.CUSTOM_JOB_CHANNELS, channels);
}

// 月份格式化
export function formatMonth(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
