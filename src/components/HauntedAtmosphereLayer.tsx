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
  visual: 'mirror_peeker' | 'door_tally' | 'thumbprint_bleed' | 'shadow_pass';
}

/**
 * 全局中式民俗恐怖氛围与实景异变演出层（适配明亮纸本 UI，不伤眼但细思极恐）
 * - 阅读苏晓棠 12/24/36 号校注、周怀瑾手印册、B2 十诫等关键档案时触发对应实景异象（拧门把手三下、叩门框数第十二人、镜面身后湿衣影、缺口红指模洇透纸背）
 * - 随幕数与视网膜残留度渐进浮现库底水渍、朱砂残印与眼角余光黑影掠过
 */
export const HauntedAtmosphereLayer: React.FC<HauntedAtmosphereLayerProps> = ({
  state,
  activeDocKey,
}) => {
  const [activeCue, setActiveCue] = useState<HauntCue | null>(null);
  const [peripheralSide, setPeripheralSide] = useState<'left' | 'right' | null>(null);
  const triggeredSetRef = useRef<Set<string>>(new Set());

  // 针对特定高能民俗档案的阅读驻留实景触发（每份档案首次驻留 3.6 秒触发一次，恰好在玩家读到正文细节时响起！）
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
          tag: 'B1-09 善本库门禁传感异常',
          line: '咔嗒……咔嗒……咔嗒。（门把手被人从走廊外侧轻轻拧了三下）',
          subline: '“十月封镜”戒律生效中：请勿将脸凑近屏幕黑边反光区域。',
          visual: 'mirror_peeker',
        },
        runAudio: () => horrorAudio.playDoorKnocks(3, true),
      },
      'qinghe:qh-24-07': {
        delayMs: 4200,
        cue: {
          id: 'cue-24-07',
          tag: '走廊木门框声学拾音',
          line: '笃、笃、笃……“九、十、十一……十二。”',
          subline: '门外点名的人数到第十一下没有停，指节正停在你的屏幕边框上。',
          visual: 'door_tally',
        },
        runAudio: () => {
          horrorAudio.playWoodenClapper();
          setTimeout(() => horrorAudio.playDoorKnocks(2, false), 950);
        },
      },
      'qinghe:qh-36-02': {
        delayMs: 3800,
        cue: {
          id: 'cue-36-02',
          tag: '视窗镜面折射告警',
          line: '采购单上第 40 面老式木框梳妆镜未在 B1 走廊找到——它正立在你的座椅正后方。',
          subline: '切勿在此刻回头核对肩膀后侧的粗布黑褂领口。',
          visual: 'mirror_peeker',
        },
        runAudio: () => horrorAudio.playMirrorChill(state.scareMode),
      },
      'chronicles:chr-migrant-appendix38': {
        delayMs: 3600,
        cue: {
          id: 'cue-appendix38',
          tag: '卷宗纸背朱砂渗印',
          line: '124 户领款人共用同一枚右上角带月牙缺口的右手拇指印——第 125 枚刚刚按在了本页背面。',
          visual: 'thumbprint_bleed',
        },
        runAudio: () => horrorAudio.playMirrorChill(state.scareMode),
      },
      'qinghe:qh-38-s00': {
        delayMs: 3400,
        cue: {
          id: 'cue-38-s00',
          tag: '1998 宗祠戏台残响',
          line: '头通锣歇灯，二通锣背身……三通锣响后，台下看戏的人不许抬头看空龛。',
          visual: 'mirror_peeker',
        },
        runAudio: () => horrorAudio.playBronzeGong(1),
      },
      'oa:oa-l2-ten-rules': {
        delayMs: 4200,
        cue: {
          id: 'cue-oa-rules',
          tag: 'VLAN-B2 审片席红外感应',
          line: '已签阅《安全审片十诫》：三号机柜旁多出了一双湿布鞋印，正站在你工位隔断外陪你读第 7 条。',
          visual: 'shadow_pass',
        },
        runAudio: () => horrorAudio.playWoodenClapper(),
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
      }, 6200);
    }, spec.delayMs);

    return () => window.clearTimeout(timer);
  }, [activeDocKey, state.scareMode]);

  // 第 2 幕起偶发的「眼角余光湿衣黑影掠过」细微心理恐怖演出（滚动翻阅长文档时低概率触发，不遮挡文字）
  useEffect(() => {
    if (state.act < 2 && state.contamination < 15) return;
    let cooldownUntil = Date.now() + 18000;

    const onScroll = () => {
      const now = Date.now();
      if (now < cooldownUntil) return;
      if (Math.random() > 0.22) {
        cooldownUntil = now + 9000;
        return;
      }
      cooldownUntil = now + 38000;
      const side = Math.random() > 0.5 ? 'right' : 'left';
      setPeripheralSide(side);
      if (state.act >= 3) {
        horrorAudio.playMirrorChill('psychological');
      }
      window.setTimeout(() => {
        setPeripheralSide(null);
      }, 1350);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [state.act, state.contamination]);

  const showCinnabarWatermark = state.contamination >= 20 || state.act >= 2;
  const showDeepWaterStain = state.contamination >= 40 || state.act >= 3;

  return (
    <>
      {/* 1. 渐进式纸边异变层：随污染度与幕数浮现水库湿泥水渍与月牙缺口红指模水印（纯 pointer-events-none，不影响阅读） */}
      {showCinnabarWatermark && (
        <div className="pointer-events-none fixed inset-0 z-[35] overflow-hidden select-none">
          {/* 右下角洇透纸背的月牙缺口朱砂拇指印 */}
          <div
            style={{ opacity: Math.min(0.24, 0.06 + state.contamination * 0.002) }}
            className="absolute bottom-10 right-7 h-24 w-20 rotate-[-14deg] transition-opacity duration-1000"
          >
            <svg viewBox="0 0 100 124" className="h-full w-full text-[#9e2a2b]">
              <defs>
                <radialGradient id="cinnabarThumbGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.65" />
                  <stop offset="72%" stopColor="currentColor" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
                {/* 右上角标志性月牙缺口遮罩 */}
                <mask id="thumbNotchMask">
                  <rect width="100" height="124" fill="white" />
                  <circle cx="76" cy="28" r="13" fill="black" />
                </mask>
              </defs>
              <g mask="url(#thumbNotchMask)">
                <ellipse cx="50" cy="62" rx="36" ry="48" fill="url(#cinnabarThumbGrad)" />
                {[14, 21, 28, 35, 42].map((rx, idx) => (
                  <ellipse
                    key={rx}
                    cx="50"
                    cy={62 + (idx % 2 === 0 ? -1 : 1)}
                    rx={rx}
                    ry={rx * 1.32}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeDasharray="6 3 11 4"
                    strokeOpacity={0.55 - idx * 0.07}
                  />
                ))}
              </g>
            </svg>
          </div>

          {/* 库底潮湿水渍暗边（第3幕或高残留时浮现） */}
          {showDeepWaterStain && (
            <div
              className="absolute inset-0 transition-opacity duration-1000"
              style={{
                background:
                  'radial-gradient(circle at 0% 100%, rgba(22, 38, 63, 0.08), transparent 28%), radial-gradient(circle at 100% 0%, rgba(158, 42, 43, 0.06), transparent 26%)',
              }}
            />
          )}
        </div>
      )}

      {/* 2. 眼角余光黑影掠过（滚动页面时偶发，一闪即逝的穿湿黑褂背影） */}
      <AnimatePresence>
        {peripheralSide && (
          <motion.div
            initial={{ opacity: 0, x: peripheralSide === 'left' ? -36 : 36 }}
            animate={{ opacity: state.scareMode === 'full' ? 0.34 : 0.2, x: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className={`pointer-events-none fixed top-1/4 z-[65] h-[62vh] w-36 select-none blur-[2px] ${
              peripheralSide === 'left' ? 'left-0' : 'right-0'
            }`}
          >
            <svg viewBox="0 0 140 360" className="h-full w-full text-[#15181e]">
              {/* 微驼背、穿宽大旧黑褂的静立人影轮廓 */}
              <ellipse cx="70" cy="54" rx="24" ry="29" fill="currentColor" />
              <path
                d="M28 112 C34 86, 106 86, 112 112 L124 265 L96 268 L92 355 L48 355 L44 268 L16 265 Z"
                fill="currentColor"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. 阅读特定禁忌卷宗时触发的「封镜暗影 / 门外数人头 / 纸背红指模」沉浸演出 */}
      <AnimatePresence>
        {activeCue && (
          <>
            {activeCue.visual === 'mirror_peeker' && (
              <motion.div
                key={`vignette-${activeCue.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="pointer-events-none fixed inset-0 z-[75] flex items-center justify-center overflow-hidden"
                style={{
                  background:
                    state.scareMode === 'full'
                      ? 'radial-gradient(circle at 50% 50%, rgba(12,12,15,0.12) 30%, rgba(12,10,12,0.58) 100%)'
                      : 'radial-gradient(circle at 50% 50%, transparent 42%, rgba(20,16,16,0.34) 100%)',
                }}
              >
                {/* 屏幕暗面反光中一闪而过的身后湿衣黑影与单只窥视眼 */}
                <motion.svg
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1.02, opacity: state.scareMode === 'full' ? 0.28 : 0.15 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                  viewBox="0 0 400 460"
                  className="h-[74vh] w-[74vh] text-stone-950"
                >
                  <ellipse cx="200" cy="138" rx="56" ry="68" fill="currentColor" />
                  <path
                    d="M92 248 C110 198, 290 198, 308 248 L332 450 L68 450 Z"
                    fill="currentColor"
                  />
                  {/* 十月封镜十字红封条缝隙间的一点暗白眼白 */}
                  <ellipse cx="222" cy="136" rx="11" ry="5.5" fill="#f5f0e6" fillOpacity="0.72" />
                  <circle cx="222" cy="136" r="3.2" fill="#3b0808" />
                </motion.svg>
              </motion.div>
            )}

            {activeCue.visual === 'door_tally' && (
              <motion.div
                key={`tally-${activeCue.id}`}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none fixed right-5 top-32 z-[76] hidden sm:flex flex-col items-center gap-1 rounded-lg border border-[#9e2a2b]/35 bg-[#fff9f5]/92 px-2.5 py-3 font-serif-cn text-xs font-bold text-[#9e2a2b] shadow-lg"
              >
                <span>一</span>
                <span>二</span>
                <span>三</span>
                <span>⋮</span>
                <span>十一</span>
                <span className="mt-1 rounded bg-[#9e2a2b] px-1.5 py-0.5 text-[11px] text-white">
                  十二
                </span>
              </motion.div>
            )}

            {/* 底部克制但极具压迫感的民俗异象实况字幕条 */}
            <motion.div
              key={`banner-${activeCue.id}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none fixed bottom-6 left-1/2 z-[82] w-[92vw] max-w-xl -translate-x-1/2 rounded-xl border border-[#9e2a2b]/55 bg-[#1b1615]/94 px-5 py-3.5 text-[#f7f2e8] shadow-2xl backdrop-blur-md"
            >
              <div className="mb-1 flex items-center justify-between text-[10.5px] font-mono-tech tracking-wider text-[#e07a7b]">
                <span>[{activeCue.tag}]</span>
                <span>LIVE_SENSOR // 10.14.202.38</span>
              </div>
              <p className="font-serif-cn text-sm font-semibold leading-relaxed text-[#fdfaf3]">
                {activeCue.line}
              </p>
              {activeCue.subline && (
                <p className="mt-1 text-[11.5px] text-stone-300/90">{activeCue.subline}</p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
