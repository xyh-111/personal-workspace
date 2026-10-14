import { useEffect, useState } from 'react';
import { useToast } from '../../components/Toast';
import { GlassCard } from '../../components/ui';
import {
  PlusIcon, EditIcon, TrashIcon,
} from '../../components/icons';
import {
  experiencesApi, jdApi, aiApi, BackendError,
} from '../../utils/api';
import type {
  ProjectExperience, ProjectExperienceCreate,
  JDRecord, GreetingVersion, RewriteResult,
} from '../../types';

type TabKey = 'greeting' | 'rewrite' | 'experiences';

function TabIcon({ n }: { n: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" stroke="none">{n}</text>
    </svg>
  );
}

function CareerAssistantPage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('greeting');

  // --- JD ---
  const [jdList, setJdList] = useState<JDRecord[]>([]);
  const [selectedJD, setSelectedJD] = useState<JDRecord | null>(null);
  const [jdTextInput, setJdTextInput] = useState('');
  const [jdLoading, setJdLoading] = useState(false);
  const [isJDImgOpen, setIsJDImgOpen] = useState(false);
  const [jdImg, setJdImg] = useState<File | null>(null);

  // --- Experiences ---
  const [expList, setExpList] = useState<ProjectExperience[]>([]);
  const [selectedExpIds, setSelectedExpIds] = useState<number[]>([]);
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<ProjectExperience | null>(null);
  const [expForm, setExpForm] = useState<ProjectExperienceCreate>({
    title: '', role: '', description: '', tech_stack: '', highlights: '',
    start_date: null, end_date: null,
  });

  // --- Greeting state ---
  const [greetingLoading, setGreetingLoading] = useState(false);
  const [greetingResult, setGreetingResult] = useState<GreetingVersion[] | null>(null);

  // --- Rewrite state ---
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<RewriteResult[] | null>(null);

  // 初始加载
  useEffect(() => {
    refreshAll();
  }, []);

  const refreshAll = async () => {
    try {
      const [exps, jds] = await Promise.all([experiencesApi.list(), jdApi.list()]);
      setExpList(exps);
      setJdList(jds);
      if (jds.length > 0 && !selectedJD) setSelectedJD(jds[0]);
    } catch (e) {
      if ((e as BackendError).status === 0) {
        toast.error('后端未启动，请先 `cd backend && uvicorn app.main:app --reload`');
      } else {
        toast.error((e as Error).message);
      }
    }
  };

  // ========== JD ==========
  const handleUploadText = async () => {
    if (!jdTextInput.trim()) { toast.error('JD 文本不能为空'); return; }
    try {
      setJdLoading(true);
      const rec = await jdApi.uploadText(jdTextInput.trim());
      setJdList((l) => [rec, ...l]);
      setSelectedJD(rec);
      setJdTextInput('');
      toast.success('JD 已上传');
    } catch (e) { toast.error((e as Error).message); }
    finally { setJdLoading(false); }
  };

  const handleUploadImage = async () => {
    if (!jdImg) return;
    try {
      setJdLoading(true);
      const rec = await jdApi.uploadImage(jdImg);
      setJdList((l) => [rec, ...l]);
      setSelectedJD(rec);
      toast.success('JD 图片已解析');
      setIsJDImgOpen(false); setJdImg(null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setJdLoading(false); }
  };

  const handleDeleteJD = async (id: number) => {
    if (!confirm('删除这条 JD 历史？')) return;
    try {
      await jdApi.delete(id);
      setJdList((l) => l.filter((j) => j.id !== id));
      if (selectedJD?.id === id) setSelectedJD(null);
      toast.success('已删除');
    } catch (e) { toast.error((e as Error).message); }
  };

  // ========== Greeting ==========
  const runGreeting = async () => {
    const jd_text = selectedJD?.source_text || jdTextInput.trim();
    const jd_id = selectedJD?.id;
    if (!jd_text && jd_id == null) { toast.error('请先选 JD 或粘贴文本'); return; }
    setGreetingLoading(true); setGreetingResult(null);
    try {
      const resp = await aiApi.greeting({
        jd_id, jd_text: jd_text || undefined,
        styles: ['简洁', '热情', '专业'],
      });
      setGreetingResult(resp.results);
      toast.success(`生成成功（${resp.model_used}）`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setGreetingLoading(false); }
  };

  const copyText = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast.success('已复制');
    } catch { toast.error('复制失败'); }
  };

  // ========== Rewrite ==========
  const toggleExp = (id: number) => {
    setSelectedExpIds((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  };

  const runRewrite = async () => {
    if (selectedExpIds.length === 0) { toast.error('先勾选要改写的项目'); return; }
    const jd_text = selectedJD?.source_text || jdTextInput.trim();
    const jd_id = selectedJD?.id;
    if (!jd_text && jd_id == null) { toast.error('请先选 JD 或粘贴文本'); return; }
    setRewriteLoading(true); setRewriteResult(null);
    try {
      const resp = await aiApi.rewrite({
        jd_id, jd_text: jd_text || undefined,
        experience_ids: selectedExpIds,
      });
      setRewriteResult(resp.results);
      toast.success(`改写成功（${resp.model_used}）`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setRewriteLoading(false); }
  };

  // ========== Experiences CRUD ==========
  const openAddExp = () => {
    setEditingExp(null);
    setExpForm({
      title: '', role: '', description: '', tech_stack: '', highlights: '',
      start_date: null, end_date: null,
    });
    setExpModalOpen(true);
  };
  const openEditExp = (e: ProjectExperience) => {
    setEditingExp(e);
    setExpForm({
      title: e.title, role: e.role, description: e.description,
      tech_stack: e.tech_stack, highlights: e.highlights,
      start_date: e.start_date, end_date: e.end_date,
    });
    setExpModalOpen(true);
  };

  const saveExp = async () => {
    if (!expForm.title.trim() || !expForm.role.trim() || !expForm.description.trim()) {
      toast.error('标题/角色/描述 必填'); return;
    }
    try {
      if (editingExp) {
        const updated = await experiencesApi.update(editingExp.id, expForm);
        setExpList((l) => l.map((x) => x.id === updated.id ? updated : x));
        toast.success('已更新');
      } else {
        const created = await experiencesApi.create(expForm);
        setExpList((l) => [created, ...l]);
        toast.success('已添加');
      }
      setExpModalOpen(false);
    } catch (e) { toast.error((e as Error).message); }
  };

  const deleteExp = async (id: number) => {
    if (!confirm('删除这条项目经历？')) return;
    try {
      await experiencesApi.delete(id);
      setExpList((l) => l.filter((x) => x.id !== id));
      setSelectedExpIds((s) => s.filter((x) => x !== id));
      toast.success('已删除');
    } catch (e) { toast.error((e as Error).message); }
  };

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'greeting', label: '打招呼语', icon: '1' },
    { key: 'rewrite', label: '项目经历改写', icon: '2' },
    { key: 'experiences', label: '项目经历库', icon: '3' },
  ];

  return (
    <div className="space-y-5">
      {/* 标题 */}
      <div className="flex items-end justify-between animate-fade-up">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">求职助手</h1>
          <p className="text-[13px] text-[var(--text-3)] mt-1">
            JD 上传 · AI 打招呼语 · AI 项目经历改写
          </p>
        </div>
        <span className="text-xs text-[var(--text-4)]">后端 FastAPI + LangGraph</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        {/* ===== 左侧 JD 面板 ===== */}
        <div className="ds-card p-5 animate-fade-up delay-75">
          <h3 className="text-sm font-medium text-[var(--text-1)] mb-3">JD 输入</h3>

          <textarea
            value={jdTextInput}
            onChange={(e) => setJdTextInput(e.target.value)}
            placeholder="直接粘贴 JD 文本到这里..."
            rows={6}
            className="ds-input font-sans text-sm leading-relaxed resize-none mb-3"
          />
          <div className="flex gap-2">
            <button onClick={handleUploadText} disabled={jdLoading || !jdTextInput.trim()}
              className="ds-btn-primary flex-1 disabled:opacity-60">
              {jdLoading ? '上传中...' : '上传文本 JD'}
            </button>
            <button onClick={() => setIsJDImgOpen(true)}
              className="ds-btn-ghost">图片</button>
          </div>

          {/* 历史 JD */}
          <div className="mt-4">
            <p className="text-xs text-[var(--text-3)] mb-2">历史 JD（{jdList.length}）</p>
            {jdList.length === 0 ? (
              <p className="text-xs text-[var(--text-4)] text-center py-4 border border-dashed border-[var(--border)] rounded-md">
                暂无，先上传一个 JD
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[240px] ds-scroll-area pr-1">
                {jdList.map((j) => (
                  <div
                    key={j.id}
                    onClick={() => setSelectedJD(j)}
                    className={`group cursor-pointer p-2.5 rounded-md border transition-all ${
                      selectedJD?.id === j.id
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-1)] truncate">
                          {j.position || '(未填岗位)'}
                          {j.company && <span className="text-[var(--text-3)]"> · {j.company}</span>}
                        </p>
                        <p className="text-[11px] text-[var(--text-4)] mt-0.5 truncate">
                          {j.source_text.slice(0, 50)}...
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteJD(j.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-3)] hover:text-[#f53f3f] hover:bg-[#fff1f0] transition-all"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedJD && (
            <p className="text-[11px] text-[var(--accent)] mt-3">
              当前选中 #{selectedJD.id} · {selectedJD.position || '未填岗位'}
            </p>
          )}
        </div>

        {/* ===== 右侧主区域 ===== */}
        <div className="animate-fade-up delay-100">
          {/* Tab 切换 */}
          <div className="ds-card p-1.5 inline-flex items-center gap-1 mb-5">
            {tabs.map((t) => (
              <button key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3.5 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5 ${
                  tab === t.key
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                }`}
              >
                <TabIcon n={t.icon} />{t.label}
              </button>
            ))}
          </div>

          {/* Tab 内容 */}
          {tab === 'greeting' && (
            <div className="space-y-4">
              <GlassCard hoverable={false} padding="md">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-[var(--text-1)] mb-1">生成 HR 打招呼语</h3>
                    <p className="text-xs text-[var(--text-3)]">
                      基于当前选中的 JD，AI 生成 3 版不同风格的打招呼语
                    </p>
                  </div>
                  <button onClick={runGreeting} disabled={greetingLoading}
                    className="ds-btn-primary disabled:opacity-60 shrink-0">
                    {greetingLoading ? '生成中...' : '✨ 生成'}
                  </button>
                </div>
              </GlassCard>

              {greetingLoading && (
                <div className="ds-card p-10 text-center">
                  <div className="text-xs text-[var(--text-3)] mb-2">AI 正在分析 JD 并生成...</div>
                  <div className="inline-block w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                </div>
              )}

              {greetingResult && (
                <div className="space-y-3">
                  {greetingResult.map((v, idx) => (
                    <GlassCard key={v.style} hoverable={false} padding="md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--text-4)] tabular-nums">#{idx + 1}</span>
                          <span className="text-xs font-medium text-[var(--text-1)]">{v.style}版</span>
                        </div>
                        <button onClick={() => copyText(v.content)}
                          className="text-xs text-[var(--accent)] hover:underline">复制</button>
                      </div>
                      <pre className="text-sm text-[var(--text-2)] whitespace-pre-wrap font-sans leading-relaxed">
                        {v.content}
                      </pre>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'rewrite' && (
            <div className="space-y-4">
              <GlassCard hoverable={false} padding="md">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-[var(--text-1)] mb-1">AI 改写项目经历</h3>
                    <p className="text-xs text-[var(--text-3)]">
                      勾选左侧项目经历 → AI 对照当前 JD 关键词重写 STAR 结构
                    </p>
                    {selectedExpIds.length > 0 && (
                      <p className="text-xs text-[var(--accent)] mt-1">
                        已选 {selectedExpIds.length} 条
                      </p>
                    )}
                  </div>
                  <button onClick={runRewrite} disabled={rewriteLoading}
                    className="ds-btn-primary disabled:opacity-60 shrink-0">
                    {rewriteLoading ? '改写中...' : '✨ 改写选中项目'}
                  </button>
                </div>
              </GlassCard>

              <div className="ds-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-[var(--text-3)]">从项目经历库勾选要改写的条目</p>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedExpIds(expList.map((e) => e.id))}
                      className="text-xs text-[var(--accent)] hover:underline">全选</button>
                    <button onClick={() => setSelectedExpIds([])}
                      className="text-xs text-[var(--text-4)] hover:text-[var(--text-1)]">清空</button>
                  </div>
                </div>
                {expList.length === 0 ? (
                  <p className="text-xs text-[var(--text-4)] text-center py-6 border border-dashed rounded-md border-[var(--border)]">
                    先去「项目经历库」Tab 添加经历
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {expList.map((e) => {
                      const active = selectedExpIds.includes(e.id);
                      return (
                        <button key={e.id} onClick={() => toggleExp(e.id)}
                          className={`text-left p-3 rounded-md border transition-all ${
                            active
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                              : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                          }`}>
                          <p className="text-sm font-medium text-[var(--text-1)] truncate">{e.title}</p>
                          <p className="text-[11px] text-[var(--text-3)] truncate">{e.role}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {rewriteLoading && (
                <div className="ds-card p-10 text-center">
                  <div className="text-xs text-[var(--text-3)] mb-2">AI 正在逐条改写（含安全检查）...</div>
                  <div className="inline-block w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                </div>
              )}

              {rewriteResult && (
                <div className="space-y-4">
                  {rewriteResult.map((r) => (
                    <GlassCard key={r.experience_id} hoverable={false} padding="md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text-1)]">{r.original_title}</span>
                          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                            匹配度 {(r.match_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <button onClick={() => copyText(r.rewritten)}
                          className="text-xs text-[var(--accent)] hover:underline">复制改写</button>
                      </div>
                      <details className="text-xs text-[var(--text-4)]">
                        <summary className="cursor-pointer hover:text-[var(--text-2)]">
                          展开看原文（{r.original.slice(0, 30)}...）
                        </summary>
                        <pre className="mt-2 text-[var(--text-3)] whitespace-pre-wrap font-sans">
                          {r.original}
                        </pre>
                      </details>
                      <pre className="mt-3 text-sm text-[var(--text-2)] whitespace-pre-wrap font-sans leading-relaxed">
                        {r.rewritten}
                      </pre>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'experiences' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--text-3)]">共 {expList.length} 条项目经历</p>
                <button onClick={openAddExp} className="ds-btn-primary">
                  <PlusIcon /> 新增项目
                </button>
              </div>

              {expList.length === 0 ? (
                <div className="ds-card p-10 text-center">
                  <p className="text-sm text-[var(--text-3)] mb-3">还没项目经历</p>
                  <button onClick={openAddExp} className="ds-btn-primary">添加第一条</button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {expList.map((e) => (
                    <div key={e.id} className="ds-card p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-[var(--text-1)]">{e.title}</h4>
                          <p className="text-xs text-[var(--text-3)] mt-0.5">
                            {e.role}
                            {e.start_date && ` · ${e.start_date}${e.end_date ? ' → ' + e.end_date : '至今'}`}
                          </p>
                          {e.tech_stack && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {e.tech_stack.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                                <span key={t} className="ds-tag"
                                  style={{ background: 'rgba(22,119,255,0.08)', color: '#1677ff', fontSize: 11, padding: '1px 8px' }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                          {e.highlights && (
                            <p className="text-xs text-[var(--text-4)] mt-2">💡 {e.highlights}</p>
                          )}
                          <p className="text-xs text-[var(--text-2)] mt-2 line-clamp-3">
                            {e.description}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEditExp(e)}
                            className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]">
                            <EditIcon />
                          </button>
                          <button onClick={() => deleteExp(e.id)}
                            className="p-1.5 rounded-md text-[var(--text-3)] hover:text-[#f53f3f] hover:bg-[#fff1f0]">
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== 新增/编辑经历弹窗 ===== */}
      {expModalOpen && (
        <div className="ds-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ds-modal ds-card w-full max-w-xl max-h-[90vh] ds-scroll-area shadow-[var(--shadow-lg)]">
            <div className="p-6">
              <h3 className="text-base font-medium text-[var(--text-1)] mb-5">
                {editingExp ? '编辑项目经历' : '新增项目经历'}
              </h3>
              <div className="space-y-3.5">
                <input type="text" value={expForm.title}
                  onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                  className="ds-input" placeholder="项目名称 *" />
                <input type="text" value={expForm.role}
                  onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
                  className="ds-input" placeholder="你的角色 *（如：前端技术负责人）" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={expForm.start_date || ''}
                    onChange={(e) => setExpForm({ ...expForm, start_date: e.target.value || null })}
                    className="ds-input" />
                  <input type="date" value={expForm.end_date || ''}
                    onChange={(e) => setExpForm({ ...expForm, end_date: e.target.value || null })}
                    className="ds-input" />
                </div>
                <input type="text" value={expForm.tech_stack}
                  onChange={(e) => setExpForm({ ...expForm, tech_stack: e.target.value })}
                  className="ds-input" placeholder="技术栈（逗号分隔：React, TypeScript, Vite）" />
                <textarea value={expForm.description} rows={5}
                  onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
                  className="ds-input font-sans text-sm leading-relaxed"
                  placeholder="项目描述（STAR 结构：情境—任务—行动—结果）*" />
                <textarea value={expForm.highlights} rows={2}
                  onChange={(e) => setExpForm({ ...expForm, highlights: e.target.value })}
                  className="ds-input font-sans text-sm leading-relaxed"
                  placeholder="亮点 / 量化成果（如：性能提升 40%、日活破 100w）" />
              </div>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setExpModalOpen(false)} className="ds-btn-ghost">取消</button>
                <button onClick={saveExp} className="ds-btn-primary">
                  {editingExp ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== JD 图片上传弹窗 ===== */}
      {isJDImgOpen && (
        <div className="ds-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="ds-modal ds-card w-full max-w-md shadow-[var(--shadow-lg)] p-6">
            <h3 className="text-base font-medium text-[var(--text-1)] mb-3">上传 JD 图片</h3>
            <input type="file" accept="image/*"
              onChange={(e) => setJdImg(e.target.files?.[0] || null)}
              className="ds-input text-sm" />
            {jdImg && (
              <p className="text-xs text-[var(--accent)] mt-2">已选：{jdImg.name}</p>
            )}
            <p className="text-[11px] text-[var(--text-4)] mt-3">
              提示：图片 OCR（pytesseract）对中文识别一般，粘贴文本效果更好。
              如需更高质量 OCR，可在后续接外部 Vision API。
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setIsJDImgOpen(false)} className="ds-btn-ghost">取消</button>
              <button onClick={handleUploadImage} disabled={!jdImg || jdLoading}
                className="ds-btn-primary disabled:opacity-60">
                {jdLoading ? '解析中...' : '上传并解析'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CareerAssistantPage;
