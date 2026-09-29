import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

function Layout() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  // 路由切换 → 回到顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  // 滚动进度条（rAF 节流）
  useEffect(() => {
    const update = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      const p = total > 0 ? h.scrollTop / total : 0;
      setProgress(p);
      rafRef.current = null;
    };
    const onScroll = () => {
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const isHome = location.pathname === '/' || location.pathname === '/study';

  return (
    <div className="min-h-screen">
      {/* 顶部滚动进度条 */}
      <div
        className="ds-scroll-progress"
        style={{ transform: `scaleX(${progress})` }}
      />

      {/* 顶部栏 */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)]">
        <div
          className="mx-auto h-[54px] flex items-center justify-between bg-[rgba(250,251,253,0.6)] backdrop-blur-xl"
          style={{ maxWidth: '1280px', paddingInline: 'clamp(16px, 4vw, 48px)' }}
        >
          <Link to="/" className="flex items-center gap-2.5 no-underline group">
            <div className="relative w-[26px] h-[26px] rounded-[8px] flex items-center justify-center text-white text-[13px] font-semibold overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1677ff] via-[#4b6bff] to-[#8b6bff]" />
              <span className="relative">W</span>
            </div>
            <span className="text-[var(--text-1)] font-medium text-[14px] tracking-wide">
              Workspace
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-[13px]">
            {isHome ? (
              <>
                <Link
                  to="/knowledge"
                  className="px-3 py-1.5 text-[var(--text-2)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-md transition-all no-underline hover:-translate-y-[1px]"
                >
                  知识库
                </Link>
                <Link
                  to="/jobs"
                  className="px-3 py-1.5 text-[var(--text-2)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-md transition-all no-underline hover:-translate-y-[1px]"
                >
                  求职看板
                </Link>
              </>
            ) : (
              <Link
                to="/"
                className="px-3 py-1.5 text-[var(--text-2)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-md transition-all no-underline hover:-translate-y-[1px]"
              >
                ← 返回首页
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main
        className="mx-auto py-7"
        style={{ maxWidth: '1280px', paddingInline: 'clamp(16px, 4vw, 48px)' }}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
