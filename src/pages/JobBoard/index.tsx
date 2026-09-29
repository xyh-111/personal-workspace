import { useEffect, useState, useMemo } from 'react';
import { useToast } from '../../components/Toast';
import {
  TrashIcon, SettingsIcon, ChartIcon,
} from '../../components/icons';
import {
  loadJobApplications, saveJobApplications, generateId, formatDate,
  loadCustomJobStatuses, saveCustomJobStatuses,
  loadCustomJobChannels, saveCustomJobChannels,
  isFirstRun, markInitialized,
} from '../../utils/storage';
import type { JobApplication, JobStatus } from '../../types';
import {
  PRESET_JOB_STATUSES, PRESET_JOB_CHANNELS,
  getStatusPalette,
} from '../../types';
import {
  ActionBar, StatCard, ProgressBar, Chip, Modal, GlassCard,
} from '../../components/ui';

const presetStatusKeys = PRESET_JOB_STATUSES.map((s) => s.key);
const presetStatusLabelMap: Record<string, string> = PRESET_JOB_STATUSES.reduce(
  (acc, s) => { acc[s.key] = s.label; return acc; }, {} as Record<string, string>
);
function getStatusLabel(key: string) {
  return presetStatusLabelMap[key] || key;
}

const sampleJobs: Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { company: '字节跳动', position: '前端工程师', channel: 'Boss直聘',
    applyDate: '2026-09-10', status: 'tech_interview', interviewDate: '2026-09-18', notes: '二面，准备项目复盘' },
  { company: '腾讯', position: 'Web前端开发', channel: '实习僧',
    applyDate: '2026-09-08', status: 'written', notes: '已收到笔试链接' },
  { company: '阿里巴巴', position: '前端技术专家', channel: '智联',
    applyDate: '2026-09-05', status: 'applied', notes: '等待回复中' },
  { company: '美团', position: 'React开发工程师', channel: 'Boss直聘',
    applyDate: '2026-09-01', status: 'hr_interview', interviewDate: '2026-09-20', notes: 'HR面谈，谈薪资' },
  { company: '京东', position: '前端开发', channel: 'Boss直聘',
    applyDate: '2026-08-28', status: 'rejected', notes: '技术一面挂，加强算法' },
  { company: '网易', position: '前端工程师', channel: '实习僧',
    applyDate: '2026-08-25', status: 'offer', notes: '已收到 Offer，考虑中' },
];

function JobBoardPage() {
  const toast = useToast();
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);

  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  const [customChannels, setCustomChannels] = useState<string[]>([]);

  const [isStatusMgrOpen, setIsStatusMgrOpen] = useState(false);
  const [isChannelMgrOpen, setIsChannelMgrOpen] = useState(false);
  const [newStatusKey, setNewStatusKey] = useState('');
  const [newChannelName, setNewChannelName] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  // 被打开状态弹窗的投递对象
  const [statusModalJob, setStatusModalJob] = useState<JobApplication | null>(null);

  const allStatusKeys = useMemo(
    () => [...presetStatusKeys, ...customStatuses],
    [customStatuses]
  );
  const allChannels = useMemo(() => {
    const presetAndCustom = [...PRESET_JOB_CHANNELS, ...customChannels];
    // 从已有投递数据中收集"孤儿"渠道（不在预置/自定义列表里但仍被引用）
    const orphanChannels = Array.from(
      new Set(jobs.map((j) => j.channel).filter((c) => !presetAndCustom.includes(c)))
    );
    return [...presetAndCustom, ...orphanChannels];
  }, [customChannels, jobs]);

  const [formData, setFormData] = useState({
    company: '', position: '', channel: PRESET_JOB_CHANNELS[0],
    applyDate: formatDate(), status: 'applied' as JobStatus,
    interviewDate: '', notes: '',
  });

  useEffect(() => {
    let data = loadJobApplications();
    if (isFirstRun()) {
      const now = Date.now();
      data = sampleJobs.map((job, index) => ({
        ...job, id: generateId(),
        createdAt: now - (sampleJobs.length - index) * 86400000,
        updatedAt: now - (sampleJobs.length - index) * 86400000,
      }));
      saveJobApplications(data);
      markInitialized();
    }
    setJobs(data);
    setCustomStatuses(loadCustomJobStatuses());
    setCustomChannels(loadCustomJobChannels());
  }, []);

  const openStatusModal = (job: JobApplication) => setStatusModalJob(job);
  const closeStatusModal = () => setStatusModalJob(null);
  const confirmStatusChange = (newStatus: JobStatus) => {
    if (!statusModalJob) return;
    handleStatusChange(statusModalJob.id, newStatus);
    setStatusModalJob(null);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchSearch = !searchTerm ||
        j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.position.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = !filterStatus || j.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [jobs, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    return {
      total: jobs.length,
      weekNew: jobs.filter((j) => j.createdAt >= weekAgo).length,
      todo: jobs.filter((j) =>
        (j.interviewDate && new Date(j.interviewDate) >= new Date()) ||
        j.status === 'written' || j.status === 'tech_interview' || j.status === 'hr_interview'
      ).length,
      offer: jobs.filter((j) => j.status === 'offer').length,
    };
  }, [jobs]);

  const statusDistribution = useMemo(() => {
    const total = jobs.length || 1;
    return allStatusKeys.map((key) => ({
      key,
      label: getStatusLabel(key),
      count: jobs.filter((j) => j.status === key).length,
      percent: Math.round((jobs.filter((j) => j.status === key).length / total) * 100),
      palette: getStatusPalette(key),
    }));
  }, [jobs, allStatusKeys]);

  const groupByStatus = useMemo(() => {
    const m: Record<string, JobApplication[]> = {};
    allStatusKeys.forEach((s) => { m[s] = filteredJobs.filter((j) => j.status === s); });
    return m;
  }, [filteredJobs, allStatusKeys]);

  // ===== 状态管理 =====
  const handleAddStatus = () => {
    const key = newStatusKey.trim();
    if (!key) return;
    if (presetStatusKeys.includes(key) || customStatuses.includes(key)) {
      toast.error('该状态已存在'); return;
    }
    const next = [...customStatuses, key];
    setCustomStatuses(next); saveCustomJobStatuses(next);
    setNewStatusKey('');
    toast.success(`已添加状态「${key}」`);
  };
  const handleDeleteStatus = (key: string) => {
    if (!customStatuses.includes(key)) return;
    const used = jobs.filter((j) => j.status === key).length;
    if (used > 0) {
      toast.error(`「${getStatusLabel(key)}」下还有 ${used} 条投递，先转移后再删除`);
      return;
    }
    if (!confirm(`确定删除状态「${getStatusLabel(key)}」吗？`)) return;
    const next = customStatuses.filter((s) => s !== key);
    setCustomStatuses(next); saveCustomJobStatuses(next);
    toast.success('状态已删除');
  };
  const handleAddChannel = () => {
    const name = newChannelName.trim();
    if (!name) return;
    if (PRESET_JOB_CHANNELS.includes(name) || customChannels.includes(name)) {
      toast.error('该渠道已存在'); return;
    }
    const next = [...customChannels, name];
    setCustomChannels(next); saveCustomJobChannels(next);
    setNewChannelName('');
    toast.success(`已添加渠道「${name}」`);
  };
  const handleDeleteChannel = (name: string) => {
    if (!customChannels.includes(name)) return;
    const used = jobs.filter((j) => j.channel === name).length;
    if (used > 0) {
      toast.error(`「${name}」下还有 ${used} 条投递，先转移后再删除`);
      return;
    }
    if (!confirm(`确定删除渠道「${name}」吗？`)) return;
    const next = customChannels.filter((c) => c !== name);
    setCustomChannels(next); saveCustomJobChannels(next);
    toast.success('渠道已删除');
  };

  // ===== 投递 CRUD =====
  const handleSubmit = () => {
    if (!formData.company.trim() || !formData.position.trim()) return;
    const now = Date.now();
    const jobData: JobApplication = {
      id: editingJob?.id || generateId(),
      company: formData.company, position: formData.position,
      channel: formData.channel, applyDate: formData.applyDate,
      status: formData.status,
      interviewDate: formData.interviewDate || undefined,
      notes: formData.notes || undefined,
      createdAt: editingJob?.createdAt || now, updatedAt: now,
    };
    let updated: JobApplication[];
    if (editingJob) {
      updated = jobs.map((j) => (j.id === editingJob.id ? jobData : j));
      toast.success('投递已更新');
    } else {
      updated = [jobData, ...jobs];
      toast.success('投递已添加');
    }
    setJobs(updated); saveJobApplications(updated); closeModal();
  };
  const handleEdit = (job: JobApplication) => {
    setEditingJob(job);
    setFormData({
      company: job.company, position: job.position,
      channel: job.channel, applyDate: job.applyDate, status: job.status,
      interviewDate: job.interviewDate || '', notes: job.notes || '',
    });
    setIsModalOpen(true);
  };
  const handleDelete = (id: string) => {
    const updated = jobs.filter((j) => j.id !== id);
    setJobs(updated); saveJobApplications(updated);
    toast.success('已删除投递记录');
  };
  const handleStatusChange = (jobId: string, newStatus: JobStatus) => {
    const updated = jobs.map((j) =>
      j.id === jobId ? { ...j, status: newStatus, updatedAt: Date.now() } : j
    );
    setJobs(updated); saveJobApplications(updated);
    toast.info(`状态已更新为「${getStatusLabel(newStatus)}」`);
  };

  const openModal = () => {
    setEditingJob(null);
    setFormData({
      company: '', position: '', channel: allChannels[0],
      applyDate: formatDate(), status: allStatusKeys[0], interviewDate: '', notes: '',
    });
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditingJob(null); };

  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      {/* ===== 顶部操作栏 ===== */}
      <ActionBar
        title="投递看板"
        logoEmoji="📮"
        searchProps={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: '搜索公司或岗位...',
        }}
        leftActions={
          <>
            <button
              onClick={() => setIsStatusMgrOpen(true)}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-xs text-[var(--text-2)] hover:text-[var(--accent)] rounded-md border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
            >
              <SettingsIcon /> 状态
            </button>
            <button
              onClick={() => setIsChannelMgrOpen(true)}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-xs text-[var(--text-2)] hover:text-[var(--accent)] rounded-md border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
            >
              <SettingsIcon /> 渠道
            </button>
          </>
        }
        primaryAction={{ label: '添加投递', onClick: openModal }}
      />

      {/* ===== 4 统计卡 ===== */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="总投递数" value={stats.total} accent="#1677ff" sub="全部记录" icon="📊" />
        <StatCard label="本周新增" value={stats.weekNew} accent="#5b8cff" sub="近 7 天" icon="🆕" delay={60} />
        <StatCard label="待办事项" value={stats.todo} accent="#fa8c16" sub="面试/笔试待处理" icon="⏱️" delay={120} />
        <StatCard label="已 Offer"  value={stats.offer} accent="#52c41a" sub="继续加油" icon="🏆" delay={180} />
      </div>

      {/* ===== 状态分布进度条 ===== */}
      <GlassCard hoverable={false} padding="md" className="animate-fade-up">
        <div className="flex items-center gap-2 mb-4">
          <ChartIcon />
          <h3 className="text-sm font-medium text-[var(--text-1)]">状态分布</h3>
          <span className="text-xs text-[var(--text-4)] ml-auto">
            共 {jobs.length} 条 · 点击行可筛选
          </span>
        </div>
        <div className="space-y-2.5">
          {statusDistribution.map((row) => (
            <ProgressBar
              key={row.key}
              label={row.label}
              value={row.count}
              max={jobs.length || 1}
              palette={row.palette}
              active={filterStatus === row.key}
              onClick={() => setFilterStatus(filterStatus === row.key ? null : row.key)}
            />
          ))}
        </div>
      </GlassCard>

      {/* ===== 筛选胶囊 ===== */}
      <div className="flex items-center gap-2 flex-wrap animate-fade-up">
        <span className="text-xs text-[var(--text-4)] mr-1">状态：</span>
        <Chip active={!filterStatus} onClick={() => setFilterStatus(null)}>
          全部 ({jobs.length})
        </Chip>
        {statusDistribution.filter((r) => r.count > 0).map((r) => (
          <Chip
            key={r.key}
            active={filterStatus === r.key}
            palette={r.palette}
            onClick={() => setFilterStatus(filterStatus === r.key ? null : r.key)}
          >
            {r.label} ({r.count})
          </Chip>
        ))}
      </div>

      {/* ===== 看板网格 ===== */}
      <div
        className="ds-scroll-area pr-1"
        style={{ maxHeight: 'calc(100vh - 440px)' }}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allStatusKeys.map((statusKey, si) => {
            const label = getStatusLabel(statusKey);
            const p = getStatusPalette(statusKey);
            const colJobs = groupByStatus[statusKey] || [];
            return (
              <div
                key={statusKey}
                className="animate-fade-up"
                style={{ animationDelay: `${si * 50}ms` }}
              >
                <GlassCard hoverable={false} hoverGlow padding="none">
                  {/* 列头 */}
                  <div className="px-4 py-2.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-surface)]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.dot }} />
                      <span className="text-[13px] font-medium text-[var(--text-1)]">{label}</span>
                      {customStatuses.includes(statusKey) && (
                        <span className="text-[10px] px-1 rounded bg-[var(--accent-soft)] text-[var(--accent)]">
                          自定义
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-3)] tabular-nums">{colJobs.length}</span>
                  </div>
                  {/* 卡片列表 */}
                  <div className="p-2.5 space-y-2 min-h-[72px]">
                    {colJobs.length === 0 ? (
                      <p className="text-center text-xs text-[var(--text-4)] py-6">暂无</p>
                    ) : (
                      colJobs.map((job) => (
                        <div
                          key={job.id}
                          className="p-3 rounded-lg border border-[var(--border)] bg-white/80 hover:border-[var(--accent-border)] transition-all cursor-pointer group"
                          onClick={() => handleEdit(job)}
                        >
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[13px] font-medium text-[var(--text-1)] truncate">{job.company}</h4>
                              <p className="text-xs text-[var(--text-2)] truncate mt-0.5">{job.position}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(job.id); }}
                              className="p-1 rounded text-[var(--text-4)] hover:text-[#f53f3f] hover:bg-[#fff1f0] opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="ds-tag" style={{ background: p.bg, color: p.text }}>{label}</span>
                            <span className="text-[11px] text-[var(--text-3)]">{job.channel}</span>
                            <span className="text-[11px] text-[var(--text-4)] ml-auto tabular-nums">{job.applyDate.slice(5)}</span>
                          </div>
                          {job.interviewDate && (
                            <p className="text-[11px] text-[var(--accent)] mt-1.5">面试：{job.interviewDate}</p>
                          )}
                          {job.notes && (
                            <p className="text-[11px] text-[var(--text-3)] mt-1 line-clamp-2 leading-relaxed">{job.notes}</p>
                          )}
                          <div
                            className="mt-2 pt-2 border-t border-[var(--border-light)] flex justify-end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => openStatusModal(job)}
                              className="px-2.5 h-[24px] inline-flex items-center gap-1 text-[11px] rounded border border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-2)] hover:text-[var(--accent)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] transition-colors"
                            >
                              改状态
                              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M3 4.5l3 3 3-3" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 投递表单模态框 ===== */}
      <Modal
        open={isModalOpen}
        onClose={closeModal}
        title={editingJob ? '编辑投递' : '新增投递'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1.5">公司 *</label>
              <input
                type="text" value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="ds-input" placeholder="字节跳动"
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1.5">岗位 *</label>
              <input
                type="text" value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="ds-input" placeholder="前端工程师"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1.5">投递渠道</label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="ds-input"
              >
                {allChannels.map((c) => {
                  const isPreset = PRESET_JOB_CHANNELS.includes(c);
                  const isCustom = customChannels.includes(c);
                  const label = isPreset ? c : isCustom ? `自定义 · ${c}` : `历史 · ${c}`;
                  return <option key={c} value={c}>{label}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1.5">投递日期</label>
              <input
                type="date" value={formData.applyDate}
                onChange={(e) => setFormData({ ...formData, applyDate: e.target.value })}
                className="ds-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1.5">当前状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as JobStatus })}
                className="ds-input"
              >
                {PRESET_JOB_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
                {customStatuses.map((k) => (
                  <option key={k} value={k}>自定义 · {k}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-3)] mb-1.5">面试时间</label>
              <input
                type="date" value={formData.interviewDate}
                onChange={(e) => setFormData({ ...formData, interviewDate: e.target.value })}
                className="ds-input"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-3)] mb-1.5">备注</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3} className="ds-input" placeholder="面试官、需要准备的内容..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={closeModal} className="ds-btn-ghost">取消</button>
          <button onClick={handleSubmit} className="ds-btn-primary">
            {editingJob ? '保存' : '添加'}
          </button>
        </div>
      </Modal>

      {/* ===== 状态管理模态框 ===== */}
      <Modal open={isStatusMgrOpen} onClose={() => setIsStatusMgrOpen(false)} title="管理状态" maxWidth="max-w-md">
        <div className="flex gap-2 mb-5">
          <input
            type="text" value={newStatusKey}
            onChange={(e) => setNewStatusKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
            placeholder="输入新状态名（如：终面、Offer放弃）"
            className="ds-input flex-1"
          />
          <button onClick={handleAddStatus} className="ds-btn-primary">添加</button>
        </div>
        <div className="mb-4">
          <p className="text-xs text-[var(--text-3)] mb-2">预置状态（不可删除）</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_JOB_STATUSES.map((s) => {
              const p = getStatusPalette(s.key);
              return (
                <span key={s.key} className="ds-tag" style={{ background: p.bg, color: p.text }}>
                  {s.label}
                </span>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-xs text-[var(--text-3)] mb-2">自定义状态（{customStatuses.length}）</p>
          {customStatuses.length === 0 ? (
            <p className="text-xs text-[var(--text-4)] py-4 text-center border border-dashed rounded-md border-[var(--border)]">
              暂无自定义状态
            </p>
          ) : (
            <div className="space-y-1.5">
              {customStatuses.map((k) => {
                const p = getStatusPalette(k);
                const count = jobs.filter((j) => j.status === k).length;
                return (
                  <div
                    key={k}
                    className="flex items-center justify-between px-3 py-2 rounded-md border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors"
                  >
                    <span className="text-sm text-[var(--text-1)] flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: p.bar }} />
                      {k}{count > 0 && <span className="text-xs text-[var(--text-3)]">· {count} 条</span>}
                    </span>
                    <button
                      onClick={() => handleDeleteStatus(k)}
                      className="text-xs text-[var(--text-4)] hover:text-[#f53f3f] hover:bg-[#fff1f0] px-2 py-1 rounded transition-colors"
                    >删除</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ===== 渠道管理模态框 ===== */}
      <Modal open={isChannelMgrOpen} onClose={() => setIsChannelMgrOpen(false)} title="管理投递渠道" maxWidth="max-w-md">
        <div className="flex gap-2 mb-5">
          <input
            type="text" value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
            placeholder="输入新渠道名（如：微信、电话）"
            className="ds-input flex-1"
          />
          <button onClick={handleAddChannel} className="ds-btn-primary">添加</button>
        </div>
        <div className="mb-4">
          <p className="text-xs text-[var(--text-3)] mb-2">预置渠道（不可删除）</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_JOB_CHANNELS.map((c) => (
              <span key={c} className="ds-tag ds-tag-muted">{c}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-[var(--text-3)] mb-2">自定义渠道（{customChannels.length}）</p>
          {customChannels.length === 0 ? (
            <p className="text-xs text-[var(--text-4)] py-4 text-center border border-dashed rounded-md border-[var(--border)]">
              暂无自定义渠道
            </p>
          ) : (
            <div className="space-y-1.5">
              {customChannels.map((c) => {
                const count = jobs.filter((j) => j.channel === c).length;
                return (
                  <div
                    key={c}
                    className="flex items-center justify-between px-3 py-2 rounded-md border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors"
                  >
                    <span className="text-sm text-[var(--text-1)]">
                      {c}{count > 0 && <span className="text-xs text-[var(--text-3)] ml-2">· {count} 条</span>}
                    </span>
                    <button
                      onClick={() => handleDeleteChannel(c)}
                      className="text-xs text-[var(--text-4)] hover:text-[#f53f3f] hover:bg-[#fff1f0] px-2 py-1 rounded transition-colors"
                    >删除</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ===== 状态变更小弹窗 ===== */}
      {statusModalJob && (
        <Modal
          open={!!statusModalJob}
          onClose={closeStatusModal}
          title={`更改「${statusModalJob.company}·${statusModalJob.position}」的状态`}
          maxWidth="max-w-sm"
        >
          <p className="text-xs text-[var(--text-3)] mb-3">
            当前状态：
            <span
              className="ds-tag ml-1.5"
              style={{
                background: getStatusPalette(statusModalJob.status).bg,
                color: getStatusPalette(statusModalJob.status).text,
              }}
            >
              {getStatusLabel(statusModalJob.status)}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {allStatusKeys.map((s) => {
              const sp = getStatusPalette(s);
              const isCurrent = s === statusModalJob.status;
              return (
                <button
                  key={s}
                  disabled={isCurrent}
                  onClick={() => confirmStatusChange(s)}
                  className={`flex items-center gap-2.5 px-3 h-[40px] rounded-lg border text-sm transition-colors ${
                    isCurrent
                      ? 'border-[var(--border)] bg-[var(--bg-hover)] text-[var(--text-4)] cursor-default'
                      : 'border-[var(--border)] bg-white text-[var(--text-1)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: sp.dot }}
                  />
                  <span className="flex-1 text-left">{getStatusLabel(s)}</span>
                  {isCurrent && <span className="text-[10px]">当前</span>}
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default JobBoardPage;
