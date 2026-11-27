import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#f7f4ed] p-6 text-stone-800">
          <div className="max-w-md rounded-2xl border border-[#dfd8ca] bg-white p-6 shadow-lg">
            <h2 className="font-serif-cn text-lg font-bold text-[#9e2a2b]">
              档案终端渲染异常，已启动本地恢复保护
            </h2>
            <p className="mt-2 text-xs leading-6 text-stone-600">
              {this.state.error.message || '检测到旧版本缓存数据结构不兼容。'}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-[#16263f] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                刷新重试
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('qinghe_arg_save_v1');
                  } catch {
                    // ignore
                  }
                  window.location.reload();
                }}
                className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-[#9e2a2b] cursor-pointer"
              >
                清理缓存并重载
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);
