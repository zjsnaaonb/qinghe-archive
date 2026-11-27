import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Sliders,
  Sparkles,
  AlertTriangle,
  Ruler,
  RotateCcw,
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

// 由 gpt-image 100% 像素对齐生成的光学放大镜专属恐怖潜影底片（肉眼原片正常，仅在镜片内显影！）
const LENS_ONLY_MUTATION_SRC: Partial<Record<ForensicVisualId, string>> = {
  nuo_mask: './media/nuo_mask_lens.png',
  qh_12_03: './media/qh_12_03_lens.png',
  shrine_1998: './media/shrine_1998_lens.png',
  qh_26_03: './media/qh_26_03_lens.png',
  qh_10_04: './media/qh_10_04_lens.png',
  village_mist: './media/village_mist_lens.png',
};

export const VISUAL_CAPTIONS: Record<
  ForensicVisualId,
  { code: string; label: string; meta: string; forensicHint: string; src: string }
> = {
  threshing_1998: {
    code: 'QH-37-09 · 135银盐底片',
    label: '《晒谷场收工图》（1998年10月16日傍晚 · 雾中宗祠前坪）',
    meta: '机身：Nikon FM2 · 显影：D-76 (1:1) · 摄制：Z.H.J.',
    forensicHint: '开启光学放大镜（滚轮可调焦距）细数站在场中的背身人数与湿石板上的黑影数，留意二楼雕花木窗。',
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
    forensicHint: '开启光学放大镜移至平滑封死的木雕眼窝处，检视樟木内侧是否存在异常裂隙。',
    src: './media/nuo_mask_artifact.png',
  },
  village_mist: {
    code: 'QH-38-F02 · 1998库底影像',
    label: '雾锁龛下坳（云溪壶口盆地 · 蓄水前实拍底片）',
    meta: '高程视角：白石滩山脊俯拍 · 1998年10月',
    forensicHint: '用光学放大镜扫过下方青石拱桥与浓雾小径，核查底片暗部潜影。',
    src: './media/village_mist_1998.png',
  },
  shrine_1998: {
    code: 'QH-38-S00 · 16mm 隔离残帧',
    label: '1998年10月17日夜《空神龛与背身戏台》',
    meta: 'Bolex H16 Reflex · Kodak Tri-X 7278 · TC 00:14:38:19',
    forensicHint: '戏班全员背对镜头叩拜空龛。切记首诫：切勿用放大镜持续凝视正中神龛超过两秒。',
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
    forensicHint: '用光学放大镜细看不同户主栏的红色指模螺线及右上角月牙缺口特征。',
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
    forensicHint: '放大检视陶瓮旁散落的十字封痕红泥麻眼罩、青石断碑，以及左上侧黑漆漆的古樟空洞深处。',
    src: './media/qh_10_04.png',
  },
  qh_12_03: {
    code: 'QH-12-03 · 馆藏实物标本照',
    label: '《晚清樟木坑村朱漆贴金镜匣（附“十月封镜”红纸封条）》',
    meta: '清光绪楠木胎描金镜匣 · 水银平镜十字封条 · 周怀瑾采集 / 苏晓棠校注',
    forensicHint: '用光学放大镜检视「十月封镜」红纸封条背后的氧化水银镜面，切记细读条目底部的夜间紧急校注。',
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
    forensicHint: '聚焦老妇灶前掬灰的孤灯身影，并用光学放大镜探向右侧敞开堂屋门外的灰白浓雾。',
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
  const LENS_SIZE = 216;

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
  const [zoomLevel, setZoomLevel] = useState(2.2);
  const zoomRef = useRef(2.2);
  zoomRef.current = zoomLevel;

  const [rakingLight, setRakingLight] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [lensAnomalyMsg, setLensAnomalyMsg] = useState<string | null>(null);
  const activeAnomalyRef = useRef<string | null>(null);

  const [hdState, setHdState] = useState<'idle' | 'scanning' | 'revealed'>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [hdTriggeredOnce, setHdTriggeredOnce] = useState(false);

  const setAnomalyIfChanged = (msg: string | null) => {
    if (activeAnomalyRef.current === msg) return;
    activeAnomalyRef.current = msg;
    setLensAnomalyMsg(msg);
  };

  const syncLensDom = () => {
    rafRef.current = null;
    const wrap = lensWrapRef.current;
    const inner = lensInnerRef.current;
    if (!wrap || !inner) return;

    const { x, y, cw, ch } = pointerRef.current;
    const z = zoomRef.current;
    const px = x * cw;
    const py = y * ch;

    wrap.style.transform = `translate3d(${Math.round(px - LENS_SIZE / 2)}px, ${Math.round(py - LENS_SIZE / 2)}px, 0)`;
    inner.style.width = `${cw}px`;
    inner.style.height = `${ch}px`;
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
        const next = prev + (e.deltaY < 0 ? 0.25 : -0.25);
        return Math.round(Math.max(1.6, Math.min(3.8, next)) * 100) / 100;
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
    setAnomalyIfChanged(null);
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

    // 1. 《晒谷场收工图》正中二楼雕花木窗窥视脸
    if (
      photoId === 'threshing_1998' &&
      nx > 0.48 &&
      nx < 0.58 &&
      ny > 0.13 &&
      ny < 0.28
    ) {
      if (!windowChimeRef.current) {
        windowChimeRef.current = true;
        horrorAudio.playWoodenClapper();
      }
      setAnomalyIfChanged('二楼雕花木窗暗格：镜片内检出窗棂后方贴着半张苍白人脸');
      return;
    }

    // 2. 无目盲傩面具：樟木裂隙内的活体充血眼球
    if (photoId === 'nuo_mask' && nx > 0.29 && nx < 0.71 && ny > 0.31 && ny < 0.54) {
      if (!lensAnomalySoundedRef.current.nuo_mask) {
        lensAnomalySoundedRef.current.nuo_mask = true;
        horrorAudio.playMirrorChill(scareMode);
        onAdjustContamination?.(3);
      }
      setAnomalyIfChanged('暗房放大镜异象：实木封死的盲傩眼窝裂开横缝，木胎深处有一双充血活人眼珠正在对焦');
      return;
    }

    // 3. 晚清「十月封镜」水银镜：红纸封条缝隙后方的湿发窥视眼
    if (photoId === 'qh_12_03' && nx > 0.33 && nx < 0.75 && ny > 0.14 && ny < 0.56) {
      if (!lensAnomalySoundedRef.current.qh_12_03) {
        lensAnomalySoundedRef.current.qh_12_03 = true;
        horrorAudio.playMirrorChill(scareMode);
        onAdjustContamination?.(3);
      }
      setAnomalyIfChanged('氧化水银镜面显影：「十月封镜」红纸右侧夹角处，映出了站在你身后的湿发窥视眼');
      return;
    }

    // 4. 1998《空神龛与背身戏台》：神龛血泪眼窝 + 戏子回头（凝视满 2 秒触发首诫违规！）
    if (photoId === 'shrine_1998' && nx > 0.42 && nx < 0.68 && ny > 0.18 && ny < 0.68) {
      const now = performance.now();
      if (shrineHoverStartRef.current === null) {
        shrineHoverStartRef.current = now;
        horrorAudio.playMirrorChill(scareMode);
      } else if (now - shrineHoverStartRef.current >= 1950 && !shrineScareFiredRef.current) {
        shrineScareFiredRef.current = true;
        onAdjustContamination?.(6);
        onTriggerScare?.({
          title: '违背首诫：举镜直视空神龛逾两秒',
          message:
            '一九九八年十月十七亥时戏台铁律：三通锣响后，凡举镜直窥空龛满两秒者，台上背身戏子必回首认人，龛中无目泥胎即借窥镜者双目视物。',
          visualType: 'shrine',
        });
      }
      setAnomalyIfChanged('高危警示：神龛泥胎已睁眼、右二戏子正在扭头看你！请立即移开放大镜！');
      return;
    } else {
      shrineHoverStartRef.current = null;
    }

    // 5. 辞灶浓雾堂屋门外：雾中并排站立的湿衣村民
    if (photoId === 'qh_26_03' && nx > 0.71 && nx < 0.99 && ny > 0.18 && ny < 0.68) {
      if (!lensAnomalySoundedRef.current.qh_26_03) {
        lensAnomalySoundedRef.current.qh_26_03 = true;
        horrorAudio.playMirrorChill(scareMode);
      }
      setAnomalyIfChanged('门外白雾潜影：敞开的堂屋门槛外并排站着四名浑身湿透的村民，正静静往屋里看');
      return;
    }

    // 6. 雾锁龛下坳：青石拱桥上整排抬头仰望镜头的黑褂村民与水中倒影
    if (photoId === 'village_mist' && nx > 0.44 && nx < 0.78 && ny > 0.60 && ny < 0.96) {
      if (!lensAnomalySoundedRef.current.village_mist) {
        lensAnomalySoundedRef.current.village_mist = true;
        horrorAudio.playMirrorChill(scareMode);
      }
      setAnomalyIfChanged('银盐底片潜影：空无一人的青石拱桥上站满了穿黑粗布褂的村民，正齐刷刷仰头望着山脊镜头');
      return;
    }

    // 7. 龙潭背空心古樟：树洞黑影里扒着内壁往外看的泥脸
    if (photoId === 'qh_10_04' && nx > 0.22 && nx < 0.52 && ny > 0.14 && ny < 0.44) {
      if (!lensAnomalySoundedRef.current.qh_10_04) {
        lensAnomalySoundedRef.current.qh_10_04 = true;
        horrorAudio.playMirrorChill(scareMode);
        onAdjustContamination?.(2);
      }
      setAnomalyIfChanged('古樟树洞微距显影：三百年雷击空腔深处有一双手正扒着腐木，从眼罩堆后直勾勾盯着镜头');
      return;
    }

    setAnomalyIfChanged(null);
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
  const lensMutationSrc = LENS_ONLY_MUTATION_SRC[photoId];

  const renderVisualCore = (isInsideMagnifier = false) => {
    const genericRakingFilter =
      rakingLight && photoId !== 'elevation_map' && photoId !== 'team_portraits'
        ? 'contrast-125 brightness-105 saturate-110'
        : '';

    const scaleZoomClass =
      !isInsideMagnifier && hdState === 'revealed'
        ? 'scale-[1.05] transition-transform duration-[2200ms] ease-out'
        : '';

    // 光学放大镜内部若存在 gpt-image 专属潜影底片，直接无缝渲染像素对齐的潜影实拍图！
    const baseImgSrc =
      isInsideMagnifier && lensMutationSrc ? lensMutationSrc : info.src;

    return (
      <div className={`relative h-full w-full overflow-hidden bg-black ${genericRakingFilter} ${scaleZoomClass}`}>
        <img
          src={baseImgSrc}
          alt={info.label}
          draggable={false}
          className="block h-full w-full object-cover select-none"
        />

        {/* 《晒谷场收工图》扫描转头异变层 */}
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

        {/* 二楼雕花木窗局部苍白窥视脸（放大镜镜片内或第三幕提前显影） */}
        {photoId === 'threshing_1998' &&
          (act === 3 || (isInsideMagnifier && act >= 1)) &&
          hdState === 'idle' && (
            <img
              src="./media/threshing_1998_turn.png"
              alt="木窗局部异变"
              draggable={false}
              style={{
                clipPath: 'inset(15% 44% 74% 50%)',
                opacity: isInsideMagnifier ? 0.95 : 0.85,
              }}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
            />
          )}

        {/* 课题组成员接触印相表瞳孔神龛反光异变照 */}
        {photoId === 'team_portraits' && (
          <img
            src="./media/team_portraits_mutated.png"
            alt="课题组成员瞳孔异变帧"
            draggable={false}
            style={{ opacity: showMutatedPortraits || isInsideMagnifier ? 1 : 0 }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none transition-opacity duration-500"
          />
        )}

        {/* 1999 水库高程底图 365nm 紫外透视层 */}
        {photoId === 'elevation_map' && (
          <img
            src="./media/elevation_map_uv.png"
            alt="365nm紫外透视高程底图：显现第38村祠下村108.4m"
            draggable={false}
            style={{ opacity: showUvElevation ? 1 : 0 }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none transition-opacity duration-500"
          />
        )}

        {/* 高清重制揭示后的红色面部焦距锁定框 */}
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

        {photoId === 'threshing_1998' && !isInsideMagnifier && (
          <div className="pointer-events-none absolute bottom-3 right-4 font-mono-tech text-xs tracking-widest text-amber-400/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
            &apos;98 10 16 · Z.H.J.
          </div>
        )}

        {photoId === 'team_portraits' && !isInsideMagnifier && (
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

        {photoId === 'nuo_mask' && !isInsideMagnifier && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded bg-black/65 px-3 py-1 font-mono-tech text-[10px] text-zinc-300 backdrop-blur-xs">
            <span className="inline-block h-1.5 w-8 bg-zinc-200" />
            <span className="inline-block h-1.5 w-8 bg-zinc-700" />
            <span className="inline-block h-1.5 w-8 bg-zinc-200" />
            <span className="ml-1.5">10 cm · 眼窝实木无孔</span>
          </div>
        )}

        {photoId === 'shrine_1998' && !isInsideMagnifier && (
          <div className="pointer-events-none absolute bottom-3 left-4 rounded bg-black/70 px-2 py-0.5 font-mono-tech text-[11px] text-amber-300/90">
            16mm · TC 00:14:38:19 · QH-38-S00
          </div>
        )}

        {photoId === 'elevation_map' && !rakingLight && !isInsideMagnifier && (
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-amber-500/40 bg-zinc-950/80 px-2.5 py-1 text-[11px] text-amber-200 backdrop-blur-xs">
            右下角存在白色涂改液覆盖层 · 可点击上方「紫外显影透视」查验
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-[#dcd4c4] bg-[#fcfbf8] text-stone-800 shadow-md">
      {/* 预加载当前图片的镜片潜影层，确保移入放大镜时 0 延迟瞬时显影 */}
      {lensMutationSrc && (
        <link rel="preload" as="image" href={lensMutationSrc} />
      )}

      {/* 顶部取证控制栏 */}
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
          setAnomalyIfChanged(null);
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

        {/* 零毛边、零右下溢出块的 120fps 纯 GPU 暗房黄铜光学放大镜 */}
        {loupeEnabled && lensVisible && (
          <div
            ref={lensWrapRef}
            className="pointer-events-none absolute left-0 top-0 z-30 rounded-full will-change-transform"
            style={{
              width: LENS_SIZE,
              height: LENS_SIZE,
              boxShadow:
                '0 18px 40px rgba(0, 0, 0, 0.72), 0 0 0 2px rgba(212, 175, 106, 0.92), 0 0 0 5px rgba(20, 20, 24, 0.94)',
            }}
          >
            {/* 严格正圆硬件裁剪内腔：彻底杜绝任何滤镜毛边与右下角溢出 */}
            <div
              className="relative h-full w-full overflow-hidden rounded-full bg-black"
              style={{
                clipPath: 'circle(50% at 50% 50%)',
                isolation: 'isolate',
                backfaceVisibility: 'hidden',
              }}
            >
              <div ref={lensInnerRef} className="origin-top-left will-change-transform">
                {renderVisualCore(true)}
              </div>

              {/* 真实消色差玻璃镀膜弧面反光与暗角（纯平滑渐变，边缘极致干净利落） */}
              <div
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    'radial-gradient(115% 85% at 28% 18%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 32%, transparent 54%), radial-gradient(circle at 50% 50%, transparent 66%, rgba(8, 8, 12, 0.44) 100%)',
                  boxShadow: 'inset 0 0 12px rgba(0, 0, 0, 0.55)',
                }}
              />

              {/* 极细光学十字准星 */}
              <div className="pointer-events-none absolute inset-x-6 top-1/2 h-px bg-amber-200/20" />
              <div className="pointer-events-none absolute inset-y-6 left-1/2 w-px bg-amber-200/20" />

              {/* 底部精巧居中焦距读数 */}
              <div className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full border border-amber-300/25 bg-black/75 px-2.5 py-0.5 font-mono-tech text-[10px] tracking-wider text-amber-100/95">
                {zoomLevel.toFixed(1)}×
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 高清重制后的底部提示条 */}
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

      {/* 放大镜局部潜影显影实时告警条 */}
      <AnimatePresence>
        {lensAnomalyMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[#9e2a2b]/40 bg-[#1c1414] px-4 py-2 text-xs font-mono-tech text-[#f8e7e7]"
          >
            ● {lensAnomalyMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部取证说明栏 */}
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
    </div>
  );
};
