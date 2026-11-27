import React from 'react';
import { motion } from 'motion/react';
import type { ScareMode } from '../types/game';
import type { ScareVisualType } from '../sites/siteProps';

interface ScareOverlayProps {
  scareEvent: {
    title: string;
    message: string;
    visualType: ScareVisualType;
  } | null;
  scareMode: ScareMode;
  onDismiss: () => void;
}

const SCARE_STILL_MAP: Record<ScareVisualType, { src: string; code: string }> = {
  shrine: {
    src: './media/horror_shrine_stare.png',
    code: 'REEL-QH38-S00 // 祠堂正龛泥胎异变帧',
  },
  peeker: {
    src: './media/horror_mirror_reflection.png',
    code: 'SEAL-10-MIRROR // 十月封镜水银暗影帧',
  },
  meta_eye: {
    src: './media/horror_webcam_behind.png',
    code: 'CAM-EXT-39 // 屏幕顶置红外反向抓拍帧',
  },
  rule_break: {
    src: './media/horror_door_gap.png',
    code: 'VAULT-B1-DOOR // 门缝库底渗水抓痕帧',
  },
  peephole: {
    src: './media/horror_peephole_corridor.png',
    code: 'VAULT-PEEPHOLE // 地下库房门镜贴脸对射帧',
  },
  under_desk: {
    src: './media/horror_under_desk.png',
    code: 'DESK-FLOOR-IR // 当前工位桌底盲罩潜伏帧',
  },
  webcam: {
    src: './media/horror_webcam_behind.png',
    code: 'CAM-EXT-39 // 座椅后方湿衣旁观者实测帧',
  },
};

export const ScareOverlay: React.FC<ScareOverlayProps> = ({
  scareEvent,
  scareMode,
  onDismiss,
}) => {
  if (!scareEvent) return null;

  const isFull = scareMode === 'full';
  const visual = SCARE_STILL_MAP[scareEvent.visualType] || SCARE_STILL_MAP.shrine;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className={`fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm ${
        isFull ? 'glitch-burst' : ''
      }`}
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: isFull ? 1.04 : 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-[#9e2a2b]/65 bg-[#120e0e] text-[#f3ede2] shadow-[0_28px_90px_rgba(0,0,0,0.94)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
          <motion.img
            src={visual.src}
            alt={scareEvent.title}
            draggable={false}
            initial={{ scale: 1.01 }}
            animate={{ scale: 1.08 }}
            transition={{ duration: 6.5, ease: 'easeOut' }}
            className="h-full w-full object-cover select-none"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 50% 42%, transparent 40%, rgba(10, 7, 7, 0.76) 100%), linear-gradient(to top, rgba(18, 14, 14, 0.96) 0%, transparent 30%)',
            }}
          />
          <div className="pointer-events-none absolute left-4 top-3.5 rounded border border-red-500/40 bg-black/75 px-2.5 py-0.5 font-mono-tech text-[10.5px] tracking-widest text-red-300/90">
            {visual.code}
          </div>
          <div className="pointer-events-none absolute right-4 top-3.5 font-mono-tech text-[10.5px] text-amber-300/80">
            TC 02:17:09:14
          </div>
        </div>

        <div className="px-6 pb-6 pt-4">
          <h3 className="mb-2.5 font-serif-cn text-xl font-bold tracking-wider text-[#f5d0c5]">
            {scareEvent.title}
          </h3>

          <p className="mb-5 whitespace-pre-line font-serif-cn text-sm leading-7 text-stone-300">
            {scareEvent.message}
          </p>

          <div className="flex items-center justify-between border-t border-white/10 pt-3.5">
            <span className="font-mono-tech text-[11px] tracking-wider text-red-400/80">
              ● 银盐底片视网膜残留已记录
            </span>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-[#9e2a2b] bg-[#8b2021] px-4 py-1.5 font-serif-cn text-xs font-semibold tracking-widest text-[#fbf7ef] hover:bg-[#a12829] cursor-pointer transition"
            >
              闭目移开视线
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
