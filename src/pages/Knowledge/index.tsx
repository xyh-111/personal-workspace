import { useEffect, useState, useMemo } from 'react';
import { useToast } from '../../components/Toast';
import {
  SearchIcon, PlusIcon, EditIcon, TrashIcon, ChevronDownIcon,
} from '../../components/icons';
import {
  loadKnowledge, saveKnowledge, generateId,
  loadCustomCategories, saveCustomCategories,
  isFirstRun, markInitialized,
} from '../../utils/storage';
import type { KnowledgeItem } from '../../types';
import { KNOWLEDGE_CATEGORIES } from '../../types';
import {
  hasApiKeyConfigured, getApiKeyMeta, saveApiKey, clearApiKey,
} from '../../utils/crypto';
import {
  chatCompletion, parseAIResponse, KNOWLEDGE_IMPORT_SYSTEM_PROMPT,
  AI_PROVIDERS, getProvider,
} from '../../utils/ai';

const PRESET_CATEGORIES: string[] = [...KNOWLEDGE_CATEGORIES];

const sampleKnowledge: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'React Hooks 核心原理', category: '前端开发', tags: ['React', 'Hooks'],
    content: `## React Hooks 核心原理\n\n### useState\n- 状态管理 Hook，返回 [值, setter]\n- setState 触发重新渲染\n\n### useEffect\n- 处理副作用，替代生命周期\n- 返回清理函数（可选）\n\n### useMemo / useCallback\n- useMemo 缓存计算结果\n- useCallback 缓存函数引用\n\n### useRef\n- 可变 ref 对象，跨渲染周期保存数据`,
  },
  {
    title: 'HTTP 与 HTTPS 区别', category: '计算机网络', tags: ['HTTP', 'HTTPS'],
    content: `## HTTP 与 HTTPS 区别\n\n### 主要差异\n1. 端口：HTTP 80 / HTTPS 443\n2. HTTPS 使用 TLS/SSL 加密\n3. HTTPS 需要 CA 证书\n4. HTTPS 更安全`,
  },
  {
    title: '快速排序算法', category: '算法与数据结构', tags: ['算法', '排序'],
    content: `## 快速排序\n\n- 分治策略\n- 平均 O(n log n)\n- 最坏 O(n²)（已排序）\n- 空间 O(log n)`,
  },
  {
    title: 'TypeScript 高级类型', category: '前端开发', tags: ['TypeScript'],
    content: `## TS 高级类型\n\n- 条件类型 T extends X ? A : B\n- 映射类型 { [K in keyof T]: ... }\n- Partial / Required / Pick / Omit / Record`,
  },
  {
    title: '设计模式 - 单例与工厂', category: '设计模式', tags: ['设计模式'],
    content: `## 创建型设计模式\n\n### 单例\n- 一个类只有一个实例\n- 全局访问点\n\n### 工厂\n- 定义创建接口\n- 子类决定实例化哪个类`,
  },
];

const presetPalette: Record<string, { bg: string; text: string; bar: string }> = {
  '前端开发':       { bg: 'rgba(22,119,255,0.10)', text: '#1677ff', bar: '#1677ff' },
  '后端开发':       { bg: 'rgba(82,196,26,0.12)',  text: '#389e0d', bar: '#52c41a' },
  '算法与数据结构': { bg: 'rgba(250,140,22,0.12)', text: '#d46b08', bar: '#fa8c16' },
  '计算机网络':     { bg: 'rgba(114,46,209,0.12)', text: '#531dab', bar: '#722ed1' },
  '操作系统':       { bg: 'rgba(19,194,194,0.12)', text: '#08979c', bar: '#13c2c2' },
  '数据库':         { bg: 'rgba(47,84,235,0.12)',  text: '#1d39c4', bar: '#2f54eb' },
  '设计模式':       { bg: 'rgba(245,34,45,0.12)',  text: '#cf1322', bar: '#f5222d' },
  '工具技巧':       { bg: 'rgba(124,179,5,0.12)',  text: '#614700', bar: '#7cb305' },
  '其他':           { bg: 'rgba(148,163,184,0.15)', text: '#475569', bar: '#94a3b8' },
};

const customPalettePool = [
  { bg: 'rgba(19,194,194,0.12)', text: '#08979c', bar: '#13c2c2' },
  { bg: 'rgba(23,170,170,0.12)', text: '#067272', bar: '#13a8a8' },
  { bg: 'rgba(64,169,255,0.12)', text: '#0050b3', bar: '#1677ff' },
  { bg: 'rgba(250,84,28,0.12)',  text: '#d4380d', bar: '#fa541c' },
  { bg: 'rgba(114,46,209,0.12)', text: '#531dab', bar: '#722ed1' },
  { bg: 'rgba(24,144,255,0.10)', text: '#0958d9', bar: '#1890ff' },
  { bg: 'rgba(82,196,26,0.12)',  text: '#389e0d', bar: '#52c41a' },
  { bg: 'rgba(255,77,79,0.12)',  text: '#cf1322', bar: '#ff4d4f' },
];
function hashColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return customPalettePool[Math.abs(h) % customPalettePool.length];
}

function getCategoryPalette(name: string) {
  if (presetPalette[name]) return presetPalette[name];
  return hashColor(name);
}

// --- 小图标 ---
function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 15l.7 2.1L22 18l-2.3.9L19 21l-.7-2.1L16 18l2.3-.9L19 15z" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

interface AIParsedItem {
  title: string;
  category: string;
  content: string;
  tags: string[];
}

function KnowledgePage() {
  const toast = useToast();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    title: string; category: string; content: string; tags: string;
  }>({ title: '', category: PRESET_CATEGORIES[0], content: '', tags: '' });

  // 分类管理弹窗
  const [isCatMgrOpen, setIsCatMgrOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // AI 导入
  const [isAIImportOpen, setIsAIImportOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParsed, setAiParsed] = useState<AIParsedItem[] | null>(null);

  // AI 设置
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState(() => getApiKeyMeta());
  const [aiKeyInput, setAiKeyInput] = useState('');
  const [aiKeyVisible, setAiKeyVisible] = useState(false);
  const [aiKeyChanged, setAiKeyChanged] = useState(false);
  const [aiKeySaving, setAiKeySaving] = useState(false);

  const allCategories = useMemo(
    () => [...PRESET_CATEGORIES, ...customCategories],
    [customCategories]
  );

  useEffect(() => {
    let data = loadKnowledge();
    if (isFirstRun()) {
      const now = Date.now();
      data = sampleKnowledge.map((item, index) => ({
        ...item, id: generateId(),
        createdAt: now - (sampleKnowledge.length - index) * 86400000,
        updatedAt: now - (sampleKnowledge.length - index) * 86400000,
      }));
      saveKnowledge(data);
      markInitialized();
    }
    setItems(data);
    setCustomCategories(loadCustomCategories());
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === '全部' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ===== 分类管理 =====
  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    if (PRESET_CATEGORIES.includes(name) || customCategories.includes(name)) {
      toast.error('该分类已存在'); return;
    }
    const next = [...customCategories, name];
    setCustomCategories(next); saveCustomCategories(next);
    setNewCatName(''); toast.success(`已添加分类「${name}」`);
  };

  const handleDeleteCategory = (name: string) => {
    if (!customCategories.includes(name)) return;
    const usedCount = items.filter((i) => i.category === name).length;
    if (usedCount > 0) {
      toast.error(`「${name}」下还有 ${usedCount} 条知识，先删除或转移后再移除分类`);
      return;
    }
    if (!confirm(`确定删除分类「${name}」吗？`)) return;
    const next = customCategories.filter((c) => c !== name);
    setCustomCategories(next); saveCustomCategories(next);
    if (selectedCategory === name) setSelectedCategory('全部');
    toast.success('分类已删除');
  };

  // ===== 知识 CRUD =====
  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.content.trim()) return;
    const now = Date.now();
    const tags = formData.tags.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean);
    let updated: KnowledgeItem[];
    if (editingItem) {
      updated = items.map((item) =>
        item.id === editingItem.id
          ? { ...item, ...formData, tags, updatedAt: now }
          : item
      );
      toast.success('知识已更新');
    } else {
      const newItem: KnowledgeItem = {
        id: generateId(), title: formData.title,
        category: formData.category, content: formData.content, tags,
        createdAt: now, updatedAt: now,
      };
      updated = [newItem, ...items];
      toast.success('知识已添加');
    }
    setItems(updated); saveKnowledge(updated); closeModal();
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title, category: item.category,
      content: item.content, tags: item.tags.join(', '),
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated); saveKnowledge(updated);
    toast.success('已删除');
  };

  const openModal = () => {
    setEditingItem(null);
    setFormData({ title: '', category: allCategories[0] || PRESET_CATEGORIES[0], content: '', tags: '' });
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditingItem(null); };

  // ===== AI 导入流程 =====
  const closeAIImport = () => {
    setIsAIImportOpen(false);
    setAiInput('');
    setAiParsed(null);
  };

  const runAIImport = async () => {
    if (!aiInput.trim()) { toast.error('请输入要整理的文本'); return; }
    if (!hasApiKeyConfigured()) {
      toast.error('未配置 API Key，请先点击「AI 设置」填写');
      setIsAISettingsOpen(true);
      return;
    }
    setAiLoading(true);
    try {
      const raw = await chatCompletion({
        systemPrompt: KNOWLEDGE_IMPORT_SYSTEM_PROMPT,
        userPrompt: aiInput,
        temperature: 0.3,
      });
      const parsed = parseAIResponse(raw);
      if (parsed.length === 0) { toast.error('AI 没有解析出有效条目'); return; }
      setAiParsed(parsed);
      toast.success(`AI 解析成功，共 ${parsed.length} 条`);
    } catch (e: any) {
      toast.error(e?.message || 'AI 调用失败');
    } finally {
      setAiLoading(false);
    }
  };

  const confirmAIImport = () => {
    if (!aiParsed) return;
    const now = Date.now();
    const existingCats = new Set([...PRESET_CATEGORIES, ...customCategories]);
    const newCategories: string[] = [];
    aiParsed.forEach((p) => {
      if (!existingCats.has(p.category) && !newCategories.includes(p.category)) {
        newCategories.push(p.category);
      }
    });
    if (newCategories.length > 0) {
      const merged = [...customCategories, ...newCategories];
      setCustomCategories(merged); saveCustomCategories(merged);
      toast.info(`自动新增分类：${newCategories.join('、')}`);
    }
    const newItems: KnowledgeItem[] = aiParsed.map((p) => ({
      id: generateId(),
      title: p.title,
      category: p.category,
      tags: p.tags.slice(0, 10),
      content: p.content,
      createdAt: now, updatedAt: now,
    }));
    const updated = [...newItems, ...items];
    setItems(updated); saveKnowledge(updated);
    toast.success(`已导入 ${newItems.length} 条知识`);
    closeAIImport();
  };

  // ===== AI 设置流程 =====
  const openAISettings = () => {
    const meta = getApiKeyMeta();
    setAiSettings(meta);
    setAiKeyInput('');
    setAiKeyVisible(false);
    setAiKeyChanged(false);
    setIsAISettingsOpen(true);
  };

  const handleSaveAISettings = async () => {
    const provider = getProvider(aiSettings.provider);
    const customBaseURL = aiSettings.provider === 'custom' ? aiSettings.customBaseURL : undefined;
    const model = aiSettings.model?.trim() || provider?.defaultModel || '';
    if (!model) { toast.error('请填写模型名'); return; }
    if (aiSettings.provider === 'custom' && !customBaseURL) {
      toast.error('自定义 provider 请填写 Base URL'); return;
    }
    if (aiKeyChanged && !aiKeyInput.trim()) { toast.error('请填写 API Key'); return; }

    setAiKeySaving(true);
    try {
      // 如果 Key 没变，拿当前已保存的继续用
      const apiKey = aiKeyChanged ? aiKeyInput.trim() : (await loadApiKey())?.apiKey || '';
      if (!apiKey) { toast.error('API Key 为空'); return; }
      await saveApiKey({
        provider: aiSettings.provider,
        customBaseURL,
        model,
      });
      toast.success('AI 设置已保存');
      setAiKeyChanged(false);
      setIsAISettingsOpen(false);
      setAiSettings(getApiKeyMeta());
    } catch (e: any) {
      toast.error('保存失败：' + (e?.message || e));
    } finally {
      setAiKeySaving(false);
    }
  };

  const handleClearAIKey = async () => {
    if (!confirm('确定清除 API Key 吗？（配置会保留，下次只需重新填 Key）')) return;
    await clearApiKey();
    setAiSettings(getApiKeyMeta());
    setAiKeyInput(''); setAiKeyChanged(false);
    toast.success('API Key 已清除');
  };

  // 分类使用次数
  const categoryUsage = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach((i) => { m[i.category] = (m[i.category] || 0) + 1; });
    return m;
  }, [items]);

  const aiKeyMasked = aiSettings.configured ? (
    (() => {
      try {
        const stored = localStorage.getItem('kw_ai_key_chain');
        if (!stored) return '';
        // 只能知道长度，但不知道明文；显示固定格式 "已保存 · 点击查看/修改"
        return '';
      } catch { return ''; }
    })()
  ) : '';

  return (
    <div className="space-y-5">
      {/* 标题 */}
      <div className="flex items-end justify-between animate-fade-up">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">知识库</h1>
          <p className="text-[13px] text-[var(--text-3)] mt-1">
            共 {items.length} 条 · {allCategories.length} 个分类 · 点击卡片展开
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openAISettings} className="h-[32px] px-3 inline-flex items-center gap-1.5 text-xs rounded-full border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition-colors">
            <SettingsIcon /> AI 设置
          </button>
          <button onClick={() => setIsAIImportOpen(true)} className="ds-btn-ghost">
            <SparklesIcon /> AI 导入
          </button>
          <button onClick={openModal} className="ds-btn-primary">
            <PlusIcon /> 新增
          </button>
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative animate-fade-up delay-75">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-4)]">
          <SearchIcon />
        </span>
        <input
          type="text" placeholder="搜索标题、内容或标签..."
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="ds-input pl-9"
        />
      </div>

      {/* 分类筛选 + 管理 */}
      <div className="flex items-start gap-2 flex-wrap animate-fade-up delay-100">
        <div className="flex flex-wrap gap-1.5 flex-1">
          <button
            onClick={() => setSelectedCategory('全部')}
            className={`ds-segment ${selectedCategory === '全部' ? 'ds-segment-active' : ''}`}
          >
            全部 ({items.length})
          </button>
          {PRESET_CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`ds-segment ${selectedCategory === cat ? 'ds-segment-active' : ''}`}
              title="预置分类">
              {cat}{categoryUsage[cat] ? ` (${categoryUsage[cat]})` : ''}
            </button>
          ))}
          {customCategories.map((cat) => {
            const p = getCategoryPalette(cat);
            return (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`ds-segment ${selectedCategory === cat ? 'ds-segment-active' : ''}`}
                style={selectedCategory === cat ? {
                  background: p.bg, borderColor: p.bar, color: p.text,
                } : undefined}>
                <span className="inline-block w-1 h-1 rounded-full mr-1 align-middle" style={{ background: p.bar }} />
                {cat}{categoryUsage[cat] ? ` (${categoryUsage[cat]})` : ''}
              </button>
            );
          })}
        </div>
        <button onClick={() => setIsCatMgrOpen(true)}
          className="h-[28px] px-3 inline-flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--accent)] rounded-full border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors shrink-0">
          <SettingsIcon /> 管理分类
        </button>
      </div>

      {/* 知识列表 */}
      <div className="ds-scroll-area space-y-3 pr-1"
        style={{ maxHeight: 'calc(100vh - 360px)' }}>
        {filteredItems.map((item, idx) => {
          const isExpanded = expandedId === item.id;
          const p = getCategoryPalette(item.category);
          return (
            <div key={item.id} className="ds-card overflow-hidden animate-fade-up"
              style={{ animationDelay: `${idx * 40}ms` }}>
              <div className="px-5 py-4 flex items-start gap-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="ds-tag" style={{ background: p.bg, color: p.text }}>{item.category}</span>
                    {item.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-xs text-[var(--text-3)]">#{tag}</span>
                    ))}
                  </div>
                  <h3 className="text-[15px] font-medium text-[var(--text-1)] truncate">{item.title}</h3>
                  <p className="text-xs text-[var(--text-4)] mt-1 tabular-nums">
                    {new Date(item.updatedAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(item)}
                    className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors">
                    <EditIcon />
                  </button>
                  <button onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[#f53f3f] hover:bg-[#fff1f0] transition-colors">
                    <TrashIcon />
                  </button>
                  <ChevronDownIcon className={`text-[var(--text-4)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-[var(--border)] animate-fade-up">
                  <pre className="mt-4 text-sm text-[var(--text-2)] whitespace-pre-wrap font-sans leading-relaxed">
                    {item.content}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="ds-card py-14 text-center">
            <p className="text-sm text-[var(--text-3)]">暂无匹配的知识条目</p>
          </div>
        )}
      </div>

      {/* ===== 新增/编辑模态框 ===== */}
      {isModalOpen && (
        <div className="ds-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ds-modal ds-card w-full max-w-xl max-h-[90vh] ds-scroll-area shadow-[var(--shadow-lg)]">
            <div className="p-6">
              <h3 className="text-base font-medium text-[var(--text-1)] mb-5">
                {editingItem ? '编辑知识' : '新增知识'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[var(--text-3)] mb-1.5">标题 *</label>
                  <input type="text" value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="ds-input" placeholder="输入知识标题" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--text-3)] mb-1.5">分类</label>
                    <select value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="ds-input">
                      {PRESET_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      {customCategories.map((cat) => (
                        <option key={cat} value={cat}>自定义 · {cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-3)] mb-1.5">标签</label>
                    <input type="text" value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="ds-input" placeholder="React, Hooks" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-3)] mb-1.5">内容 *</label>
                  <textarea value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={10} className="ds-input font-mono text-[13px]" placeholder="输入知识内容..." />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={closeModal} className="ds-btn-ghost">取消</button>
                <button onClick={handleSubmit} className="ds-btn-primary">
                  {editingItem ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 分类管理弹窗 ===== */}
      {isCatMgrOpen && (
        <div className="ds-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ds-modal ds-card w-full max-w-md shadow-[var(--shadow-lg)]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-medium text-[var(--text-1)]">管理分类</h3>
                <button onClick={() => setIsCatMgrOpen(false)}
                  className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)] transition-colors">
                  <XIcon />
                </button>
              </div>
              <div className="flex gap-2 mb-5">
                <input type="text" value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  placeholder="输入新分类名称" className="ds-input flex-1" />
                <button onClick={handleAddCategory} className="ds-btn-primary">添加</button>
              </div>
              {customCategories.length === 0 && PRESET_CATEGORIES.length === 0 ? (
                <p className="text-xs text-[var(--text-4)] py-6 text-center border border-dashed rounded-md border-[var(--border)]">
                  暂无分类，上方输入框添加
                </p>
              ) : null}
              {PRESET_CATEGORIES.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-[var(--text-3)] mb-2 flex items-center gap-2">
                    <span className="inline-block w-1 h-1 rounded-full bg-[var(--text-4)]" />
                    预置分类（不可删除）
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_CATEGORIES.map((cat) => {
                      const p = getCategoryPalette(cat);
                      return (
                        <span key={cat} className="ds-tag"
                          style={{ background: p.bg, color: p.text }}>
                          {cat}{categoryUsage[cat] ? <span className="opacity-60 ml-1">· {categoryUsage[cat]}</span> : null}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-[var(--text-3)] mb-2 flex items-center gap-2">
                  <span className="inline-block w-1 h-1 rounded-full bg-[var(--accent)]" />
                  自定义分类（{customCategories.length}）
                </p>
                {customCategories.length === 0 ? (
                  <p className="text-xs text-[var(--text-4)] py-4 text-center border border-dashed rounded-md border-[var(--border)]">
                    暂无自定义分类，上方输入框添加
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {customCategories.map((cat) => {
                      const p = getCategoryPalette(cat);
                      const count = categoryUsage[cat] || 0;
                      return (
                        <div key={cat}
                          className="flex items-center justify-between px-3 py-2 rounded-md border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors group">
                          <span className="text-sm text-[var(--text-1)] flex items-center gap-2">
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: p.bar }} />
                            {cat}{count > 0 && <span className="text-xs text-[var(--text-3)]">· {count} 条</span>}
                          </span>
                          <button onClick={() => handleDeleteCategory(cat)}
                            className="text-xs text-[var(--text-4)] hover:text-[#f53f3f] hover:bg-[#fff1f0] px-2 py-1 rounded transition-colors">
                            删除
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== AI 导入模态框 ===== */}
      {isAIImportOpen && (
        <div className="ds-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ds-modal ds-card w-full max-w-2xl max-h-[90vh] ds-scroll-area shadow-[var(--shadow-lg)]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-medium text-[var(--text-1)] flex items-center gap-2">
                  <SparklesIcon /> AI 一键导入
                </h3>
                <button onClick={closeAIImport}
                  className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)] transition-colors">
                  <XIcon />
                </button>
              </div>
              <p className="text-xs text-[var(--text-3)] mb-5">
                粘贴原始文本（笔记、文章、书籍章节、面试题等），AI 会自动拆分成结构化知识条目
                {!aiSettings.configured && <span className="ml-1 text-[var(--accent)]">· 请先在「AI 设置」里填 API Key</span>}
              </p>

              {/* 输入区 */}
              {!aiParsed && (
                <>
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="例如：React Hooks 是 React 16.8 引入的特性，让函数组件也能拥有状态和副作用。主要包括 useState、useEffect、useMemo、useCallback、useRef 等..."
                    rows={10}
                    className="ds-input font-sans text-sm leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-[var(--text-4)]">
                      预计调用 {aiSettings.model || 'deepseek-chat'} · {aiSettings.provider || 'deepseek'}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={closeAIImport} className="ds-btn-ghost">取消</button>
                      <button
                        onClick={runAIImport}
                        disabled={aiLoading || !aiInput.trim()}
                        className="ds-btn-primary disabled:opacity-60 disabled:cursor-not-allowed">
                        {aiLoading ? '解析中...' : '✨ AI 解析'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 预览区 */}
              {aiParsed && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="px-3 py-1.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-medium">
                      解析成功 · {aiParsed.length} 条
                    </div>
                    <button onClick={() => setAiParsed(null)}
                      className="text-xs text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors underline-offset-2 hover:underline">
                      重新输入
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[420px] ds-scroll-area pr-2">
                    {aiParsed.map((p, idx) => {
                      const pal = getCategoryPalette(p.category);
                      return (
                        <div key={idx} className="p-4 rounded-lg border border-[var(--border)] bg-white/60 backdrop-blur-sm">
                          <div className="flex items-start gap-3">
                            <div className="text-[11px] text-[var(--text-4)] font-mono pt-0.5 w-5 shrink-0">{idx + 1}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="ds-tag" style={{ background: pal.bg, color: pal.text, fontSize: 11, padding: '1px 8px' }}>{p.category}</span>
                                {p.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="text-[11px] text-[var(--text-3)]">#{tag}</span>
                                ))}
                              </div>
                              <h4 className="text-sm font-medium text-[var(--text-1)] mb-1">{p.title}</h4>
                              <p className="text-xs text-[var(--text-3)] line-clamp-2">
                                {p.content.replace(/[#*`>\-]/g, '').trim().slice(0, 140)}
                                {p.content.length > 140 ? '...' : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2 mt-5">
                    <button onClick={closeAIImport} className="ds-btn-ghost">取消</button>
                    <button onClick={confirmAIImport} className="ds-btn-primary">
                      确认导入 {aiParsed.length} 条
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== AI 设置模态框 ===== */}
      {isAISettingsOpen && (
        <div className="ds-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ds-modal ds-card w-full max-w-md shadow-[var(--shadow-lg)]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-medium text-[var(--text-1)]">AI 设置</h3>
                <button onClick={() => setIsAISettingsOpen(false)}
                  className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)] transition-colors">
                  <XIcon />
                </button>
              </div>
              <p className="text-xs text-[var(--text-3)] mb-5">
                API Key 会用 AES-GCM 加密后存储在浏览器本地，不上传任何后端
              </p>

              <div className="space-y-4">
                {/* Provider */}
                <div>
                  <label className="block text-xs text-[var(--text-3)] mb-1.5">Provider</label>
                  <select
                    value={aiSettings.provider}
                    onChange={(e) => {
                      const p = getProvider(e.target.value);
                      setAiSettings((s) => ({
                        ...s,
                        provider: e.target.value,
                        customBaseURL: e.target.value === 'custom' ? s.customBaseURL : undefined,
                        model: p?.popularModels?.[0] || p?.defaultModel || '',
                      }));
                      setAiKeyChanged(true);
                    }}
                    className="ds-input"
                  >
                    {AI_PROVIDERS.map((p) => (
                      <option key={p.key} value={p.key}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* Custom baseURL */}
                {aiSettings.provider === 'custom' && (
                  <div>
                    <label className="block text-xs text-[var(--text-3)] mb-1.5">Base URL</label>
                    <input
                      type="text" value={aiSettings.customBaseURL || ''}
                      onChange={(e) => setAiSettings((s) => ({ ...s, customBaseURL: e.target.value }))}
                      placeholder="https://your-api.com/v1"
                      className="ds-input"
                    />
                  </div>
                )}

                {/* Model */}
                <div>
                  <label className="block text-xs text-[var(--text-3)] mb-1.5">模型</label>
                  <input
                    list="ai-model-list"
                    value={aiSettings.model}
                    onChange={(e) => setAiSettings((s) => ({ ...s, model: e.target.value }))}
                    className="ds-input" placeholder="deepseek-chat"
                  />
                  <datalist id="ai-model-list">
                    {(() => {
                      const p = getProvider(aiSettings.provider);
                      return p?.popularModels?.map((m) => <option key={m} value={m} />) || null;
                    })()}
                  </datalist>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-xs text-[var(--text-3)] mb-1.5">
                    API Key
                    {aiSettings.configured && !aiKeyChanged && (
                      <span className="ml-2 text-[var(--accent)]">· 已保存</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={aiKeyVisible ? 'text' : 'password'}
                      value={aiKeyInput}
                      onChange={(e) => { setAiKeyInput(e.target.value); setAiKeyChanged(true); }}
                      placeholder={aiSettings.configured && !aiKeyChanged ? '当前 Key 已加密保存，输入新 Key 以替换' : 'sk-...'}
                      className="ds-input pr-10"
                      autoComplete="off"
                    />
                    <button type="button" onClick={() => setAiKeyVisible((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
                      {aiKeyVisible ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6">
                {aiSettings.configured ? (
                  <button onClick={handleClearAIKey}
                    className="text-xs text-[#f53f3f] hover:text-[#cf1322] transition-colors">
                    清除 API Key
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button onClick={() => setIsAISettingsOpen(false)} className="ds-btn-ghost">取消</button>
                  <button onClick={handleSaveAISettings} disabled={aiKeySaving}
                    className="ds-btn-primary disabled:opacity-60">
                    {aiKeySaving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgePage;
