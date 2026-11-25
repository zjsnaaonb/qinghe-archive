import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Search, Eye, Sliders, Sparkles, AlertTriangle, Ruler } from 'lucide-react';
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
    code: 'QH-37-09 // 135银盐黑白底片扫描',
    label: '《晒谷场收工图》（1998年10月16日傍晚 · 雾中宗祠前坪）',
    meta: '机身：Nikon FM2 · 显影：D-76 (1:1) · 摄制：Z.H.J.',
    forensicHint: '开启光学放大镜可逐一核对背身村民人数、湿石板地面拉长黑影数及宗祠二楼雕花木窗细节。',
  },
  team_portraits: {
    code: 'QH-ADM-01 // 课题组成员公示标准照',
    label: '青禾民俗影像数字化保护工程核心成员证件照',
    meta: '采集：南州大学人文高研院数字采集室 · 2025—2026',
    forensicHint: '可用放大镜检视成员瞳孔高光区反光轮廓随调查推进的细微变化。',
  },
  nuo_mask: {
    code: 'QH-38-M01 // 未编目库底器物取证照',
    label: '清代樟木圆雕朱砂髹漆「无目盲傩」面具正视标本图',
    meta: '出土点：原龛下坳粮站夹墙外侧泥滩 · 附 10cm 法医级比例尺',
    forensicHint: '注意观察面具眼窝处是否留有常规傩面具的透视钻孔，以及剥落朱砂层下的封漆痕迹。',
  },
  village_mist: {
    code: 'QH-38-F02 // 田野速写手稿红外扫描',
    label: '周怀瑾 1998 年秋《雾锁龛下坳地形与宗祠朝向速写》',
    meta: '纸本碳素钢笔淡彩 · 320dpi 原稿扫描',
    forensicHint: '记录了漏斗状盆地内唯一背水朝山而建的古宗祠及村民闻锣背立的习俗。',
  },
  shrine_1998: {
    code: 'QH-38-S00 // 16mm 胶片残帧低清转磁样片',
    label: '1998年10月17日夜《空神龛与背身戏台》单帧定格',
    meta: 'Bolex H16 Reflex · Kodak Tri-X Reversal 7278 · TC 00:14:38:19',
    forensicHint: '台上戏班全员背对台下观众，面朝黑洞洞的无目空神龛行礼。',
  },
  elevation_map: {
    code: '云水勘字〔1999〕底图-07 // 库区等高线蓝图',
    label: '云溪水库淹没区 1:10000 水文高程勘测底图（东南库湾局部）',
    meta: '测绘单位：省水利水电勘测设计院 · 1999年8月归档扫描',
    forensicHint: '切换【斜射紫外显影】并用放大镜移至右下角涂改液留白处，可辨认被抹除的原始海拔高程与旧村名。',
  },
  woodblock_seal: {
    code: '清光绪十九年刻本 // 古籍善本原叶高精度影印',
    label: '《云溪风土杂记·卷四·祀典志》木刻雕版书叶（带骑缝破裂藏书印）',
    meta: '半叶八行，行十八字，黑口双鱼尾 · 青禾周氏旧藏',
    forensicHint: '放大检视右侧骑缝红印破裂处与竖排雕版原刻文字，仔细核对「封龛逆仪」四道牌位的真正先后次序！',
  },
  thumbprint_ledger: {
    code: '云水移审〔1999〕附表38 // 移民安置签收花名册影印件',
    label: '未编入总册《附表38：祠下村（龛下坳）124户补偿款领款红指模总览》',
    meta: '档案密级：内部备查 · 1999年11月封存',
    forensicHint: '用放大镜比对不同户主栏内的红色指模箕斗螺线与右上方月牙形缺口。',
  },
};

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const ForensicPhotoViewer: React.FC<ForensicPhotoViewerProps> = ({
  photoId,
  act,
  scareMode,
  viewCount = 0,
  onInspect,
  onTriggerScare,
  onAdjustContamination,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [loupeEnabled, setLoupeEnabled] = useState(true);
  const [rakingLight, setRakingLight] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number; active: boolean }>({
    x: 0.5,
    y: 0.5,
    active: false,
  });
  const [windowScareTriggered, setWindowScareTriggered] = useState(false);

  const W = 900;
  const H = 560;

  const drawScene = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const rand = seededRandom(
        photoId.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 1998) + act * 17
      );
      ctx.save();
      ctx.clearRect(0, 0, W, H);

      if (photoId === 'threshing_1998') {
        // 1998 银盐黑白老照片：《晒谷场收工图》
        const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, '#cfc9be');
        skyGrad.addColorStop(0.42, '#9e988e');
        skyGrad.addColorStop(0.55, '#59554f');
        skyGrad.addColorStop(1, '#201e1c');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        // 远山与山坳浓雾
        ctx.fillStyle = 'rgba(72, 69, 63, 0.55)';
        ctx.beginPath();
        ctx.moveTo(0, 220);
        ctx.quadraticCurveTo(180, 120, 360, 195);
        ctx.quadraticCurveTo(590, 130, 900, 210);
        ctx.lineTo(900, 310);
        ctx.lineTo(0, 310);
        ctx.closePath();
        ctx.fill();

        // 祠下古宗祠主体（马头墙 + 重檐 + 二楼雕花木窗 + 底层黑洞祠门）
        const hallX = 270;
        const hallW = 360;
        const hallTop = 98;
        const hallBottom = 292;

        // 两侧马头墙阶梯
        ctx.fillStyle = '#2d2b28';
        ctx.fillRect(hallX, hallTop + 26, hallW, hallBottom - hallTop - 26);
        ctx.fillStyle = '#1f1d1b';
        // 左马头墙垛
        ctx.fillRect(hallX - 10, hallTop + 10, 22, 182);
        ctx.fillRect(hallX - 4, hallTop - 2, 14, 16);
        // 右马头墙垛
        ctx.fillRect(hallX + hallW - 12, hallTop + 10, 22, 182);
        ctx.fillRect(hallX + hallW - 10, hallTop - 2, 14, 16);

        // 飞檐黛瓦屋顶
        ctx.fillStyle = '#171614';
        ctx.beginPath();
        ctx.moveTo(hallX - 36, hallTop + 34);
        ctx.quadraticCurveTo(hallX + hallW / 2, hallTop - 16, hallX + hallW + 36, hallTop + 34);
        ctx.lineTo(hallX + hallW + 18, hallTop + 48);
        ctx.quadraticCurveTo(hallX + hallW / 2, hallTop + 8, hallX - 18, hallTop + 48);
        ctx.closePath();
        ctx.fill();

        // 腰檐
        ctx.beginPath();
        ctx.moveTo(hallX - 20, hallTop + 112);
        ctx.lineTo(hallX + hallW + 20, hallTop + 112);
        ctx.lineTo(hallX + hallW + 10, hallTop + 122);
        ctx.lineTo(hallX - 10, hallTop + 122);
        ctx.closePath();
        ctx.fill();

        // 宗祠底层中门与深处空神龛暗影
        ctx.fillStyle = '#090908';
        ctx.fillRect(hallX + 138, hallTop + 132, 84, 62);
        // 门内隐约神龛底座轮廓
        ctx.strokeStyle = rakingLight ? 'rgba(210,185,140,0.42)' : 'rgba(130,124,114,0.22)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(hallX + 165, hallTop + 146, 30, 36);

        // 匾额《祠下宗祠》
        ctx.fillStyle = '#141311';
        ctx.fillRect(hallX + 144, hallTop + 116, 72, 15);
        ctx.fillStyle = '#9b9386';
        ctx.font = 'bold 10px "Songti SC", SimSun, serif';
        ctx.textAlign = 'center';
        ctx.fillText('祠 下 宗 祠', hallX + 180, hallTop + 127);

        // 二楼雕花木窗（左、中、右三扇；中央/右侧木窗在第四幕推开露出惨白无目窥视脸！）
        const winY = hallTop + 56;
        const winPositions = [hallX + 70, hallX + 156, hallX + 242];
        winPositions.forEach((wx, idx) => {
          const wWidth = 48;
          const wHeight = 44;
          ctx.fillStyle = '#141312';
          ctx.fillRect(wx, winY, wWidth, wHeight);
          ctx.strokeStyle = '#4a4640';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(wx, winY, wWidth, wHeight);

          if (act >= 4 && idx === 2) {
            // 第四幕：右侧二楼木窗推开半扇，露出惨白无目窥视面孔轮廓！
            ctx.fillStyle = '#070707';
            ctx.fillRect(wx + 2, winY + 2, wWidth - 4, wHeight - 4);

            // 向外推开的半扇雕花窗页（透视斜出）
            ctx.fillStyle = '#2b2824';
            ctx.beginPath();
            ctx.moveTo(wx, winY);
            ctx.lineTo(wx - 14, winY + 6);
            ctx.lineTo(wx - 14, winY + wHeight + 4);
            ctx.lineTo(wx, winY + wHeight);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 窗缝内贴近的苍白人脸与无眼珠黑窟窿
            ctx.fillStyle = 'rgba(226, 222, 214, 0.84)';
            ctx.beginPath();
            ctx.ellipse(wx + 26, winY + 24, 11, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#080808';
            ctx.beginPath();
            ctx.ellipse(wx + 22, winY + 21, 3.1, 2.2, 0, 0, Math.PI * 2);
            ctx.ellipse(wx + 30, winY + 21, 3.1, 2.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#181615';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(wx + 23, winY + 31);
            ctx.lineTo(wx + 29, winY + 31);
            ctx.stroke();
          } else {
            // 紧闭的传统竖棂雕花木窗
            for (let gx = 8; gx < wWidth; gx += 8) {
              ctx.beginPath();
              ctx.moveTo(wx + gx, winY);
              ctx.lineTo(wx + gx, winY + wHeight);
              ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(wx, winY + 15);
            ctx.lineTo(wx + wWidth, winY + 15);
            ctx.moveTo(wx, winY + 30);
            ctx.lineTo(wx + wWidth, winY + 30);
            ctx.stroke();
          }
        });

        // 宗祠前山雾缭绕带
        const mistGrad = ctx.createLinearGradient(0, 245, 0, 325);
        mistGrad.addColorStop(0, 'rgba(210, 206, 198, 0)');
        mistGrad.addColorStop(0.5, 'rgba(205, 200, 192, 0.42)');
        mistGrad.addColorStop(1, 'rgba(95, 91, 84, 0.15)');
        ctx.fillStyle = mistGrad;
        ctx.fillRect(0, 245, W, 80);

        // 湿青石板晒谷场地坪与拼缝
        const groundGrad = ctx.createLinearGradient(0, 290, 0, H);
        groundGrad.addColorStop(0, '#6e6a63');
        groundGrad.addColorStop(0.35, '#4d4a45');
        groundGrad.addColorStop(1, '#23211e');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, 292, W, H - 292);

        // 青石板透视缝隙与积水反光
        ctx.strokeStyle = 'rgba(24, 22, 20, 0.42)';
        ctx.lineWidth = 1;
        for (let row = 310; row < H; row += 28) {
          ctx.beginPath();
          ctx.moveTo(0, row);
          ctx.lineTo(W, row);
          ctx.stroke();
        }
        for (let col = -120; col <= W + 120; col += 68) {
          ctx.beginPath();
          ctx.moveTo(W / 2 + (col - W / 2) * 0.45, 292);
          ctx.lineTo(col, H);
          ctx.stroke();
        }

        // 12 道拉长黑影（对应 11 名活人 + 正中偏右第 7 道“无人空位”多出的第 12 道诡异黑影！）
        const shadowSlots = [
          { x: 112, y: 356, h: 150 },
          { x: 172, y: 362, h: 155 },
          { x: 234, y: 352, h: 148 },
          { x: 296, y: 366, h: 158 },
          { x: 358, y: 355, h: 152 },
          { x: 418, y: 360, h: 156 },
          // 第 7 道：空无一人的石板裂缝处延伸出的第 12 道细长黑影（头戴高冠傩面轮廓）！
          { x: 478, y: 358, h: 168, isExtraGhostShadow: true },
          { x: 538, y: 362, h: 154 },
          { x: 600, y: 354, h: 149 },
          { x: 662, y: 365, h: 156 },
          { x: 724, y: 358, h: 152 },
          { x: 792, y: 368, h: 160 },
        ];

        shadowSlots.forEach((s, idx) => {
          ctx.save();
          const shadowAlpha = rakingLight
            ? s.isExtraGhostShadow
              ? 0.88
              : 0.72
            : s.isExtraGhostShadow
            ? 0.68
            : 0.62;
          const sGrad = ctx.createLinearGradient(s.x, s.y, s.x - 24, s.y + s.h);
          sGrad.addColorStop(0, `rgba(10, 10, 9, ${shadowAlpha})`);
          sGrad.addColorStop(0.75, `rgba(12, 11, 10, ${shadowAlpha * 0.78})`);
          sGrad.addColorStop(1, 'rgba(12, 11, 10, 0.06)');
          ctx.fillStyle = sGrad;

          ctx.beginPath();
          ctx.moveTo(s.x - 11, s.y);
          ctx.lineTo(s.x + 11, s.y);
          ctx.lineTo(s.x - 8, s.y + s.h - 18);
          ctx.ellipse(s.x - 18, s.y + s.h - 8, 12, 9, 0.2, 0, Math.PI * 2);
          ctx.lineTo(s.x - 30, s.y + s.h - 18);
          ctx.closePath();
          ctx.fill();

          if (rakingLight) {
            ctx.fillStyle = s.isExtraGhostShadow ? 'rgba(248, 113, 113, 0.85)' : 'rgba(251, 191, 36, 0.72)';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`#${idx + 1}`, s.x - 16, s.y + s.h - 24);
          }
          ctx.restore();
        });

        // 11 名背身深色粗布褂村民（第四幕最右侧 #11 蓝布衫老人消失，仅剩 10 人！）
        const villagerSlots = [
          { x: 112, y: 356, tall: 74, hat: false },
          { x: 172, y: 362, tall: 70, hat: true },
          { x: 234, y: 352, tall: 76, hat: false },
          { x: 296, y: 366, tall: 68, hat: false },
          { x: 358, y: 355, tall: 75, hat: true },
          { x: 418, y: 360, tall: 72, hat: false },
          // 注意 x=478 空缺，没有站人，只有地上第7道黑影！
          { x: 538, y: 362, tall: 73, hat: false },
          { x: 600, y: 354, tall: 77, hat: true },
          { x: 662, y: 365, tall: 69, hat: false },
          { x: 724, y: 358, tall: 74, hat: false },
          { x: 792, y: 368, tall: 71, hat: false, isBlueElder: true },
        ];

        villagerSlots.forEach((v) => {
          if (v.isBlueElder && act >= 4) {
            // 第四幕：最右侧蓝布衫老人已消失，仅留湿脚印水渍
            ctx.fillStyle = 'rgba(15, 16, 18, 0.55)';
            ctx.beginPath();
            ctx.ellipse(v.x - 5, v.y + 2, 4, 7, -0.1, 0, Math.PI * 2);
            ctx.ellipse(v.x + 6, v.y + 2, 4, 7, 0.1, 0, Math.PI * 2);
            ctx.fill();
            return;
          }

          const topY = v.y - v.tall;
          // 裤管
          ctx.fillStyle = '#191817';
          ctx.fillRect(v.x - 9, v.y - 24, 7, 25);
          ctx.fillRect(v.x + 2, v.y - 24, 7, 25);

          // 对襟粗布褂背影（最右侧老人穿暗蓝灰粗布衫）
          ctx.fillStyle = v.isBlueElder ? '#242c35' : '#1f1e1c';
          ctx.beginPath();
          ctx.moveTo(v.x - 16, topY + 20);
          ctx.quadraticCurveTo(v.x, topY + 14, v.x + 16, topY + 20);
          ctx.lineTo(v.x + 14, v.y - 21);
          ctx.lineTo(v.x - 14, v.y - 21);
          ctx.closePath();
          ctx.fill();

          // 背部衣褶暗线
          ctx.strokeStyle = 'rgba(255,255,255,0.06)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(v.x, topY + 18);
          ctx.lineTo(v.x, v.y - 22);
          ctx.stroke();

          // 头颅与发髻/竹笠
          if (v.isBlueElder && act === 3) {
            // 第三幕：最右侧蓝布衫老人脖子诡异向后扭转 45°，露出惨白半边侧脸与黑眼窝！
            ctx.save();
            ctx.translate(v.x, topY + 10);
            ctx.rotate(0.42);
            ctx.fillStyle = '#beb8ad';
            ctx.beginPath();
            ctx.ellipse(0, 0, 9.5, 11, 0, 0, Math.PI * 2);
            ctx.fill();
            // 后脑灰发遮盖左半，右半露出侧脸黑眼窝与僵硬嘴角
            ctx.fillStyle = '#252422';
            ctx.beginPath();
            ctx.arc(-3, -1, 9, Math.PI * 0.55, Math.PI * 1.65);
            ctx.fill();
            ctx.fillStyle = '#090909';
            ctx.beginPath();
            ctx.ellipse(4.2, -1.5, 2.4, 1.8, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1b1a18';
            ctx.beginPath();
            ctx.moveTo(3, 4.5);
            ctx.lineTo(7.5, 3.8);
            ctx.stroke();
            ctx.restore();
          } else {
            // 正常背身黑发后脑勺
            ctx.fillStyle = '#181715';
            ctx.beginPath();
            ctx.ellipse(v.x, topY + 9, 8.5, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            if (v.hat) {
              ctx.fillStyle = '#3b3730';
              ctx.beginPath();
              ctx.moveTo(v.x - 18, topY + 11);
              ctx.quadraticCurveTo(v.x, topY - 3, v.x + 18, topY + 11);
              ctx.closePath();
              ctx.fill();
            }
          }
        });

        // 90年代傻瓜/单反石英日期背印：右下角橙红色 `'98 10 16 Z.H.J.`
        ctx.save();
        ctx.font = 'bold 17px "Courier New", Consolas, monospace';
        ctx.textAlign = 'right';
        ctx.shadowColor = 'rgba(234, 88, 12, 0.75)';
        ctx.shadowBlur = 5;
        ctx.fillStyle = 'rgba(249, 115, 22, 0.88)';
        ctx.fillText("'98 10 16  Z.H.J.", W - 32, H - 26);
        ctx.restore();
      } else if (photoId === 'team_portraits') {
        // 课题组 5 人证件照（郑国栋 + 4名研究生，瞳孔反光随幕次异变为同一座神龛）
        ctx.fillStyle = '#eef2f6';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(0, 0, W, 52);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px "Songti SC", SimSun, serif';
        ctx.textAlign = 'left';
        ctx.fillText('南州大学青禾民俗影像数字化保护工程 · 课题组登记标准照（档案批次 QH-ADM-01）', 24, 32);

        const members = [
          { name: '郑国栋', role: '课题负责人 / 副院长', code: 'PI-01', glasses: true, isDean: true },
          { name: '林知夏', role: '首席编目 / 博士生', code: 'STU-01', glasses: false, hair: 'long' },
          { name: '陈 默', role: '胶片数字化与AI修复', code: 'STU-02', glasses: true, hair: 'short' },
          { name: '苏晓棠', role: '田野文本与善本校注', code: 'STU-03', glasses: false, hair: 'bob' },
          { name: '赵一鸣', role: '多轨声学降噪与采集', code: 'STU-04', glasses: false, hair: 'short' },
        ];

        members.forEach((m, idx) => {
          const cardW = 152;
          const cardH = 268;
          const gap = 20;
          const startX = 30 + idx * (cardW + gap);
          const startY = 92;

          // 白底相纸框
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(startX, startY, cardW, cardH);
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(startX, startY, cardW, cardH);

          // 证件照蓝灰渐变背景
          const bg = ctx.createLinearGradient(startX, startY + 8, startX, startY + 198);
          bg.addColorStop(0, m.isDean ? '#3b5984' : '#4a6b82');
          bg.addColorStop(1, '#293d52');
          ctx.fillStyle = bg;
          ctx.fillRect(startX + 8, startY + 8, cardW - 16, 190);

          const cx = startX + cardW / 2;
          const cy = startY + 96;

          // 肩膀西装/衬衫
          ctx.fillStyle = m.isDean ? '#1e293b' : '#334155';
          ctx.beginPath();
          ctx.moveTo(startX + 16, startY + 198);
          ctx.quadraticCurveTo(cx, startY + 148, startX + cardW - 16, startY + 198);
          ctx.closePath();
          ctx.fill();

          // 脖颈与面庞
          ctx.fillStyle = act >= 4 && !m.isDean ? '#d8d5cf' : '#e6ccb2';
          ctx.fillRect(cx - 12, cy + 32, 24, 26);
          ctx.beginPath();
          ctx.ellipse(cx, cy, 34, 42, 0, 0, Math.PI * 2);
          ctx.fill();

          // 发型
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.arc(cx, cy - 10, 36, Math.PI * 0.92, Math.PI * 2.08);
          ctx.fill();
          if (m.hair === 'long') {
            ctx.fillRect(cx - 36, cy - 8, 10, 62);
            ctx.fillRect(cx + 26, cy - 8, 10, 62);
          } else if (m.hair === 'bob') {
            ctx.fillRect(cx - 35, cy - 8, 9, 40);
            ctx.fillRect(cx + 26, cy - 8, 9, 40);
          }

          // 双眼与瞳孔高光（核心线索：随幕次推进，4名学生瞳孔高光渐变为同一座无目神龛轮廓！）
          [-13, 13].forEach((ox) => {
            const ex = cx + ox;
            const ey = cy - 2;
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.ellipse(ex, ey, 7.5, 4.6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#18181b';
            ctx.beginPath();
            ctx.arc(ex, ey, 4.1, 0, Math.PI * 2);
            ctx.fill();

            if (m.isDean) {
              // 郑国栋镜片强烈白反光遮蔽瞳孔细节
              ctx.fillStyle = 'rgba(255,255,255,0.65)';
              ctx.fillRect(ex - 5, ey - 3, 8, 2.5);
            } else if (act <= 1) {
              // 第一幕：正常圆形眼神光
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(ex - 1.3, ey - 1.2, 1.3, 0, Math.PI * 2);
              ctx.fill();
            } else if (act === 2) {
              // 第二幕：高光拉长为竖向方龛初态
              ctx.fillStyle = '#fde68a';
              ctx.fillRect(ex - 1.5, ey - 2.4, 3, 4.6);
            } else {
              // 第三、四幕：放大镜下清晰可见瞳孔正中映出完全一致的「飞檐空神龛」朱砂金轮廓！
              ctx.strokeStyle = act >= 4 ? '#ef4444' : '#fbbf24';
              ctx.lineWidth = 0.85;
              // 飞檐顶
              ctx.beginPath();
              ctx.moveTo(ex - 3.2, ey - 1.6);
              ctx.lineTo(ex + 3.2, ey - 1.6);
              ctx.stroke();
              // 神龛框与底座
              ctx.strokeRect(ex - 2.1, ey - 1.5, 4.2, 4.2);
              ctx.fillStyle = act >= 4 ? 'rgba(239,68,68,0.55)' : 'rgba(251,191,36,0.45)';
              ctx.fillRect(ex - 1.1, ey - 0.5, 2.2, 2.8);
            }
          });

          if (m.glasses) {
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.3;
            ctx.strokeRect(cx - 24, cy - 9, 19, 13);
            ctx.strokeRect(cx + 5, cy - 9, 19, 13);
            ctx.beginPath();
            ctx.moveTo(cx - 5, cy - 3);
            ctx.lineTo(cx + 5, cy - 3);
            ctx.stroke();
          }

          // 鼻与唇线
          ctx.strokeStyle = '#9a7b69';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx, cy + 2);
          ctx.lineTo(cx - 2, cy + 12);
          ctx.lineTo(cx + 2, cy + 12);
          ctx.stroke();

          ctx.strokeStyle = '#7f5546';
          ctx.beginPath();
          if (act >= 4 && !m.isDean) {
            // 第四幕：四人嘴角弧度变得一模一样
            ctx.arc(cx, cy + 20, 7, 0.15 * Math.PI, 0.85 * Math.PI);
          } else {
            ctx.moveTo(cx - 7, cy + 22);
            ctx.lineTo(cx + 7, cy + 22);
          }
          ctx.stroke();

          // 姓名栏
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 15px "Songti SC", SimSun, serif';
          ctx.textAlign = 'center';
          ctx.fillText(m.name, cx, startY + 224);
          ctx.fillStyle = '#475569';
          ctx.font = '11px sans-serif';
          ctx.fillText(m.role, cx, startY + 243);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px monospace';
          ctx.fillText(m.code, cx, startY + 258);
        });

        ctx.fillStyle = '#475569';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          act >= 3
            ? '【图像校验异常提示】光学检视发现 STU-01 至 STU-04 角膜反射区呈现非自然几何同构（疑似同一木构龛体投影）。'
            : '归档说明：标准照均于人文楼三层采集室使用同一柔光箱拍摄，供特展宣传册及内网工牌核验使用。',
          30,
          415
        );
      } else if (photoId === 'nuo_mask') {
        // 无眼孔朱砂盲傩木雕面具 + 法医比例尺
        ctx.fillStyle = '#121011';
        ctx.fillRect(0, 0, W, H);

        // 深暗红绒布底衬纹理
        const velvet = ctx.createRadialGradient(W / 2, H / 2 - 20, 40, W / 2, H / 2, 460);
        velvet.addColorStop(0, '#2b1416');
        velvet.addColorStop(1, '#090708');
        ctx.fillStyle = velvet;
        ctx.fillRect(0, 0, W, H);

        // 樟木圆雕面具轮廓
        const mx = W / 2;
        const my = H / 2 - 26;
        const maskGrad = ctx.createRadialGradient(mx - 25, my - 35, 20, mx, my, 185);
        maskGrad.addColorStop(0, '#8f2620'); // 残存暗朱砂漆皮
        maskGrad.addColorStop(0.55, '#591914');
        maskGrad.addColorStop(0.85, '#3b2416'); // 裸露老樟木胎底
        maskGrad.addColorStop(1, '#1d110a');

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = 16;
        ctx.fillStyle = maskGrad;
        ctx.beginPath();
        ctx.ellipse(mx, my, 128, 168, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 剥落朱砂斑驳露木纹与纵向干裂纹
        ctx.strokeStyle = 'rgba(28, 16, 9, 0.72)';
        ctx.lineWidth = 1.6;
        for (let i = -95; i <= 95; i += 19) {
          ctx.beginPath();
          ctx.moveTo(mx + i, my - 150 + Math.abs(i) * 0.35);
          ctx.bezierCurveTo(mx + i - 6, my - 40, mx + i + 6, my + 40, mx + i, my + 150 - Math.abs(i) * 0.35);
          ctx.stroke();
        }

        // 古拙粗眉弓
        ctx.strokeStyle = '#1a0d08';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(mx - 50, my - 26, 38, Math.PI * 1.15, Math.PI * 1.88);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mx + 50, my - 26, 38, Math.PI * 1.12, Math.PI * 1.85);
        ctx.stroke();

        // 核心取证特征：平滑封死、毫无透视钻孔的盲眼窝（绝无眼孔！）
        [-48, 48].forEach((ox) => {
          const ex = mx + ox;
          const ey = my - 18;
          const socketGrad = ctx.createRadialGradient(ex, ey, 3, ex, ey, 32);
          socketGrad.addColorStop(0, '#6b221b'); // 平滑封死木胎凹面
          socketGrad.addColorStop(0.7, '#421611');
          socketGrad.addColorStop(1, '#240c09');
          ctx.fillStyle = socketGrad;
          ctx.beginPath();
          ctx.ellipse(ex, ey, 32, 19, 0, 0, Math.PI * 2);
          ctx.fill();

          // 眼窝内残留手工平铲刀痕与朱砂封涂纹（证明自始至终未钻孔）
          ctx.strokeStyle = rakingLight ? 'rgba(251, 191, 36, 0.55)' : 'rgba(180, 80, 65, 0.35)';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(ex - 22, ey - 2);
          ctx.lineTo(ex + 22, ey + 2);
          ctx.moveTo(ex - 16, ey + 5);
          ctx.lineTo(ex + 18, ey - 4);
          ctx.stroke();
        });

        // 高耸山根与鼻翼
        ctx.fillStyle = '#4c1b14';
        ctx.beginPath();
        ctx.moveTo(mx, my - 42);
        ctx.lineTo(mx - 22, my + 42);
        ctx.quadraticCurveTo(mx, my + 54, mx + 22, my + 42);
        ctx.closePath();
        ctx.fill();

        // 紧抿封死之双唇（缄口）与一道黑漆封口线
        ctx.strokeStyle = '#140907';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(mx - 44, my + 92);
        ctx.quadraticCurveTo(mx, my + 88, mx + 44, my + 92);
        ctx.stroke();

        // 右侧馆藏牛皮纸系绳签条
        ctx.fillStyle = '#d6c7a9';
        ctx.fillRect(670, 82, 168, 92);
        ctx.strokeStyle = '#78684c';
        ctx.strokeRect(670, 82, 168, 92);
        ctx.fillStyle = '#1c1917';
        ctx.font = 'bold 13px "Songti SC", SimSun, serif';
        ctx.textAlign = 'left';
        ctx.fillText('标本号：QH-38-M01', 682, 106);
        ctx.font = '11px "Songti SC", SimSun, serif';
        ctx.fillText('名称：朱砂髹漆无目盲傩面', 682, 126);
        ctx.fillText('特征：双目平滑封死无钻孔', 682, 145);
        ctx.fillStyle = '#991b1b';
        ctx.fillText('状态：未公开展出（库底残件）', 682, 163);

        // 底部 10cm 法医级黑白相间取证标尺
        const rx = 250;
        const ry = H - 58;
        const rw = 400;
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(rx, ry, rw, 30);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx, ry, rw, 30);
        for (let cm = 0; cm < 10; cm++) {
          ctx.fillStyle = cm % 2 === 0 ? '#0f172a' : '#f8fafc';
          ctx.fillRect(rx + cm * 40, ry, 40, 12);
          ctx.fillStyle = '#0f172a';
          ctx.font = '10px monospace';
          ctx.fillText(`${cm}cm`, rx + cm * 40 + 4, ry + 25);
        }
      } else if (photoId === 'village_mist') {
        // 周怀瑾 1998 雾锁龛下坳炭笔钢笔速写
        ctx.fillStyle = '#dfd4b9';
        ctx.fillRect(0, 0, W, H);

        // 速写本纸张水渍与纤维感
        ctx.strokeStyle = 'rgba(120, 98, 68, 0.16)';
        for (let y = 24; y < H; y += 26) {
          ctx.beginPath();
          ctx.moveTo(40, y);
          ctx.lineTo(W - 40, y);
          ctx.stroke();
        }

        // 漏斗状四面环山炭笔线条（108.4m 壶口坳地）
        ctx.strokeStyle = '#2b2620';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(55, 115);
        ctx.quadraticCurveTo(230, 290, 390, 330);
        ctx.moveTo(845, 105);
        ctx.quadraticCurveTo(670, 285, 510, 330);
        ctx.stroke();

        // 炭笔排线阴影
        ctx.lineWidth = 1;
        for (let x = 90; x < 370; x += 10) {
          ctx.beginPath();
          ctx.moveTo(x, 150 + (x - 90) * 0.55);
          ctx.lineTo(x - 22, 210 + (x - 90) * 0.55);
          ctx.stroke();
        }
        for (let x = 530; x < 810; x += 10) {
          ctx.beginPath();
          ctx.moveTo(x, 320 - (x - 530) * 0.55);
          ctx.lineTo(x + 22, 375 - (x - 530) * 0.55);
          ctx.stroke();
        }

        // 坳底背水朝山而建的古宗祠速写
        ctx.lineWidth = 2;
        ctx.strokeRect(395, 290, 110, 68);
        ctx.beginPath();
        ctx.moveTo(380, 292);
        ctx.quadraticCurveTo(450, 262, 520, 292);
        ctx.stroke();

        // 祠前背立小人速写符号
        [415, 432, 448, 465, 482].forEach((px) => {
          ctx.beginPath();
          ctx.arc(px, 382, 3.5, 0, Math.PI * 2);
          ctx.moveTo(px, 386);
          ctx.lineTo(px, 408);
          ctx.stroke();
        });

        // 淡墨水雾渲染
        ctx.fillStyle = 'rgba(236, 230, 216, 0.55)';
        ctx.fillRect(180, 235, 540, 48);

        // 周怀瑾钢笔手书批注
        ctx.fillStyle = '#231f1a';
        ctx.font = '15px "Songti SC", SimSun, serif';
        ctx.textAlign = 'left';
        ctx.fillText('戊寅年九月廿七（1998.10.16）龛下坳写生备忘：', 72, 68);
        ctx.font = '13px "Songti SC", SimSun, serif';
        ctx.fillText('1. 四山合抱如漏斗壶口，气压极低，海拔实测仅 108.4 米，终日白雾锁坳。', 72, 96);
        ctx.fillText('2. 奇俗：沿溪三十七村祠堂皆面水而筑，唯此第38村（祠下村）背溪面崖，戏台正对空山暗渊。', 72, 120);
        ctx.fillText('3. 傍晚铜锣初响，全村男女老少皆垂手背身立于湿石坪，无一人敢朝戏台神龛抬眼。', 72, 468);
        ctx.fillStyle = '#7f1d1d';
        ctx.fillText('【补记：万不可用闪光灯直打龛内泥塑！切记切记 —— 周怀瑾】', 72, 496);
      } else if (photoId === 'shrine_1998') {
        // 16mm 残帧：空神龛与背身戏台
        ctx.fillStyle = '#090909';
        ctx.fillRect(0, 0, W, H);

        // 两侧 16mm 胶片单边齿孔与片边码
        ctx.fillStyle = '#030303';
        ctx.fillRect(0, 0, 56, H);
        ctx.fillRect(W - 56, 0, 56, H);
        ctx.fillStyle = '#d4d4d8';
        for (let py = 36; py < H; py += 92) {
          ctx.fillRect(16, py, 24, 34);
        }
        ctx.save();
        ctx.translate(W - 22, H / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('KODAK 7278 SAFETY FILM  //  BATCH QH-38-REEL00', 0, 0);
        ctx.restore();

        // 画面主体：幽暗古戏台与正中黑洞空神龛
        const frameGrad = ctx.createRadialGradient(W / 2, 220, 30, W / 2, 260, 390);
        frameGrad.addColorStop(0, '#57534e');
        frameGrad.addColorStop(0.55, '#292524');
        frameGrad.addColorStop(1, '#0c0a09');
        ctx.fillStyle = frameGrad;
        ctx.fillRect(56, 18, W - 112, H - 36);

        // 神龛木构外框与掀开的帐幔
        ctx.strokeStyle = '#a8a29e';
        ctx.lineWidth = 2;
        ctx.strokeRect(365, 86, 170, 210);
        ctx.fillStyle = '#050505';
        ctx.fillRect(380, 102, 140, 194);

        // 空神龛内无脸泥塑残座轮廓
        ctx.fillStyle = '#27272a';
        ctx.fillRect(422, 236, 56, 58);
        ctx.fillStyle = 'rgba(168, 162, 158, 0.28)';
        ctx.beginPath();
        ctx.ellipse(450, 192, 24, 32, 0, 0, Math.PI * 2);
        ctx.fill();

        // 台上三名穿戏袍背对镜头、面朝空神龛跪拜/起舞的盲傩伶人
        [320, 450, 580].forEach((ax, idx) => {
          const ay = idx === 1 ? 330 : 348;
          ctx.fillStyle = '#18181b';
          ctx.beginPath();
          ctx.moveTo(ax - 32, ay + 120);
          ctx.lineTo(ax - 18, ay);
          ctx.lineTo(ax + 18, ay);
          ctx.lineTo(ax + 32, ay + 120);
          ctx.closePath();
          ctx.fill();
          // 水袖展开背影
          ctx.strokeStyle = '#78716c';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(ax - 18, ay + 12);
          ctx.lineTo(ax - 44, ay + 48);
          ctx.moveTo(ax + 18, ay + 12);
          ctx.lineTo(ax + 44, ay + 48);
          ctx.stroke();
          // 后脑戏冠
          ctx.fillStyle = '#09090b';
          ctx.fillRect(ax - 9, ay - 22, 18, 22);
        });

        // 16mm 转磁时间码叠加
        ctx.fillStyle = 'rgba(250, 250, 249, 0.85)';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('REC 1998.10.17  亥时  TC 00:14:38:19  [剧目：辞社背身]', 84, H - 42);
      } else if (photoId === 'elevation_map') {
        // 云溪水库 1:10000 水文等高线蓝图 + 108.4m 涂改液留白块
        ctx.fillStyle = '#dce7f2';
        ctx.fillRect(0, 0, W, H);

        // 测绘公里网格线
        ctx.strokeStyle = 'rgba(30, 64, 175, 0.16)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx <= W; gx += 60) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, H);
          ctx.stroke();
        }
        for (let gy = 0; gy <= H; gy += 60) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(W, gy);
          ctx.stroke();
        }

        // 顶部蓝图图框标题
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(20, 18, W - 40, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px "Songti SC", SimSun, serif';
        ctx.textAlign = 'left';
        ctx.fillText('云溪水库淹没区水文等高线勘测底图（1999年正常蓄水位 165.0m 核定版）', 34, 43);

        // 正常等高线群与云溪干流
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(30, 240);
        ctx.bezierCurveTo(260, 190, 440, 310, 870, 210);
        ctx.stroke();

        // 多层闭合等高线
        const centers = [
          { cx: 250, cy: 230, radii: [155, 120, 85, 50], labels: ['165m', '150m', '138m', '126m'] },
          { cx: 635, cy: 365, radii: [165, 130, 96, 64, 36], labels: ['160m', '145m', '130m', '118m', '108.4m'] },
        ];
        ctx.strokeStyle = 'rgba(29, 78, 216, 0.55)';
        ctx.lineWidth = 1.3;
        centers.forEach((c) => {
          c.radii.forEach((r, idx) => {
            ctx.beginPath();
            ctx.ellipse(c.cx, c.cy, r * 1.25, r * 0.82, 0.22, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#1e40af';
            ctx.font = '11px monospace';
            ctx.fillText(c.labels[idx], c.cx - r * 1.1, c.cy - 6);
          });
        });

        // 周边正常行政村标注
        ctx.fillStyle = '#0f172a';
        ctx.font = '12px "Songti SC", SimSun, serif';
        ctx.fillText('● QH-35 樟溪村 (134.2m)', 165, 195);
        ctx.fillText('● QH-36 白石滩 (129.8m)', 310, 275);
        ctx.fillText('● QH-37 上坪村 (141.0m)', 455, 185);

        // 核心取证点：东南壶口盆地 (cx=635, cy=365) 被涂改液厚涂抹白的异常斑块！
        ctx.save();
        ctx.fillStyle = rakingLight ? 'rgba(255, 253, 245, 0.58)' : 'rgba(252, 252, 250, 0.94)';
        ctx.beginPath();
        ctx.ellipse(638, 368, 92, 54, -0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.restore();

        // 涂改液刮擦边缘与斜射光透出的底层蓝图原字：108.4m 祠下村（龛下坳）漏水暗渊！
        ctx.fillStyle = rakingLight ? 'rgba(185, 28, 28, 0.92)' : 'rgba(30, 58, 138, 0.24)';
        ctx.font = 'bold 13px "Songti SC", SimSun, serif';
        ctx.fillText('▲ 108.4m 壶口漏水暗渊', 566, 362);
        ctx.fillText('原址：祠下村（龛下坳 / 批次38）', 554, 384);

        ctx.fillStyle = '#475569';
        ctx.font = '11px monospace';
        ctx.fillText(
          rakingLight
            ? '[紫外斜射显影已开启] 涂改液涂层下方检出原始测绘注记：海拔 108.4m 喀斯特竖井暗渊（祠下村旧址）'
            : '提示：东南角 E118°42\' 处存在大面积白色修正液涂抹痕迹，可点击上方【斜射显影增强】透视底稿。',
          32,
          H - 22
        );
      } else if (photoId === 'woodblock_seal') {
        // 清光绪十九年《云溪风土杂记·卷四·祀典志》竖排木刻书叶 + 骑缝破裂红印（核心终局真假顺序证据！）
        ctx.fillStyle = '#e7d8b5';
        ctx.fillRect(0, 0, W, H);

        // 古籍竹纸虫蛀与水渍暗斑
        ctx.fillStyle = 'rgba(133, 98, 52, 0.14)';
        ctx.beginPath();
        ctx.arc(120, 95, 58, 0, Math.PI * 2);
        ctx.arc(810, 470, 74, 0, Math.PI * 2);
        ctx.fill();

        // 木刻四周双栏乌丝栏框（外粗内细）
        ctx.strokeStyle = '#1c1712';
        ctx.lineWidth = 4;
        ctx.strokeRect(56, 38, W - 112, H - 76);
        ctx.lineWidth = 1.2;
        ctx.strokeRect(64, 46, W - 128, H - 92);

        // 竖排分栏界行（从右至左 8 列）
        const rightStart = W - 76;
        const colW = 88;
        for (let c = 0; c <= 8; c++) {
          const lx = rightStart - c * colW;
          ctx.beginPath();
          ctx.moveTo(lx, 46);
          ctx.lineTo(lx, H - 46);
          ctx.stroke();
        }

        // 版心鱼尾（最左侧装订口）
        ctx.fillStyle = '#1c1712';
        ctx.fillRect(64, 145, 36, 14);
        ctx.fillRect(64, 395, 36, 14);

        // 从右向左竖排雕版刻字（第1列～第7列）
        const columns = [
          '雲溪風土雜記卷四・祀典志',
          '龕下社在縣東南壺口坳深處',
          '祀無目社公泥塑不設睛珠',
          '歲末十月十七亥時演盲儺絕唱',
          '劇目四字正名曰【辭社背身】',
          '封龕逆儀：退目・覆面・緘口・封龕',
          '小注：倒置退目於末則萬目獻龕',
        ];

        columns.forEach((text, colIdx) => {
          const cx = rightStart - colIdx * colW - colW / 2;
          const isCrucialCol = colIdx === 5 || colIdx === 6;
          ctx.fillStyle = isCrucialCol && rakingLight ? '#7f1d1d' : '#18130e';
          ctx.font =
            colIdx === 6
              ? 'bold 16px "Songti SC", SimSun, serif'
              : 'bold 20px "Songti SC", SimSun, serif';
          ctx.textAlign = 'center';

          const chars = Array.from(text);
          const stepY = Math.min(28, 420 / Math.max(chars.length, 1));
          chars.forEach((ch, i) => {
            ctx.fillText(ch, cx, 78 + i * stepY);
          });
        });

        // 骑缝破裂朱砂藏书印（盖在第6、7列交界处，印泥剥落裂缝恰露出「退目・覆面・緘口・封龕」原刻字口！）
        ctx.save();
        const sx = rightStart - 5.5 * colW - 42;
        const sy = 195;
        ctx.strokeStyle = 'rgba(185, 28, 28, 0.78)';
        ctx.lineWidth = 4;
        ctx.strokeRect(sx, sy, 92, 118);
        ctx.fillStyle = rakingLight ? 'rgba(185, 28, 28, 0.16)' : 'rgba(185, 28, 28, 0.30)';
        ctx.fillRect(sx + 4, sy + 4, 84, 110);

        // 纸张虫蛀与骑缝斜向破裂白痕（让底下的原刻墨字清晰透出）
        ctx.strokeStyle = '#e7d8b5';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(sx - 6, sy + 28);
        ctx.lineTo(sx + 98, sy + 78);
        ctx.stroke();

        ctx.fillStyle = 'rgba(153, 27, 27, 0.82)';
        ctx.font = 'bold 13px "Songti SC", SimSun, serif';
        ctx.textAlign = 'center';
        ctx.fillText('青禾周氏', sx + 46, sy + 24);
        ctx.fillText('珍藏善本', sx + 46, sy + 104);
        ctx.restore();

        // 左下角现代取证比对提示签
        ctx.fillStyle = 'rgba(28, 25, 23, 0.88)';
        ctx.fillRect(72, H - 92, 340, 40);
        ctx.fillStyle = '#fde68a';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          '原刻真文核验：退目 → 覆面 → 缄口 → 封龛（与2025电子录入稿完全相反！）',
          84,
          H - 67
        );
      } else if (photoId === 'thumbprint_ledger') {
        // 1999 移民安置补偿附表38：124枚完全一致的红手印指模阵列
        ctx.fillStyle = '#efe7d3';
        ctx.fillRect(0, 0, W, H);

        // 红线会计账页表头
        ctx.fillStyle = '#991b1b';
        ctx.font = 'bold 17px "Songti SC", SimSun, serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          '云溪水库移民安置补偿费签收花名册 · 附表38（祠下村 / 龛下坳 · 共124户）',
          W / 2,
          34
        );
        ctx.font = '11px "Songti SC", SimSun, serif';
        ctx.fillStyle = '#44403c';
        ctx.fillText(
          '制表日期：1999年10月29日    发放总额：124户（签收率100%）    新镇实际报到落户：0 户',
          W / 2,
          54
        );

        // 绘制 124 格密密麻麻完全一致的红指模（16列 x 8行，前124格）
        const cols = 16;
        const rows = 8;
        const startX = 34;
        const startY = 70;
        const cellW = (W - 68) / cols;
        const cellH = (H - 122) / rows;

        ctx.strokeStyle = 'rgba(185, 28, 28, 0.45)';
        ctx.lineWidth = 1;

        let idx = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            idx++;
            const x = startX + c * cellW;
            const y = startY + r * cellH;
            ctx.strokeRect(x, y, cellW, cellH);

            if (idx <= 124) {
              // 户号
              ctx.fillStyle = '#57534e';
              ctx.font = '9px monospace';
              ctx.textAlign = 'left';
              ctx.fillText(`38-${String(idx).padStart(3, '0')}`, x + 3, y + 11);

              // 完全一致的红色斗形指模（连2点钟方向的月牙形断纹疤痕都100%分毫不差！）
              const px = x + cellW / 2 + 2;
              const py = y + cellH / 2 + 5;
              ctx.save();
              ctx.fillStyle = 'rgba(200, 30, 30, 0.24)';
              ctx.beginPath();
              ctx.ellipse(px, py, 10.5, 13.5, -0.08, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = 'rgba(185, 20, 20, 0.82)';
              ctx.lineWidth = 0.9;
              [3, 5.5, 8, 10.5].forEach((ring) => {
                ctx.beginPath();
                ctx.ellipse(px, py, ring * 0.82, ring * 1.08, -0.08, 0.25, Math.PI * 1.92);
                ctx.stroke();
              });
              // 右上方2点钟完全一致的月牙疤痕白缺口
              ctx.fillStyle = '#efe7d3';
              ctx.fillRect(px + 3.2, py - 7.5, 5.5, 2.4);
              ctx.restore();
            } else {
              ctx.fillStyle = '#a8a29e';
              ctx.font = '10px "Songti SC", SimSun, serif';
              ctx.textAlign = 'center';
              ctx.fillText('以下空白', x + cellW / 2, y + cellH / 2 + 4);
            }
          }
        }

        ctx.fillStyle = rakingLight ? '#991b1b' : '#57534e';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
          rakingLight
            ? '[刑侦指模叠对比对结果] 38-001 至 38-124 共 124 枚拇指印中心斗纹与右上方 2.1mm 断疤重合率：100.00%（同一只手连按124次）'
            : '审计批注：本表共 124 户领款指模，放大镜下可见每枚指模右上角均有同一道月牙形断纹缺口。',
          34,
          H - 18
        );
      }

      // 叠加银盐颗粒、细微划痕与暗角
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let g = 0; g < 480; g++) {
        const gx = rand() * W;
        const gy = rand() * H;
        ctx.fillRect(gx, gy, 1.4, 1.4);
      }

      if (showGrid) {
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx < W; gx += 75) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, H);
          ctx.stroke();
        }
        for (let gy = 0; gy < H; gy += 70) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(W, gy);
          ctx.stroke();
        }
      }

      // 四周胶片暗角
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, W * 0.65);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.48)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      ctx.restore();
    },
    [photoId, act, rakingLight, showGrid]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawScene(ctx);
  }, [drawScene]);

  // 实时绘制光学放大镜局部画布
  useEffect(() => {
    if (!loupeEnabled || !pointer.active) return;
    const srcCanvas = canvasRef.current;
    const loupeCanvas = loupeCanvasRef.current;
    if (!srcCanvas || !loupeCanvas) return;
    const lctx = loupeCanvas.getContext('2d');
    if (!lctx) return;

    const size = 180;
    const zoom = 2.4;
    const srcW = size / zoom;
    const srcH = size / zoom;
    const sx = Math.max(0, Math.min(W - srcW, pointer.x * W - srcW / 2));
    const sy = Math.max(0, Math.min(H - srcH, pointer.y * H - srcH / 2));

    lctx.clearRect(0, 0, size, size);
    lctx.drawImage(srcCanvas, sx, sy, srcW, srcH, 0, 0, size, size);

    // 十字取证分划丝
    lctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
    lctx.lineWidth = 1;
    lctx.beginPath();
    lctx.moveTo(size / 2, 0);
    lctx.lineTo(size / 2, size);
    lctx.moveTo(0, size / 2);
    lctx.lineTo(size, size / 2);
    lctx.stroke();
  }, [loupeEnabled, pointer, act, rakingLight, showGrid, photoId]);

  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setPointer({ x: nx, y: ny, active: true });

    // 第四幕放大镜移至《晒谷场收工图》二楼推开的木窗时触发细微声效反馈
    if (
      photoId === 'threshing_1998' &&
      act >= 4 &&
      loupeEnabled &&
      !windowScareTriggered &&
      nx > 0.54 &&
      nx < 0.64 &&
      ny > 0.24 &&
      ny < 0.38
    ) {
      setWindowScareTriggered(true);
      horrorAudio.playWoodenClapper();
    }
  };

  const handleEyeGenTrapClick = () => {
    horrorAudio.playScareStinger(scareMode);
    onAdjustContamination?.(10);
    onTriggerScare?.({
      title: '【违规操作】已触发 EyeGen 高清补帧重制预览',
      message:
        '林知夏在求救信中明确警告过：切勿点击右上角的高清重制预览！\n\n在 0.3 秒的神经网络补帧画面里，晒谷场上所有背身的黑褂村民全都缓缓转过了脖子，而他们没有眼珠的眼眶正对着你的屏幕完成了一次焦距标定。（视网膜残留指数 +10%）',
      visualType: 'peeker',
    });
  };

  const info = VISUAL_CAPTIONS[photoId];

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-zinc-700/90 bg-zinc-950 text-zinc-100 shadow-xl">
      {/* 顶部取证工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/95 px-3.5 py-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-amber-950/70 border border-amber-700/50 px-1.5 py-0.5 text-[10px] font-mono-tech text-amber-300">
              {info.code}
            </span>
            <span className="text-xs font-bold text-zinc-100">{info.label}</span>
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
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] cursor-pointer transition ${
              loupeEnabled
                ? 'border-amber-500 bg-amber-950/50 text-amber-200'
                : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
            }`}
          >
            <Search className="h-3 w-3" />
            <span>放大镜 {loupeEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              horrorAudio.playClick('film');
              setRakingLight((v) => !v);
              onInspect?.(photoId);
            }}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] cursor-pointer transition ${
              rakingLight
                ? 'border-sky-500 bg-sky-950/50 text-sky-200'
                : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
            }`}
            title="开启斜射紫外光/高反差取证显影，透视涂改液与阴影计数"
          >
            <Sliders className="h-3 w-3" />
            <span>斜射显影增强</span>
          </button>

          <button
            type="button"
            onClick={() => {
              horrorAudio.playClick('ui');
              setShowGrid((v) => !v);
            }}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] cursor-pointer transition ${
              showGrid
                ? 'border-emerald-500 bg-emerald-950/50 text-emerald-200'
                : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
            }`}
          >
            <Ruler className="h-3 w-3" />
            <span>坐标标尺</span>
          </button>

          {photoId === 'threshing_1998' && (
            <button
              type="button"
              onClick={handleEyeGenTrapClick}
              className="inline-flex items-center gap-1 rounded border border-red-900/70 bg-red-950/40 px-2 py-1 text-[11px] text-red-300 hover:bg-red-900/60 cursor-pointer"
              title="实验性 EyeGen AI 4K 高清补帧重制预览"
            >
              <Sparkles className="h-3 w-3 text-red-400" />
              <span>高清重制预览</span>
            </button>
          )}
        </div>
      </div>

      {/* 主画布检视区 */}
      <div
        ref={containerRef}
        onMouseMove={handlePointerMove}
        onMouseEnter={() => {
          setPointer((p) => ({ ...p, active: true }));
          onInspect?.(photoId);
        }}
        onMouseLeave={() => setPointer((p) => ({ ...p, active: false }))}
        className={`relative w-full select-none overflow-hidden bg-black ${
          loupeEnabled ? 'cursor-crosshair' : 'cursor-default'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block h-auto w-full"
        />

        {/* 2.4x 光学取证放大镜悬浮窗 */}
        {loupeEnabled && pointer.active && (
          <div
            className="pointer-events-none absolute z-30 h-44 w-44 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-amber-400/90 shadow-2xl shadow-black"
            style={{
              left: `${pointer.x * 100}%`,
              top: `${pointer.y * 100}%`,
            }}
          >
            <canvas ref={loupeCanvasRef} width={180} height={180} className="h-full w-full" />
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-mono-tech text-amber-300">
              2.4x [{Math.round(pointer.x * 100)},{Math.round(pointer.y * 100)}]
            </div>
          </div>
        )}
      </div>

      {/* 底部取证说明栏 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-900/90 px-3.5 py-2 text-xs text-zinc-300">
        <div className="flex items-center gap-1.5">
          <Eye className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>{info.forensicHint}</span>
        </div>
        {act >= 3 && (photoId === 'threshing_1998' || photoId === 'team_portraits') && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono-tech text-red-400">
            <AlertTriangle className="h-3 w-3" />
            底片校验和已偏移 (阅览频次: {Math.max(1, viewCount)})
          </span>
        )}
      </div>
    </div>
  );
};
