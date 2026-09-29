/**
 * AI Provider 配置 + 调用封装
 *
 * 统一接口：OpenAI Chat Completions
 * 大部分 Chat 模型供应商都兼容这套协议（DeepSeek / OpenAI / 阿里通义 / 豆包 / 智谱...）
 * 用户可在 UI 里选预设 provider 或填自定义 baseURL
 */

import { loadApiKey } from './crypto';

export interface ProviderConfig {
  key: string;           // UI 内部标识
  label: string;         // 显示名
  baseURL: string;       // API base URL（不要带 /chat/completions，fetch 会自动拼）
  defaultModel: string;  // 默认模型名
  popularModels: string[]; // 下拉推荐列表
}

export const AI_PROVIDERS: ProviderConfig[] = [
  {
    key: 'deepseek',
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    popularModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    key: 'openai',
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    popularModels: ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
  },
  {
    key: 'dashscope',
    label: '阿里百炼 (DashScope)',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    popularModels: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
  },
  {
    key: 'doubao',
    label: '火山方舟 (豆包)',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'ep-20250210...', // 用户要填 endpoint id
    popularModels: ['请填自定义 endpoint'],
  },
  {
    key: 'zhipu',
    label: '智谱 AI',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    popularModels: ['glm-4-flash', 'glm-4-plus'],
  },
  {
    key: 'custom',
    label: '自定义',
    baseURL: '',
    defaultModel: '',
    popularModels: [],
  },
];

export function getProvider(key: string): ProviderConfig | undefined {
  return AI_PROVIDERS.find((p) => p.key === key);
}

/** 从 provider 配置拼完整的 chat-completions URL */
export function buildChatURL(baseURL: string): string {
  let u = baseURL.trim();
  if (u.endsWith('/')) u = u.slice(0, -1);
  if (u.endsWith('/chat/completions')) return u;
  return u + '/chat/completions';
}

/**
 * Chat Completions 调用
 * 返回 assistant 回复文本。
 * 抛出的错误带 .message 给 UI 直接展示。
 */
export async function chatCompletion(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}): Promise<string> {
  const cfg = await loadApiKey();
  if (!cfg) throw new Error('未配置 API Key，请先点击右上角「AI 设置」填写 Key');

  const provider = getProvider(cfg.provider);
  const baseURL = cfg.provider === 'custom'
    ? (cfg.customBaseURL || '').trim()
    : (provider?.baseURL || '');

  if (!baseURL) throw new Error('API Base URL 为空，请检查「AI 设置」');

  const url = buildChatURL(baseURL);

  const body = {
    model: cfg.model,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user',   content: params.userPrompt },
    ],
    temperature: params.temperature ?? 0.3,
    response_format: { type: 'json_object' },
  };

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    if ((e as any)?.name === 'TimeoutError') throw new Error('请求超时（60s），检查网络或换更快的模型');
    throw new Error('网络错误：' + ((e as any)?.message || String(e)));
  }

  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.json()).error?.message || ''; } catch { /* ignore */ }
    if (!detail) {
      try { detail = await resp.text(); } catch { /* ignore */ }
    }
    const hint = resp.status === 401 ? '（API Key 无效或已过期）'
      : resp.status === 404 ? '（Base URL 错误，检查 provider 设置）'
      : resp.status === 429 ? '（调用太频繁，稍后重试）' : '';
    throw new Error(`HTTP ${resp.status} ${hint} ${detail}`.trim());
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('模型返回为空');
  return content as string;
}

/**
 * 知识库 AI 导入的 System Prompt
 * 要求模型输出严格 JSON，每条带 title / category / content / tags
 */
export const KNOWLEDGE_IMPORT_SYSTEM_PROMPT = `你是一个知识整理助手。
用户会给你一段原始文本（可能是笔记、文章、书籍章节、面试题、课程大纲等），
请把它拆分成若干条结构化知识条目，便于用户存入个人知识库。

严格遵守以下规则：
1. 输出必须是**纯 JSON 对象**，不要有 Markdown 代码块标记（\`\`\`json），不要有任何解释文字。
2. JSON 结构：{ "items": [ ... ] }
3. 每个 item 字段：
   - title    (string, 20字以内的清晰标题，概括这条知识的核心)
   - category (string, 从文本中推断最合适的分类，如：前端开发 / 后端开发 / 计算机网络 / 算法与数据结构 / 操作系统 / 数据库 / 设计模式 / 工具技巧 / 其他)
   - tags     (string[], 3-8 个相关关键词，英文用 snake_case 或小写，中文直接写)
   - content  (string, Markdown 格式的正文，保留层级标题、列表、代码块，完整但精炼)
4. 如果原始文本信息不足，能提炼就提炼，提炼不了就跳过那条，不要输出空 title 或空 content 的条目。
5. content 中的代码必须用 \`\`\`language ... \`\`\` 包裹。
6. 输出语言默认跟随用户输入的语言（中文输入 → 中文输出；英文输入 → 英文输出）。
7. 如果只有一个知识点，也要放在 items 数组里（只有一个元素）。`;

/**
 * 解析 AI 返回的 JSON（容忍一些常见格式错误）
 */
export function parseAIResponse(raw: string): { title: string; category: string; content: string; tags: string[] }[] {
  let text = raw.trim();

  // 去掉包裹的 ```json ... ``` 代码块
  if (text.startsWith('```')) {
    const end = text.lastIndexOf('```');
    if (end > 0) text = text.slice(text.indexOf('\n') + 1, end).trim();
  }

  // 尝试直接 JSON.parse
  try {
    const obj = JSON.parse(text);
    return extractItems(obj);
  } catch { /* 继续 */ }

  // 尝试在文本里找第一个 { ... } 的 JSON 对象
  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    const jsonLike = text.slice(braceStart, braceEnd + 1);
    try {
      const obj = JSON.parse(jsonLike);
      return extractItems(obj);
    } catch { /* 继续 */ }
  }

  // 尝试找 [ ... ] 数组
  const arrStart = text.indexOf('[');
  const arrEnd = text.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
    try {
      const arr = JSON.parse(text.slice(arrStart, arrEnd + 1));
      if (Array.isArray(arr)) return normalize(arr);
    } catch { /* 继续 */ }
  }

  throw new Error('AI 返回内容无法解析为 JSON，请重试或手动检查。\n\n收到的内容开头：\n' + text.slice(0, 300));
}

function extractItems(obj: any): any[] {
  if (Array.isArray(obj)) return normalize(obj);
  if (Array.isArray(obj?.items)) return normalize(obj.items);
  if (Array.isArray(obj?.data)) return normalize(obj.data);
  // 兜底：把整个 obj 当一条
  return normalize([obj]);
}

function normalize(raw: any[]): any[] {
  return raw
    .filter((r) => r && typeof r === 'object')
    .map((r) => ({
      title: String(r.title || r.name || '').trim().slice(0, 80),
      category: String(r.category || '其他').trim() || '其他',
      content: String(r.content || r.body || r.summary || '').trim(),
      tags: Array.isArray(r.tags)
        ? r.tags.map((t: any) => String(t).trim()).filter(Boolean)
        : [],
    }))
    .filter((r) => r.title && r.content);
}
