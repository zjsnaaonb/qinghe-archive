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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#f6f2e8] px-5 py-12 text-stone-800">
      {/* 柔和宣纸机理与淡朱砂印泥光晕 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 28%, rgba(158, 42, 43, 0.07), transparent 55%), radial-gradient(circle at 50% 100%, rgba(214, 205, 186, 0.45), transparent 70%)',
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
            className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#9e2a2b]/30 bg-white/85 px-3.5 py-1 text-[11px] font-mono-tech tracking-widest text-[#9e2a2b] shadow-2xs"
          >
            <Eye className="h-3.5 w-3.5 text-[#9e2a2b]" />
            <span>云溪库区遗存影像调查档案 · 1998—2026</span>
          </motion.div>

          <h1 className="font-serif-cn text-4xl sm:text-5xl font-bold tracking-[0.14em] text-[#16263f]">
            青禾库
          </h1>
          <p className="mt-2 font-serif-cn text-base tracking-[0.25em] text-stone-500">
            祠下村遗存影像考
          </p>

          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-stone-600">
            2026 年 11 月 25 日晚 21:00，你的加密邮箱收到一封来自南州大学民俗课题组的定时死信。
            <br />
            距离「百年民俗线上特展」全网公映，只剩不到三小时。
          </p>
        </div>

        {/* 清爽纸本风体验偏好卡片 */}
        <div className="rounded-2xl border border-[#dfd8ca] bg-white/95 p-6 backdrop-blur-md shadow-xl shadow-stone-900/5">
          <div className="mb-4 flex items-center justify-between border-b border-[#ece6da] pb-3 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#16263f]">
              <ShieldAlert className="h-3.5 w-3.5 text-[#9e2a2b]" />
              惊吓与声景偏好（游玩中随时可切）
            </span>
            <button
              type="button"
              onClick={onToggleMute}
              className="inline-flex items-center gap-1 rounded-full border border-[#d6cebe] bg-[#faf8f3] px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:border-stone-400 cursor-pointer transition"
            >
              {audioMuted ? (
                <>
                  <VolumeX className="h-3 w-3 text-[#9e2a2b]" />
                  <span>已静音</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3 w-3 text-emerald-600" />
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
                  ? 'border-[#9e2a2b]/60 bg-red-50/70 text-[#7f1d1d] shadow-2xs'
                  : 'border-stone-200 bg-[#faf8f3] text-stone-600 hover:border-stone-300'
              }`}
            >
              <div className="text-xs font-bold">完整惊悚体验</div>
              <div className="mt-1 text-[11px] leading-relaxed opacity-85">
                含老照片异变转头、故障音效与违规惊吓演出
              </div>
            </button>

            <button
              type="button"
              onClick={() => onChangeScareMode('psychological')}
              className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                scareMode === 'psychological'
                  ? 'border-amber-600/60 bg-amber-50/80 text-amber-950 shadow-2xs'
                  : 'border-stone-200 bg-[#faf8f3] text-stone-600 hover:border-stone-300'
              }`}
            >
              <div className="text-xs font-bold">心理压迫模式（温和）</div>
              <div className="mt-1 text-[11px] leading-relaxed opacity-85">
                保留全部细思极恐异变，移除高分贝突发惊吓
              </div>
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-[#ece6da] bg-[#faf8f3] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-stone-600">
            <strong className="text-[#16263f]">玩法贴士：</strong>
            游戏不会替你自动总结答案。阅读档案时，用鼠标
            <strong className="text-[#9e2a2b]">划选任意可疑文字</strong>
            即可直接摘录到右侧随身手记或跨站搜索；展开手记时主页面会自动左移，方便对照取证。
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
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8f2425] to-[#ad2f30] py-3 text-sm font-semibold text-white shadow-md shadow-[#9e2a2b]/20 hover:brightness-105 cursor-pointer transition"
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
