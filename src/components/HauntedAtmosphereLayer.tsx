import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { GameState } from '../types/game';
import { horrorAudio } from '../engine/audio';

interface HauntedAtmosphereLayerProps {
  state: GameState;
  activeDocKey: string;
}

interface HauntCue {
  id: string;
  tag: string;
  line: string;
  subline?: string;
  imageSrc: string;
  mode: 'mirror_flash' | 'door_peek' | 'shrine_glimpse';
}

/**
 * 全局中式民俗恐怖实景异变层（100% 采用 gpt-image 生成的真实摄影级素材，零手绘 SVG）
 * - 阅读苏晓棠 12/24/36 号校注、周怀瑾手印册、1998 空神龛与 B2 十诫时，触发真实门缝水渍手影、封镜窥视眼与神龛泥胎实拍异象
 * - 纸张边缘随视网膜残留浮现真实朱砂月牙断疤红指模（mix-blend-multiply 洇纸质感）与湿黑褂立影
 */
export const HauntedAtmosphereLayer: React.FC<HauntedAtmosphereLayerProps> = ({
  state,
  activeDocKey,
}) => {
  const [activeCue, setActiveCue] = useState<HauntCue | null>(null);
  const [peripheralSide, setPeripheralSide] = useState<'left' | 'right' | null>(null);
  const triggeredSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!activeDocKey) return;

    const triggerMap: Record<
      string,
      {
        delayMs: number;
        cue: HauntCue;
        runAudio: () => void;
      }
    > = {
      'qinghe:qh-12-03': {
        delayMs: 3800,
        cue: {
          id: 'cue-12-03',
          tag: 'B1-09 善本库门缝实况',
          line: '咔嗒……咔嗒……咔嗒。（门把手被人从走廊外侧轻轻拧了三下）',
          subline: '防鼠钢板反光里有一双泡白的光脚停在门外，湿泥水正顺着门缝往屋里漫。',
          imageSrc: './media/horror_door_gap.png',
          mode: 'door_peek',
        },
        runAudio: () => horrorAudio.playDoorKnocks(3, true),
      },
      'qinghe:qh-24-07': {
        delayMs: 4200,
        cue: {
          id: 'cue-24-07',
          tag: '走廊木门框声学拾音',
          line: '笃、笃、笃……“九、十、十一……十二。”',
          subline: '门外点名的人数到第十一下没有停，湿透的手指正从门底缝隙往里探。',
          imageSrc: './media/horror_door_gap.png',
          mode: 'door_peek',
        },
        runAudio: () => {
          horrorAudio.playWoodenClapper();
          setTimeout(() => horrorAudio.playDoorKnocks(3, false), 950);
        },
      },
      'qinghe:qh-36-02': {
        delayMs: 3800,
        cue: {
          id: 'cue-36-02',
          tag: '十月封镜 · 屏幕暗面反光',
          line: '采购单上第 40 面老式木框梳妆镜不在走廊——它正立在你的座椅正后方。',
          subline: '十字红封条的裂口后面，有一只眼睛正贴着玻璃看你后颈。',
          imageSrc: './media/horror_mirror_reflection.png',
          mode: 'mirror_flash',
        },
        runAudio: () => horrorAudio.playScareStinger(state.scareMode),
      },
      'chronicles:chr-migrant-appendix38': {
        delayMs: 3600,
        cue: {
          id: 'cue-appendix38',
          tag: '卷宗纸背朱砂渗印',
          line: '124 户领款人共用同一枚右上角带月牙缺口的右手拇指印——第 125 枚刚刚按在了本页右下角。',
          imageSrc: './media/cinnabar_thumbprint.png',
          mode: 'door_peek',
        },
        runAudio: () => horrorAudio.playMirrorChill(state.scareMode),
      },
      'qinghe:qh-38-s00': {
        delayMs: 3400,
        cue: {
          id: 'cue-38-s00',
          tag: '1998 宗祠戏台残响',
          line: '头通锣歇灯，二通锣背身……三通锣响后，龛里的泥胎已经裂开眼皮了。',
          imageSrc: './media/horror_shrine_stare.png',
          mode: 'shrine_glimpse',
        },
        runAudio: () => horrorAudio.playBronzeGong(1),
      },
      'oa:oa-l2-ten-rules': {
        delayMs: 4200,
        cue: {
          id: 'cue-oa-rules',
          tag: 'VLAN-B2 审片席红外抓拍',
          line: '已签阅《安全审片十诫》：三号机柜旁多出了一双湿布鞋印，正站在你椅背后面陪你读第七条。',
          imageSrc: './media/horror_mirror_reflection.png',
          mode: 'mirror_flash',
        },
        runAudio: () => horrorAudio.playMirrorChill(state.scareMode),
      },
    };

    const spec = triggerMap[activeDocKey];
    if (!spec || triggeredSetRef.current.has(spec.cue.id)) return;

    const timer = window.setTimeout(() => {
      triggeredSetRef.current.add(spec.cue.id);
      spec.runAudio();
      setActiveCue(spec.cue);
      window.setTimeout(() => {
        setActiveCue((curr) => (curr?.id === spec.cue.id ? null : curr));
      }, 6500);
    }, spec.delayMs);

    return () => window.clearTimeout(timer);
  }, [activeDocKey, state.scareMode]);

  // 第 2 幕起偶发的「眼角余光湿黑褂村民立影」一闪即逝（采用 gpt-image 实拍透明图层）
  useEffect(() => {
    if (state.act < 2 && state.contamination < 15) return;
    let cooldownUntil = Date.now() + 20000;

    const onScroll = () => {
      const now = Date.now();
      if (now < cooldownUntil) return;
      if (Math.random() > 0.2) {
        cooldownUntil = now + 9500;
        return;
      }
      cooldownUntil = now + 42000;
      const side = Math.random() > 0.5 ? 'right' : 'left';
      setPeripheralSide(side);
      if (state.act >= 3) {
        horrorAudio.playMirrorChill('psychological');
      }
      window.setTimeout(() => {
        setPeripheralSide(null);
      }, 1450);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [state.act, state.contamination]);

  const showCinnabarWatermark = state.contamination >= 15 || state.act >= 2;
  const showDeepWaterStain = state.contamination >= 40 || state.act >= 3;

  return (
    <>
      {/* 1. 真实朱砂月牙断疤红指模洇纸水印（gpt-image 微距印泥实拍 + mix-blend-multiply 融于宣纸肌理） */}
      {showCinnabarWatermark && (
        <div className="pointer-events-none fixed inset-0 z-[35] overflow-hidden select-none">
          <img
            src="./media/cinnabar_thumbprint.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{ opacity: Math.min(0.32, 0.08 + state.contamination * 0.0024) }}
            className="absolute bottom-8 right-6 h-24 w-24 rotate-[-14deg] object-contain mix-blend-multiply transition-opacity duration-1000"
          />

          {showDeepWaterStain && (
            <div
              className="absolute inset-0 transition-opacity duration-1000"
              style={{
                background:
                  'radial-gradient(circle at 0% 100%, rgba(22, 38, 63, 0.09), transparent 28%), radial-gradient(circle at 100% 0%, rgba(158, 42, 43, 0.07), transparent 26%)',
              }}
            />
          )}
        </div>
      )}

      {/* 2. 眼角余光一闪即逝的湿粗布黑褂村民实拍立影（gpt-image 透明通道图层） */}
      <AnimatePresence>
        {peripheralSide && (
          <motion.img
            src="./media/peripheral_villager.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            initial={{ opacity: 0, x: peripheralSide === 'left' ? -44 : 44 }}
            animate={{ opacity: state.scareMode === 'full' ? 0.42 : 0.24, x: 0 }}
            exit={{ opacity: 0, filter: 'blur(6px)' }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className={`pointer-events-none fixed bottom-0 z-[65] h-[64vh] w-auto object-contain select-none mix-blend-multiply blur-[1px] ${
              peripheralSide === 'left' ? '-left-6' : '-right-6'
            }`}
          />
        )}
      </AnimatePresence>

      {/* 3. 阅读禁忌档案时触发的沉浸式实拍暗影浮现 + 现场拾音条 */}
      <AnimatePresence>
        {activeCue && (
          <>
            {(activeCue.mode === 'mirror_flash' || activeCue.mode === 'shrine_glimpse') &&
              state.scareMode === 'full' && (
                <motion.div
                  key={`flash-${activeCue.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.36, 0.22, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.1, ease: 'easeInOut' }}
                  className="pointer-events-none fixed inset-0 z-[75] flex items-center justify-center overflow-hidden bg-black/45"
                >
                  <img
                    src={activeCue.imageSrc}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="h-full w-full object-cover opacity-65 mix-blend-luminosity scale-105 select-none"
                  />
                </motion.div>
              )}

            {/* 底部带真实 gpt-image 现场抓拍缩略帧的民俗异象拾音框 */}
            <motion.div
              key={`banner-${activeCue.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: 0.32 }}
              className="pointer-events-none fixed bottom-6 left-1/2 z-[82] flex w-[94vw] max-w-2xl -translate-x-1/2 items-stretch overflow-hidden rounded-xl border border-[#9e2a2b]/60 bg-[#141010]/95 text-[#f7f2e8] shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-md"
            >
              <div className="relative hidden sm:block w-40 shrink-0 overflow-hidden bg-black border-r border-white/10">
                <img
                  src={activeCue.imageSrc}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover opacity-92"
                />
                <span className="absolute bottom-1.5 left-2 rounded bg-black/75 px-1.5 py-0.5 font-mono-tech text-[9px] text-red-300">
                  REC ● 02:17
                </span>
              </div>

              <div className="flex-1 px-4 py-3.5">
                <div className="mb-1 flex items-center justify-between text-[10.5px] font-mono-tech tracking-wider text-[#e07a7b]">
                  <span>[{activeCue.tag}]</span>
                  <span>SENSOR // 10.14.202.38</span>
                </div>
                <p className="font-serif-cn text-sm font-semibold leading-relaxed text-[#fdfaf3]">
                  {activeCue.line}
                </p>
                {activeCue.subline && (
                  <p className="mt-1 font-serif-cn text-xs text-stone-300/90">{activeCue.subline}</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
