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
      className={`fixed inset-0 z-[120] flex items-center justify-center p-4 backdrop-blur-xs ${
        isFull ? 'bg-stone-900/55 glitch-burst' : 'bg-stone-900/45 transition-opacity duration-500'
      }`}
      onClick={onDismiss}
    >
      {isFull && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-25">
          <svg viewBox="0 0 400 400" className="h-[78vh] w-[78vh] text-[#9e2a2b]/60">
            <rect x="30" y="20" width="340" height="360" fill="none" stroke="currentColor" strokeWidth="3" />
            <line x1="115" y1="20" x2="115" y2="380" stroke="currentColor" strokeWidth="2" />
            <line x1="200" y1="20" x2="200" y2="380" stroke="currentColor" strokeWidth="2" />
            <line x1="285" y1="20" x2="285" y2="380" stroke="currentColor" strokeWidth="2" />
            <line x1="30" y1="140" x2="370" y2="140" stroke="currentColor" strokeWidth="2" />
            <line x1="30" y1="260" x2="370" y2="260" stroke="currentColor" strokeWidth="2" />
            <ellipse cx="200" cy="195" rx="76" ry="98" fill="#ffffff" fillOpacity="0.45" />
            <ellipse cx="170" cy="178" rx="18" ry="11" fill="#450a0a" />
            <ellipse cx="230" cy="178" rx="18" ry="11" fill="#450a0a" />
            <path d="M178 242 Q200 252 222 242" stroke="#450a0a" strokeWidth="5" fill="none" />
          </svg>
        </div>
      )}

      <div
        className="relative z-10 max-w-lg w-full rounded-2xl border-2 border-[#9e2a2b]/60 bg-[#fffcf8] p-6 text-stone-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between border-b border-red-200 pb-2 text-xs font-mono-tech font-semibold text-[#9e2a2b]">
          <span>[RETINAL_HAZARD // 视网膜残留异常告警]</span>
          <span>{isFull ? 'MODE: FULL_HORROR' : 'MODE: PSYCHOLOGICAL_SAFE'}</span>
        </div>

        <h3 className="mb-3 font-serif-cn text-xl font-bold tracking-wider text-[#7f1d1d]">
          {scareEvent.title}
        </h3>

        <p className="mb-5 whitespace-pre-line text-sm leading-relaxed text-stone-700">
          {scareEvent.message}
        </p>

        <div className="flex items-center justify-between border-t border-stone-200 pt-3">
          <span className="text-xs text-stone-500">
            提示：可在右上角「设置」随时切换【完整惊悚 / 心理压迫】模式
          </span>
          <button
            onClick={onDismiss}
            className="rounded-lg bg-[#9e2a2b] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#822021] cursor-pointer transition"
          >
            移开视线（确认）
          </button>
        </div>
      </div>
    </div>
  );
};
