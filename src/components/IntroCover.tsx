import React from 'react';
import { motion } from 'motion/react';
import { Mail, ShieldAlert, Volume2, VolumeX, ArrowRight, Eye } from 'lucide-react';
import type { ScareMode } from '../types/game';
import { horrorAudio } from '../engine/audio';

interface IntroCoverProps {
  scareMode: ScareMode;
  audioMuted: boolean;
  onChangeScareMode: (mode: ScareMode) => void;
  onToggleMute: () => void;
  onEnter: () => void;
}

export const IntroCover: React.FC<IntroCoverProps> = ({
  scareMode,
  audioMuted,
  onChangeScareMode,
  onToggleMute,
  onEnter,
}) => {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0a0a0c] px-5 py-12 text-zinc-100">
      {/* 细腻暗房晕影与红色微光 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(circle at 50% 34%, rgba(158, 42, 43, 0.16), transparent 56%), radial-gradient(circle at 50% 100%, rgba(24, 24, 27, 0.9), #09090b 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-xl"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-red-900/50 bg-red-950/30 px-3.5 py-1 text-[11px] font-mono-tech tracking-widest text-red-300/90"
          >
            <Eye className="h-3.5 w-3.5 text-red-400" />
            <span>云溪库区遗存影像调查档案 · 1998—2026</span>
          </motion.div>

          <h1 className="font-serif-cn text-4xl sm:text-5xl font-bold tracking-[0.14em] text-zinc-100">
            青禾库
          </h1>
          <p className="mt-2 font-serif-cn text-base tracking-[0.25em] text-zinc-400">
            祠下村遗存影像考
          </p>

          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-zinc-400">
            2026 年 11 月 25 日晚 21:00，你的加密邮箱收到一封来自南州大学民俗课题组的定时死信。
            <br />
            距离「百年民俗线上特展」全网公映，只剩不到三小时。
          </p>
        </div>

        {/* 简洁优雅的体验偏好面板 */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/55 p-5 backdrop-blur-md shadow-2xl">
          <div className="mb-4 flex items-center justify-between border-b border-zinc-800/80 pb-3 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5 font-medium text-zinc-200">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              惊吓与声景偏好（游玩中随时可切）
            </span>
            <button
              type="button"
              onClick={onToggleMute}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-zinc-500 cursor-pointer transition"
            >
              {audioMuted ? (
                <>
                  <VolumeX className="h-3 w-3 text-red-400" />
                  <span>已静音</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3 w-3 text-emerald-400" />
                  <span>音效开启（推荐）</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onChangeScareMode('full')}
              className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                scareMode === 'full'
                  ? 'border-red-700/80 bg-red-950/35 text-red-100 shadow-inner'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="text-xs font-bold">完整惊悚体验</div>
              <div className="mt-1 text-[11px] leading-relaxed opacity-80">
                含老照片异变转头、故障音效与违规惊吓演出
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChangeScareMode('psychological')}
              className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                scareMode === 'psychological'
                  ? 'border-amber-600/80 bg-amber-950/30 text-amber-100'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="text-xs font-bold">心理压迫模式（护眼）</div>
              <div className="mt-1 text-[11px] leading-relaxed opacity-80">
                保留全部细思极恐异变，移除高分贝突发惊吓
              </div>
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-zinc-950/70 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-zinc-400">
            <strong className="text-zinc-200">玩法贴士：</strong>
            游戏不会替你自动总结答案。阅读档案时，用鼠标<strong className="text-amber-300">划选任意可疑文字</strong>即可直接摘录到右侧随身手记或跨站搜索；展开手记时主页面会自动左移，方便对照取证。
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            type="button"
            onClick={() => {
              horrorAudio.playClick('unlock');
              horrorAudio.startOrUpdateAmbient(1);
              onEnter();
            }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8b2323] to-[#b03030] py-3 text-sm font-medium text-white shadow-lg shadow-red-950/40 hover:brightness-110 cursor-pointer transition"
          >
            <Mail className="h-4 w-4" />
            <span>查收林知夏的未读定时邮件</span>
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
