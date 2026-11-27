import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { renderDisplacementMap } from 'liquid-glass-web-react';
import {
  Search,
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
  | 'thumbprint_ledger'
  | 'qh_01_02'
  | 'qh_05_08'
  | 'qh_08_01'
  | 'qh_10_04'
  | 'qh_12_03'
  | 'qh_19_02'
  | 'qh_21_09'
  | 'qh_23_05'
  | 'qh_26_03'
  | 'qh_28_08'
  | 'qh_31_02'
  | 'qh_38_n03';

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

export const VISUAL_CAPTIONS: Record<
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
    forensicHint: '点击上方【紫外显影透视】切换 365nm 紫外透视，穿透右下角白色涂改液查看被抹除的高程与村名。',
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
  qh_01_02: {
    code: 'QH-01-02 · 宣纸乌金拓片',
    label: '《清嘉庆丙寅年青禾渡口镇水铁牛拓片》',
    meta: '1997年11月09日 · 周怀瑾、林守诚合拓（纵118cm × 横185cm）',
    forensicHint: '用光学放大镜细看铁牛眼部平滑无凹的生铁浇封痕迹，以及左侧「嘉庆丙寅年铸·铁牛封目·莫望上溪坳」铭文。',
    src: './media/qh_01_02.png',
  },
  qh_05_08: {
    code: 'QH-05-08 · 135银盐纪实照',
    label: '《1999年10月双溪口村陈氏宗祠“迁主起龛”辞祖现场》',
    meta: '乐凯 SHD100 黑白负片 · 1999年10月19日晨 · 云溪县移民办宣传组',
    forensicHint: '留意族老用朱红生绸裹面正捧的先祖牌位，对照后方祠堂耳房外反常处理的无字旧木龛记载。',
    src: './media/qh_05_08.png',
  },
  qh_08_01: {
    code: 'QH-08-01 · 民国木活字书叶',
    label: '《民国二十三年〈青禾周氏联修支谱·山禁家规〉残卷》',
    meta: '1934年甲戌岁青禾敦睦堂印本 · 毛边竹纸线装 · 周怀瑾征集',
    forensicHint: '放大细读卷中竖排家规条文，核对「白石滩」「反穿外褂」「倒步退出」等清代山禁遗训。',
    src: './media/qh_08_01.png',
  },
  qh_10_04: {
    code: 'QH-10-04 · 清库纪实底片',
    label: '《1999年夏龙潭背村空心古樟、红泥草编眼罩与断碑现场》',
    meta: '编号 YX-FOR-9907-18 · 富士 Neopan 400 · 1999年7月22日林业局清库队',
    forensicHint: '放大检视陶瓮旁散落的十字封痕红泥麻眼罩，以及树根处半埋的青石断碑「前山有社，樵夫背行」。',
    src: './media/qh_10_04.png',
  },
  qh_12_03: {
    code: 'QH-12-03 · 馆藏实物标本照',
    label: '《晚清樟木坑村朱漆贴金镜匣（附“十月封镜”红纸封条）》',
    meta: '清光绪楠木胎描金镜匣 · 水银平镜十字封条 · 周怀瑾采集 / 苏晓棠校注',
    forensicHint: '观察氧化斑驳的水银平镜与交叉粘贴的「十月封镜」朱红纸封条，切记细读条目底部的夜间紧急校注。',
    src: './media/qh_12_03.png',
  },
  qh_19_02: {
    code: 'QH-19-02 · 民间梨园手抄旧账',
    label: '《梅树湾“福春班”戏箱行头清点册与梨园忌例》',
    meta: '1996年冬班主饶世福捐赠 · 毛边纸蓝布包角账本 · 周怀瑾抄录建档',
    forensicHint: '放大细看账末所录「梨园忌例」三条：严禁接演十月半深坳红帖外戏、严禁挂白底黑字水牌、三锣响后不得回首窥龛。',
    src: './media/qh_19_02.png',
  },
  qh_21_09: {
    code: 'QH-21-09 · 1999缓拆晒图蓝本',
    label: '《青禾乡中心粮站五号苏式圆筒仓及双层防潮夹墙测绘图》',
    meta: '图纸号 YX-GRN-1958-05 · 比例尺 1:100 · 云溪县粮食局基建科',
    forensicHint: '放大查看图纸右侧标注的「北侧双层防潮夹墙（免予爆破平毁）」与右下角红笔批注「周怀瑾担保缓拆存照 1999.10」。',
    src: './media/qh_21_09.png',
  },
  qh_23_05: {
    code: 'QH-23-05 · 科技考古物化标本',
    label: '《“生桐油调辰砂”封龛胶泥（S-01）与粮仓铁盒涂层（S-02）对照标本》',
    meta: '送检号 QH-LAB-2024-19 · 532nm 拉曼光谱对照样 · 15cm 不锈钢标尺',
    forensicHint: '对照左右瓷皿及玻璃样本瓶标签（S-01 赤水溪废祠 / S-02 五号粮仓铁盒），两处暗红封壳成分高度同源。',
    src: './media/qh_23_05.png',
  },
  qh_26_03: {
    code: 'QH-26-03 · 120中画幅银盐照',
    label: '《1999年11月13日蓄水前夜上坪村“辞灶起火”纪实照》',
    meta: '海鸥 DF-200 · 1999年11月13日 21:40 · 云溪县文化馆林守诚摄',
    forensicHint: '聚焦老妇灶前掬灰的孤灯身影，同时留意敞开堂屋门外自西北库底悄然漫入的灰白浓雾。',
    src: './media/qh_26_03.png',
  },
  qh_28_08: {
    code: 'QH-28-08 · 清代石刻拓本',
    label: '《清道光十九年茶亭坳〈过坳四戒碑〉残石乌金拓本》',
    meta: '道光十九年（1839）茶亭坳凉亭旧石 · 1997年周怀瑾刮灰椎拓',
    forensicHint: '放大辨识石刻四戒全文：「莫听锣、莫窥帘、莫照龛、莫点睛」——这四句正是后续进入深层档案的核心护身戒律。',
    src: './media/qh_28_08.png',
  },
  qh_31_02: {
    code: 'QH-31-02 · 1998器材借用凭证',
    label: '《云溪县文化馆下乡工作证与美制 Wratten No.15 琥珀黄滤光镜借用单》',
    meta: '凭据编号 98-042 · 1998年10月15日 · 领队周怀瑾签借 / 林守诚经手',
    forensicHint: '放大细检借用单上的红印签收栏、两枚深琥珀黄色 Wratten No.15 金属压环滤镜实物及1998年进山工作证。',
    src: './media/qh_31_02.png',
  },
  qh_38_n03: {
    code: 'QH-38-N03 · 未公开绝密抢拍',
    label: '《五号粮仓夹墙朱砂封存14号铁盒与周怀瑾绝笔戒条》',
    meta: '林知夏夜班抢拍孤本 · 桐油辰砂厚封马口铁盒与桑皮棉纸残笺',
    forensicHint: '放大细读铁盒盖刻字「朱砂封存14」与残笺绝笔：「一九九八年十月十七亥时，切勿撤除黄镜直拍正龛，五人泣血·铁盒永沉夹墙」。',
    src: './media/qh_38_n03.png',
  },
};

export const ForensicPhotoViewer: React.FC<ForensicPhotoViewerProps> = ({
  photoId,
  act,
  scareMode,
  viewCount = 1,
  onInspect,
  onTriggerScare,
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
  const lensAnomalySoundedRef = useRef<Record<string, boolean>>({});
  const shrineHoverStartRef = useRef<number | null>(null);
  const shrineScareFiredRef = useRef(false);

  const [loupeEnabled, setLoupeEnabled] = useState(false);
  const [lensVisible, setLensVisible] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(2.3);
  const zoomRef = useRef(2.3);
  zoomRef.current = zoomLevel;

  const [rakingLight, setRakingLight] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [lensAnomalyMsg, setLensAnomalyMsg] = useState<string | null>(null);

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
    setLensAnomalyMsg(null);
    shrineHoverStartRef.current = null;
    shrineScareFiredRef.current = false;
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
      (act >= 2 || hdState === 'revealed') &&
      nx > 0.49 &&
      nx < 0.57 &&
      ny > 0.14 &&
      ny < 0.27
    ) {
      if (!windowChimeRef.current) {
        windowChimeRef.current = true;
        horrorAudio.playWoodenClapper();
      }
      setLensAnomalyMsg('二楼雕花木窗暗格：放大镜内可见窗棂后方贴着半张苍白人脸');
      return;
    }

    // 凸透镜专属民俗异象 1：无目盲傩面具（实木眼窝裂隙里藏着活人湿润瞳仁）
    if (photoId === 'nuo_mask' && nx > 0.36 && nx < 0.64 && ny > 0.34 && ny < 0.54) {
      if (!lensAnomalySoundedRef.current.nuo_mask) {
        lensAnomalySoundedRef.current.nuo_mask = true;
        horrorAudio.playWoodenClapper();
        horrorAudio.playMirrorChill(scareMode);
        onAdjustContamination?.(3);
      }
      setLensAnomalyMsg('光学透镜异象：原本实木封死的盲傩眼窝木纹裂开，内侧有两只湿润瞳仁正贴着木缝往外看');
      return;
    }

    // 凸透镜专属民俗异象 2：晚清朱漆镜匣「十月封镜」（水银镜面映出身后第二个人）
    if (photoId === 'qh_12_03' && nx > 0.32 && nx < 0.68 && ny > 0.22 && ny < 0.68) {
      if (!lensAnomalySoundedRef.current.qh_12_03) {
        lensAnomalySoundedRef.current.qh_12_03 = true;
        horrorAudio.playMirrorChill(scareMode);
        onAdjustContamination?.(3);
      }
      setLensAnomalyMsg('水银镜底反光：「十月封镜」红纸交叉缝隙深处，映出了一件站在你椅背后的湿黑布褂领口');
      return;
    }

    // 凸透镜专属民俗异象 3：1998 空神龛（直视满 2 秒触发首诫违规惊吓！）
    if (photoId === 'shrine_1998' && nx > 0.38 && nx < 0.62 && ny > 0.18 && ny < 0.54) {
      const now = performance.now();
      if (shrineHoverStartRef.current === null) {
        shrineHoverStartRef.current = now;
        horrorAudio.playMirrorChill(scareMode);
      } else if (now - shrineHoverStartRef.current >= 1950 && !shrineScareFiredRef.current) {
        shrineScareFiredRef.current = true;
        horrorAudio.playBronzeGong(1);
        onAdjustContamination?.(6);
        onTriggerScare?.({
          title: '已违背首诫：透过透镜直视空神龛逾两秒',
          message:
            '《地下审片安全十诫》第一条：三通锣响后，切勿直视空神龛超过两秒。\n刚才在凸透镜焦平面内，空龛深处那两粒没有眼白的湿黑瞳孔已经完成了对焦。（视网膜残留 +6%）',
          visualType: 'shrine',
        });
      }
      setLensAnomalyMsg('危险警告：空神龛深处检出双点湿润高光！请立即移开放大镜（切勿凝视超过两秒）');
      return;
    } else {
      shrineHoverStartRef.current = null;
    }

    // 凸透镜专属民俗异象 4：辞灶浓雾门外 / 雾锁龛下坳（仅在镜片内显影的雾中成排背影）
    if (
      (photoId === 'qh_26_03' && nx > 0.52 && nx < 0.9 && ny > 0.16 && ny < 0.72) ||
      (photoId === 'village_mist' && nx > 0.26 && nx < 0.76 && ny > 0.3 && ny < 0.68)
    ) {
      const key = `mist_${photoId}`;
      if (!lensAnomalySoundedRef.current[key]) {
        lensAnomalySoundedRef.current[key] = true;
        horrorAudio.playMirrorChill(scareMode);
      }
      setLensAnomalyMsg('银盐雾翳潜影：肉眼空白的灰雾里显影出成排静立不动的黑褂背影');
      return;
    }

    // 凸透镜专属民俗异象 5：空心古樟树洞内壁抓痕
    if (photoId === 'qh_10_04' && nx > 0.34 && nx < 0.66 && ny > 0.16 && ny < 0.54) {
      if (!lensAnomalySoundedRef.current.qh_10_04) {
        lensAnomalySoundedRef.current.qh_10_04 = true;
        horrorAudio.playWoodenClapper();
      }
      setLensAnomalyMsg('树洞内壁暗痕：放大镜下可见古樟空腔内侧布满由里向外抠抓的红泥指印');
      return;
    }

    if (lensAnomalyMsg) {
      setLensAnomalyMsg(null);
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

        {/* 第三幕自然回访时的幽微预览，或任意幕次在【光学放大镜】镜片内部提前窥见二楼木窗苍白人脸！ */}
        {photoId === 'threshing_1998' &&
          (act === 3 || (isInsideMagnifier && act >= 1)) &&
          hdState === 'idle' && (
            <img
              src="./media/threshing_1998_turn.png"
              alt="木窗局部异变"
              draggable={false}
              style={{
                clipPath: 'inset(15% 44% 74% 50%)',
                opacity: isInsideMagnifier ? 0.92 : 0.85,
              }}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
            />
          )}

        {/* ===== 仅在光学放大镜镜片内部显影的民俗诡异潜影（肉眼看原图完全正常，移镜至此骤然浮现！） ===== */}
        {isInsideMagnifier && photoId === 'nuo_mask' && (
          <svg
            viewBox="0 0 600 400"
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
          >
            {/* 左眼窝木缝湿瞳 */}
            <path d="M236 172 Q256 164 276 173 Q256 181 236 172 Z" fill="#120707" fillOpacity="0.88" />
            <circle cx="257" cy="172" r="5.5" fill="#d8cfc2" fillOpacity="0.82" />
            <circle cx="257" cy="172" r="2.9" fill="#090404" />
            <circle cx="258.5" cy="170.8" r="1" fill="#ffffff" fillOpacity="0.9" />
            {/* 右眼窝木缝湿瞳 */}
            <path d="M324 172 Q344 164 364 173 Q344 181 324 172 Z" fill="#120707" fillOpacity="0.88" />
            <circle cx="343" cy="172" r="5.5" fill="#d8cfc2" fillOpacity="0.82" />
            <circle cx="343" cy="172" r="2.9" fill="#090404" />
            <circle cx="344.5" cy="170.8" r="1" fill="#ffffff" fillOpacity="0.9" />
          </svg>
        )}

        {isInsideMagnifier && photoId === 'qh_12_03' && (
          <svg
            viewBox="0 0 600 400"
            className="pointer-events-none absolute inset-0 h-full w-full select-none opacity-80"
          >
            {/* 水银镜十字封条缝隙后的苍白窥视半脸与黑褂领口 */}
            <ellipse cx="306" cy="168" rx="28" ry="36" fill="#cfc8b8" fillOpacity="0.34" />
            <path d="M262 238 C274 206, 338 206, 350 238 L360 290 L252 290 Z" fill="#0f1318" fillOpacity="0.58" />
            <ellipse cx="316" cy="164" rx="8.5" ry="4.4" fill="#eee8da" fillOpacity="0.85" />
            <circle cx="316" cy="164" r="2.8" fill="#1a0505" />
          </svg>
        )}

        {isInsideMagnifier && photoId === 'shrine_1998' && (
          <svg
            viewBox="0 0 600 400"
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
          >
            {/* 漆黑空龛正中央凝视镜头的双点湿冷眼白与血丝暗影 */}
            <ellipse cx="288" cy="136" rx="6" ry="3.3" fill="#e7dfd1" fillOpacity="0.82" />
            <circle cx="288" cy="136" r="2.3" fill="#2b0505" />
            <ellipse cx="312" cy="136" rx="6" ry="3.3" fill="#e7dfd1" fillOpacity="0.82" />
            <circle cx="312" cy="136" r="2.3" fill="#2b0505" />
          </svg>
        )}

        {isInsideMagnifier && (photoId === 'qh_26_03' || photoId === 'village_mist') && (
          <svg
            viewBox="0 0 600 400"
            className="pointer-events-none absolute inset-0 h-full w-full select-none blur-[1px]"
          >
            {/* 白雾深处静立不动的五道高瘦黑褂人影 */}
            {[345, 382, 418, 456, 492].map((cx, i) => (
              <g key={cx} opacity={0.34 - i * 0.03}>
                <ellipse cx={cx} cy={148 + (i % 2) * 6} rx="8" ry="10" fill="#14171c" />
                <path
                  d={`M${cx - 14} ${166 + (i % 2) * 6} L${cx + 14} ${166 + (i % 2) * 6} L${cx + 17} 252 L${cx - 17} 252 Z`}
                  fill="#14171c"
                />
              </g>
            ))}
          </svg>
        )}

        {isInsideMagnifier && photoId === 'qh_10_04' && (
          <svg
            viewBox="0 0 600 400"
            className="pointer-events-none absolute inset-0 h-full w-full select-none opacity-75"
          >
            {/* 空心古樟树洞深处的苍白半脸与暗红抓痕 */}
            <ellipse cx="298" cy="146" rx="18" ry="23" fill="#cbbba8" fillOpacity="0.28" />
            <ellipse cx="291" cy="143" rx="4.2" ry="2.2" fill="#efe9dc" fillOpacity="0.7" />
            <ellipse cx="305" cy="143" rx="4.2" ry="2.2" fill="#efe9dc" fillOpacity="0.7" />
            <path d="M276 168 L280 198 M286 166 L289 201 M312 167 L309 199" stroke="#7f1d1d" strokeWidth="2.2" strokeOpacity="0.65" />
          </svg>
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
      className="my-5 overflow-hidden rounded-xl border border-[#dcd4c4] bg-[#fcfbf8] text-stone-800 shadow-md"
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

      {/* 顶部清爽亮色博物馆取证控制栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5dfd2] bg-[#f5f1e7] px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#9e2a2b]/30 bg-white px-2 py-0.5 text-[10px] font-mono-tech font-semibold text-[#9e2a2b]">
              {info.code}
            </span>
            <span className="text-xs font-bold text-[#16263f]">{info.label}</span>
          </div>
          <p className="mt-0.5 text-[11px] font-mono-tech text-stone-500">{info.meta}</p>
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
                ? 'border-amber-600/70 bg-amber-50 text-amber-950 shadow-2xs'
                : 'border-[#d6cebe] bg-white text-stone-700 hover:border-stone-400 hover:text-stone-950'
            }`}
          >
            <Search className="h-3.5 w-3.5 text-amber-700" />
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
                ? 'border-sky-600/70 bg-sky-50 text-sky-950'
                : 'border-[#d6cebe] bg-white text-stone-700 hover:border-stone-400 hover:text-stone-950'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-sky-700" />
            <span>{photoId === 'elevation_map' ? '紫外显影透视' : '斜射显影'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              horrorAudio.playClick('ui');
              setShowGrid((v) => !v);
            }}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium cursor-pointer transition ${
              showGrid
                ? 'border-emerald-600/70 bg-emerald-50 text-emerald-950'
                : 'border-[#d6cebe] bg-white text-stone-700 hover:border-stone-400 hover:text-stone-950'
            }`}
          >
            <Ruler className="h-3.5 w-3.5 text-emerald-700" />
            <span>网格</span>
          </button>

          {photoId === 'threshing_1998' && (
            <button
              type="button"
              onClick={handleStartHdRemaster}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition ${
                hdState === 'revealed'
                  ? 'border-[#9e2a2b] bg-[#9e2a2b] text-white'
                  : 'border-red-300 bg-red-50 text-[#9e2a2b] hover:bg-red-100'
              }`}
              title="实验性 EyeGen-v4 神经超分补帧重制预览（林知夏曾警告切勿点击）"
            >
              {hdState === 'revealed' ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 text-white" />
                  <span>切回原始底片</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-[#9e2a2b]" />
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
        onMouseLeave={() => {
          setLensVisible(false);
          setLensAnomalyMsg(null);
          shrineHoverStartRef.current = null;
        }}
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
            className="border-t border-red-200 bg-red-50 px-4 py-3 text-xs text-[#7f1d1d]"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9e2a2b]" />
              <p className="leading-relaxed">
                <strong>EyeGen-v4 神经超分异常：</strong>
                晒谷场上原本背对镜头的 11 名村民中有 5 人在重制帧中扭转脖颈直视屏幕，正中二楼雕花木窗内亦浮现苍白窥视脸（视网膜残留 +10%）。可用光学放大镜凑近细查，或随时切回原始银盐底片。
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 凸透镜局部异象实时警示条 */}
      <AnimatePresence>
        {lensAnomalyMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[#9e2a2b]/35 bg-[#221717] px-4 py-2 text-xs font-mono-tech text-[#f8e7e7]"
          >
            ● {lensAnomalyMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部精简亮色取证说明栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e5dfd2] bg-[#f5f1e7] px-4 py-2 text-xs text-stone-600">
        <div className="flex items-center gap-2">
          <span className="font-mono-tech text-[10px] font-bold text-[#9e2a2b]">[取证贴士]</span>
          <span>{info.forensicHint}</span>
        </div>
        {act >= 3 && (photoId === 'threshing_1998' || photoId === 'team_portraits') && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono-tech font-semibold text-[#9e2a2b]">
            底片校验偏移 · 阅览 {Math.max(1, viewCount)} 次
          </span>
        )}
      </div>
    </motion.div>
  );
};
