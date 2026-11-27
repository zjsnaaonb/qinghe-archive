import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Hand,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { ScareMode } from '../types/game';
import type { ScarePayload } from '../sites/siteProps';
import { horrorAudio } from '../engine/audio';

export type EncounterId =
  | 'knock_hold'
  | 'fog_wipe_seal'
  | 'mirror_cross_seal'
  | 'gong_freeze';

export const ENCOUNTER_METAS: Record<
  EncounterId,
  {
    id: EncounterId;
    title: string;
    shortRule: string;
    durationSec: number;
    imageSrc: string;
  }
> = {
  knock_hold: {
    id: 'knock_hold',
    title: '走廊叩门拧锁 · 熄屏屏息',
    shortRule: '闻门外三叩锁响，立按熄屏屏息至门外脚步远去，切勿凑近猫眼。',
    durationSec: 8.5,
    imageSrc: './media/horror_door_gap.png',
  },
  fog_wipe_seal: {
    id: 'fog_wipe_seal',
    title: '库底冷雾漫屏 · 拭雾拍符',
    shortRule: '迅速擦散屏幕冷雾定位窥视眼，随即拍上朱砂封镜符镇压。',
    durationSec: 9.5,
    imageSrc: './media/horror_under_desk.png',
  },
  mirror_cross_seal: {
    id: 'mirror_cross_seal',
    title: '十月封镜崩裂 · 交叉贴封',
    shortRule: '水银镜面封条脱落前，依次贴合两条对角红纸封条成十字镇镜。',
    durationSec: 8.5,
    imageSrc: './media/horror_mirror_reflection.png',
  },
  gong_freeze: {
    id: 'gong_freeze',
    title: '三通铜锣勿回首 · 静立不动',
    shortRule: '三通铜锣响起后，保持鼠标与手指绝对静止 3.2 秒，切忌回头或点击。',
    durationSec: 7.5,
    imageSrc: './media/horror_webcam_behind.png',
  },
};

export interface EmergencyHorrorEncounterProps {
  encounterId: EncounterId | null;
  scareMode: ScareMode;
  onSurvive: (encounterId: EncounterId) => void;
  onFail: (encounterId: EncounterId, scare: ScarePayload) => void;
}

export const EmergencyHorrorEncounter: React.FC<EmergencyHorrorEncounterProps> = ({
  encounterId,
  scareMode,
  onSurvive,
  onFail,
}) => {
  const [phase, setPhase] = useState<'active' | 'survived'>('active');
  const [timeLeftMs, setTimeLeftMs] = useState(8500);
  const resolvedRef = useRef(false);

  // 1. knock_hold 状态
  const [holdingBreath, setHoldingBreath] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  // 2. fog_wipe_seal 状态
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fogDrawingRef = useRef(false);
  const fogStrokeRef = useRef(0);
  const [fogPercent, setFogPercent] = useState(0);
  const [talismanSlapped, setTalismanSlapped] = useState(false);

  // 3. mirror_cross_seal 状态
  const [seal1Done, setSeal1Done] = useState(false);
  const [seal2Done, setSeal2Done] = useState(false);

  // 4. gong_freeze 状态
  const [freezeProgress, setFreezeProgress] = useState(0);
  const [freezeArmed, setFreezeArmed] = useState(false);
  const freezeOriginRef = useRef<{ x: number; y: number } | null>(null);

  const meta = encounterId ? ENCOUNTER_METAS[encounterId] : null;

  const triggerSurvival = (id: EncounterId) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    horrorAudio.playClick('unlock');
    setPhase('survived');
    window.setTimeout(() => {
      onSurvive(id);
    }, 1350);
  };

  const triggerFailure = (id: EncounterId, reasonTitle: string, reasonMsg: string, visualType: ScarePayload['visualType']) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onFail(id, {
      title: reasonTitle,
      message: reasonMsg,
      visualType,
    });
  };

  // 初始化每次突发事件 + 音效 + 总倒计时
  useEffect(() => {
    if (!encounterId || !meta) return;
    resolvedRef.current = false;
    setPhase('active');
    const totalMs = meta.durationSec * 1000;
    setTimeLeftMs(totalMs);
    setHoldingBreath(false);
    setHoldProgress(0);
    setFogPercent(0);
    setTalismanSlapped(false);
    setSeal1Done(false);
    setSeal2Done(false);
    setFreezeProgress(0);
    setFreezeArmed(false);
    freezeOriginRef.current = null;

    if (encounterId === 'knock_hold') {
      horrorAudio.playDoorKnocks(3, true);
    } else if (encounterId === 'fog_wipe_seal') {
      horrorAudio.playMirrorChill(scareMode);
    } else if (encounterId === 'mirror_cross_seal') {
      horrorAudio.playMirrorChill(scareMode);
    } else if (encounterId === 'gong_freeze') {
      horrorAudio.playBronzeGong(3);
    }

    const start = performance.now();
    const timer = window.setInterval(() => {
      if (resolvedRef.current) return;
      const left = Math.max(0, totalMs - (performance.now() - start));
      setTimeLeftMs(left);
      if (left <= 0) {
        if (encounterId === 'knock_hold') {
          triggerFailure(
            encounterId,
            '未能及时熄屏屏息：门锁已被从外拧开',
            '走廊里那张贴着门镜的湿冷面孔听见了你的呼吸声，防盗门链在黑暗中发出一声闷响。（视网膜残留 +12%）',
            'peephole'
          );
        } else if (encounterId === 'fog_wipe_seal') {
          triggerFailure(
            encounterId,
            '冷雾封屏超时：桌底湿手已触及屏幕边缘',
            '未能在十秒内拭雾拍下朱砂封镜符，冰冷的水渍正顺着键盘缝隙漫上来。（视网膜残留 +12%）',
            'under_desk'
          );
        } else if (encounterId === 'mirror_cross_seal') {
          triggerFailure(
            encounterId,
            '十月封镜彻底脱落：镜中人影已贴近玻璃',
            '未能在红纸卷边前补齐十字交叉封条，水银镜里的那双湿眼睛直勾勾对上了你的视线。（视网膜残留 +12%）',
            'peeker'
          );
        } else {
          triggerFailure(
            encounterId,
            '三通锣声未尽而惊动身后滞留体',
            '屏幕顶置红外探头抓拍到身后三名穿湿黑褂的旁观者同时俯身凑近了你的耳畔。（视网膜残留 +12%）',
            'webcam'
          );
        }
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, [encounterId]);

  // 1. knock_hold: 长按 2.6 秒（支持鼠标/触屏/空格键）
  useEffect(() => {
    if (encounterId !== 'knock_hold' || phase !== 'active') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setHoldingBreath(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setHoldingBreath(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [encounterId, phase]);

  useEffect(() => {
    if (encounterId !== 'knock_hold' || phase !== 'active' || !holdingBreath) return;
    const tick = window.setInterval(() => {
      setHoldProgress((prev) => {
        const next = Math.min(100, prev + 4);
        if (next >= 100) {
          triggerSurvival('knock_hold');
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(tick);
  }, [encounterId, phase, holdingBreath]);

  // 2. fog_wipe_seal: 初始化冷雾画布
  useEffect(() => {
    if (encounterId !== 'fog_wipe_seal' || phase !== 'active') return;
    const canvas = fogCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.globalCompositeOperation = 'source-over';
    const grad = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.65);
    grad.addColorStop(0, 'rgba(202, 214, 222, 0.96)');
    grad.addColorStop(1, 'rgba(136, 152, 165, 0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(24, 34, 46, 0.78)';
    ctx.font = 'bold 17px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('迅速擦散冷雾，找出湿雾后盯着你的眼睛！', W / 2, H / 2);
  }, [encounterId, phase]);

  const handleFogWipe = (clientX: number, clientY: number) => {
    if (resolvedRef.current) return;
    const canvas = fogCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const r = 48;
    const brush = ctx.createRadialGradient(x, y, 6, x, y, r);
    brush.addColorStop(0, 'rgba(0,0,0,1)');
    brush.addColorStop(0.7, 'rgba(0,0,0,0.85)');
    brush.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = brush;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    fogStrokeRef.current += 1;
    if (fogStrokeRef.current % 5 === 0) {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let cleared = 0;
      let total = 0;
      for (let yy = 0; yy < canvas.height; yy += 14) {
        for (let xx = 0; xx < canvas.width; xx += 14) {
          total++;
          if (data[(yy * canvas.width + xx) * 4 + 3] < 100) cleared++;
        }
      }
      setFogPercent(total > 0 ? Math.round((cleared / total) * 100) : 0);
    }
  };

  // 4. gong_freeze: 0.9s 准备缓冲后开始监测指针绝对静止 3.2 秒
  useEffect(() => {
    if (encounterId !== 'gong_freeze' || phase !== 'active') return;
    const armTimer = window.setTimeout(() => {
      setFreezeArmed(true);
    }, 900);
    return () => window.clearTimeout(armTimer);
  }, [encounterId, phase]);

  useEffect(() => {
    if (encounterId !== 'gong_freeze' || phase !== 'active' || !freezeArmed) return;

    const onMove = (e: PointerEvent) => {
      if (resolvedRef.current) return;
      if (!freezeOriginRef.current) {
        freezeOriginRef.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const dist = Math.hypot(
        e.clientX - freezeOriginRef.current.x,
        e.clientY - freezeOriginRef.current.y
      );
      if (dist > 26) {
        triggerFailure(
          'gong_freeze',
          '违背「三锣勿回首」戒律：光标剧烈惊动身后滞留影',
          '三通铜锣余音未歇，你晃动了鼠标。顶置红外摄像头捕捉到椅背后的三个人影同时俯下身来。（视网膜残留 +12%）',
          'webcam'
        );
      }
    };

    window.addEventListener('pointermove', onMove);
    const tick = window.setInterval(() => {
      setFreezeProgress((prev) => {
        const next = Math.min(100, prev + 3.2);
        if (next >= 100) {
          triggerSurvival('gong_freeze');
        }
        return next;
      });
    }, 100);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.clearInterval(tick);
    };
  }, [encounterId, phase, freezeArmed]);

  if (!encounterId || !meta) return null;

  const progressRatio = Math.max(0, Math.min(100, (timeLeftMs / (meta.durationSec * 1000)) * 100));

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/92 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-[#9e2a2b]/70 bg-[#120d0d] text-stone-100 shadow-2xl"
      >
        {/* 顶部紧急倒计时进度条 */}
        <div className="h-1.5 w-full bg-stone-900">
          <div
            className={`h-full transition-all duration-75 ${
              phase === 'survived'
                ? 'bg-emerald-500'
                : progressRatio < 30
                ? 'bg-red-500'
                : 'bg-amber-500'
            }`}
            style={{ width: `${phase === 'survived' ? 100 : progressRatio}%` }}
          />
        </div>

        <div className="flex items-center justify-between border-b border-red-950/80 bg-[#1a1111] px-5 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
            <span className="font-serif-cn text-sm font-bold tracking-wider text-red-100">
              {meta.title}
            </span>
          </div>
          <span className="rounded border border-red-800/70 bg-red-950/70 px-2 py-0.5 font-mono-tech text-xs font-bold text-red-200">
            {phase === 'survived' ? '已镇压' : `${(timeLeftMs / 1000).toFixed(1)}s`}
          </span>
        </div>

        {phase === 'survived' ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/60 bg-emerald-950/60 text-emerald-300">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="font-serif-cn text-xl font-bold text-emerald-200">
              异象暂时退散 · 走廊恢复死寂
            </h3>
            <p className="mt-2 max-w-md text-xs leading-6 text-stone-400">
              本次应对记录已录入「暗房异象收集册」。请保持冷静，继续核查档案。
            </p>
          </div>
        ) : (
          <div className="p-5">
            {/* 场景一：走廊叩门拧锁 · 长按熄屏屏息 */}
            {encounterId === 'knock_hold' && (
              <div className="space-y-4">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-stone-800 bg-black">
                  <img
                    src="./media/horror_door_gap.png"
                    alt="门缝异动"
                    className={`h-full w-full object-cover transition-all duration-300 ${
                      holdingBreath ? 'brightness-[0.14] scale-100' : 'brightness-90 scale-[1.04]'
                    }`}
                  />
                  {holdingBreath && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-center">
                      <EyeOff className="mb-2 h-8 w-8 text-emerald-400" />
                      <div className="font-serif-cn text-base font-bold text-emerald-200">
                        已熄屏屏息……切勿松手（{holdProgress}%）
                      </div>
                      <div className="mt-2 h-2 w-56 overflow-hidden rounded-full bg-stone-800">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-100"
                          style={{ width: `${holdProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-center font-serif-cn text-xs leading-6 text-stone-300">
                  咔嗒……咔嗒……门外有人正在试拧门锁。遵循山禁旧例，立即<strong>按住熄屏屏息</strong>直到脚步声退去！
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onPointerDown={() => setHoldingBreath(true)}
                    onPointerUp={() => setHoldingBreath(false)}
                    onPointerLeave={() => setHoldingBreath(false)}
                    onPointerCancel={() => setHoldingBreath(false)}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/70 bg-emerald-950/80 px-6 py-3 text-sm font-bold text-emerald-100 hover:bg-emerald-900 select-none touch-none cursor-pointer transition"
                  >
                    <Hand className="h-4 w-4" />
                    长按【关灯熄屏并屏息】（或按住空格键）
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      triggerFailure(
                        'knock_hold',
                        '违禁凑近猫眼：门镜外侧正贴着一只眼睛',
                        '你凑近门镜的瞬间，走廊灯光灭了——外面的人把整张湿漉漉的脸抵在了猫眼玻璃上。（视网膜残留 +12%）',
                        'peephole'
                      )
                    }
                    className="rounded-xl border border-red-900/70 bg-red-950/50 px-4 py-3 text-xs font-medium text-red-300 hover:bg-red-900/60 cursor-pointer transition"
                  >
                    凑近猫眼偷看门外是谁
                  </button>
                </div>
              </div>
            )}

            {/* 场景二：库底冷雾漫屏 · 擦雾并拍朱砂符 */}
            {encounterId === 'fog_wipe_seal' && (
              <div className="space-y-4">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-stone-800 bg-black select-none">
                  <img
                    src="./media/horror_under_desk.png"
                    alt="冷雾后方"
                    draggable={false}
                    className="h-full w-full object-cover"
                  />
                  <canvas
                    ref={fogCanvasRef}
                    width={640}
                    height={360}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      fogDrawingRef.current = true;
                      handleFogWipe(e.clientX, e.clientY);
                    }}
                    onPointerMove={(e) => {
                      if (!fogDrawingRef.current) return;
                      handleFogWipe(e.clientX, e.clientY);
                    }}
                    onPointerUp={() => {
                      fogDrawingRef.current = false;
                    }}
                    className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
                  />
                  {talismanSlapped && (
                    <motion.img
                      initial={{ scale: 1.8, opacity: 0, rotate: -12 }}
                      animate={{ scale: 1, opacity: 1, rotate: -4 }}
                      transition={{ duration: 0.18 }}
                      src="./media/cinnabar_talisman.png"
                      alt="十月封镜朱砂符"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[78%] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)]"
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-stone-300">
                    步骤 ①：拖拽擦散屏幕冷雾（当前 <strong className="text-amber-300">{fogPercent}%</strong> / 需 ≥ 30%）→ 步骤 ②：拍上朱砂符
                  </span>
                  <button
                    type="button"
                    disabled={fogPercent < 30 || talismanSlapped}
                    onClick={() => {
                      setTalismanSlapped(true);
                      horrorAudio.playWoodenClapper();
                      window.setTimeout(() => triggerSurvival('fog_wipe_seal'), 420);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#9e2a2b] px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer transition"
                  >
                    <Sparkles className="h-4 w-4" />
                    拍上【十月封镜·朱砂符】
                  </button>
                </div>
              </div>
            )}

            {/* 场景三：十月封镜崩裂 · 交叉贴两条红纸封条 */}
            {encounterId === 'mirror_cross_seal' && (
              <div className="space-y-4">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-stone-800 bg-black">
                  <img
                    src="./media/horror_mirror_reflection.png"
                    alt="封镜反光"
                    className="h-full w-full object-cover animate-[pulse_2.4s_ease-in-out_infinite]"
                  />

                  {/* 左上 ↘ 右下 封条 */}
                  {seal1Done && (
                    <motion.img
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 0.96 }}
                      src="./media/cinnabar_talisman.png"
                      alt="对角封条一"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[92%] -translate-x-1/2 -translate-y-1/2 rotate-[42deg] object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.85)]"
                    />
                  )}

                  {/* 右上 ↙ 左下 封条 */}
                  {seal2Done && (
                    <motion.img
                      initial={{ scale: 1.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 0.96 }}
                      src="./media/cinnabar_talisman.png"
                      alt="对角封条二"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[92%] -translate-x-1/2 -translate-y-1/2 -rotate-[42deg] object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.85)]"
                    />
                  )}
                </div>

                <p className="text-center font-serif-cn text-xs text-stone-300">
                  水银镜面上的旧封条正在湿润卷边！立刻贴齐两条对角「十月封镜」朱砂符组成十字镇镜：
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={seal1Done}
                    onClick={() => {
                      horrorAudio.playWoodenClapper();
                      setSeal1Done(true);
                      if (seal2Done) {
                        window.setTimeout(() => triggerSurvival('mirror_cross_seal'), 350);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-5 py-2.5 text-xs font-bold transition cursor-pointer ${
                      seal1Done
                        ? 'border-emerald-500/60 bg-emerald-950/70 text-emerald-300'
                        : 'border-amber-400/70 bg-[#9e2a2b] text-white hover:bg-red-700'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {seal1Done ? '✓ 左上↘右下 已封贴' : '贴上第一道【左上 ↘ 右下】'}
                  </button>

                  <button
                    type="button"
                    disabled={seal2Done}
                    onClick={() => {
                      horrorAudio.playWoodenClapper();
                      setSeal2Done(true);
                      if (seal1Done) {
                        window.setTimeout(() => triggerSurvival('mirror_cross_seal'), 350);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-5 py-2.5 text-xs font-bold transition cursor-pointer ${
                      seal2Done
                        ? 'border-emerald-500/60 bg-emerald-950/70 text-emerald-300'
                        : 'border-amber-400/70 bg-[#9e2a2b] text-white hover:bg-red-700'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {seal2Done ? '✓ 右上↙左下 已封贴' : '贴上第二道【右上 ↙ 左下】'}
                  </button>
                </div>
              </div>
            )}

            {/* 场景四：三通铜锣勿回首 · 鼠标绝对静止 */}
            {encounterId === 'gong_freeze' && (
              <div className="space-y-4">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-stone-800 bg-black">
                  <img
                    src="./media/horror_webcam_behind.png"
                    alt="椅后滞留影"
                    className="h-full w-full object-cover brightness-90"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent p-4 text-center">
                    <div className="font-serif-cn text-sm font-bold text-amber-200">
                      {!freezeArmed
                        ? '三通铜锣响起——立刻松开鼠标，保持双手完全静止！'
                        : `正在屏息静立，切勿移动鼠标或触碰屏幕（${Math.round(freezeProgress)}%）`}
                    </div>
                    <div className="mx-auto mt-2 h-2 w-64 overflow-hidden rounded-full bg-stone-800">
                      <div
                        className="h-full bg-amber-400 transition-all duration-100"
                        style={{ width: `${freezeProgress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      triggerFailure(
                        'gong_freeze',
                        '违背梨园第三忌：三锣响后回首窥视',
                        '你回头确认的瞬间，站在椅背后的三名湿衣旁观者同时将脸贴向了镜头。（视网膜残留 +12%）',
                        'webcam'
                      )
                    }
                    className="rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-2 text-xs text-red-300/90 hover:bg-red-900/60 cursor-pointer transition"
                  >
                    好像有人在叫我名字……回头看一眼
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
