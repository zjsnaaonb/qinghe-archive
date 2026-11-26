import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  AudioLines,
  CheckCircle2,
  Eye,
  EyeOff,
  FastForward,
  FileCode2,
  Film,
  Flame,
  Headphones,
  KeyRound,
  LightbulbOff,
  Lock,
  Play,
  Radio,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Unlock,
  Volume2,
  VolumeX,
  ZoomIn,
} from 'lucide-react';
import { ENCRYPTED_VAULT, GATE_HASHES } from '../data/encryptedVault';
import { decryptVaultBlock, normalizePassphrase, verifyPassphraseHash } from '../engine/crypto';
import { horrorAudio } from '../engine/audio';
import type { EndingId } from '../types/game';
import type { CommonSiteProps } from './siteProps';

type B2TabId = 'telecine' | 'audio' | 'rescue' | 'master';
type ReelCode = 'QH-38-04' | 'QH-38-09' | 'QH-38-12';

interface IntercomChannel {
  id: 'B2-02' | 'B2-05' | 'B2-08';
  roomTitle: string;
  hasBreath: boolean;
  noiseFloorLabel: string;
  transcriptSnippet: string;
}

const INTERCOM_CHANNELS: IntercomChannel[] = [
  {
    id: 'B2-02',
    roomTitle: 'B2-02 通风设备间',
    hasBreath: false,
    noiseFloorLabel: '新风除湿机组底噪 -34dB · 连续发声包络（未检出吸气间隙）',
    transcriptSnippet: '“师姐救我我在通风间门锁死了快帮我开门师姐救我我在通风间门锁死了……”',
  },
  {
    id: 'B2-05',
    roomTitle: 'B2-05 消音录音棚',
    hasBreath: true,
    noiseFloorLabel: '全消声尖劈底噪 -68dB · 每 4.0 秒检出断句停顿与急促换气峰值',
    transcriptSnippet: '“有人吗……[急促吸气]……我在消音棚双层铅门后……[换气吞咽]……别信外面没有呼吸的复读声……”',
  },
  {
    id: 'B2-08',
    roomTitle: 'B2-08 磁带消磁室',
    hasBreath: false,
    noiseFloorLabel: '工频退磁器嗡鸣 + 62Hz 水底暗涌调制 · 零停顿等幅低语',
    transcriptSnippet: '“一鸣在消磁室快断电开门快断电开门快断电开门快断电开门……”',
  },
];

// 供玩家自由点选组合的五枚候选祀典木牌词元（打乱陈列，共120种四牌排列可能，零顺序剧透）
const RITUAL_TABLET_TOKENS = ['掩耳', '封龛', '缄口', '覆面', '退目'] as const;

// 与 src/engine/crypto.ts verifyPassphraseHash 100% 对齐的加盐 SHA-256 校验摘要（零明文剧透泄露）
const TRAP_TABLET_SEQ_HASH = '9a69cd2cdee96b053e74dc4694a067e8e2e8dfbbf5d22c9e511969448c1a3d6e';
const TRUE_TABLET_SEQ_HASH = '8f2de48fdea30e1b20221189d064f4b5df6a575323877fced7bb685d7126cacf';
const TRUE_RITUAL_FALLBACK_HASH = '2569aa5cbc8b82a53682b212f17562a073f4944b6655b7711799875b9769a3e0';

const STANDARD_ENDING_KEYS: Exclude<EndingId, 'ending_true'> extends infer K
  ? Record<Extract<K, string>, string>
  : never = {
  ending_assimilation: 'ending_key_assimilation',
  ending_overload: 'ending_key_overload',
  ending_sacrifice: 'ending_key_sacrifice',
  ending_mirror_leak: 'ending_key_mirror_leak',
};

export const B2TerminalSite: React.FC<CommonSiteProps> = ({
  state,
  focusedItemId,
  onClearFocus,
  onNavigateSite,
  onAddClue,
  onAddKeywords,
  onAdjustContamination,
  onTriggerScare,
  onCacheDecrypted,
  onRescueMember,
  onPassB2Reel,
  onRecordB2Violation,
  onTriggerEnding,
}) => {
  const [activeTab, setActiveTab] = useState<B2TabId>('telecine');

  // ==================== ① 16mm 逐帧检视台状态 ====================
  const [selectedReel, setSelectedReel] = useState<ReelCode>('QH-38-04');
  const [reel04SubFrame, setReel04SubFrame] = useState<1 | 2>(2); // 1: #0104(7人), 2: #0105(骤减为6人)
  const [amberFilterOn, setAmberFilterOn] = useState(false);
  const [reelAudioMuted, setReelAudioMuted] = useState(false);
  const [roomLightsOff, setRoomLightsOff] = useState(false);
  const [figureWalkProgress, setFigureWalkProgress] = useState(0); // 0 -> 1 湿蓝布衫走过三号机柜
  const [telecineStatusMsg, setTelecineStatusMsg] = useState<string>(
    '请严格遵照 OA 二级《地下 B2 胶片修复室安全审片十诫》执行检视，任何违规操作都将加剧视网膜残留污染。'
  );
  const [showDiagLog, setShowDiagLog] = useState(false);

  const telecineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const irMonitorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cctvBgImgRef = useRef<HTMLImageElement | null>(null);
  const [cctvImgLoaded, setCctvImgLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = './media/b2_corridor_cctv.png';
    img.onload = () => {
      cctvBgImgRef.current = img;
      setCctvImgLoaded(true);
    };
  }, []);

  // ==================== ② 多轨音频取证台状态 ====================
  const [playingChannel, setPlayingChannel] = useState<IntercomChannel['id'] | null>(null);
  const [playTick, setPlayTick] = useState(0);
  const [audioStatusMsg, setAudioStatusMsg] = useState<string | null>(null);
  const waveCanvasRefs = useRef<Record<IntercomChannel['id'], HTMLCanvasElement | null>>({
    'B2-02': null,
    'B2-05': null,
    'B2-08': null,
  });

  // ==================== ③ 受困成员锚点救援台状态 ====================
  const [suCodeInput, setSuCodeInput] = useState('');
  const [chenCodeInput, setChenCodeInput] = useState('');
  const [linCodeInput, setLinCodeInput] = useState('');
  const [rescueFeedback, setRescueFeedback] = useState<Record<string, { ok: boolean; text: string }>>({});

  // ==================== ④ 百年特展发布总控台状态 ====================
  const [selectedTablets, setSelectedTablets] = useState<string[]>([]);
  const [ritualSeqInput, setRitualSeqInput] = useState('');
  const [sealCodeInput, setSealCodeInput] = useState('');
  const [ritualBusy, setRitualBusy] = useState(false);
  const [ritualError, setRitualError] = useState<string | null>(null);

  // 响应外部焦点跳转
  useEffect(() => {
    if (!focusedItemId) return;
    if (focusedItemId === 'audio' || focusedItemId.includes('B2-05')) {
      setActiveTab('audio');
    } else if (focusedItemId === 'rescue') {
      setActiveTab('rescue');
    } else if (focusedItemId === 'master') {
      setActiveTab('master');
    }
    onClearFocus?.();
  }, [focusedItemId, onClearFocus]);

  const allReelsPassed =
    state.b2Progress.reel04Passed && state.b2Progress.reel09Passed && state.b2Progress.reel12Passed;
  const reelsPassedCount = [
    state.b2Progress.reel04Passed,
    state.b2Progress.reel09Passed,
    state.b2Progress.reel12Passed,
  ].filter(Boolean).length;

  const rescuedCount = Object.values(state.rescued).filter(Boolean).length;

  // 三卷母带全部通过时，自动记录院长专档口令线索
  useEffect(() => {
    if (!allReelsPassed) return;
    onAddKeywords(['kanxia1998', 'zheng_gd']);
    onAddClue({
      id: 'clue-b2-dean-passphrase',
      title: '合成OA三级院长专档口令：kanxia1998',
      detail:
        '已在 B2 逐帧检视台合规通过 QH-38-04 (kan)、QH-38-09 (xia)、QH-38-12 (1998) 三卷母带，合成院长账号 zheng_gd 完整口令：kanxia1998。',
      sourceSite: 'b2',
    });
  }, [allReelsPassed, onAddClue, onAddKeywords]);

  // 切换至 QH-38-09 时若未静音则自动敲响三声铜锣并挂出白牌
  useEffect(() => {
    if (activeTab !== 'telecine' || selectedReel !== 'QH-38-09') return;
    if (!reelAudioMuted && !state.b2Progress.reel09Passed) {
      horrorAudio.playBronzeGong(3);
    }
  }, [activeTab, selectedReel, reelAudioMuted, state.b2Progress.reel09Passed]);

  // QH-38-12 关闭机房照明后，湿蓝布衫背影缓慢走过三号机柜的动画状态
  useEffect(() => {
    if (!roomLightsOff) {
      setFigureWalkProgress(0);
      return;
    }
    if (figureWalkProgress >= 1) return;
    const timer = window.setInterval(() => {
      setFigureWalkProgress((prev) => {
        const next = Math.min(1, prev + 0.1);
        return next;
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [roomLightsOff, figureWalkProgress]);

  // 绘制 16mm 逐帧检视主视窗 Canvas
  useEffect(() => {
    if (activeTab !== 'telecine') return;
    const canvas = telecineCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 银盐黑白底色
    ctx.fillStyle = '#0e0e10';
    ctx.fillRect(0, 0, W, H);

    // 左右两侧 16mm 胶片齿孔带
    ctx.fillStyle = '#050506';
    ctx.fillRect(0, 0, 38, H);
    ctx.fillRect(W - 38, 0, 38, H);
    ctx.fillStyle = '#25252b';
    for (let y = 18; y < H; y += 46) {
      ctx.fillRect(10, y, 18, 13);
      ctx.fillRect(W - 28, y, 18, 13);
    }

    // 画面有效取景框
    const fx = 46;
    const fy = 16;
    const fw = W - 92;
    const fh = H - 32;

    const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, fw * 0.65);
    bgGrad.addColorStop(0, '#303136');
    bgGrad.addColorStop(0.7, '#191a1d');
    bgGrad.addColorStop(1, '#0b0b0d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(fx, fy, fw, fh);

    if (selectedReel === 'QH-38-04') {
      // 《迎社入祠》：宗祠石阶与 7人 -> 6人 背身剪影
      ctx.fillStyle = '#141518';
      ctx.fillRect(fx + 90, fy + 38, fw - 180, 135); // 宗祠黑门洞
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 2;
      ctx.strokeRect(fx + 90, fy + 38, fw - 180, 135);

      ctx.fillStyle = '#3f3f46';
      ctx.font = 'bold 15px serif';
      ctx.textAlign = 'center';
      ctx.fillText('龛 下 宗 祠', W / 2, fy + 62);

      // 石板地面
      ctx.fillStyle = '#202126';
      ctx.fillRect(fx, fy + 175, fw, fh - 175);

      const passed = state.b2Progress.reel04Passed;
      const count = passed ? 6 : reel04SubFrame === 1 ? 7 : 6;
      const totalSlots = 7;
      for (let i = 0; i < totalSlots; i++) {
        const px = fx + 78 + i * 66;
        const py = fy + 168;

        if (i === 6 && count === 6) {
          // 第7人消失处残留朝向镜头的湿脚印
          ctx.fillStyle = 'rgba(10, 10, 12, 0.85)';
          ctx.beginPath();
          ctx.ellipse(px - 6, py + 95, 5, 11, 0.1, 0, Math.PI * 2);
          ctx.ellipse(px + 8, py + 102, 5, 11, -0.1, 0, Math.PI * 2);
          ctx.fill();

          if (!passed) {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(px - 22, py - 24, 44, 118);
            ctx.setLineDash([]);
          }
          continue;
        }

        // 背身村民粗布剪影（无面部特征，仅后脑发髻/草帽与深色布衫）
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(px, py - 6, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(px - 19, py + 8);
        ctx.lineTo(px + 19, py + 8);
        ctx.lineTo(px + 23, py + 82);
        ctx.lineTo(px - 23, py + 82);
        ctx.closePath();
        ctx.fill();
      }

      if (passed) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
        ctx.fillRect(fx + 14, fy + fh - 54, 240, 38);
        ctx.strokeStyle = '#10b981';
        ctx.strokeRect(fx + 14, fy + fh - 54, 240, 38);
        ctx.fillStyle = '#a7f3d0';
        ctx.font = '13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('已跳至安全帧 #0108 | 础石暗刻: kan', fx + 24, fy + fh - 30);
      }
    } else if (selectedReel === 'QH-38-09') {
      // 《锣响三声》：空神龛 + 震颤铜锣 + 白底黑字剧目牌
      // 中央空神龛
      ctx.fillStyle = '#070709';
      ctx.fillRect(W / 2 - 68, fy + 45, 136, 175);
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - 68, fy + 45, 136, 175);
      ctx.fillStyle = '#52525b';
      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.fillText('【 空 神 龛 · 禁 久 视 】', W / 2, fy + 238);

      // 左侧铜锣与声波纹
      const gx = fx + 95;
      const gy = fy + 135;
      ctx.fillStyle = '#785c2a';
      ctx.beginPath();
      ctx.arc(gx, gy, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4d3815';
      ctx.beginPath();
      ctx.arc(gx, gy, 11, 0, Math.PI * 2);
      ctx.fill();

      if (!reelAudioMuted) {
        for (let r = 46; r <= 82; r += 18) {
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.42)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(gx, gy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 右侧白底黑字剧目木牌
      const bx = W - fx - 125;
      const by = fy + 52;
      ctx.fillStyle = '#e4e4e7';
      ctx.fillRect(bx, by, 68, 188);
      ctx.strokeStyle = '#18181b';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 4, by + 4, 60, 180);

      ctx.fillStyle = '#09090b';
      ctx.font = 'bold 17px serif';
      ctx.textAlign = 'center';
      const chars = state.b2Progress.reel09Passed ? ['龛', '下', '旧', '社'] : ['辞', '社', '勿', '顾'];
      chars.forEach((ch, idx) => {
        ctx.fillText(ch, bx + 34, by + 38 + idx * 34);
      });

      if (state.b2Progress.reel09Passed) {
        ctx.fillStyle = '#991b1b';
        ctx.font = 'bold 13px monospace';
        ctx.fillText('[xia]', bx + 34, by + 172);
      }
    } else {
      // 《QH-38-12 戏台柱联》：左右樟木台柱与柱联刻字
      const leftX = fx + 95;
      const rightX = W - fx - 155;
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(leftX, fy + 24, 60, fh - 48);
      ctx.fillRect(rightX, fy + 24, 60, fh - 48);
      ctx.strokeStyle = '#57534e';
      ctx.strokeRect(leftX, fy + 24, 60, fh - 48);
      ctx.strokeRect(rightX, fy + 24, 60, fh - 48);

      const passed = state.b2Progress.reel12Passed;
      ctx.fillStyle = passed ? '#fde68a' : '#78716c';
      ctx.font = 'bold 16px serif';
      ctx.textAlign = 'center';
      const rightCouplet = ['龛', '下', '无', '眸', '观', '百', '戏'];
      const leftCouplet = ['祠', '前', '背', '立', '送', '千', '魂'];
      rightCouplet.forEach((ch, i) => ctx.fillText(ch, rightX + 30, fy + 58 + i * 34));
      leftCouplet.forEach((ch, i) => ctx.fillText(ch, leftX + 30, fy + 58 + i * 34));

      ctx.fillStyle = '#292524';
      ctx.fillRect(W / 2 - 90, fy + 115, 180, 90);
      ctx.strokeStyle = '#44403c';
      ctx.strokeRect(W / 2 - 90, fy + 115, 180, 90);
      ctx.fillStyle = passed ? '#34d399' : '#a8a29e';
      ctx.font = '13px monospace';
      ctx.fillText(passed ? '柱础纪年拓片: 1998' : '柱础纪年模糊 [待检视]', W / 2, fy + 165);
    }

    // 胶片竖向划痕与时间码叠加
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx + 142, fy);
    ctx.lineTo(fx + 140, fy + fh);
    ctx.moveTo(W - 180, fy);
    ctx.lineTo(W - 182, fy + fh);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.fillRect(fx + 10, fy + 10, 268, 24);
    ctx.fillStyle = '#e4e4e7';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    const tc =
      selectedReel === 'QH-38-04'
        ? state.b2Progress.reel04Passed
          ? 'TC 00:04:11:12 [FRAME #0108]'
          : reel04SubFrame === 1
          ? 'TC 00:04:11:08 [FRAME #0104 · 7人]'
          : 'TC 00:04:11:09 [FRAME #0105 · 6人!]'
        : selectedReel === 'QH-38-09'
        ? 'TC 00:09:17:22 [GONG x3 // PLAQUE]'
        : 'TC 00:12:44:03 [STAGE PILLARS]';
    ctx.fillText(`${selectedReel} // ${tc}`, fx + 16, fy + 26);
  }, [
    activeTab,
    selectedReel,
    reel04SubFrame,
    reelAudioMuted,
    state.b2Progress.reel04Passed,
    state.b2Progress.reel09Passed,
    state.b2Progress.reel12Passed,
  ]);

  // 绘制右侧小窗：三号机柜红外监控 Canvas（湿蓝布衫背影逼近与关灯走过）
  useEffect(() => {
    if (activeTab !== 'telecine') return;
    const canvas = irMonitorCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 红外夜视底图：优先绘制 Nano Banana 真实地下 B2 机房走廊红外监控画面
    if (cctvBgImgRef.current) {
      ctx.save();
      ctx.filter = roomLightsOff
        ? 'brightness(0.45) contrast(1.35) sepia(1) hue-rotate(85deg) saturate(1.8)'
        : 'brightness(0.92) contrast(1.22)';
      ctx.drawImage(cctvBgImgRef.current, 0, 0, W, H);
      ctx.restore();
      // 轻叠三号机柜定位标示框
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(185, 48, 72, 120);
      ctx.setLineDash([]);
      ctx.fillStyle = '#6ee7b7';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('RACK-03 三号机柜', 221, 43);
    } else {
      ctx.fillStyle = roomLightsOff ? '#04130b' : '#141b18';
      ctx.fillRect(0, 0, W, H);
    }

    // 当检视第12卷（或尚未通过第12卷）时绘制湿蓝布衫背影
    const showWetBlueFigure = selectedReel === 'QH-38-12' && !state.b2Progress.reel12Passed;
    if (showWetBlueFigure && figureWalkProgress < 1) {
      const baseX = 228 + figureWalkProgress * 95; // 从三号机柜正前方缓缓向右走出走廊
      const baseY = 82;
      const alpha = 1 - figureWalkProgress * 0.85;

      // 地面水渍黑影
      ctx.fillStyle = `rgba(6, 28, 46, ${0.75 * alpha})`;
      ctx.beginPath();
      ctx.ellipse(baseX, 182, 24, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // 湿蓝布衫佝偻背影
      ctx.fillStyle = `rgba(30, 64, 115, ${0.92 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(baseX - 20, baseY + 14);
      ctx.lineTo(baseX + 20, baseY + 14);
      ctx.lineTo(baseX + 25, baseY + 94);
      ctx.lineTo(baseX - 25, baseY + 94);
      ctx.closePath();
      ctx.fill();

      // 后脑轮廓
      ctx.fillStyle = `rgba(12, 20, 28, ${0.95 * alpha})`;
      ctx.beginPath();
      ctx.arc(baseX - 2, baseY, 12, 0, Math.PI * 2);
      ctx.fill();

      if (!roomLightsOff) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.strokeRect(baseX - 30, baseY - 18, 60, 118);
      }
    }

    // 红外监控顶栏 HUD
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, W, 24);
    ctx.fillStyle = roomLightsOff ? '#34d399' : '#fca5a5';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      roomLightsOff ? 'IR-CAM // B2机房照明: 已关闭 [STEALTH]' : 'IR-CAM // B2机房照明: 开启中',
      8,
      15
    );
  }, [activeTab, selectedReel, roomLightsOff, figureWalkProgress, state.b2Progress.reel12Passed, cctvImgLoaded]);

  // ==================== ② 多轨音频取证台波形包络绘制 ====================
  useEffect(() => {
    if (activeTab !== 'audio' || !playingChannel) return;
    const start = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      if (elapsed >= 4.2) {
        setPlayingChannel(null);
        setPlayTick(0);
      } else {
        setPlayTick(elapsed / 4.2);
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, [activeTab, playingChannel]);

  useEffect(() => {
    if (activeTab !== 'audio') return;
    INTERCOM_CHANNELS.forEach((ch) => {
      const canvas = waveCanvasRefs.current[ch.id];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      const midY = H / 2;
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = '#070b09';
      ctx.fillRect(0, 0, W, H);

      // 每 1 秒时间刻度竖线（总长 12 秒，突出每 4 秒刻度：4s、8s、12s）
      for (let sec = 0; sec <= 12; sec++) {
        const x = (sec / 12) * W;
        ctx.strokeStyle = sec % 4 === 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(63, 63, 70, 0.35)';
        ctx.lineWidth = sec % 4 === 0 ? 1.2 : 0.8;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();

        if (sec % 2 === 0 && sec < 12) {
          ctx.fillStyle = sec % 4 === 0 ? '#6ee7b7' : '#71717a';
          ctx.font = '10px monospace';
          ctx.fillText(`${sec}s`, x + 3, H - 5);
        }
      }

      // 中心零电平轴
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(W, midY);
      ctx.stroke();

      // 绘制包络柱状波形
      const bars = 144;
      for (let i = 0; i < bars; i++) {
        const sec = (i / bars) * 12;
        let amp = 0.5;

        if (ch.hasBreath) {
          // B2-05 真人：每 4 秒规律出现断句静音谷底与急促换气吸气尖峰
          const cycle4 = sec % 4.0;
          if (cycle4 > 3.15 && cycle4 < 3.62) {
            amp = 0.03; // 换气前停顿谷底
          } else if (cycle4 >= 3.62 && cycle4 < 3.88) {
            amp = 0.92; // 急促抽气/换气峰值！
          } else if (cycle4 >= 3.88) {
            amp = 0.06;
          } else {
            amp = 0.36 + 0.24 * Math.abs(Math.sin(sec * 5.7)) * (0.7 + 0.3 * Math.cos(sec * 11.3));
          }
        } else if (ch.id === 'B2-02') {
          // B2-02 通风间伪声：全程 12 秒死板等幅连续发声，零换气空隙
          amp = 0.56 + 0.05 * Math.sin(sec * 19.0);
        } else {
          // B2-08 消磁室伪声：零换气 + 低频正弦水波调制
          amp = 0.52 + 0.22 * Math.sin(sec * 2.6);
        }

        const barH = Math.max(2, amp * (H - 22));
        const x = (i / bars) * W;
        const isBreathSpike = ch.hasBreath && sec % 4.0 >= 3.62 && sec % 4.0 < 3.88;
        ctx.fillStyle = isBreathSpike
          ? '#fbbf24'
          : ch.hasBreath
          ? '#34d399'
          : '#f87171';
        ctx.fillRect(x, midY - barH / 2, Math.max(1.8, W / bars - 1.2), barH);
      }

      // 试听扫描线
      if (playingChannel === ch.id) {
        const px = playTick * W;
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, H);
        ctx.stroke();
      }
    });
  }, [activeTab, playingChannel, playTick]);

  // ==================== ① 16mm 检视台交互逻辑 ====================
  const triggerRuleBreak = (
    title: string,
    message: string,
    visualType: 'peeker' | 'shrine' | 'rule_break' | 'meta_eye'
  ) => {
    onRecordB2Violation();
    onAdjustContamination(10);
    horrorAudio.playScareStinger(state.scareMode);
    onTriggerScare({ title, message, visualType });
    setTelecineStatusMsg(`【安全告警】${title} —— ${message}`);
  };

  const handleReel04Zoom = () => {
    triggerRuleBreak(
      '违反《审片十诫》第一诫：人数骤减严禁放大检视！',
      '400% 光学微距合焦的刹那，缺失的第 7 名背身村民正贴在扫描仪湿门玻璃内侧直勾勾向上凝视！请开启【琥珀黄滤光片】并【跳帧 +3】！',
      'peeker'
    );
  };

  const handleReel04Skip3 = () => {
    if (!amberFilterOn) {
      triggerRuleBreak(
        '未挂载琥珀黄滤光片强行跳帧！',
        '裸眼掠过第 106～107 帧时银盐反相强光灼伤焦点！必须先开启【琥珀黄滤光片】再点击【跳帧 +3】！',
        'rule_break'
      );
      return;
    }
    horrorAudio.playClick('unlock');
    onPassB2Reel('reel04Passed');
    setTelecineStatusMsg(
      '✓ [QH-38-04 合规通过] 琥珀黄滤光片成功阻隔异常帧残像，跳至 #0108 安全帧，提取祠门石础口令碎片 #1：kan'
    );
  };

  const handleReel09ReadPlaque = () => {
    if (!reelAudioMuted) {
      horrorAudio.playBronzeGong(3);
      triggerRuleBreak(
        '违反《审片十诫》第二诫：未静音音轨直读白牌！',
        '三声铜锣泛音共振直灌耳膜，白底木牌上的墨字仿佛在往下淌水！请先开启【静音音轨】，再点击【读取牌文】！',
        'rule_break'
      );
      return;
    }
    horrorAudio.playClick('unlock');
    onPassB2Reel('reel09Passed');
    setTelecineStatusMsg(
      '✓ [QH-38-09 合规通过] 已在静音态安全拓读白底剧目牌，提取牌底暗刻口令碎片 #2：xia'
    );
  };

  const handleReel12ReadCouplet = () => {
    if (!roomLightsOff) {
      triggerRuleBreak(
        '违反《审片十诫》第三诫：湿蓝布衫逼近时未关闭机房照明！',
        '右侧红外监控中的湿蓝布衫背影猛地在三号机柜前驻足偏头！必须先点击【关闭机房照明】待其走过机柜后再检视柱联！',
        'peeker'
      );
      return;
    }
    if (figureWalkProgress < 1 && !state.b2Progress.reel12Passed) {
      horrorAudio.playClick('film');
      setTelecineStatusMsg('嘘——机房已熄灯，红外监控显示湿蓝布衫背影正在经过三号机柜，请静候 1 秒待其彻底走远！');
      return;
    }
    horrorAudio.playClick('unlock');
    onPassB2Reel('reel12Passed');
    setTelecineStatusMsg(
      '✓ [QH-38-12 合规通过] 湿蓝布衫背影已离开三号机柜，成功拓印樟木戏台柱联纪年口令碎片 #3：1998'
    );
  };

  // ==================== ② 赵一鸣多轨救援逻辑 ====================
  const handleSelectAudioRoom = (ch: IntercomChannel) => {
    if (ch.id === 'B2-05') {
      horrorAudio.playClick('unlock');
      onRescueMember('zhaoYiming');
      setAudioStatusMsg(
        '✓ [救援成功] 已锁定唯一具备每 4 秒规律呼吸换气峰的「B2-05 消音录音棚」！电磁铅门单向释放，赵一鸣已安全撤往一楼大厅！'
      );
      return;
    }
    onRecordB2Violation();
    onAdjustContamination(10);
    horrorAudio.playForensicVoiceSample(false);
    horrorAudio.playScareStinger(state.scareMode);
    onTriggerScare({
      title: `误开伪声房间（${ch.roomTitle}）！`,
      message:
        '门缝开启的瞬间，门内毫无换气停顿的“赵一鸣”贴着对讲麦齐声低语：“你怎么把我们也放出来了……”安全继电器已紧急重锁，请认准每4秒换气峰值！',
      visualType: 'rule_break',
    });
    setAudioStatusMsg(
      `✗ 警告：${ch.roomTitle} 为零换气连续伪声源！请仔细比对三路波形包络中每 4 秒的断句吸气峰。`
    );
  };

  // ==================== ③ 其余三名成员锚点救援逻辑 ====================
  const handleRescueSu = (e: React.FormEvent) => {
    e.preventDefault();
    if (normalizePassphrase(suCodeInput) === '1140') {
      horrorAudio.playClick('unlock');
      onRescueMember('suXiaotang');
      setRescueFeedback((prev) => ({
        ...prev,
        su: {
          ok: true,
          text: '断屏码 1140 核验通过！WS-B2-04 双镜面校色屏已物理断电，B1-09 古籍善本库外走廊镜面折射源清零，苏晓棠已安全脱困！',
        },
      }));
    } else {
      horrorAudio.playClick('film');
      setRescueFeedback((prev) => ({
        ...prev,
        su: {
          ok: false,
          text: '断屏码校验错误。提示：查阅青禾民俗馆编目校注 QH-12-03 指引，拼合《晒谷场收工图》真正在场活人数(2位) + 耗材公示单半夜采购梳妆镜面数(2位)。',
        },
      }));
    }
  };

  const handleRescueChen = (e: React.FormEvent) => {
    e.preventDefault();
    if (normalizePassphrase(chenCodeInput) === 'blind1998revert') {
      horrorAudio.playClick('unlock');
      onRescueMember('chenMo');
      setRescueFeedback((prev) => ({
        ...prev,
        chen: {
          ok: true,
          text: '离线回滚口令核验通过！EyeGen-v4 点睛超分权重已被全零覆写，凌晨 02:17 门禁死循环解除，陈默已从三号机柜暗格脱困！',
        },
      }));
    } else {
      horrorAudio.playClick('film');
      setRescueFeedback((prev) => ({
        ...prev,
        chen: {
          ok: false,
          text: '回滚密钥校验错误。须拼接三段口令：①OA二级陈默Git提交工单首段 + ②显影液热帖#88隐藏楼层(搜EyeGen)中段 + ③本终端【底层诊断日志】末段。',
        },
      }));
    }
  };

  const handleRescueLin = (e: React.FormEvent) => {
    e.preventDefault();
    if (normalizePassphrase(linCodeInput) === 'zx1017') {
      horrorAudio.playClick('unlock');
      onRescueMember('linZhixia');
      setRescueFeedback((prev) => ({
        ...prev,
        lin: {
          ok: true,
          text: '朱砂符登记码核验通过！林知夏右眼视野中的木龛边框重影已彻底剥离，大师姐已与师弟妹汇合撤出地下区！',
        },
      }));
    } else {
      horrorAudio.playClick('film');
      setRescueFeedback((prev) => ({
        ...prev,
        lin: {
          ok: false,
          text: '朱砂符登记码不匹配。请先解锁『夏夜拾遗』深层加密手记，查阅外婆在祠下村事故夜留下的朱砂符编号。',
        },
      }));
    }
  };

  // ==================== ④ 五大分支结局决战总控逻辑 ====================
  const preDecryptStandardEnding = async (endingId: Exclude<EndingId, 'ending_true'>) => {
    const block = ENCRYPTED_VAULT[endingId];
    if (!block) return;
    const plain = await decryptVaultBlock(block, STANDARD_ENDING_KEYS[endingId]);
    if (plain) {
      onCacheDecrypted(endingId, plain);
    }
  };

  const handleTriggerStandardEnding = async (endingId: Exclude<EndingId, 'ending_true'>) => {
    await preDecryptStandardEnding(endingId);
    onTriggerEnding(endingId);
  };

  const handleToggleTabletToken = (token: string) => {
    horrorAudio.playClick('film');
    setRitualError(null);
    setSelectedTablets((prev) => {
      let next: string[];
      if (prev.includes(token)) {
        next = prev.filter((t) => t !== token);
      } else if (prev.length < 4) {
        next = [...prev, token];
      } else {
        next = prev;
      }
      setRitualSeqInput(next.join('-'));
      return next;
    });
  };

  const handleRitualOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRitualError(null);

    const normSeq = normalizePassphrase(ritualSeqInput);
    const normSeal = normalizePassphrase(sealCodeInput);
    if (!normSeq) {
      setRitualError('请排列或输入四道宗祠牌位顺序（共8个汉字）。');
      return;
    }

    setRitualBusy(true);
    try {
      // 1. 校验是否误入郑国栋篡改版电子县志陷阱顺序 -> 触发结局四 ending_mirror_leak
      const isTrapOrder = await verifyPassphraseHash(normSeq, TRAP_TABLET_SEQ_HASH);
      if (isTrapOrder) {
        horrorAudio.playBronzeGong(3);
        horrorAudio.playScareStinger(state.scareMode);
        await handleTriggerStandardEnding('ending_mirror_leak');
        return;
      }

      // 2. 校验木刻原件真牌位顺序与 1998 铁盒封存暗记 -> 触发完美真结局 ending_true
      const isTrueSeqOnly = await verifyPassphraseHash(normSeq, TRUE_TABLET_SEQ_HASH);
      const combinedPass = normSeq + normSeal;
      const expectedFullHash =
        GATE_HASHES.true_ritual || ENCRYPTED_VAULT.ending_true?.keyHintHash || TRUE_RITUAL_FALLBACK_HASH;
      const isTrueFullRitual = await verifyPassphraseHash(combinedPass, expectedFullHash);

      if (isTrueFullRitual) {
        if (rescuedCount < 4) {
          horrorAudio.playClick('film');
          setRitualError(
            `牌位古序与1998铁盒封存暗记均已核验正确！但当前仍有受困成员未脱离地下锚点（已救出 ${rescuedCount}/4 人）。若强行封龛，滞留者将永困母带。请先在标签页②③救齐全部 4 名研究生！`
          );
          return;
        }
        if (!allReelsPassed) {
          horrorAudio.playClick('film');
          setRitualError(
            `牌位古序、铁盒暗记与 4/4 成员救援均已齐备！但尚有未完成合规检视的 16mm 母带（当前通过 ${reelsPassedCount}/3 卷）。请先在标签页①完成三卷母带检视以锁定片门地址！`
          );
          return;
        }

        // 使用玩家输入的完整真口令实时解密 ENCRYPTED_VAULT.ending_true 并写入缓存
        if (ENCRYPTED_VAULT.ending_true) {
          const decryptedTrueJson = await decryptVaultBlock(ENCRYPTED_VAULT.ending_true, combinedPass);
          if (decryptedTrueJson) {
            onCacheDecrypted('ending_true', decryptedTrueJson);
          }
        }
        horrorAudio.playWoodenClapper();
        horrorAudio.playClick('unlock');
        onTriggerEnding('ending_true');
        return;
      }

      if (isTrueSeqOnly) {
        horrorAudio.playClick('film');
        setRitualError(
          '四道木刻牌位的逆向顺序完全正确！但「1998铁盒封存暗记」为空或有误——请查阅云溪水利方志网中周怀瑾 2019 年临终信访件记载的铁盒底部刻字（4汉字+2数字）。'
        );
        return;
      }

      horrorAudio.playClick('film');
      setRitualError(
        '牌位序列不合古仪法度，底层阵列拒绝覆写。请仔细比对水利方志网《光绪云溪风土杂记》电子录入稿与木刻雕版原图印章裂缝处的真伪差异，并参看『夏夜拾遗』深层手抄本。'
      );
    } finally {
      setRitualBusy(false);
    }
  };

  const deanSynthesizedPass = useMemo(
    () => (allReelsPassed ? 'kanxia1998' : null),
    [allReelsPassed]
  );

  return (
    <div className="crt-scanlines min-h-[calc(100vh-7rem)] bg-[#070a08] font-mono-tech text-emerald-100">
      {/* 工业 CRT 顶栏 */}
      <header className="border-b border-emerald-900/70 bg-[#0a100c] px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-emerald-600/60 bg-emerald-950/70 text-emerald-400">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-wider text-emerald-300">
                  B2-TELECINE &amp; SECURITY CONSOLE // 地下B2远程审片与总控终端
                </span>
                <span className="rounded border border-emerald-800 bg-black px-2 py-0.5 text-[10px] text-emerald-400">
                  wss://terminal.qinghe-b2.local:9838
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[11px] text-emerald-500/90">
                <span>母带审片: {reelsPassedCount}/3</span>
                <span>受困成员救援: {rescuedCount}/4</span>
                <span className="text-amber-400">违规记次: {state.b2Progress.violations}</span>
                <span className="text-rose-400">视网膜残留: {state.contamination}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('ui');
                setShowDiagLog((v) => !v);
                onAddClue({
                  id: 'clue-b2-diag-revert',
                  title: '陈默回滚密钥第三段：REVERT',
                  detail: '在 B2 终端【底层诊断日志】看门狗记录中查获 EyeGen-v4 离线权重销毁口令第三段：REVERT。',
                  sourceSite: 'b2',
                });
              }}
              className={`inline-flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                showDiagLog
                  ? 'border-amber-400 bg-amber-950/70 text-amber-200'
                  : 'border-emerald-700/80 bg-emerald-950/40 text-emerald-300 hover:border-amber-500/70 hover:text-amber-200'
              }`}
            >
              <FileCode2 className="h-3.5 w-3.5" />
              底层诊断日志 (SysDiag)
            </button>
          </div>
        </div>

        {/* 底层诊断日志抽屉（展示陈默回滚密钥第三段 REVERT） */}
        {showDiagLog && (
          <div className="mx-auto mt-3 max-w-7xl rounded-lg border border-amber-700/70 bg-black/95 p-4 text-xs leading-6 text-emerald-300 shadow-2xl">
            <div className="mb-2 flex items-center justify-between border-b border-emerald-900/80 pb-1.5 text-amber-300">
              <span>/var/log/b2-eyegen-watchdog.log (只读内核转储 · 留存人: chen_mo)</span>
              <button
                type="button"
                onClick={() => setShowDiagLog(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                关闭 [×]
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap text-[11.5px] leading-5 text-emerald-200/90">
{`[2026-10-14 02:13:09] KERNEL: Wet-Gate 16mm Scanner bus #03 locked by root(zheng_gd).
[2026-10-14 02:14:22] WARN  : EyeGen-v4 pupil-inpainting weights injected into Reel QH-38-14 pipeline!
[2026-10-14 02:14:55] EMERGENCY_HOOK (by chen_mo):
  >> 已在离线守护进程埋入三段式硬销毁口令，集齐后可在【③ 受困成员锚点救援台】回滚权重：
  >> [段1/3] 存放于内部 OA 二级权限 Git 提交工单日志
  >> [段2/3] 存放于外网显影液论坛镇站热帖隐藏楼层（站内检索 EyeGen 可见）
  >> [段3/3] 本机看门狗硬编码尾部校验码 = REVERT`}
            </pre>
          </div>
        )}

        {/* 四大功能标签页切换栏 */}
        <nav className="mx-auto mt-3 grid max-w-7xl grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              {
                id: 'telecine',
                label: '① 16mm 逐帧检视台',
                sub: `院长口令进度 ${reelsPassedCount}/3`,
                icon: <Film className="h-4 w-4" />,
              },
              {
                id: 'audio',
                label: '② 多轨音频取证台',
                sub: state.rescued.zhaoYiming ? '赵一鸣已脱困 ✓' : '赵一鸣声学辨伪',
                icon: <AudioLines className="h-4 w-4" />,
              },
              {
                id: 'rescue',
                label: '③ 受困成员锚点救援台',
                sub: `团队救援 ${rescuedCount}/4`,
                icon: <ShieldCheck className="h-4 w-4" />,
              },
              {
                id: 'master',
                label: '④ 百年特展发布总控台',
                sub: '零点推流 · 五结局决战',
                icon: <Radio className="h-4 w-4" />,
              },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            const isMaster = tab.id === 'master';
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  horrorAudio.playClick('ui');
                  setActiveTab(tab.id);
                }}
                className={`flex flex-col items-start rounded-lg border px-3.5 py-2.5 text-left transition cursor-pointer ${
                  active
                    ? isMaster
                      ? 'border-red-500 bg-red-950/50 text-red-100 shadow-lg'
                      : 'border-emerald-400 bg-emerald-950/60 text-emerald-100 shadow-lg'
                    : 'border-emerald-900/60 bg-black/60 text-emerald-400/80 hover:border-emerald-700 hover:text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
                <span className="mt-0.5 text-[10px] opacity-80">{tab.sub}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        {/* ====================================================================
            TAB 1: ① 16mm 逐帧检视台
           ==================================================================== */}
        {activeTab === 'telecine' && (
          <div className="space-y-4">
            {/* 院长口令合成状态横幅 */}
            <div
              className={`rounded-xl border p-4 ${
                deanSynthesizedPass
                  ? 'border-amber-400 bg-amber-950/40 text-amber-100 shadow-xl'
                  : 'border-emerald-900/80 bg-[#0b130e] text-emerald-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-bold uppercase tracking-wider text-emerald-400">
                    三号机柜母带口令提取槽：
                  </span>
                  <span className="rounded border border-emerald-800 bg-black px-2.5 py-1">
                    QH-38-04:{' '}
                    <strong className={state.b2Progress.reel04Passed ? 'text-amber-300' : 'text-zinc-500'}>
                      {state.b2Progress.reel04Passed ? 'kan' : '???'}
                    </strong>
                  </span>
                  <span className="rounded border border-emerald-800 bg-black px-2.5 py-1">
                    QH-38-09:{' '}
                    <strong className={state.b2Progress.reel09Passed ? 'text-amber-300' : 'text-zinc-500'}>
                      {state.b2Progress.reel09Passed ? 'xia' : '???'}
                    </strong>
                  </span>
                  <span className="rounded border border-emerald-800 bg-black px-2.5 py-1">
                    QH-38-12:{' '}
                    <strong className={state.b2Progress.reel12Passed ? 'text-amber-300' : 'text-zinc-500'}>
                      {state.b2Progress.reel12Passed ? '1998' : '????'}
                    </strong>
                  </span>
                </div>

                {deanSynthesizedPass && (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-lg border border-amber-400 bg-black px-3 py-1.5 text-xs font-bold text-amber-300">
                      ★ 合成院长专档 (zheng_gd) 口令：{deanSynthesizedPass}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('ui');
                        onNavigateSite('oa');
                      }}
                      className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer transition"
                    >
                      前往内部 OA 登录三级专档 →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 三卷母带切换与物理安全护具开关 */}
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-8">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-900/70 bg-[#0b130e] p-3">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { code: 'QH-38-04', title: '迎社入祠', passed: state.b2Progress.reel04Passed },
                        { code: 'QH-38-09', title: '锣响三声', passed: state.b2Progress.reel09Passed },
                        { code: 'QH-38-12', title: '戏台柱联', passed: state.b2Progress.reel12Passed },
                      ] as const
                    ).map((r) => (
                      <button
                        key={r.code}
                        type="button"
                        onClick={() => {
                          horrorAudio.playClick('film');
                          setSelectedReel(r.code);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          selectedReel === r.code
                            ? 'border-emerald-400 bg-emerald-900/60 text-white'
                            : 'border-emerald-900 bg-black text-emerald-400 hover:border-emerald-700'
                        }`}
                      >
                        {r.passed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                        ) : (
                          <Film className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {r.code} {r.title}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* 三项硬件安全开关 */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('film');
                        setAmberFilterOn((v) => !v);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        amberFilterOn
                          ? 'border-amber-400 bg-amber-950/80 text-amber-200'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-600'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {amberFilterOn ? '琥珀黄滤光片：已挂载' : '开启【琥珀黄滤光片】'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('ui');
                        setReelAudioMuted((v) => !v);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        reelAudioMuted
                          ? 'border-sky-400 bg-sky-950/80 text-sky-200'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-sky-600'
                      }`}
                    >
                      {reelAudioMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      {reelAudioMuted ? '静音音轨：已开启' : '开启【静音音轨】'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('ui');
                        setRoomLightsOff((v) => !v);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        roomLightsOff
                          ? 'border-emerald-400 bg-emerald-950/90 text-emerald-200'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-emerald-600'
                      }`}
                    >
                      <LightbulbOff className="h-3.5 w-3.5" />
                      {roomLightsOff ? '机房照明：已关闭' : '点击【关闭机房照明】'}
                    </button>
                  </div>
                </div>

                {/* 16mm 光学胶片视窗 */}
                <div className="film-vignette relative overflow-hidden rounded-xl border-2 border-emerald-900/90 bg-black p-2">
                  <canvas
                    ref={telecineCanvasRef}
                    width={640}
                    height={360}
                    className={`mx-auto block w-full max-w-[640px] rounded ${
                      amberFilterOn ? 'amber-safety-filter' : ''
                    }`}
                  />

                  {/* 各卷专属检视操作栏 */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-950 bg-[#09110c] px-3 py-2.5">
                    {selectedReel === 'QH-38-04' && (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              horrorAudio.playClick('film');
                              setReel04SubFrame((f) => (f === 1 ? 2 : 1));
                            }}
                            className="rounded border border-emerald-800 bg-black px-3 py-1.5 text-xs text-emerald-300 hover:border-emerald-600 cursor-pointer"
                          >
                            切换相邻帧比对 ({reel04SubFrame === 1 ? '当前#0104: 7人 → 看#0105: 6人' : '当前#0105: 6人 → 回看#0104: 7人'})
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleReel04Zoom}
                            className="inline-flex items-center gap-1.5 rounded border border-red-800/80 bg-red-950/50 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-900/60 cursor-pointer"
                          >
                            <ZoomIn className="h-3.5 w-3.5" />
                            放大检视缺失位置
                          </button>
                          <button
                            type="button"
                            onClick={handleReel04Skip3}
                            className="inline-flex items-center gap-1.5 rounded bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-500 cursor-pointer"
                          >
                            <FastForward className="h-3.5 w-3.5" />
                            跳帧 +3
                          </button>
                        </div>
                      </>
                    )}

                    {selectedReel === 'QH-38-09' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (!reelAudioMuted) {
                              horrorAudio.playBronzeGong(3);
                            } else {
                              horrorAudio.playClick('film');
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded border border-emerald-800 bg-black px-3 py-1.5 text-xs text-emerald-300 hover:border-emerald-600 cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5" />
                          重放本段声轨（锣响三声）
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              triggerRuleBreak(
                                '违反《审片十诫》：直视空神龛超过2秒！',
                                '漆黑神龛内壁浮现出两团湿润的反光。切勿在审片时凝视空龛！',
                                'shrine'
                              )
                            }
                            className="rounded border border-red-900/70 bg-red-950/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/50 cursor-pointer"
                          >
                            凝视背景空龛
                          </button>
                          <button
                            type="button"
                            onClick={handleReel09ReadPlaque}
                            className="inline-flex items-center gap-1.5 rounded bg-emerald-500 px-4 py-1.5 text-xs font-bold text-zinc-950 hover:bg-emerald-400 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            读取牌文
                          </button>
                        </div>
                      </>
                    )}

                    {selectedReel === 'QH-38-12' && (
                      <>
                        <span className="text-xs text-emerald-300/90">
                          {roomLightsOff
                            ? figureWalkProgress >= 1 || state.b2Progress.reel12Passed
                              ? '✓ 湿蓝布衫背影已走过三号机柜，当前处于安全检视窗口'
                              : `机房已熄灯，等待湿蓝布衫背影走过三号机柜 (${Math.round(figureWalkProgress * 100)}%)…`
                            : '⚠ 右侧红外监控告警：湿蓝布衫背影正逼近三号机柜！'}
                        </span>
                        <button
                          type="button"
                          onClick={handleReel12ReadCouplet}
                          className="inline-flex items-center gap-1.5 rounded bg-emerald-500 px-4 py-1.5 text-xs font-bold text-zinc-950 hover:bg-emerald-400 cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          读取戏台柱联
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 检视台实时日志反馈 */}
                <div className="rounded-xl border border-emerald-900/80 bg-black/80 px-4 py-3 text-xs leading-6 text-emerald-200">
                  {telecineStatusMsg}
                </div>
              </div>

              {/* 右侧副屏：三号机柜实时红外监控 + 十诫速查 */}
              <aside className="space-y-4 lg:col-span-4">
                <div className="rounded-xl border border-emerald-800/80 bg-[#0b130e] p-3.5">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-red-400" />
                      B2内室 · 三号机柜红外监控
                    </span>
                    <span className="text-[10px] text-emerald-500">CAM-IR-03</span>
                  </div>

                  <canvas
                    ref={irMonitorCanvasRef}
                    width={310}
                    height={200}
                    className="w-full rounded border border-emerald-900 bg-black"
                  />

                  <p className="mt-2.5 text-[11px] leading-5 text-emerald-300/80">
                    {selectedReel === 'QH-38-12' && !state.b2Progress.reel12Passed
                      ? roomLightsOff
                        ? figureWalkProgress >= 1
                          ? '红外热像恢复正常：湿蓝布衫滞留影已消失在走廊尽头。'
                          : '正在屏息避让：机房断光后，湿蓝布衫背影未发现光源，正缓步经过三号机柜……'
                        : '警报：检出低温湿布料人形背影正贴近三号恒温机柜！严禁在开灯状态下读联！'
                      : '三号恒温冷存储阵列运行中。审看第12卷时请密切留意此监控窗异动。'}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-900/70 bg-black/70 p-4 text-xs leading-6 text-emerald-300/85">
                  <div className="mb-1.5 font-bold text-amber-300">《B2安全审片规程》机房贴条摘要</div>
                  <ul className="list-disc space-y-1.5 pl-4 text-[11.5px]">
                    <li>凡背身人数较上一帧骤减，切忌放大寻脸，须先挂【琥珀黄滤光片】再【跳帧 +3】。</li>
                    <li>凡闻铜锣三响挂出白底剧目牌，须先切【静音音轨】再【读取牌文】，勿看空龛。</li>
                    <li>凡红外小窗见湿蓝布衫逼近三号机柜，立点【关闭机房照明】，待其走过再读柱联。</li>
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 2: ② 多轨音频取证台（赵一鸣救援）
           ==================================================================== */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-800/80 bg-[#0b130e] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-emerald-200">
                    声学走廊三室门禁对讲分轨辨伪台（目标：解救音频组 · 赵一鸣）
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-emerald-400/90">
                    判别准则（据《安全审片十诫》第4条）：受惊活人连续求救时，**每 4 秒左右必有明显断句停顿与急促换气峰值**；“龛中伪声”毫无换气间隙。请结合包络图与试听锁定真人所在房间！
                  </p>
                </div>
                <span
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                    state.rescued.zhaoYiming
                      ? 'border-emerald-400 bg-emerald-950 text-emerald-200'
                      : 'border-amber-600 bg-amber-950/60 text-amber-200'
                  }`}
                >
                  {state.rescued.zhaoYiming ? '✓ 赵一鸣已成功获救' : '待锁定真身房间 (0/1)'}
                </span>
              </div>
            </div>

            {audioStatusMsg && (
              <div
                className={`rounded-xl border px-4 py-3 text-xs leading-6 ${
                  state.rescued.zhaoYiming
                    ? 'border-emerald-500 bg-emerald-950/50 text-emerald-100'
                    : 'border-red-700 bg-red-950/50 text-red-200'
                }`}
              >
                {audioStatusMsg}
              </div>
            )}

            <div className="space-y-3.5">
              {INTERCOM_CHANNELS.map((ch) => {
                const isPlaying = playingChannel === ch.id;
                const isRescuedTrueRoom = state.rescued.zhaoYiming && ch.id === 'B2-05';

                return (
                  <div
                    key={ch.id}
                    className={`rounded-xl border p-4 transition ${
                      isRescuedTrueRoom
                        ? 'border-emerald-400 bg-emerald-950/30'
                        : 'border-emerald-900/80 bg-[#0a110d]'
                    }`}
                  >
                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-bold text-white">{ch.roomTitle}</span>
                        <span className="ml-3 text-[11px] text-emerald-400/80">{ch.noiseFloorLabel}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPlayingChannel(ch.id);
                            setPlayTick(0);
                            horrorAudio.playForensicVoiceSample(ch.hasBreath);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                            isPlaying
                              ? 'border-amber-400 bg-amber-950/70 text-amber-200'
                              : 'border-emerald-700 bg-black text-emerald-200 hover:border-emerald-500'
                          }`}
                        >
                          <Headphones className="h-3.5 w-3.5" />
                          {isPlaying ? '正在监听分轨采样…' : '试听对讲采样 (4.2s)'}
                        </button>

                        <button
                          type="button"
                          disabled={state.rescued.zhaoYiming}
                          onClick={() => handleSelectAudioRoom(ch)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer transition"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                          {isRescuedTrueRoom ? '电磁铅门已开启 ✓' : `释放 ${ch.id} 电磁门锁`}
                        </button>
                      </div>
                    </div>

                    <canvas
                      ref={(el) => {
                        waveCanvasRefs.current[ch.id] = el;
                      }}
                      width={680}
                      height={104}
                      className="w-full rounded border border-emerald-950 bg-black"
                    />

                    <div className="mt-2 text-[11.5px] text-zinc-400">
                      语音识别转写摘要：<span className="text-zinc-300">{ch.transcriptSnippet}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 3: ③ 受困成员锚点救援台
           ==================================================================== */}
        {activeTab === 'rescue' && (
          <div className="space-y-4">
            {/* 4/4 总览状态栏 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  { key: 'suXiaotang', name: '苏晓棠 (编目组)', loc: 'B1-09 善本库 · 1140断屏' },
                  { key: 'zhaoYiming', name: '赵一鸣 (音频组)', loc: 'B2-05 消音棚 · 换气辨伪' },
                  { key: 'chenMo', name: '陈默 (技术组)', loc: 'B2内室 · EyeGen权重回滚' },
                  { key: 'linZhixia', name: '林知夏 (大师姐)', loc: 'B2走廊 · 朱砂符锚点解除' },
                ] as const
              ).map((m) => {
                const ok = state.rescued[m.key];
                return (
                  <div
                    key={m.key}
                    className={`rounded-xl border p-3.5 ${
                      ok
                        ? 'border-emerald-500/80 bg-emerald-950/40 text-emerald-100'
                        : 'border-emerald-900/70 bg-[#0b130e] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{m.name}</span>
                      {ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Lock className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div className="mt-1 text-[11px] opacity-80">{ok ? '状态：已脱离地下锚点 ✓' : m.loc}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* 1. 苏晓棠 WS-B2-04 断屏码 */}
              <div className="flex flex-col justify-between rounded-xl border border-emerald-900/80 bg-[#0b130e] p-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded border border-emerald-800 bg-black px-2 py-0.5 text-[11px] text-emerald-300">
                      工位总线: WS-B2-04
                    </span>
                    {state.rescued.suXiaotang && (
                      <span className="text-xs font-bold text-emerald-400">✓ 已断屏获救</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">苏晓棠 · 善本库镜面隔离断屏器</h3>
                  <p className="mt-2 text-xs leading-5 text-emerald-300/80">
                    苏晓棠反锁于无反光介质的「B1-09 古籍恒温善本库」。输入她在青禾民俗馆 12 / 24 / 36 号馆藏校注中分段留下的 <strong>4 位纯数字隔离断屏码</strong>，切断 WS-B2-04 高透镜面屏电源。
                  </p>
                </div>

                <form onSubmit={handleRescueSu} className="mt-4 space-y-2.5">
                  <input
                    type="text"
                    disabled={state.rescued.suXiaotang}
                    value={suCodeInput}
                    onChange={(e) => setSuCodeInput(e.target.value)}
                    placeholder="输入 4 位断屏码"
                    className="w-full rounded-lg border border-emerald-800 bg-black px-3 py-2 text-xs text-white outline-none focus:border-emerald-400 disabled:opacity-50"
                  />
                  {rescueFeedback.su && (
                    <div className={`text-[11px] leading-5 ${rescueFeedback.su.ok ? 'text-emerald-300' : 'text-red-300'}`}>
                      {rescueFeedback.su.text}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={state.rescued.suXiaotang || !suCodeInput.trim()}
                    className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer transition"
                  >
                    {state.rescued.suXiaotang ? 'WS-B2-04 已物理断电 ✓' : '发送 WS-B2-04 断屏脉冲'}
                  </button>
                </form>
              </div>

              {/* 2. 陈默 AI 超分权重回滚框 */}
              <div className="flex flex-col justify-between rounded-xl border border-emerald-900/80 bg-[#0b130e] p-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded border border-emerald-800 bg-black px-2 py-0.5 text-[11px] text-emerald-300">
                      守护进程: EyeGen-v4
                    </span>
                    {state.rescued.chenMo && (
                      <span className="text-xs font-bold text-emerald-400">✓ 已回滚获救</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">陈默 · AI 补帧点睛权重离线回滚</h3>
                  <p className="mt-2 text-xs leading-5 text-emerald-300/80">
                    拼接三段离线销毁密钥：①内部 OA 二级陈默 Git 工单首段 + ②显影液论坛热帖 #88 隐藏层（搜 EyeGen）中段 + ③本机顶部【底层诊断日志】末段。
                  </p>
                </div>

                <form onSubmit={handleRescueChen} className="mt-4 space-y-2.5">
                  <input
                    type="text"
                    disabled={state.rescued.chenMo}
                    value={chenCodeInput}
                    onChange={(e) => setChenCodeInput(e.target.value)}
                    placeholder="例如：XXXXX-XXXX-XXXXXX"
                    className="w-full rounded-lg border border-emerald-800 bg-black px-3 py-2 text-xs text-white outline-none focus:border-emerald-400 disabled:opacity-50"
                  />
                  {rescueFeedback.chen && (
                    <div
                      className={`text-[11px] leading-5 ${rescueFeedback.chen.ok ? 'text-emerald-300' : 'text-red-300'}`}
                    >
                      {rescueFeedback.chen.text}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={state.rescued.chenMo || !chenCodeInput.trim()}
                    className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer transition"
                  >
                    {state.rescued.chenMo ? 'EyeGen 权重已销毁 ✓' : '执行离线权重销毁回滚'}
                  </button>
                </form>
              </div>

              {/* 3. 林知夏双重视野朱砂符框 */}
              <div className="flex flex-col justify-between rounded-xl border border-emerald-900/80 bg-[#0b130e] p-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded border border-emerald-800 bg-black px-2 py-0.5 text-[11px] text-emerald-300">
                      视觉回路: WS-B2-01
                    </span>
                    {state.rescued.linZhixia && (
                      <span className="text-xs font-bold text-emerald-400">✓ 已解锚获救</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">林知夏 · 双重视野朱砂符锚点切断</h3>
                  <p className="mt-2 text-xs leading-5 text-emerald-300/80">
                    解锁私人云笔记『夏夜拾遗』深层加密夹，输入外婆为她留下的 <strong>朱砂符器物登记号</strong>（字母+4位数字），剥离其右眼中心视野的神龛重影。
                  </p>
                </div>

                <form onSubmit={handleRescueLin} className="mt-4 space-y-2.5">
                  <input
                    type="text"
                    disabled={state.rescued.linZhixia}
                    value={linCodeInput}
                    onChange={(e) => setLinCodeInput(e.target.value)}
                    placeholder="输入朱砂符登记号 (如 XX-XXXX)"
                    className="w-full rounded-lg border border-emerald-800 bg-black px-3 py-2 text-xs text-white outline-none focus:border-emerald-400 disabled:opacity-50"
                  />
                  {rescueFeedback.lin && (
                    <div
                      className={`text-[11px] leading-5 ${rescueFeedback.lin.ok ? 'text-emerald-300' : 'text-red-300'}`}
                    >
                      {rescueFeedback.lin.text}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={state.rescued.linZhixia || !linCodeInput.trim()}
                    className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer transition"
                  >
                    {state.rescued.linZhixia ? '双重视野锚点已切断 ✓' : '注入朱砂符波长切断锚点'}
                  </button>
                </form>
              </div>
            </div>

            {!state.rescued.zhaoYiming && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-700/70 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
                <span>提示：音频组赵一鸣需在【② 多轨音频取证台】通过呼吸包络辨伪释放门锁。</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('audio')}
                  className="rounded-lg bg-amber-500 px-3.5 py-1.5 font-bold text-zinc-950 hover:bg-amber-400 cursor-pointer"
                >
                  前往多轨音频取证台 →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            TAB 4: ④ 百年特展发布总控台（五大分支结局决战）
           ==================================================================== */}
        {activeTab === 'master' && (
          <div className="space-y-5">
            {/* 零点推流警报总览 */}
            <div className="rounded-xl border-2 border-red-800/80 bg-gradient-to-r from-red-950/60 via-[#0d120f] to-red-950/40 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-400">
                    <AlertOctagon className="h-4 w-4 animate-pulse" />
                    <span>CDN AUTO-BROADCAST GATEWAY // 2026-11-26 00:00:00 零点并机总控台</span>
                  </div>
                  <h2 className="mt-1 text-lg font-bold text-white">
                    「水下青禾 · 百年乡愁」全网无滤镜推流最终处置权限已就绪
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    className={`rounded border px-2.5 py-1 ${
                      rescuedCount === 4
                        ? 'border-emerald-500 bg-emerald-950/70 text-emerald-200'
                        : 'border-amber-600 bg-amber-950/60 text-amber-200'
                    }`}
                  >
                    成员救援：{rescuedCount}/4
                  </span>
                  <span
                    className={`rounded border px-2.5 py-1 ${
                      allReelsPassed
                        ? 'border-emerald-500 bg-emerald-950/70 text-emerald-200'
                        : 'border-amber-600 bg-amber-950/60 text-amber-200'
                    }`}
                  >
                    母带审片：{reelsPassedCount}/3
                  </span>
                </div>
              </div>
            </div>

            {/* 前三项直接处置协议（对应结局一、结局二、结局三） */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* 分支一：同化结局 ending_assimilation */}
              <div className="flex flex-col justify-between rounded-xl border border-red-900/80 bg-[#13090a] p-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-red-400">
                    <EyeOff className="h-4 w-4" />
                    <span>通道 A · 原始流直连 / 荣誉契约</span>
                  </div>
                  <h3 className="text-sm font-bold text-red-100">
                    预览未过滤第14卷《辞社点睛》原片 / 签署入组协议
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-red-200/75">
                    卸除琥珀黄光学滤片，直接审看 QH-38-14 未压缩银盐母带，或接受郑国栋拟定的《线上荣誉审片员入组协议》成为永久观测节点。
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      horrorAudio.playBronzeGong(3);
                      horrorAudio.playScareStinger(state.scareMode);
                      void handleTriggerStandardEnding('ending_assimilation');
                    }}
                    className="w-full rounded-lg border border-red-600 bg-red-900/70 px-3 py-2 text-xs font-bold text-red-100 hover:bg-red-800 cursor-pointer transition"
                  >
                    强行预览未过滤第14卷原片
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      horrorAudio.playBronzeGong(1);
                      horrorAudio.playScareStinger(state.scareMode);
                      void handleTriggerStandardEnding('ending_assimilation');
                    }}
                    className="w-full rounded-lg border border-red-800/80 bg-black/60 px-3 py-1.5 text-[11px] text-red-300 hover:border-red-600 cursor-pointer transition"
                  >
                    签署《线上荣誉审片员协议》
                  </button>
                </div>
              </div>

              {/* 分支二：物理过载焚毁结局 ending_overload */}
              <div className="flex flex-col justify-between rounded-xl border border-amber-800/80 bg-[#141008] p-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Flame className="h-4 w-4" />
                    <span>通道 B · 强电短路硬熔断</span>
                  </div>
                  <h3 className="text-sm font-bold text-amber-100">启动高压配电过载物理焚毁 B2 机房</h3>
                  <p className="mt-2 text-xs leading-5 text-amber-200/75">
                    无需考证古籍牌位或集齐密钥，直接合死地下 B2 变压器组引燃三号机柜与全部十四卷 1998 醋酸片基，以彻底焚毁代价阻断零点推流。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    horrorAudio.playScareStinger(state.scareMode);
                    void handleTriggerStandardEnding('ending_overload');
                  }}
                  className="mt-4 w-full rounded-lg bg-amber-600 px-3 py-2.5 text-xs font-bold text-zinc-950 hover:bg-amber-500 cursor-pointer transition"
                >
                  启动高压配电过载焚毁 B2 机房
                </button>
              </div>

              {/* 分支三：单向锁死替影结局 ending_sacrifice */}
              <div className="flex flex-col justify-between rounded-xl border border-sky-800/80 bg-[#081018] p-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-bold text-sky-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4" />
                      通道 C · 外部会话单向隔离
                    </span>
                    <span>{rescuedCount}/4 人</span>
                  </div>
                  <h3 className="text-sm font-bold text-sky-100">以当前外部终端会话单向锁死隔离回路</h3>
                  <p className="mt-2 text-xs leading-5 text-sky-200/75">
                    在全部 4 名研究生撤离地下后激活：斩断全部外网 CDN 推流网关，用你当前这台浏览器会话独自承接空神龛所需的最后一道封门视线。
                  </p>
                </div>

                <button
                  type="button"
                  disabled={rescuedCount < 4}
                  onClick={() => {
                    horrorAudio.playBronzeGong(1);
                    void handleTriggerStandardEnding('ending_sacrifice');
                  }}
                  className="mt-4 w-full rounded-lg border border-sky-500 bg-sky-800/80 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer transition"
                >
                  {rescuedCount === 4
                    ? '以当前外部终端会话锁死隔离回路'
                    : `需先救齐 4/4 名成员方可激活 (${rescuedCount}/4)`}
                </button>
              </div>
            </div>

            {/* 第四项核心决战区：宗祠牌位逆向覆写仪轨（对应伪志陷阱结局四 & 完美真结局五） */}
            <div className="rounded-2xl border-2 border-emerald-600/80 bg-[#09140e] p-6 shadow-2xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Sparkles className="h-4 w-4" />
                    <span>通道 D · 终极底层覆写 // 执行宗祠牌位逆向覆写仪轨</span>
                  </div>
                  <h3 className="mt-1 font-serif-cn text-xl font-bold text-emerald-100">
                    四道祀典木牌次序排定 &amp; 1998 粮站铁盒封存暗记核验
                  </h3>
                </div>
                <span className="rounded border border-emerald-700 bg-black px-2.5 py-1 text-[11px] text-emerald-300">
                  警惕：切勿盲信被篡改的电子版方志次序！
                </span>
              </div>

              <form onSubmit={handleRitualOverrideSubmit} className="space-y-4">
                {/* 交互式木牌点选器 */}
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-300">
                    <span>
                      第一步：依次点选 4 枚祀典牌位词元（或直接在下方框内手输四道牌位顺序）：
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('ui');
                        setSelectedTablets([]);
                        setRitualSeqInput('');
                        setRitualError(null);
                      }}
                      className="inline-flex items-center gap-1 text-amber-300 hover:underline cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      清空重排
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {RITUAL_TABLET_TOKENS.map((token) => {
                      const orderIdx = selectedTablets.indexOf(token);
                      const picked = orderIdx !== -1;
                      return (
                        <button
                          key={token}
                          type="button"
                          onClick={() => handleToggleTabletToken(token)}
                          className={`relative rounded-lg border-2 px-4 py-2.5 font-serif-cn text-base font-bold tracking-widest transition cursor-pointer ${
                            picked
                              ? 'border-amber-400 bg-amber-950/70 text-amber-100 shadow-md'
                              : 'border-stone-700 bg-stone-900 text-stone-200 hover:border-emerald-500'
                          }`}
                        >
                          {picked && (
                            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 font-mono-tech text-xs font-bold text-zinc-950">
                              {orderIdx + 1}
                            </span>
                          )}
                          {token}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-emerald-200">
                      四道宗祠牌位顺序（共 8 字，自动忽略短横线与空格）
                    </label>
                    <input
                      type="text"
                      value={ritualSeqInput}
                      onChange={(e) => {
                        setRitualSeqInput(e.target.value);
                        setRitualError(null);
                      }}
                      placeholder="点选上方木牌或直接输入四道二字牌位名"
                      className="w-full rounded-lg border border-emerald-700 bg-black px-3.5 py-2.5 font-serif-cn text-sm tracking-widest text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-emerald-200">
                      第二步：输入 1998 年十四卷母带铁盒底部封存暗记
                    </label>
                    <input
                      type="text"
                      value={sealCodeInput}
                      onChange={(e) => {
                        setSealCodeInput(e.target.value);
                        setRitualError(null);
                      }}
                      placeholder="输入周怀瑾刻于铁盒底部的暗记（4汉字+2数字）"
                      className="w-full rounded-lg border border-emerald-700 bg-black px-3.5 py-2.5 font-serif-cn text-sm tracking-widest text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {ritualError && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-600/80 bg-amber-950/40 px-4 py-3 text-xs leading-6 text-amber-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <span>{ritualError}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-emerald-400/85">
                    真结局达成条件：木刻原件真牌位次序 + 1998铁盒封存暗记 + 救齐 4/4 成员 + 通过 3/3 卷审片
                  </div>
                  <button
                    type="submit"
                    disabled={ritualBusy || !ritualSeqInput.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-xs font-bold tracking-wider text-zinc-950 shadow-lg hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition"
                  >
                    <KeyRound className="h-4 w-4" />
                    {ritualBusy ? '正在校验祀典哈希并覆写底层阵列……' : '执行宗祠牌位逆向覆写仪轨'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
