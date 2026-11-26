import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { renderDisplacementMap } from 'liquid-glass-web-react';
import {
  Search,
  Eye,
  Sliders,
  Sparkles,
  AlertTriangle,
  Ruler,
  RotateCcw,
  ZoomIn,
} from 'lucide-react';
import type { ActNumber, ScareMode } from '../types/game';
import { horrorAudio } from '../engine/audio';

export type ForensicVisualId =
  | 'threshing_1998'
  | 'team_portraits'
  | 'nuo_mask'
  | 'village_mist'
  | 'shrine_1998'
  | 'elevation_map'
  | 'woodblock_seal'
  | 'thumbprint_ledger';

export interface ForensicPhotoViewerProps {
  photoId: ForensicVisualId;
  act: ActNumber;
  scareMode: ScareMode;
  viewCount?: number;
  onInspect?: (photoId: string) => void;
  onTriggerScare?: (event: {
    title: string;
    message: string;
    visualType: 'peeker' | 'shrine' | 'rule_break' | 'meta_eye';
  }) => void;
  onAdjustContamination?: (delta: number) => void;
}

const VISUAL_CAPTIONS: Record<
  ForensicVisualId,
  { code: string; label: string; meta: string; forensicHint: string; src: string }
> = {
  threshing_1998: {
    code: 'QH-37-09 · 135银盐底片',
    label: '《晒谷场收工图》（1998年10月16日傍晚 · 雾中宗祠前坪）',
    meta: '机身：Nikon FM2 · 显影：D-76 (1:1) · 摄制：Z.H.J.',
    forensicHint: '开启光学放大镜（滚轮可调倍率）细数站在场中的背身人数与湿石板上的黑影数。',
    src: './media/threshing_1998_base.png',
  },
  team_portraits: {
    code: 'QH-ADM-01 · 成员证件照',
    label: '青禾民俗影像数字化保护工程核心成员接触印相表',
    meta: '左起：郑国栋 · 林知夏 · 陈默 · 苏晓棠 · 赵一鸣（2025—2026）',
    forensicHint: '放大镜移至各成员瞳孔高光区，留意随章节深入或斜射显影下浮现的细微反光异变。',
    src: './media/team_portraits.png',
  },
  nuo_mask: {
    code: 'QH-38-M01 · 未编目库底器物',
    label: '清代樟木圆雕朱砂髹漆「无目盲傩」面具标本',
    meta: '出土点：原龛下坳粮站夹墙外侧泥滩 · 10cm 取证标尺',
    forensicHint: '注意眼窝处平滑封死的实木结构——这副面具自雕刻之初便不留透视眼孔。',
    src: './media/nuo_mask_artifact.png',
  },
  village_mist: {
    code: 'QH-38-F02 · 1998库底影像',
    label: '雾锁龛下坳（云溪壶口盆地 · 蓄水前实拍底片）',
    meta: '高程视角：白石滩山脊俯拍 · 1998年10月',
    forensicHint: '浓雾深处盘踞着行政区划地图上从未登记的第 38 个宗族聚落。',
    src: './media/village_mist_1998.png',
  },
  shrine_1998: {
    code: 'QH-38-S00 · 16mm 隔离残帧',
    label: '1998年10月17日夜《空神龛与背身戏台》',
    meta: 'Bolex H16 Reflex · Kodak Tri-X 7278 · TC 00:14:38:19',
    forensicHint: '戏班全员背对镜头叩拜空龛，龛内泥塑面目平滑无眼。',
    src: './media/shrine_1998.png',
  },
  elevation_map: {
    code: '云水勘字〔1999〕底图-07',
    label: '云溪水库淹没区 1:10000 水文高程勘测底图',
    meta: '测绘：省水利水电勘测设计院 · 1999年8月归档扫描',
    forensicHint: '点击上方【斜射显影】切换 365nm 紫外透视，穿透右下角白色涂改液查看被抹除的高程与村名。',
    src: './media/elevation_map.png',
  },
  woodblock_seal: {
    code: '清光绪十九年刻本 · 原叶扫描',
    label: '《云溪风土杂记·卷四·祀典志》木刻雕版书叶',
    meta: '竖排右起 · 青禾周氏旧藏（带骑缝破裂朱砂藏书印）',
    forensicHint: '放大检视左侧骑缝破裂红印覆盖处，逐字核对原刻「封龛逆仪」四道牌位的真实先后次序。',
    src: './media/woodblock_seal.png',
  },
  thumbprint_ledger: {
    code: '云水移审〔1999〕附表38',
    label: '《附表38：祠下村（龛下坳）124户领款红指模总览》',
    meta: '档案密级：内部备查 · 1999年封存影印件',
    forensicHint: '用光学放大镜细看不同户主栏的红色指模螺线及右上角缺口特征。',
    src: './media/thumbprint_ledger.png',
  },
};

export const ForensicPhotoViewer: React.FC<ForensicPhotoViewerProps> = ({
  photoId,
  act,
  scareMode,
  viewCount = 1,
  onInspect,
  onAdjustContamination,
}) => {
  const LENS_SIZE = 200;
  const rawId = useId();
  const filterId = `qh-opt-lens-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lensWrapRef = useRef<HTMLDivElement | null>(null);
  const lensInnerRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, cw: 720, ch: 480 });
  const rafRef = useRef<number | null>(null);
  const windowChimeRef = useRef(false);

  const [loupeEnabled, setLoupeEnabled] = useState(false);
  const [lensVisible, setLensVisible] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(2.3);
  const zoomRef = useRef(2.3);
  zoomRef.current = zoomLevel;

  const [rakingLight, setRakingLight] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // 一次性调用开源 liquid-glass-web-react 预计算真实球面凸透镜折射位移贴图（静态缓存，60~120fps 零卡顿）
  const displacementMapUrl = useMemo(() => {
    if (typeof document === 'undefined') return '';
    try {
      return renderDisplacementMap({
        size: 128,
        halfWidth: LENS_SIZE / 2,
        halfHeight: LENS_SIZE / 2,
        radius: LENS_SIZE / 2,
        depth: 34,
        domeDepth: 34,
        splay: 0.25,
        glow: 0,
        glowSpread: 0.5,
        glowExponent: 2,
        edgeHighlight: 0,
        edgeWidth: 6,
        edgeExponent: 2,
        specularAngle: 45,
      });
    } catch {
      return '';
    }
  }, []);

  // 高清重制预览动画状态（原地红激光扫过 → 村民逐个扭转脖颈直视镜头）
  const [hdState, setHdState] = useState<'idle' | 'scanning' | 'revealed'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [hdTriggeredOnce, setHdTriggeredOnce] = useState(false);

  const syncLensDom = () => {
    rafRef.current = null;
    const wrap = lensWrapRef.current;
    const inner = lensInnerRef.current;
    if (!wrap || !inner) return;

    const { x, y, cw, ch } = pointerRef.current;
    const z = zoomRef.current;
    const px = x * cw;
    const py = y * ch;

    wrap.style.transform = `translate3d(${px - LENS_SIZE / 2}px, ${py - LENS_SIZE / 2}px, 0)`;
    inner.style.width = `${cw}px`;
    inner.style.transform = `translate3d(${LENS_SIZE / 2 - px * z}px, ${LENS_SIZE / 2 - py * z}px, 0) scale(${z})`;
  };

  useEffect(() => {
    if (loupeEnabled && lensVisible) {
      syncLensDom();
    }
  }, [zoomLevel, loupeEnabled, lensVisible]);

  useEffect(() => {
    if (!loupeEnabled) return;
    const el = containerRef.current;
    if (!el) return;
    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoomLevel((prev) => {
        const next = prev + (e.deltaY < 0 ? 0.3 : -0.3);
        return Math.round(Math.max(1.6, Math.min(4.0, next)) * 10) / 10;
      });
    };
    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', onNativeWheel);
  }, [loupeEnabled]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    setHdState('idle');
    setScanProgress(0);
  }, [photoId]);

  useEffect(() => {
    if (hdState !== 'scanning') return;
    let raf = 0;
    const start = performance.now();
    const duration = scareMode === 'full' ? 2400 : 3200;
    let stingerFired = false;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setScanProgress(Math.round(p * 100));

      if (p >= 0.45 && !stingerFired) {
        stingerFired = true;
        horrorAudio.playScareStinger(scareMode);
      }
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setHdState('revealed');
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hdState, scareMode]);

  const handleStartHdRemaster = () => {
    if (hdState === 'scanning') return;
    if (hdState === 'revealed') {
      horrorAudio.playClick('film');
      setHdState('idle');
      setScanProgress(0);
      return;
    }
    horrorAudio.playClick('film');
    onInspect?.(photoId);
    if (!hdTriggeredOnce) {
      setHdTriggeredOnce(true);
      onAdjustContamination?.(10);
    }
    setScanProgress(0);
    setHdState('scanning');
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!loupeEnabled) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    pointerRef.current = { x: nx, y: ny, cw: rect.width, ch: rect.height };

    if (!lensVisible) setLensVisible(true);
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(syncLensDom);
    }

    // 放大镜扫过《晒谷场收工图》正中二楼雕花木窗（x: 50%-56%, y: 15%-26%）时轻响一声木梆
    if (
      photoId === 'threshing_1998' &&
      (act >= 3 || hdState === 'revealed') &&
      !windowChimeRef.current &&
      nx > 0.50 &&
      nx < 0.56 &&
      ny > 0.15 &&
      ny < 0.26
    ) {
      windowChimeRef.current = true;
      horrorAudio.playWoodenClapper();
    }
  };

  const info = VISUAL_CAPTIONS[photoId];

  const showTurnLayer =
    photoId === 'threshing_1998' && (hdState === 'scanning' || hdState === 'revealed' || act >= 4);
  const turnClipBottom =
    hdState === 'scanning'
      ? `${100 - scanProgress}%`
      : hdState === 'revealed' || act >= 4
      ? '0%'
      : '100%';

  const showMutatedPortraits = photoId === 'team_portraits' && (act >= 3 || rakingLight);
  const showUvElevation = photoId === 'elevation_map' && rakingLight;

  const renderVisualCore = (isInsideMagnifier = false) => {
    const genericRakingFilter =
      rakingLight && photoId !== 'elevation_map' && photoId !== 'team_portraits'
        ? 'contrast-125 brightness-105 saturate-110'
        : '';

    const scaleZoomClass =
      !isInsideMagnifier && hdState === 'revealed'
        ? 'scale-[1.06] transition-transform duration-[2200ms] ease-out'
        : '';

    return (
      <div className={`relative w-full overflow-hidden bg-black ${genericRakingFilter} ${scaleZoomClass}`}>
        {/* 主实拍底片 */}
        <img
          src={info.src}
          alt={info.label}
          draggable={false}
          className="block h-auto w-full object-cover select-none"
        />

        {/* 1) 《晒谷场收工图》像素对齐转头异变层（11人12影，随红激光扫过逐像素显现！） */}
        {showTurnLayer && (
          <img
            src="./media/threshing_1998_turn.png"
            alt="高清重制异常帧：村民扭转脖颈直视镜头"
            draggable={false}
            style={{
              clipPath: `inset(0 0 ${turnClipBottom} 0)`,
              opacity: act >= 4 && hdState === 'idle' ? 0.92 : 1,
            }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
          />
        )}

        {/* 第三幕自然回访时的幽微预览：二楼正中雕花木窗内浮现苍白窥视脸 */}
        {photoId === 'threshing_1998' && act === 3 && hdState === 'idle' && (
          <img
            src="./media/threshing_1998_turn.png"
            alt="第三幕局部异变"
            draggable={false}
            style={{
              clipPath: 'inset(15% 44% 74% 50%)',
              opacity: 0.85,
            }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
          />
        )}

        {/* 2) 课题组成员接触印相表：第3/4幕或斜射显影下切换像素对齐的瞳孔神龛反光异变照 */}
        {photoId === 'team_portraits' && (
          <img
            src="./media/team_portraits_mutated.png"
            alt="课题组成员瞳孔异变帧"
            draggable={false}
            style={{ opacity: showMutatedPortraits ? 1 : 0 }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none transition-opacity duration-500"
          />
        )}

        {/* 3) 1999 水库高程底图：点击【斜射显影】平滑切换 365nm 紫外透视涂改液显现 108.4m 祠下村 */}
        {photoId === 'elevation_map' && (
          <img
            src="./media/elevation_map_uv.png"
            alt="365nm紫外透视高程底图：显现第38村祠下村108.4m"
            draggable={false}
            style={{ opacity: showUvElevation ? 1 : 0 }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none transition-opacity duration-500"
          />
        )}

        {/* 高清重制揭示后的红色面部焦距锁定框（精准校准至新版 11 人构图中的窗内人脸 + 居中5名转头村民） */}
        {photoId === 'threshing_1998' && hdState === 'revealed' && !isInsideMagnifier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute inset-0"
          >
            {[
              { left: '51.3%', top: '16.8%', w: '3.0%', h: '6.8%', tag: 'WINDOW' },
              { left: '38.6%', top: '40.5%', w: '3.6%', h: '5.8%', tag: 'LOCK #04' },
              { left: '44.5%', top: '38.6%', w: '3.8%', h: '6.0%', tag: 'LOCK #05' },
              { left: '50.8%', top: '40.4%', w: '3.6%', h: '5.8%', tag: 'LOCK #06' },
              { left: '57.3%', top: '39.0%', w: '3.6%', h: '5.8%', tag: 'LOCK #07' },
              { left: '63.9%', top: '41.4%', w: '3.6%', h: '5.8%', tag: 'LOCK #08' },
            ].map((box) => (
              <div
                key={box.tag}
                style={{ left: box.left, top: box.top, width: box.w, height: box.h }}
                className="absolute border border-red-500/85 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
              >
                <span className="absolute -top-4 left-0 whitespace-nowrap bg-red-950/90 px-1 text-[8px] font-mono-tech text-red-200">
                  {box.tag}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {/* 1998 底片右下角真实日期戳 */}
        {photoId === 'threshing_1998' && (
          <div className="pointer-events-none absolute bottom-3 right-4 font-mono-tech text-xs tracking-widest text-amber-400/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
            &apos;98 10 16 · Z.H.J.
          </div>
        )}

        {/* 成员证件照下方姓名铭牌条 */}
        {photoId === 'team_portraits' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[6%] grid grid-cols-5 px-[1%] text-center font-serif-cn text-[11px] sm:text-xs text-zinc-200/90">
            {[
              '郑国栋 · 副院长',
              '林知夏 · 研三',
              '陈默 · 研二',
              '苏晓棠 · 研二',
              '赵一鸣 · 研一',
            ].map((label) => (
              <span key={label} className="truncate px-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {label}
              </span>
            ))}
          </div>
        )}

        {/* 盲傩面具 10cm 博物馆取证比例尺 */}
        {photoId === 'nuo_mask' && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded bg-black/65 px-3 py-1 font-mono-tech text-[10px] text-zinc-300 backdrop-blur-xs">
            <span className="inline-block h-1.5 w-8 bg-zinc-200" />
            <span className="inline-block h-1.5 w-8 bg-zinc-700" />
            <span className="inline-block h-1.5 w-8 bg-zinc-200" />
            <span className="ml-1.5">10 cm · 眼窝实木无孔</span>
          </div>
        )}

        {/* 16mm 胶片时间码 */}
        {photoId === 'shrine_1998' && (
          <div className="pointer-events-none absolute bottom-3 left-4 rounded bg-black/70 px-2 py-0.5 font-mono-tech text-[11px] text-amber-300/90">
            16mm · TC 00:14:38:19 · QH-38-S00
          </div>
        )}

        {/* 高程图未开紫外显影时的轻提示徽章 */}
        {photoId === 'elevation_map' && !rakingLight && !isInsideMagnifier && (
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-amber-500/40 bg-zinc-950/80 px-2.5 py-1 text-[11px] text-amber-200 backdrop-blur-xs">
            右下角存在白色涂改液覆盖层 · 可点击上方「斜射显影」开启紫外透视
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="my-5 overflow-hidden rounded-xl border border-zinc-800/90 bg-zinc-950 text-zinc-100 shadow-2xl"
    >
      {/* 静态永久缓存的单通道球面凸透镜折射滤镜（仅作用于 200x200 镜片内） */}
      {displacementMapUrl && (
        <svg className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden="true">
          <defs>
            <filter
              id={filterId}
              x="0%"
              y="0%"
              width="100%"
              height="100%"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={displacementMapUrl}
                x="0"
                y="0"
                width={LENS_SIZE}
                height={LENS_SIZE}
                result="lensMap"
                preserveAspectRatio="none"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="lensMap"
                scale="24"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      )}

      {/* 顶部清爽取证控制栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/90 bg-zinc-900/95 px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-amber-600/40 bg-amber-950/60 px-2 py-0.5 text-[10px] font-mono-tech text-amber-300">
              {info.code}
            </span>
            <span className="text-xs font-semibold text-zinc-100">{info.label}</span>
          </div>
          <p className="mt-0.5 text-[11px] font-mono-tech text-zinc-400">{info.meta}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              horrorAudio.playClick('film');
              setLoupeEnabled((v) => !v);
              onInspect?.(photoId);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium cursor-pointer transition ${
              loupeEnabled
                ? 'border-amber-500/80 bg-amber-500/15 text-amber-200 shadow-sm'
                : 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:border-zinc-500 hover:text-white'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>光学放大镜 {loupeEnabled ? `${zoomLevel.toFixed(1)}x` : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              horrorAudio.playClick('film');
              setRakingLight((v) => !v);
              onInspect?.(photoId);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium cursor-pointer transition ${
              rakingLight
                ? 'border-sky-500/80 bg-sky-500/15 text-sky-200'
                : 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:border-zinc-500 hover:text-white'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{photoId === 'elevation_map' ? '紫外显影透视' : '斜射显影'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              horrorAudio.playClick('ui');
              setShowGrid((v) => !v);
            }}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] cursor-pointer transition ${
              showGrid
                ? 'border-emerald-500/80 bg-emerald-500/15 text-emerald-200'
                : 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:border-zinc-500 hover:text-white'
            }`}
          >
            <Ruler className="h-3.5 w-3.5" />
            <span>网格</span>
          </button>

          {photoId === 'threshing_1998' && (
            <button
              type="button"
              onClick={handleStartHdRemaster}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium cursor-pointer transition ${
                hdState === 'revealed'
                  ? 'border-red-500 bg-red-600/25 text-red-100'
                  : 'border-red-800/80 bg-red-950/50 text-red-200 hover:bg-red-900/60'
              }`}
              title="实验性 EyeGen-v4 神经超分补帧重制预览（林知夏曾警告切勿点击）"
            >
              {hdState === 'revealed' ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 text-red-300" />
                  <span>切回原始底片</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-red-400" />
                  <span>{hdState === 'scanning' ? `重制中 ${scanProgress}%` : '高清重制预览'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 主取证视图区 */}
      <div
        ref={containerRef}
        onMouseMove={handlePointerMove}
        onMouseEnter={(e) => {
          onInspect?.(photoId);
          if (loupeEnabled) {
            setLensVisible(true);
            handlePointerMove(e);
          }
        }}
        onMouseLeave={() => setLensVisible(false)}
        className={`relative w-full select-none overflow-hidden bg-black ${
          loupeEnabled ? 'cursor-none' : 'cursor-default'
        }`}
      >
        {renderVisualCore(false)}

        {/* 坐标网格叠加 */}
        {showGrid && (
          <div
            className="pointer-events-none absolute inset-0 z-10 opacity-35"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(245,158,11,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,158,11,0.5) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        )}

        {/* EyeGen 高清重制红激光扫描线 */}
        {hdState === 'scanning' && (
          <div
            className="pointer-events-none absolute inset-x-0 z-20 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_24px_6px_rgba(239,68,68,0.85)]"
            style={{ top: `${scanProgress}%` }}
          >
            <div className="absolute right-3 -top-6 rounded bg-red-950/90 px-2 py-0.5 font-mono-tech text-[10px] text-red-200 border border-red-600/60">
              EYEGEN-v4 NEURAL RESTORE · {scanProgress}%
            </div>
          </div>
        )}

        {/* 零卡顿光学球面折射放大镜 */}
        {loupeEnabled && lensVisible && (
          <div
            ref={lensWrapRef}
            className="pointer-events-none absolute left-0 top-0 z-30 rounded-full will-change-transform"
            style={{
              width: LENS_SIZE,
              height: LENS_SIZE,
              boxShadow:
                '0 18px 42px rgba(0,0,0,0.82), -1.5px -1px 6px rgba(56,189,248,0.28), 1.5px 1px 6px rgba(248,113,113,0.28), 0 0 0 2px rgba(217,179,106,0.78), 0 0 0 5px rgba(14,14,18,0.88)',
            }}
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-full bg-black"
              style={{
                contain: 'strict',
                filter: displacementMapUrl ? `url(#${filterId})` : undefined,
              }}
            >
              <div ref={lensInnerRef} className="origin-top-left will-change-transform">
                {renderVisualCore(true)}
              </div>
            </div>

            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 28% 22%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 28%, transparent 54%), radial-gradient(circle at 50% 50%, transparent 65%, rgba(0,0,0,0.45) 100%)',
                boxShadow:
                  'inset 2px 2px 6px rgba(56,189,248,0.22), inset -2px -2px 6px rgba(251,146,60,0.22), inset 0 0 14px rgba(255,255,255,0.16)',
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-amber-300/25" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-amber-300/25" />
            <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-mono-tech text-amber-200">
              <ZoomIn className="h-2.5 w-2.5 text-amber-400" />
              <span>{zoomLevel.toFixed(1)}x · 滚轮调焦</span>
            </div>
          </div>
        )}
      </div>

      {/* 高清重制后的非遮挡底部惊悚提示条 */}
      <AnimatePresence>
        {photoId === 'threshing_1998' && hdState === 'revealed' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-red-900/70 bg-red-950/70 px-4 py-3 text-xs text-red-100"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="leading-relaxed">
                <strong>EyeGen-v4 神经超分异常：</strong>
                晒谷场上原本背对镜头的 11 名村民中有 5 人在重制帧中扭转脖颈直视屏幕，正中二楼雕花木窗内亦浮现苍白窥视脸（视网膜残留 +10%）。可用光学放大镜凑近细查，或随时切回原始银盐底片。
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部精简取证说明栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/90 bg-zinc-900/90 px-4 py-2 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>{info.forensicHint}</span>
        </div>
        {act >= 3 && (photoId === 'threshing_1998' || photoId === 'team_portraits') && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono-tech text-red-400">
            <AlertTriangle className="h-3 w-3" />
            底片校验偏移 · 阅览 {Math.max(1, viewCount)} 次
          </span>
        )}
      </div>
    </motion.div>
  );
};
