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
  { code: string; label: string; meta: string; forensicHint: string }
> = {
  threshing_1998: {
    code: 'QH-37-09 · 135银盐底片',
    label: '《晒谷场收工图》（1998年10月16日傍晚 · 雾中宗祠前坪）',
    meta: '机身：Nikon FM2 · 显影：D-76 (1:1) · 摄制：Z.H.J.',
    forensicHint: '开启光学折射放大镜（滚轮可调倍率）细查人影数量与二楼雕花木窗。',
  },
  team_portraits: {
    code: 'QH-ADM-01 · 成员证件照',
    label: '青禾民俗影像数字化保护工程核心成员标准像',
    meta: '采集：南州大学人文高研院数字采集室 · 2025—2026',
    forensicHint: '放大镜移至各成员瞳孔高光区，留意随章节深入出现的细微反光异变。',
  },
  nuo_mask: {
    code: 'QH-38-M01 · 未编目库底器物',
    label: '清代樟木圆雕朱砂髹漆「无目盲傩」面具标本',
    meta: '出土点：原龛下坳粮站夹墙外侧泥滩 · 10cm 取证标尺',
    forensicHint: '注意眼窝处平滑封死的实木结构——这副面具自雕刻之初便不留透视眼孔。',
  },
  village_mist: {
    code: 'QH-38-F02 · 1998库底影像',
    label: '雾锁龛下坳（云溪壶口盆地 · 蓄水前实拍底片）',
    meta: '高程视角：白石滩山脊俯拍 · 1998年10月',
    forensicHint: '浓雾深处盘踞着地图上并未登记的第 38 个宗族聚落。',
  },
  shrine_1998: {
    code: 'QH-38-S00 · 16mm 隔离残帧',
    label: '1998年10月17日夜《空神龛与背身戏台》',
    meta: 'Bolex H16 Reflex · Kodak Tri-X 7278 · TC 00:14:38:19',
    forensicHint: '戏班背对镜头叩拜空龛，龛内泥塑面目平滑无眼。',
  },
  elevation_map: {
    code: '云水勘字〔1999〕底图-07',
    label: '云溪水库淹没区 1:10000 水文高程勘测底图',
    meta: '测绘：省水利水电勘测设计院 · 1999年8月归档',
    forensicHint: '开启【斜射紫外显影】并用放大镜移至东南库湾涂改液留白处，透视被抹除的高程与地名。',
  },
  woodblock_seal: {
    code: '清光绪十九年刻本 · 原叶影印',
    label: '《云溪风土杂记·卷四·祀典志》木刻雕版书叶',
    meta: '半叶八行 · 黑口双鱼尾 · 青禾周氏旧藏（带骑缝裂印）',
    forensicHint: '放大检视右侧骑缝红印破裂处，核对原刻「封龛逆仪」四道牌位的真实先后次序。',
  },
  thumbprint_ledger: {
    code: '云水移审〔1999〕附表38',
    label: '《附表38：祠下村（龛下坳）124户领款红指模总览》',
    meta: '档案密级：内部备查 · 1999年11月封存',
    forensicHint: '用光学放大镜比对不同户主栏内红指模的螺线纹路与右上角月牙形断疤。',
  },
};

/** 精致高DPI矢量取证底图：用于需要清晰文字、等高线、红指模螺线与瞳孔反光的四类档案 */
const FineArchivalSvg: React.FC<{
  photoId: 'team_portraits' | 'elevation_map' | 'woodblock_seal' | 'thumbprint_ledger';
  act: ActNumber;
  rakingLight: boolean;
}> = ({ photoId, act, rakingLight }) => {
  if (photoId === 'elevation_map') {
    return (
      <svg viewBox="0 0 960 640" className="block h-auto w-full select-none bg-[#e8eef3]">
        <defs>
          <pattern id="gridMap" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#9db2c4" strokeWidth="0.6" strokeOpacity="0.45" />
          </pattern>
          <radialGradient id="basinDepth" cx="62%" cy="62%" r="36%">
            <stop offset="0%" stopColor={rakingLight ? '#7c2d12' : '#4a6b82'} stopOpacity={rakingLight ? '0.32' : '0.24'} />
            <stop offset="100%" stopColor="#e8eef3" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="960" height="640" fill={rakingLight ? '#17202e' : '#e8eef3'} />
        <rect width="960" height="640" fill="url(#gridMap)" />
        <rect width="960" height="640" fill="url(#basinDepth)" />

        {/* 测绘图框 */}
        <rect x="24" y="24" width="912" height="592" fill="none" stroke={rakingLight ? '#38bdf8' : '#2c4a66'} strokeWidth="2" />
        <rect x="30" y="30" width="900" height="580" fill="none" stroke={rakingLight ? '#38bdf8' : '#2c4a66'} strokeWidth="0.6" strokeDasharray="6 4" />

        {/* 优雅贝塞尔水文等高线 */}
        {[
          { d: 'M 70,120 C 260,55 480,75 680,105 C 830,128 905,210 895,360 C 885,510 730,585 520,575 C 310,565 110,520 75,380 C 48,270 30,150 70,120 Z', h: '165.0m', s: 1.5 },
          { d: 'M 145,165 C 310,105 510,118 675,155 C 805,185 845,275 835,385 C 825,495 690,545 530,535 C 365,525 185,480 145,365 C 115,280 105,195 145,165 Z', h: '150.0m', s: 1.2 },
          { d: 'M 245,220 C 380,170 555,175 680,220 C 775,255 795,335 778,415 C 760,490 650,515 545,505 C 425,492 275,455 245,365 C 222,295 215,242 245,220 Z', h: '135.0m', s: 1.1 },
          { d: 'M 365,280 C 460,245 590,252 670,295 C 735,330 742,390 715,442 C 685,485 605,495 535,482 C 445,465 375,425 360,365 C 348,320 340,295 365,280 Z', h: '120.0m', s: 1.1 },
        ].map((c, idx) => (
          <g key={idx}>
            <path d={c.d} fill="none" stroke={rakingLight ? '#7dd3fc' : '#43647f'} strokeWidth={c.s} strokeOpacity={0.75} />
            <text x={150 + idx * 92} y={152 + idx * 54} fill={rakingLight ? '#bae6fd' : '#2b4c68'} fontSize="11" fontFamily="monospace">
              {c.h}
            </text>
          </g>
        ))}

        {/* 云溪主河道 */}
        <path
          d="M 40,240 C 190,260 280,190 410,250 C 520,300 560,385 620,405 C 710,435 810,360 920,390"
          fill="none"
          stroke={rakingLight ? '#38bdf8' : '#2563eb'}
          strokeWidth="4.5"
          strokeOpacity="0.55"
        />

        {/* 37个常规村落坐标点 */}
        {[
          { x: 180, y: 195, name: 'QH-01 大坪村 (152m)' },
          { x: 320, y: 155, name: 'QH-12 石桥村 (148m)' },
          { x: 525, y: 175, name: 'QH-17 槐湾村 (141m)' },
          { x: 740, y: 215, name: 'QH-29 渡口村 (138m)' },
          { x: 255, y: 420, name: 'QH-37 白石滩 (135.2m)' },
        ].map((v, i) => (
          <g key={i}>
            <circle cx={v.x} cy={v.y} r="4.5" fill={rakingLight ? '#f8fafc' : '#1e3a5f'} />
            <text x={v.x + 10} y={v.y + 4} fill={rakingLight ? '#e2e8f0' : '#1e293b'} fontSize="12" fontFamily="serif">
              {v.name}
            </text>
          </g>
        ))}

        {/* 核心秘密区域：壶口漏水暗渊 108.4m（涂改液覆盖层，开启斜射紫外显影后透出红字！） */}
        <g transform="translate(505, 325)">
          <ellipse
            cx="95"
            cy="68"
            rx="92"
            ry="58"
            fill={rakingLight ? 'rgba(220, 38, 38, 0.14)' : '#f8fafc'}
            stroke={rakingLight ? '#f87171' : '#cbd5e1'}
            strokeWidth={rakingLight ? '1.8' : '2'}
            strokeDasharray={rakingLight ? '5 3' : 'none'}
          />
          {rakingLight ? (
            <g>
              <ellipse cx="95" cy="68" rx="52" ry="32" fill="none" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 3" />
              <circle cx="95" cy="68" r="6" fill="#dc2626" />
              <text x="95" y="48" textAnchor="middle" fill="#fecaca" fontSize="14" fontWeight="bold" fontFamily="serif">
                第38村 · 祠下村（旧称：龛下坳）
              </text>
              <text x="95" y="96" textAnchor="middle" fill="#fca5a5" fontSize="13" fontWeight="bold" fontFamily="monospace">
                漏水暗渊实测高程：108.4m [原注涂抹痕迹]
              </text>
              <text x="95" y="114" textAnchor="middle" fill="#fde68a" fontSize="10" fontFamily="monospace">
                UV-365nm 显影：1999.08 化学白色修正液覆盖区
              </text>
            </g>
          ) : (
            <g>
              <path d="M 18,45 Q 90,22 170,48 Q 180,88 158,105 Q 85,120 20,96 Z" fill="#ffffff" opacity="0.94" />
              <text x="95" y="72" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="serif" opacity="0.7">
                [ 勘测底图白液涂覆区 · 2.4km² ]
              </text>
              <text x="95" y="90" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
                建议开启上方「斜射显影增强」透视涂改痕迹
              </text>
            </g>
          )}
        </g>

        {/* 图签标题栏 */}
        <g transform="translate(48, 48)">
          <rect width="315" height="62" fill={rakingLight ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)'} stroke={rakingLight ? '#38bdf8' : '#2c4a66'} strokeWidth="1" />
          <text x="14" y="25" fill={rakingLight ? '#f8fafc' : '#0f172a'} fontSize="14" fontWeight="bold" fontFamily="serif">
            云溪水库淹没区水文高程总图（1999）
          </text>
          <text x="14" y="46" fill={rakingLight ? '#94a3b8' : '#475569'} fontSize="11" fontFamily="monospace">
            截流日期: 1999-11-14 · 正常蓄水位: 162.0m · 比例 1:10000
          </text>
        </g>
      </svg>
    );
  }

  if (photoId === 'woodblock_seal') {
    // 博物馆级清光绪十九年木刻书叶 + 骑缝破裂朱砂藏书印（清晰呈现阳文原刻：退目 → 覆面 → 缄口 → 封龛）
    const columns = [
      '云溪风土杂记卷四·祀典志',
      '青禾西南有洼曰龛下坳即祠下村',
      '村祠奉无目社公泥塑不凿双瞳',
      '凡岁迁水厄演辞社背身之傩',
      '伶人背龛而讴合村背台而拜',
      '三锣既响切忌回首窥龛',
      '若欲永封空龛须依古志四牌逆仪',
      '一曰退目二曰覆面三曰缄口四曰封龛',
      '倒置退目于末则万目反献大祸立至',
    ];
    return (
      <svg viewBox="0 0 960 640" className="block h-auto w-full select-none bg-[#e8dcc2]">
        <defs>
          <linearGradient id="oldPaper" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={rakingLight ? '#d8c39b' : '#efe5cf'} />
            <stop offset="50%" stopColor={rakingLight ? '#cbb184' : '#e4d5b7'} />
            <stop offset="100%" stopColor={rakingLight ? '#bfa272' : '#d8c5a1'} />
          </linearGradient>
        </defs>
        <rect width="960" height="640" fill="url(#oldPaper)" />

        {/* 古籍四周双边栏与中缝黑口双鱼尾 */}
        <rect x="46" y="34" width="868" height="572" fill="none" stroke="#2c241b" strokeWidth="4" />
        <rect x="54" y="42" width="852" height="556" fill="none" stroke="#2c241b" strokeWidth="1.2" />

        {/* 中缝版心（黑口双鱼尾） */}
        <line x1="470" y1="42" x2="470" y2="598" stroke="#2c241b" strokeWidth="1.4" />
        <line x1="490" y1="42" x2="490" y2="598" stroke="#2c241b" strokeWidth="1.4" />
        <polygon points="470,130 490,130 490,148 480,140 470,148" fill="#2c241b" />
        <polygon points="470,480 490,480 490,462 480,470 470,462" fill="#2c241b" />
        <text x="480" y="210" textAnchor="middle" fill="#2c241b" fontSize="14" fontFamily="serif" style={{ writingMode: 'vertical-rl' }}>
          云溪风土杂记·卷四
        </text>
        <text x="480" y="535" textAnchor="middle" fill="#2c241b" fontSize="13" fontFamily="serif" style={{ writingMode: 'vertical-rl' }}>
          光绪十九年刻
        </text>

        {/* 竖排木刻栏格与古籍阳文 */}
        {columns.map((colText, colIdx) => {
          // 从右向左排布（古籍阅读顺序）
          const xPositions = [862, 772, 682, 592, 526, 424, 334, 240, 146];
          const x = xPositions[colIdx];
          const isTruthCol = colIdx === 7;
          const isWarnCol = colIdx === 8;
          return (
            <g key={colIdx}>
              <line x1={x - 42} y1="42" x2={x - 42} y2="598" stroke="#2c241b" strokeWidth="0.6" strokeOpacity="0.45" />
              {colText.split('').map((ch, charIdx) => {
                const y = 78 + charIdx * 31;
                const highlightChar =
                  isTruthCol && ['退', '目', '覆', '面', '缄', '口', '封', '龛'].includes(ch);
                return (
                  <text
                    key={charIdx}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    fill={
                      highlightChar
                        ? rakingLight
                          ? '#991b1b'
                          : '#1c1510'
                        : isWarnCol
                        ? '#3f1d1d'
                        : '#251e17'
                    }
                    fontSize={highlightChar ? '22' : '20'}
                    fontWeight={highlightChar ? 'bold' : 'normal'}
                    fontFamily="'Songti SC', 'Noto Serif SC', 'SimSun', serif"
                  >
                    {ch}
                  </text>
                );
              })}
            </g>
          );
        })}

        {/* 关键物证：骑缝破裂朱砂藏书印（跨骑在“退目·覆面·缄口·封龛”一列上，证明原版未被电子篡改） */}
        <g transform="translate(198, 255) rotate(-4)">
          <rect
            x="0"
            y="0"
            width="84"
            height="108"
            rx="3"
            fill="rgba(166, 36, 36, 0.14)"
            stroke="#9e2a2b"
            strokeWidth="3.2"
          />
          <rect x="6" y="6" width="72" height="96" fill="none" stroke="#9e2a2b" strokeWidth="1" />
          <text x="58" y="34" textAnchor="middle" fill="#9e2a2b" fontSize="20" fontWeight="bold" fontFamily="serif">
            青
          </text>
          <text x="58" y="62" textAnchor="middle" fill="#9e2a2b" fontSize="20" fontWeight="bold" fontFamily="serif">
            禾
          </text>
          <text x="58" y="90" textAnchor="middle" fill="#9e2a2b" fontSize="20" fontWeight="bold" fontFamily="serif">
            周
          </text>
          <text x="26" y="34" textAnchor="middle" fill="#9e2a2b" fontSize="20" fontWeight="bold" fontFamily="serif">
            氏
          </text>
          <text x="26" y="62" textAnchor="middle" fill="#9e2a2b" fontSize="20" fontWeight="bold" fontFamily="serif">
            珍
          </text>
          <text x="26" y="90" textAnchor="middle" fill="#9e2a2b" fontSize="20" fontWeight="bold" fontFamily="serif">
            藏
          </text>
          {/* 藏书印木版裂纹 */}
          <path d="M -4,44 L 36,52 L 54,48 L 88,62" stroke="#e4d5b7" strokeWidth="3.4" fill="none" />
        </g>

        {/* 朱笔眉批标注 */}
        {rakingLight && (
          <g transform="translate(64, 545)">
            <rect width="388" height="36" rx="4" fill="rgba(153, 27, 27, 0.9)" />
            <text x="194" y="23" textAnchor="middle" fill="#fef2f2" fontSize="13" fontWeight="bold" fontFamily="serif">
              斜射校勘确认：原刻阳文真序为【退目 → 覆面 → 缄口 → 封龛】
            </text>
          </g>
        )}
      </svg>
    );
  }

  if (photoId === 'thumbprint_ledger') {
    const names = [
      '001 祠氏长生', '002 祠氏守义', '003 祠氏阿福', '004 祠氏桂兰',
      '005 祠氏永年', '006 祠氏明远', '007 祠氏玉珍', '008 祠氏德海',
      '009 祠氏文财', '010 祠氏秀英', '011 祠氏顺喜', '012 祠氏根生',
      '……', '122 祠氏老七', '123 祠氏幺妹', '124 祠氏无名',
    ];
    return (
      <svg viewBox="0 0 960 640" className="block h-auto w-full select-none bg-[#f2ece1]">
        <rect width="960" height="640" fill="#f2ece1" />
        <rect x="28" y="24" width="904" height="592" fill="none" stroke="#334155" strokeWidth="1.8" />
        <text x="480" y="64" textAnchor="middle" fill="#991b1b" fontSize="22" fontWeight="bold" fontFamily="serif" letterSpacing="4">
          云溪水库青禾乡移民安置补偿款签收总表 · 附表38（祠下村）
        </text>
        <text x="480" y="88" textAnchor="middle" fill="#475569" fontSize="12" fontFamily="monospace">
          签收日期：1998年10月17日 · 登记户数：124户 · 迁入新镇核销户数：0户 · 经手人：陆长根
        </text>
        <line x1="48" y1="102" x2="912" y2="102" stroke="#991b1b" strokeWidth="1.6" />

        {/* 16格户主签收指模矩阵（100%完全重合的同心螺线 + 右上月牙断疤！） */}
        {names.map((label, idx) => {
          const col = idx % 4;
          const row = Math.floor(idx / 4);
          const x = 52 + col * 218;
          const y = 118 + row * 116;
          return (
            <g key={idx} transform={`translate(${x}, ${y})`}>
              <rect width="204" height="102" fill="#faf6ee" stroke="#94a3b8" strokeWidth="1" />
              <text x="10" y="22" fill="#1e293b" fontSize="12" fontWeight="bold" fontFamily="serif">
                {label}
              </text>
              <text x="10" y="40" fill="#64748b" fontSize="10" fontFamily="monospace">
                领款: ¥8,400 · 迁入: 未报到
              </text>
              <text x="10" y="90" fill="#94a3b8" fontSize="10" fontFamily="serif">
                户主按印：
              </text>
              {/* 完全一致的生朱砂红指模（6道同心椭圆螺线 + 同一道右上角月牙断疤） */}
              <g transform="translate(148, 56)">
                {[11, 16, 21, 26, 31].map((ry, rIdx) => (
                  <ellipse
                    key={rIdx}
                    cx="0"
                    cy="0"
                    rx={ry * 0.68}
                    ry={ry}
                    fill="none"
                    stroke="#b91c1c"
                    strokeWidth={rakingLight ? '1.8' : '1.4'}
                    strokeOpacity={0.78 - rIdx * 0.08}
                    strokeDasharray={rIdx % 2 === 0 ? '26 3' : '18 2'}
                  />
                ))}
                {/* 同一道月牙形断疤 */}
                <path d="M 4,-22 Q 14,-14 10,-4" stroke="#faf6ee" strokeWidth="3.2" fill="none" />
                {rakingLight && (
                  <circle cx="10" cy="-14" r="9" fill="none" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="2 2" />
                )}
              </g>
            </g>
          );
        })}

        {rakingLight && (
          <g transform="translate(52, 584)">
            <rect width="856" height="24" rx="3" fill="#7f1d1d" />
            <text x="428" y="16" textAnchor="middle" fill="#fecaca" fontSize="12" fontFamily="monospace">
              十倍镜比对异常：全部 124 枚指模右上角均存在完全重合的 3.2mm 月牙断疤（同模反复摁印）
            </text>
          </g>
        )}
      </svg>
    );
  }

  // team_portraits：精细档案接触印相表（5位课题组成员证件照 + 第3/4幕瞳孔神龛反光异变）
  const members = [
    { name: '郑国栋', role: '项目首席 · 副院长', id: 'NZU-0199', eyeShift: true },
    { name: '林知夏', role: '田野统筹 · 研三', id: 'NZU-2301', eyeShift: act >= 4 },
    { name: '陈默', role: '胶片修复 · 研二', id: 'NZU-2408', eyeShift: act >= 3 },
    { name: '苏晓棠', role: '古籍编目 · 研二', id: 'NZU-2412', eyeShift: act >= 3 },
    { name: '赵一鸣', role: '方言音频 · 研一', id: 'NZU-2504', eyeShift: act >= 3 },
  ];

  return (
    <svg viewBox="0 0 960 420" className="block h-auto w-full select-none bg-[#18191d]">
      <rect width="960" height="420" fill="#18191d" />
      <text x="36" y="34" fill="#a1a1aa" fontSize="11" fontFamily="monospace">
        CONTACT SHEET // QINGHE-PROJECT-2026 // KODAK T-MAX 400 // DIGITAL ARCHIVE REGISTRY
      </text>

      {members.map((m, idx) => {
        const x = 32 + idx * 182;
        return (
          <g key={m.id} transform={`translate(${x}, 54)`}>
            <rect width="166" height="296" rx="4" fill="#23252b" stroke="#3f3f46" strokeWidth="1" />
            {/* 证件照底色 */}
            <rect x="13" y="14" width="140" height="196" fill={m.eyeShift && act >= 3 ? '#1f232b' : '#2c3543'} />
            {/* 细腻人物胸像剪影 */}
            <path d="M 32,210 C 34,166 56,154 83,154 C 110,154 132,166 134,210 Z" fill="#111318" />
            <ellipse cx="83" cy="108" rx="33" ry="42" fill="#d4cfc7" fillOpacity="0.88" />
            {/* 发型微区分 */}
            <path
              d={
                idx % 2 === 1
                  ? 'M 48,112 C 46,66 120,66 118,112 C 112,84 54,84 48,112 Z'
                  : 'M 50,96 C 54,60 112,60 116,96 C 102,78 64,78 50,96 Z'
              }
              fill="#18181b"
            />
            {/* 眼睛与瞳孔高光（关键细思极恐异变点：第3/4幕瞳孔浮现微小空神龛高光！） */}
            <g>
              <ellipse cx="70" cy="104" rx="6.5" ry="3.6" fill="#18181b" />
              <ellipse cx="96" cy="104" rx="6.5" ry="3.6" fill="#18181b" />
              {m.eyeShift ? (
                <>
                  <rect x="68.5" y="101.8" width="3" height="4.2" fill={rakingLight ? '#ef4444' : '#f8fafc'} />
                  <rect x="94.5" y="101.8" width="3" height="4.2" fill={rakingLight ? '#ef4444' : '#f8fafc'} />
                </>
              ) : (
                <>
                  <circle cx="71" cy="103" r="1.2" fill="#f8fafc" />
                  <circle cx="97" cy="103" r="1.2" fill="#f8fafc" />
                </>
              )}
            </g>
            <path d="M 75,130 Q 83,134 91,130" stroke="#52525b" strokeWidth="1.4" fill="none" />

            <text x="83" y="238" textAnchor="middle" fill="#f4f4f5" fontSize="14" fontWeight="bold" fontFamily="serif">
              {m.name}
            </text>
            <text x="83" y="258" textAnchor="middle" fill="#a1a1aa" fontSize="11">
              {m.role}
            </text>
            <text x="83" y="278" textAnchor="middle" fill={m.eyeShift ? '#f87171' : '#71717a'} fontSize="10" fontFamily="monospace">
              {m.eyeShift && act >= 3 ? `${m.id} · RETINA SYNC` : m.id}
            </text>
          </g>
        );
      })}

      <text x="36" y="388" fill={act >= 3 ? '#f87171' : '#71717a'} fontSize="11" fontFamily="monospace">
        {act >= 3
          ? '※ 光学放大检视提示：多位成员瞳孔高光已同步为相同的门框形神龛轮廓'
          : '※ 点击上方「光学放大镜」可检视每位课题组成员的标准像细节'}
      </text>
    </svg>
  );
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

  // 一次性调用开源 liquid-glass-web-react 预计算真实球面凸透镜折射位移贴图（永久缓存，零逐帧重算！）
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

  // 点 2 核心修复：点击【高清重制预览】后直接在照片原地播放真实的“神经扫描线扫过 → 村民逐个转过脖子直视你”动态演化！
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

    // 100% GPU translate3d 位移，彻底避免 left/top 触发布局重排与 React 重渲染
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

  const isRealPhoto =
    photoId === 'threshing_1998' ||
    photoId === 'nuo_mask' ||
    photoId === 'village_mist' ||
    photoId === 'shrine_1998';

  const basePhotoSrc = (() => {
    switch (photoId) {
      case 'threshing_1998':
        return './media/threshing_1998_base.jpg';
      case 'nuo_mask':
        return './media/nuo_mask_artifact.jpg';
      case 'village_mist':
        return './media/village_mist_1998.jpg';
      case 'shrine_1998':
        return './media/shrine_1998.jpg';
      default:
        return '';
    }
  })();

  // 切换条目时重置高清重制状态
  useEffect(() => {
    setHdState('idle');
    setScanProgress(0);
  }, [photoId]);

  // 播放高清重制扫描线动画（从 0% -> 100%，真实揭示转头直视帧 threshing_1998_turn.jpg）
  useEffect(() => {
    if (hdState !== 'scanning') return;
    let raf = 0;
    const start = performance.now();
    const duration = scareMode === 'full' ? 2400 : 3200;
    let stingerFired = false;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setScanProgress(Math.round(p * 100));

      if (p >= 0.56 && !stingerFired) {
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

    // 放大镜扫过《晒谷场收工图》二楼木窗（x: 54%-62%, y: 19%-30%）时轻响一声木梆
    if (
      photoId === 'threshing_1998' &&
      (act >= 3 || hdState === 'revealed') &&
      !windowChimeRef.current &&
      nx > 0.54 &&
      nx < 0.63 &&
      ny > 0.18 &&
      ny < 0.30
    ) {
      windowChimeRef.current = true;
      horrorAudio.playWoodenClapper();
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!loupeEnabled) return;
    e.preventDefault();
    setZoomLevel((prev) => {
      const next = prev + (e.deltaY < 0 ? 0.3 : -0.3);
      return Math.round(Math.max(1.6, Math.min(4.0, next)) * 10) / 10;
    });
  };

  const info = VISUAL_CAPTIONS[photoId];

  // 计算当前《晒谷场收工图》的转头揭示程度
  const showTurnLayer =
    photoId === 'threshing_1998' && (hdState === 'scanning' || hdState === 'revealed' || act >= 4);
  const turnClipBottom =
    hdState === 'scanning'
      ? `${100 - scanProgress}%`
      : hdState === 'revealed' || act >= 4
      ? '0%'
      : '100%';

  // 渲染核心画面内容（主画布与光学放大镜内部复用同一视觉源，确保像素级同步！）
  const renderVisualCore = (isInsideMagnifier = false) => {
    const filterClasses = [
      rakingLight && isRealPhoto ? 'contrast-150 brightness-110 saturate-50' : '',
      !isInsideMagnifier && hdState === 'revealed' ? 'scale-[1.06] transition-transform duration-[2200ms] ease-out' : '',
    ]
      .filter(Boolean)
      .join(' ');

    if (!isRealPhoto) {
      return (
        <FineArchivalSvg
          photoId={photoId as 'team_portraits' | 'elevation_map' | 'woodblock_seal' | 'thumbprint_ledger'}
          act={act}
          rakingLight={rakingLight}
        />
      );
    }

    return (
      <div className={`relative w-full overflow-hidden bg-black ${filterClasses}`}>
        {/* 原始 1998 银盐底片 */}
        <img
          src={basePhotoSrc}
          alt={info.label}
          draggable={false}
          className="block h-auto w-full object-cover select-none"
        />

        {/* 点 2 核心演出：像素对齐的《晒谷场收工图》转头直视层（随红激光扫描线逐像素显现！） */}
        {showTurnLayer && (
          <img
            src="./media/threshing_1998_turn.jpg"
            alt="高清重制异常帧：村民转头直视镜头"
            draggable={false}
            style={{
              clipPath: `inset(0 0 ${turnClipBottom} 0)`,
              opacity: act >= 4 && hdState === 'idle' ? 0.88 : 1,
            }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
          />
        )}

        {/* 第三幕自然回访时的幽微预览：二楼窗户出现微弱反光影 */}
        {photoId === 'threshing_1998' && act === 3 && hdState === 'idle' && (
          <img
            src="./media/threshing_1998_turn.jpg"
            alt="第三幕局部异变"
            draggable={false}
            style={{
              clipPath: 'inset(18% 38% 68% 54%)',
              opacity: 0.78,
            }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
          />
        )}

        {/* 高清重制揭示后的红色面部焦距锁定框（直观引导视线看到他们转过脖子盯着你！） */}
        {photoId === 'threshing_1998' && hdState === 'revealed' && !isInsideMagnifier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute inset-0"
          >
            {/* 标记二楼木窗窥视脸 + 居中四名转头直视的村民 */}
            {[
              { left: '56.2%', top: '19.5%', w: '5.2%', h: '8.2%', tag: 'WINDOW' },
              { left: '38.8%', top: '53.0%', w: '5.5%', h: '7.6%', tag: 'LOCK #06' },
              { left: '44.8%', top: '54.2%', w: '5.5%', h: '7.6%', tag: 'LOCK #07' },
              { left: '50.2%', top: '56.4%', w: '5.6%', h: '7.6%', tag: 'LOCK #08' },
              { left: '56.0%', top: '57.0%', w: '5.6%', h: '7.6%', tag: 'LOCK #09' },
            ].map((box) => (
              <div
                key={box.tag}
                style={{ left: box.left, top: box.top, width: box.w, height: box.h }}
                className="absolute border border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.45)]"
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
      {/* 静态永久缓存的单通道球面凸透镜折射滤镜（仅作用于 200x200 镜片内，绝不每帧重建！） */}
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
            <span>斜射显影</span>
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

      {/* 主取证视图区（底层零滤镜开销 + 镜片内 60~120fps GPU 合成球面折射透镜） */}
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

        {/* 零卡顿光学球面折射放大镜（translate3d 硬件合成 + 静态缓存球面折射图 + GPU 色散边与曲面高光） */}
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
              <div
                ref={lensInnerRef}
                className="origin-top-left will-change-transform"
              >
                {renderVisualCore(true)}
              </div>
            </div>

            {/* GPU 零开销凸透镜曲面玻璃高光、球面边缘色散晕与精密十字准星 */}
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

      {/* 高清重制后的非遮挡底部惊悚提示条（让玩家清清楚楚盯着转过脖子的村民！） */}
      <AnimatePresence>
        {photoId === 'threshing_1998' && hdState === 'revealed' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-red-900/70 bg-red-950/70 px-4 py-3 text-xs text-red-100"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="leading-relaxed">
                  <strong>EyeGen-v4 神经超分异常：</strong>
                  晒谷场上原本背对镜头的村民在重制帧中扭转脖颈直视屏幕，二楼雕花木窗内亦浮现窥视人影。林知夏在邮件中警告过切勿点开此预览（视网膜残留 +10%）。你可以用光学放大镜细查画面，或随时切回原始银盐底片。
                </p>
              </div>
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
