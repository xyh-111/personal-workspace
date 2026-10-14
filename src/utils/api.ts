/** FastAPI 后端 client — 统一 fetch + 错误处理 + timeout
 *
 * 所有请求走 /api/* 前缀，Vite dev 下代理到 FastAPI。
 * 后端没启动时 fetch 会抛 NetworkError，UI 层 catch 住 toast 即可。
 */
import type {
  ProjectExperience, ProjectExperienceCreate,
  JDRecord,
  GreetingResponse, RewriteResponse,
} from '../types';

const BASE = '/api';
const TIMEOUT = 60_000; // 60s — LangGraph 两个 node 串起来可能要久一点

export class BackendError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(BASE + path, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const text = await resp.text();
    let data: any;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!resp.ok) {
      const detail = data?.detail || (typeof data === 'string' ? data : '请求失败');
      throw new BackendError(detail, resp.status);
    }
    return data as T;
  } catch (e: any) {
    if (e instanceof BackendError) throw e;
    if (e?.name === 'AbortError') throw new BackendError('请求超时（后端响应慢）', 408);
    // NetworkError — 后端大概率没启动
    throw new BackendError(
      `后端不可用（${e?.message || 'NetworkError'}）。请确认 FastAPI 已启动在 http://127.0.0.1:8000`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}

// ========== Project Experiences ==========
export const experiencesApi = {
  list: () => request<ProjectExperience[]>('/experiences'),
  get: (id: number) => request<ProjectExperience>(`/experiences/${id}`),
  create: (payload: ProjectExperienceCreate) =>
    request<ProjectExperience>('/experiences', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: number, payload: Partial<ProjectExperienceCreate>) =>
    request<ProjectExperience>(`/experiences/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (id: number) => request<{ ok: boolean; id: number }>(`/experiences/${id}`, { method: 'DELETE' }),
};

// ========== JD ==========
export const jdApi = {
  list: () => request<JDRecord[]>('/jd'),
  get: (id: number) => request<JDRecord>(`/jd/${id}`),
  delete: (id: number) => request<{ ok: boolean; id: number }>(`/jd/${id}`, { method: 'DELETE' }),

  /** 上传 JD 文本 */
  uploadText: (text: string, company?: string, position?: string) =>
    request<JDRecord>('/jd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        text,
        ...(company ? { company } : {}),
        ...(position ? { position } : {}),
      }).toString(),
    }),

  /** 上传 JD 图片（multipart/form-data） */
  uploadImage: async (file: File, company?: string, position?: string): Promise<JDRecord> => {
    const form = new FormData();
    form.append('image', file);
    if (company) form.append('company', company);
    if (position) form.append('position', position);
    return request<JDRecord>('/jd', {
      method: 'POST',
      headers: {},   // 让浏览器自动带 Content-Type: multipart/form-data
      body: form as any,
    });
  },
};

// ========== AI ==========
export const aiApi = {
  greeting: (payload: { jd_id?: number; jd_text?: string; styles?: string[] }) =>
    request<GreetingResponse>('/ai/greeting', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  rewrite: (payload: {
    jd_id?: number; jd_text?: string; experience_ids: number[];
  }) =>
    request<RewriteResponse>('/ai/rewrite', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
