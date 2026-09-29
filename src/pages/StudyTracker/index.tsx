import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import {
  BookIcon, BriefcaseIcon, ArrowRightIcon, ClockIcon, ChartIcon,
  CalendarCheckIcon, PlayIcon, PauseIcon, SaveIcon, RotateIcon,
  ChevronLeftIcon, ChevronRightIcon,
} from '../../components/icons';
import {
  loadStudySessions, saveStudySessions, loadStudyTimer, saveStudyTimer,
  generateId, formatDate, formatDuration, formatDurationShort, formatMonth,
} from '../../utils/storage';
import type { StudySession } from '../../types';

const todayStatus = {
  label: '今日',
  color: '#1677ff',
  bg: 'rgba(22,119,255,0.08)',
};
const monthStatus = {
  label: '本月',
  color: '#4b6bff',
  bg: 'rgba(75,107,255,0.08)',
};
const daysStatus = {
  label: '天数',
  color: '#8b6bff',
  bg: 'rgba(139,107,255,0.08)',
};

// ===== 迷你日历 =====
interface CalendarProps { sessions: StudySession[]; }
function StudyCalendar({ sessions }: CalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const minutesByDate: Record<string, number> = sessions.reduce((acc, s) => {
    acc[s.date] = (acc[s.date] || 0) + s.duration; return acc;
  }, {} as Record<string, number>);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const todayStr = formatDate();

  const getLevel = (m: number) => {
    if (m === 0) return 0;
    if (m < 30) return 1;
    if (m < 60) return 2;
    if (m < 120) return 3;
    if (m < 240) return 4;
    return 5;
  };

  const levelColors = [
    'bg-[#f1f5f9]',
    'bg-[#e3eeff]',
    'bg-[#c3dcff]',
    'bg-[#9cc4ff]',
    'bg-[#63a4ff]',
    'bg-[#1677ff]',
  ];
  const levelTextColors = [
    'text-[var(--text-4)]',
    'text-[#0e5fd8]', 'text-[#0e5fd8]',
    'text-white', 'text-white', 'text-white',
  ];

  const todayBtn = 'h-6 px-2 text-xs text-[var(--text-3)] hover:text-[var(--accent)] rounded-md hover:bg-[var(--accent-soft)] transition-colors';
  const navBtn = 'w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-3)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition-colors';

  return (
    <div className="ds-card p-4 animate-fade-up delay-150">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--text-1)]">
          {year} 年 {month + 1} 月
        </h3>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} className={navBtn}>
            <ChevronLeftIcon />
          </button>
          <button
            onClick={() => setViewMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            className={todayBtn}
          >
            今天
          </button>
          <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} className={navBtn}>
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((w) => (
          <div key={w} className="text-center text-[11px] text-[var(--text-3)] py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} className="h-8" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const minutes = minutesByDate[dateStr] || 0;
          const level = getLevel(minutes);
          const isToday = dateStr === todayStr;
          return (
            <div
              key={idx}
              className={`calendar-day h-8 mx-0.5 flex items-center justify-center rounded-md text-[11px] font-medium ${levelColors[level]} ${levelTextColors[level]} ${
                isToday ? 'ring-[1.5px] ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-base)]' : ''
              }`}
            >
              {day}
              {minutes > 0 && (
                <span className="day-tooltip">{dateStr} · 学习 {formatDurationShort(minutes)}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-1 mt-3 text-[11px] text-[var(--text-4)]">
        <span>少</span>
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <div key={l} className={`w-2.5 h-2.5 rounded-[3px] ${levelColors[l]}`} />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}

// ===== 统计卡 =====
function StatCard({ label, value, icon, status }: {
  label: string; value: string; icon: React.ReactNode;
  status: { color: string; bg: string };
}) {
  return (
    <div
      className="ds-card p-4 flex items-center gap-3.5 animate-fade-up"
    >
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
        style={{ background: status.bg, color: status.color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[var(--text-3)]">{label}</p>
        <p className="text-[17px] font-semibold text-[var(--text-1)] mt-0.5 truncate tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

// ===== 主页面 =====
function StudyTrackerPage() {
  const toast = useToast();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [monthStats, setMonthStats] = useState({ totalMinutes: 0, days: 0 });
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedRef = useRef<number>(0);

  useEffect(() => {
    const saved = loadStudySessions();
    setSessions(saved);
    const timer = loadStudyTimer();
    if (timer.isRunning && timer.startTime) {
      setIsRunning(true);
      startTimeRef.current = timer.startTime;
      accumulatedRef.current = timer.accumulatedSeconds;
      setElapsedSeconds(
        timer.accumulatedSeconds + Math.floor((Date.now() - timer.startTime) / 1000)
      );
      startTimerInterval();
    } else {
      accumulatedRef.current = timer.accumulatedSeconds;
      setElapsedSeconds(timer.accumulatedSeconds);
    }
    calcMonth(saved);
  }, []);

  const calcMonth = (list: StudySession[]) => {
    const cur = formatMonth();
    const monthList = list.filter((s) => s.date.startsWith(cur));
    const total = monthList.reduce((sum, s) => sum + s.duration, 0);
    const days = new Set(monthList.map((s) => s.date)).size;
    setMonthStats({ totalMinutes: total, days });
  };

  const startTimerInterval = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = window.setInterval(() => {
      if (startTimeRef.current) {
        setElapsedSeconds(
          accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
        );
      }
    }, 1000);
  }, []);

  const stopTimerInterval = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const handleStart = () => {
    setIsRunning(true);
    startTimeRef.current = Date.now();
    saveStudyTimer({
      isRunning: true, startTime: startTimeRef.current,
      accumulatedSeconds: accumulatedRef.current,
    });
    startTimerInterval();
    toast.success('开始记录专注时间');
  };

  const handlePause = () => {
    setIsRunning(false);
    stopTimerInterval();
    if (startTimeRef.current) {
      accumulatedRef.current += Math.floor((Date.now() - startTimeRef.current) / 1000);
      startTimeRef.current = null;
    }
    saveStudyTimer({
      isRunning: false, startTime: null, accumulatedSeconds: accumulatedRef.current,
    });
    toast.info('已暂停计时');
  };

  const handleStop = () => {
    if (elapsedSeconds < 60) {
      toast.error('学习时长不足 1 分钟，未保存');
      handleReset();
      return;
    }
    stopTimerInterval();
    const now = Date.now();
    const newSession: StudySession = {
      id: generateId(), date: formatDate(now),
      startTime: now - elapsedSeconds * 1000, endTime: now,
      duration: Math.round(elapsedSeconds / 60),
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    saveStudySessions(updated);
    calcMonth(updated);
    toast.success(`记录已保存 · ${formatDurationShort(newSession.duration)}`);
    handleReset();
  };

  const handleReset = () => {
    stopTimerInterval();
    setIsRunning(false);
    startTimeRef.current = null;
    accumulatedRef.current = 0;
    setElapsedSeconds(0);
    saveStudyTimer({ isRunning: false, startTime: null, accumulatedSeconds: 0 });
  };

  const handleDelete = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    saveStudySessions(updated);
    calcMonth(updated);
    toast.success('已删除一条记录');
  };

  useEffect(() => () => stopTimerInterval(), [stopTimerInterval]);

  const todayMinutes = sessions
    .filter((s) => s.date === formatDate())
    .reduce((sum, s) => sum + s.duration, 0);

  const grouped = sessions.reduce<Record<string, StudySession[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const now = new Date();
  const weekMap = ['日', '一', '二', '三', '四', '五', '六'];
  const timerStatusColor = isRunning ? '#52c41a' : elapsedSeconds > 0 ? '#fa8c16' : '#94a3b8';
  const timerStatusText = isRunning ? '计时中' : elapsedSeconds > 0 ? '已暂停' : '待开始';

  return (
    <div className="space-y-5">
      {/* 标题区 */}
      <div className="flex items-end justify-between animate-fade-up">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">学习记录</h1>
          <p className="text-[13px] text-[var(--text-3)] mt-1">
            记录每一次专注，沉淀每一份成长
          </p>
        </div>
        <p className="text-[13px] text-[var(--text-3)] tabular-nums">
          {now.getMonth() + 1} / {now.getDate()} · 周{weekMap[now.getDay()]}
        </p>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 gap-3 animate-fade-up delay-75">
        <Link to="/knowledge" className="ds-card ds-card-interactive p-4 flex items-center gap-3.5 no-underline group">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-gradient-to-br from-[#1677ff]/10 to-[#8b6bff]/10 text-[var(--accent)]">
            <BookIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors">
              知识库
            </p>
            <p className="text-xs text-[var(--text-3)] mt-0.5">查看和整理学习笔记</p>
          </div>
          <span className="text-[var(--text-4)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all">
            <ArrowRightIcon />
          </span>
        </Link>
        <Link to="/jobs" className="ds-card ds-card-interactive p-4 flex items-center gap-3.5 no-underline group">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 bg-gradient-to-br from-[#1677ff]/10 to-[#8b6bff]/10 text-[var(--accent)]">
            <BriefcaseIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-1)] group-hover:text-[var(--accent)] transition-colors">
              求职看板
            </p>
            <p className="text-xs text-[var(--text-3)] mt-0.5">追踪简历投递进度</p>
          </div>
          <span className="text-[var(--text-4)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all">
            <ArrowRightIcon />
          </span>
        </Link>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="今日学习" value={formatDurationShort(todayMinutes)} icon={<ClockIcon />} status={todayStatus} />
        <StatCard label="本月学习" value={formatDurationShort(monthStats.totalMinutes)} icon={<ChartIcon />} status={monthStatus} />
        <StatCard label="本月天数" value={`${monthStats.days} 天`} icon={<CalendarCheckIcon />} status={daysStatus} />
      </div>

      {/* 计时器 */}
      <div
        className="ds-card px-6 py-8 text-center animate-scale-in"
      >
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs mb-4 backdrop-blur"
          style={{ background: `${timerStatusColor}1a`, color: timerStatusColor }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: timerStatusColor,
              animation: isRunning ? 'float-slow 1.5s ease infinite' : 'none',
            }}
          />
          {timerStatusText}
        </span>

        <p
          className={`text-[52px] font-mono font-semibold tabular-nums leading-none mb-7 transition-colors duration-300 ${
            isRunning ? 'ds-gradient-text' : elapsedSeconds > 0 ? 'text-[var(--text-1)]' : 'text-[var(--text-4)]'
          }`}
          style={isRunning ? { filter: 'drop-shadow(0 2px 12px rgba(22,119,255,0.3))' } : {}}
        >
          {formatDuration(elapsedSeconds)}
        </p>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          {!isRunning ? (
            <button onClick={handleStart} disabled={elapsedSeconds > 0} className="ds-btn-primary">
              <PlayIcon /> 开始学习
            </button>
          ) : (
            <button onClick={handlePause} className="ds-btn-ghost">
              <PauseIcon /> 暂停
            </button>
          )}
          {!isRunning && elapsedSeconds > 0 && (
            <button onClick={handleStart} className="ds-btn-primary">
              <PlayIcon /> 继续
            </button>
          )}
          {elapsedSeconds > 0 && (
            <>
              <button onClick={handleStop} className="ds-btn-primary">
                <SaveIcon /> 保存记录
              </button>
              <button onClick={handleReset} className="ds-btn-ghost">
                <RotateIcon /> 重置
              </button>
            </>
          )}
        </div>

        <p className="text-xs text-[var(--text-4)] mt-5">
          计时器状态自动保存，刷新页面不丢失进度
        </p>
      </div>

      {/* 日历 + 历史记录 双栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        <div className="lg:col-span-2"><StudyCalendar sessions={sessions} /></div>

        {/* 历史记录 */}
        <div className="lg:col-span-3 animate-fade-up delay-200">
          <div className="ds-card overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-surface)]">
              <h3 className="text-sm font-medium text-[var(--text-1)]">历史记录</h3>
              <span className="text-xs text-[var(--text-3)] tabular-nums">
                共 {sessions.length} 条
              </span>
            </div>

            {sortedDates.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-sm text-[var(--text-3)]">
                  还没有学习记录，开始你的第一次专注吧
                </p>
              </div>
            ) : (
              <div className="ds-scroll-area max-h-[420px] pr-1">
                {sortedDates.map((date, di) => {
                  const dayTotal = grouped[date].reduce((sum, s) => sum + s.duration, 0);
                  return (
                    <div key={date} className="animate-fade-up" style={{ animationDelay: `${di * 30}ms` }}>
                      <div className="px-5 py-2 bg-[var(--bg-surface)] flex justify-between items-center sticky top-0 border-b border-[var(--border-light)]">
                        <span className="text-xs font-medium text-[var(--text-2)]">{date}</span>
                        <span className="text-xs text-[var(--accent)] font-medium tabular-nums">
                          {formatDurationShort(dayTotal)}
                        </span>
                      </div>
                      {grouped[date].map((session) => (
                        <div
                          key={session.id}
                          className="px-5 py-2.5 flex justify-between items-center hover:bg-[var(--bg-hover)] transition-colors"
                        >
                          <span className="text-sm text-[var(--text-2)] tabular-nums">
                            {new Date(session.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                            {' — '}
                            {new Date(session.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="ds-tag bg-[var(--accent-soft)] text-[var(--accent)] tabular-nums">
                              {formatDurationShort(session.duration)}
                            </span>
                            <button
                              onClick={() => handleDelete(session.id)}
                              className="text-xs text-[var(--text-4)] hover:text-[#f53f3f] hover:bg-[#fff1f0] px-2 py-1 rounded-md transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudyTrackerPage;
