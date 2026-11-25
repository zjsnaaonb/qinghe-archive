import React from 'react';
import type { ScareMode } from '../types/game';

interface ScareOverlayProps {
  scareEvent: {
    title: string;
    message: string;
    visualType: 'peeker' | 'shrine' | 'rule_break' | 'meta_eye';
  } | null;
  scareMode: ScareMode;
  onDismiss: () => void;
}

export const ScareOverlay: React.FC<ScareOverlayProps> = ({
  scareEvent,
  scareMode,
  onDismiss,
}) => {
  if (!scareEvent) return null;

  const isFull = scareMode === 'full';

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center p-4 ${
        isFull ? 'bg-black/95 glitch-burst' : 'bg-zinc-950/92 transition-opacity duration-500'
      }`}
      onClick={onDismiss}
    >
      {/* 完整惊悚模式下的视觉压迫背景图腾（无眼面孔/雕花窗窥视剪影） */}
      {isFull && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-35">
          <svg viewBox="0 0 400 400" className="h-[82vh] w-[82vh] text-red-900/70">
            <rect x="30" y="20" width="340" height="360" fill="none" stroke="currentColor" strokeWidth="3" />
            {/* 传统雕花窗棂 */}
            <line x1="115" y1="20" x2="115" y2="380" stroke="currentColor" strokeWidth="2" />
            <line x1="200" y1="20" x2="200" y2="380" stroke="currentColor" strokeWidth="2" />
            <line x1="285" y1="20" x2="285" y2="380" stroke="currentColor" strokeWidth="2" />
            <line x1="30" y1="140" x2="370" y2="140" stroke="currentColor" strokeWidth="2" />
            <line x1="30" y1="260" x2="370" y2="260" stroke="currentColor" strokeWidth="2" />
            {/* 窗后贴近的惨白无目轮廓 */}
            <ellipse cx="200" cy="195" rx="76" ry="98" fill="#d4d4d8" fillOpacity="0.22" />
            <ellipse cx="170" cy="178" rx="18" ry="11" fill="#09090b" />
            <ellipse cx="230" cy="178" rx="18" ry="11" fill="#09090b" />
            <path d="M178 242 Q200 252 222 242" stroke="#09090b" strokeWidth="5" fill="none" />
          </svg>
        </div>
      )}

      <div
        className="relative z-10 max-w-lg w-full border border-red-900/80 bg-zinc-950/95 p-6 shadow-2xl shadow-red-950/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between border-b border-red-900/50 pb-2 text-xs font-mono-tech text-red-400">
          <span>[RETINAL_HAZARD // 视网膜残留异常告警]</span>
          <span>{isFull ? 'MODE: FULL_HORROR' : 'MODE: PSYCHOLOGICAL_SAFE'}</span>
        </div>

        <h3 className="mb-3 font-serif-cn text-xl font-bold tracking-wider text-red-200">
          {scareEvent.title}
        </h3>

        <p className="mb-5 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
          {scareEvent.message}
        </p>

        <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
          <span className="text-xs text-zinc-500">
            提示：可在右上角「设置」随时切换【完整惊悚 / 心理压迫】模式
          </span>
          <button
            onClick={onDismiss}
            className="border border-red-800 bg-red-950/60 px-4 py-1.5 text-xs font-medium text-red-100 hover:bg-red-900/70 cursor-pointer"
          >
            移开视线（确认）
          </button>
        </div>
      </div>
    </div>
  );
};
