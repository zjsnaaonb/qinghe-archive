import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { GameState } from '../types/game';
import type { ScarePayload, ScareVisualType } from '../sites/siteProps';
import { horrorAudio } from '../engine/audio';

interface HauntedAtmosphereLayerProps {
  state: GameState;
  activeDocKey: string;
  onTriggerScare: (scare: ScarePayload) => void;
}

interface HauntCue {
  id: string;
  tag: string;
  line: string;
  subline?: string;
  tabTitleWarning: string;
  imageSrc: string;
  scareVisual: ScareVisualType;
  flashFullScreen?: boolean;
}

const DEFAULT_PAGE_TITLE = '青禾民俗影像数字化保护工程 — 外部协查检索终端';

/**
 * 全局中式民俗恐怖实景异变与跨站点惊悚演出层（全套 100% gpt-image 摄影级实拍资产）
 * - 覆盖收件箱、民俗馆、水利方志网、OA工单与夏夜拾遗的 13 处文档级定制惊悚触发
 * - 支持点击任意底部监控抓拍卡片一键弹出高分辨率全屏恐怖画面检视
 * - 异象发生时同步侵蚀浏览器标签页标题栏（Document Title Possession）
 * - 随调查深入偶发「02:17 门镜猫眼贴脸 / 显示器顶置红外反向取景」巡检异变
 */
export const HauntedAtmosphereLayer: React.FC<HauntedAtmosphereLayerProps> = ({
  state,
  activeDocKey,
  onTriggerScare,
}) => {
  const [activeCue, setActiveCue] = useState<HauntCue | null>(null);
  const [peripheralSide, setPeripheralSide] = useState<'left' | 'right' | null>(null);
  const triggeredSetRef = useRef<Set<string>>(new Set());

  // 异象激活期间动态篡改浏览器顶部标签栏文字
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (activeCue) {
      document.title = activeCue.tabTitleWarning;
      return () => {
        document.title = DEFAULT_PAGE_TITLE;
      };
    }
    document.title = DEFAULT_PAGE_TITLE;
  }, [activeCue]);

  // 13 处核心文档实景民俗异象触发器
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
      'mail:mail-prologue-step2': {
        delayMs: 4200,
        cue: {
          id: 'cue-mail-step2',
          tag: '邮件网关镜像尾流告警',
          line: '检测到人文楼 B2 湿法暗房（10.14.202.38）在同一秒打开了这封续信。',
          subline: '红外副摄回传：有三名穿湿粗布褂的旁观者正站在你的椅背后面一起读信。',
          tabTitleWarning: '● [同页4人] 椅背后面有人正在陪你读信',
          imageSrc: './media/horror_webcam_behind.png',
          scareVisual: 'webcam',
        },
        runAudio: () => horrorAudio.playMirrorChill(state.scareMode),
      },
      'mail:mail-act2-su-draft': {
        delayMs: 3600,
        cue: {
          id: 'cue-mail-su',
          tag: 'B1-09 善本库防盗门镜抓拍',
          line: '门外走廊有人端着木框梳妆镜贴紧了防盗猫眼——镜子里排满了背过身去的人影！',
          subline: '点击左侧门镜画面可核对门外贴脸人员特征。',
          tabTitleWarning: '● [B1猫眼告警] 门镜外侧贴着一只眼睛',
          imageSrc: './media/horror_peephole_corridor.png',
          scareVisual: 'peephole',
          flashFullScreen: true,
        },
        runAudio: () => horrorAudio.playDoorKnocks(3, true),
      },
      'qinghe:qh-consumables-audit': {
        delayMs: 3800,
        cue: {
          id: 'cue-consumables',
          tag: '资产入库单异常反光',
          line: '凌晨 03:12 紧急采购的 40 面老式木框梳妆镜中，第 40 面显示「已调拨至当前外部终端」。',
          subline: '切勿贴近屏幕暗处核对『十月封镜』红纸封条后的视线。',
          tabTitleWarning: '● [十月封镜] 第40面梳妆镜已立在身后',
          imageSrc: './media/horror_mirror_reflection.png',
          scareVisual: 'peeker',
        },
        runAudio: () => horrorAudio.playMirrorChill(state.scareMode),
      },
      'qinghe:qh-12-03': {
        delayMs: 3600,
        cue: {
          id: 'cue-12-03',
          tag: 'B1-09 善本库门缝实况',
          line: '咔嗒……咔嗒……咔嗒。（门把手被人从走廊外侧缓慢拧动了三下）',
          subline: '防鼠钢板反光里有一双泡白的光脚停在门外，湿泥水正顺着门缝往屋里漫。',
          tabTitleWarning: '● [门锁异动] 门缝底下伸进来了湿手指',
          imageSrc: './media/horror_door_gap.png',
          scareVisual: 'rule_break',
          flashFullScreen: true,
        },
        runAudio: () => horrorAudio.playDoorKnocks(3, true),
      },
      'qinghe:qh-19-02': {
        delayMs: 4000,
        cue: {
          id: 'cue-19-02',
          tag: '福春班梨园忌例异动',
          line: '账本左页空白处正在渗出暗红字迹：“三锣响后，戏箱里多出一颗头……”',
          subline: '提示：对上方账本照片开启【光学放大镜】或【斜射显影】可检视竹纸背面血书。',
          tabTitleWarning: '● [梨园三忌] 三锣响后不得回首窥龛',
          imageSrc: './media/qh_19_02_lens.png',
          scareVisual: 'shrine',
        },
        runAudio: () => horrorAudio.playWoodenClapper(),
      },
      'qinghe:qh-24-07': {
        delayMs: 3800,
        cue: {
          id: 'cue-24-07',
          tag: '当前工位桌底声学拾音',
          line: '笃、笃、笃……“九、十、十一……十二。”',
          subline: '数到第十二下时，声音不是从走廊传来的——是从你脚边的电脑桌底下传出来的。',
          tabTitleWarning: '● [切勿低头] 电脑桌底下蹲着第十二个人',
          imageSrc: './media/horror_under_desk.png',
          scareVisual: 'under_desk',
          flashFullScreen: true,
        },
        runAudio: () => {
          horrorAudio.playWoodenClapper();
          setTimeout(() => horrorAudio.playDoorKnocks(3, false), 900);
        },
      },
      'qinghe:qh-36-02': {
        delayMs: 3600,
        cue: {
          id: 'cue-36-02',
          tag: 'CAM-EXT-39 顶置夜视告警',
          line: '屏幕顶置红外探头已完成活体清点：当前座椅正后方共站立 3 名湿黑褂旁观者。',
          subline: '他们正俯身越过你的肩膀，逐字核对你输入手记的数字。',
          tabTitleWarning: '● [CAM-EXT-39] 你椅背后面站着三个人',
          imageSrc: './media/horror_webcam_behind.png',
          scareVisual: 'webcam',
          flashFullScreen: true,
        },
        runAudio: () => horrorAudio.playScareStinger(state.scareMode),
      },
      'qinghe:qh-38-s00': {
        delayMs: 3200,
        cue: {
          id: 'cue-38-s00',
          tag: '1998 宗祠戏台残响',
          line: '头通锣歇灯，二通锣背身……三通锣响后，龛里的泥胎已经裂开眼皮看着你了。',
          subline: '切记首诫：用放大镜检视上方戏台时，停留神龛切勿超过两秒！',
          tabTitleWarning: '● [首诫警告] 空神龛里的泥胎睁开眼了',
          imageSrc: './media/horror_shrine_stare.png',
          scareVisual: 'shrine',
          flashFullScreen: true,
        },
        runAudio: () => horrorAudio.playBronzeGong(1),
      },
      'chronicles:chr-migrant-appendix38': {
        delayMs: 3500,
        cue: {
          id: 'cue-appendix38',
          tag: '附表38 纸背印泥渗血',
          line: '124 枚同源断疤红指模中心同时睁开了瞳孔，二排三列户主名正被涂改为『屏前调阅人』。',
          subline: '可用上方【光学放大镜】或【斜射显影】核验第 125 户借目状态。',
          tabTitleWarning: '● [附表38异变] 户主已变更为屏前调阅人',
          imageSrc: './media/thumbprint_ledger_lens.png',
          scareVisual: 'peeker',
        },
        runAudio: () => horrorAudio.playMirrorChill(state.scareMode),
      },
      'chronicles:chr-1998-police-notice': {
        delayMs: 3800,
        cue: {
          id: 'cue-police-1998',
          tag: '协查卷宗物证袋异响',
          line: '1998 失踪戏班协查通报末尾夹着一张昨晚 02:17 拍自人文楼地下库房门镜的湿底片。',
          subline: '门外贴着猫眼往里看的人，穿的正是二十八年前失踪班主那件粗布黑褂。',
          tabTitleWarning: '● [协查补卷] 门镜外发现1998失踪人员特征',
          imageSrc: './media/horror_peephole_corridor.png',
          scareVisual: 'peephole',
        },
        runAudio: () => horrorAudio.playDoorKnocks(2, true),
      },
      'oa:oa-l1-attendance': {
        delayMs: 3800,
        cue: {
          id: 'cue-oa-attendance',
          tag: '门禁读卡器实时回传',
          line: '滴——地下 B1/B2 隔离门刚刚在无卡状态下刷开了，猫眼抓拍到门外有人举着梳妆镜对射。',
          subline: '点击左侧抓拍帧可查看门镜外侧走廊镜像。',
          tabTitleWarning: '● [02:17门禁刷开] 门外走廊梳妆镜对射中',
          imageSrc: './media/horror_peephole_corridor.png',
          scareVisual: 'peephole',
        },
        runAudio: () => horrorAudio.playDoorKnocks(3, false),
      },
      'oa:oa-l2-ten-rules': {
        delayMs: 3800,
        cue: {
          id: 'cue-oa-rules',
          tag: 'VLAN-B2 审片席红外抓拍',
          line: '已签阅《安全审片十诫》：工位桌底与椅背后面均检出低温湿衣生命体征。',
          subline: '请勿低头查看电源插排旁攥着草编盲罩的手。',
          tabTitleWarning: '● [审片十诫] 桌底与椅后检出湿衣滞留体',
          imageSrc: './media/horror_under_desk.png',
          scareVisual: 'under_desk',
          flashFullScreen: true,
        },
        runAudio: () => horrorAudio.playScareStinger(state.scareMode),
      },
      'notes:note-s3': {
        delayMs: 4000,
        cue: {
          id: 'cue-notes-s3',
          tag: '夏夜拾遗 · 纸笺潮气渗入',
          line: '外婆口述里提过的那副红泥草编盲罩，刚刚被人从你的书桌底下递到了脚边。',
          subline: '听到水滴落在插线板旁的声音时，千万不要弯腰去捡。',
          tabTitleWarning: '● [外婆忌言] 夜半闻滴水声莫看桌底',
          imageSrc: './media/horror_under_desk.png',
          scareVisual: 'under_desk',
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
      }, 7800);
    }, spec.delayMs);

    return () => window.clearTimeout(timer);
  }, [activeDocKey, state.scareMode]);

  // 眼角余光湿粗布黑褂村民立影（全幕次开放：第1幕读过收工图后即低频出没，第2~4幕愈发频繁！）
  useEffect(() => {
    if (!state.readDocIds.includes('qh-37-09') && state.act < 2) return;
    let cooldownUntil = Date.now() + 14000;

    const onScroll = () => {
      const now = Date.now();
      if (now < cooldownUntil) return;
      if (Math.random() > 0.28) {
        cooldownUntil = now + 7500;
        return;
      }
      cooldownUntil = now + 32000;
      const side = Math.random() > 0.5 ? 'right' : 'left';
      setPeripheralSide(side);
      horrorAudio.playMirrorChill('psychological');
      window.setTimeout(() => {
        setPeripheralSide(null);
      }, 1500);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [state.act, state.readDocIds]);

  const showCinnabarWatermark =
    state.contamination >= 10 || state.act >= 2 || state.readDocIds.includes('qh-37-09');
  const showDeepWaterStain = state.contamination >= 30 || state.act >= 3;

  return (
    <>
      {/* 1. 真实朱砂月牙断疤红指模洇纸水印 */}
      {showCinnabarWatermark && (
        <div className="pointer-events-none fixed inset-0 z-[35] overflow-hidden select-none">
          <img
            src="./media/cinnabar_thumbprint.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{ opacity: Math.min(0.34, 0.09 + state.contamination * 0.0025) }}
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

      {/* 2. 眼角余光一闪即逝的湿粗布黑褂村民实拍立影 */}
      <AnimatePresence>
        {peripheralSide && (
          <motion.img
            src="./media/peripheral_villager.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            initial={{ opacity: 0, x: peripheralSide === 'left' ? -40 : 40 }}
            animate={{ opacity: state.scareMode === 'full' ? 0.46 : 0.26, x: 0 }}
            exit={{ opacity: 0, filter: 'blur(6px)' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`pointer-events-none fixed bottom-0 z-[65] h-[66vh] w-auto object-contain select-none mix-blend-multiply blur-[0.8px] ${
              peripheralSide === 'left' ? '-left-4' : '-right-4'
            }`}
          />
        )}
      </AnimatePresence>

      {/* 3. 实拍暗影闪现 + 可点击放大检视的现场监控拾音卡 */}
      <AnimatePresence>
        {activeCue && (
          <>
            {activeCue.flashFullScreen && state.scareMode === 'full' && (
              <motion.div
                key={`flash-${activeCue.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.48, 0.28, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.0, ease: 'easeInOut' }}
                className="pointer-events-none fixed inset-0 z-[75] flex items-center justify-center overflow-hidden bg-black/55"
              >
                <img
                  src={activeCue.imageSrc}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="h-full w-full object-cover opacity-75 scale-105 select-none"
                />
              </motion.div>
            )}

            <motion.div
              key={`banner-${activeCue.id}`}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: 0.3 }}
              onClick={() =>
                onTriggerScare({
                  title: activeCue.tag,
                  message: `${activeCue.line}${activeCue.subline ? `\n\n${activeCue.subline}` : ''}`,
                  visualType: activeCue.scareVisual,
                })
              }
              title="点击放大调看异常监控原片"
              className="group fixed bottom-6 left-1/2 z-[82] flex w-[94vw] max-w-2xl -translate-x-1/2 items-stretch overflow-hidden rounded-xl border border-[#9e2a2b]/70 bg-[#141010]/96 text-[#f7f2e8] shadow-[0_22px_65px_rgba(0,0,0,0.75)] backdrop-blur-md cursor-pointer"
            >
              <div className="relative w-32 sm:w-44 shrink-0 overflow-hidden bg-black border-r border-white/10">
                <img
                  src={activeCue.imageSrc}
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover opacity-95 transition duration-500 group-hover:scale-105"
                />
                <span className="absolute bottom-1.5 left-2 rounded bg-black/80 px-1.5 py-0.5 font-mono-tech text-[9px] text-red-300">
                  点击放大原片
                </span>
              </div>

              <div className="flex-1 px-4 py-3.5">
                <div className="mb-1 flex items-center justify-between text-[10.5px] font-mono-tech tracking-wider text-[#e07a7b]">
                  <span>[{activeCue.tag}]</span>
                  <span className="underline text-amber-200/90 group-hover:text-white">调阅抓拍 →</span>
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
