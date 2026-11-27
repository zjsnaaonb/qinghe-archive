import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Droplets,
  Layers,
  Move,
  Puzzle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { horrorAudio } from '../engine/audio';

/* ============================================================================
 * 1. WipeRevealBoard — 暗房湿雾 / 库底淤泥 / 朱砂墨渍 物理擦拭显影板
 * ============================================================================ */
export interface WipeRevealBoardProps {
  puzzleId: string;
  title: string;
  subtitle: string;
  coatType: 'fog' | 'mud' | 'cinnabar';
  baseSrc: string;
  revealSrc?: string;
  revealBadge: string;
  revealDetail: string;
  solved: boolean;
  onSolved: (puzzleId: string) => void;
}

export const WipeRevealBoard: React.FC<WipeRevealBoardProps> = ({
  puzzleId,
  title,
  subtitle,
  coatType,
  baseSrc,
  revealSrc,
  revealBadge,
  revealDetail,
  solved,
  onSolved,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const strokeCountRef = useRef(0);
  const [percent, setPercent] = useState(solved ? 100 : 0);
  const [localSolved, setLocalSolved] = useState(solved);

  useEffect(() => {
    if (solved) {
      setLocalSolved(true);
      setPercent(100);
    }
  }, [solved]);

  const paintCoat = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);

    if (coatType === 'fog') {
      const grad = ctx.createRadialGradient(W * 0.5, H * 0.45, 20, W * 0.5, H * 0.5, W * 0.65);
      grad.addColorStop(0, 'rgba(218, 226, 232, 0.94)');
      grad.addColorStop(1, 'rgba(176, 189, 198, 0.97)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // 细密水汽凝结颗粒
      for (let i = 0; i < 420; i++) {
        const x = (Math.sin(i * 19.7) * 0.5 + 0.5) * W;
        const y = (Math.cos(i * 31.3) * 0.5 + 0.5) * H;
        const r = 1 + (i % 4) * 0.9;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(120,138,150,0.22)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (coatType === 'mud') {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, 'rgba(66, 56, 44, 0.96)');
      grad.addColorStop(0.5, 'rgba(54, 46, 36, 0.97)');
      grad.addColorStop(1, 'rgba(42, 35, 28, 0.96)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 360; i++) {
        const x = (Math.sin(i * 13.1) * 0.5 + 0.5) * W;
        const y = (Math.cos(i * 27.9) * 0.5 + 0.5) * H;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(98, 82, 62, 0.35)' : 'rgba(24, 20, 16, 0.38)';
        ctx.beginPath();
        ctx.arc(x, y, 2 + (i % 6) * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // cinnabar 朱砂倾洒印泥污层
      const grad = ctx.createRadialGradient(W * 0.45, H * 0.48, 30, W * 0.5, H * 0.5, W * 0.65);
      grad.addColorStop(0, 'rgba(138, 30, 30, 0.94)');
      grad.addColorStop(0.65, 'rgba(104, 22, 24, 0.96)');
      grad.addColorStop(1, 'rgba(72, 16, 18, 0.97)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 280; i++) {
        const x = (Math.sin(i * 17.3) * 0.5 + 0.5) * W;
        const y = (Math.cos(i * 23.7) * 0.5 + 0.5) * H;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(180, 48, 42, 0.28)' : 'rgba(52, 10, 12, 0.32)';
        ctx.beginPath();
        ctx.arc(x, y, 2.5 + (i % 5) * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 表层引导印字（会随擦拭一起被抹去）
    ctx.fillStyle = coatType === 'fog' ? 'rgba(30, 41, 59, 0.72)' : 'rgba(248, 240, 224, 0.85)';
    ctx.font = 'bold 16px "Noto Serif SC", serif';
    ctx.textAlign = 'center';
    const guideText =
      coatType === 'fog'
        ? '← 按住并反复擦拭镜面冷雾，显露底层暗记 →'
        : coatType === 'mud'
        ? '← 按住并拭去库底淤泥水渍，核查隐藏数量 →'
        : '← 按住并拭去倾洒朱砂印泥，检视纸背断疤 →';
    ctx.fillText(guideText, W / 2, H / 2);
  };

  useEffect(() => {
    if (!localSolved) {
      paintCoat();
    }
  }, [puzzleId, coatType, localSolved]);

  const computeClearedPercent = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let cleared = 0;
    let total = 0;
    // 抽样步长 12px，保证 120fps 零卡顿
    const step = 12;
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        total++;
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha < 95) cleared++;
      }
    }
    return total > 0 ? Math.round((cleared / total) * 100) : 0;
  };

  const wipeAt = (clientX: number, clientY: number) => {
    if (localSolved) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const r = 42;
    const brush = ctx.createRadialGradient(x, y, 4, x, y, r);
    brush.addColorStop(0, 'rgba(0,0,0,1)');
    brush.addColorStop(0.65, 'rgba(0,0,0,0.82)');
    brush.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = brush;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    strokeCountRef.current += 1;
    if (strokeCountRef.current % 6 === 0) {
      const pct = computeClearedPercent();
      setPercent(pct);
      if (pct >= 42) {
        finishWipe();
      }
    }
  };

  const finishWipe = () => {
    if (localSolved) return;
    setLocalSolved(true);
    setPercent(100);
    horrorAudio.playClick('unlock');
    onSolved(puzzleId);
  };

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-[#d9cfbd] bg-[#faf7f0] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5dfd2] bg-[#f3ede0] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-[#9e2a2b]" />
          <div>
            <div className="text-xs font-bold text-[#16263f]">{title}</div>
            <div className="text-[11px] text-stone-500">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 font-mono-tech text-[11px] font-semibold ${
              localSolved
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                : 'border-amber-400/70 bg-amber-50 text-amber-900'
            }`}
          >
            {localSolved ? '✓ 已拭净显影' : `已擦拭 ${percent}% / 42%`}
          </span>
          {!localSolved && percent >= 12 && (
            <button
              type="button"
              onClick={finishWipe}
              className="rounded-lg border border-[#d6cebe] bg-white px-2 py-0.5 text-[11px] text-stone-600 hover:border-[#9e2a2b] hover:text-[#9e2a2b] cursor-pointer"
            >
              快速拭净
            </button>
          )}
        </div>
      </div>

      <div className="relative mx-auto aspect-[16/10] w-full select-none overflow-hidden bg-zinc-950">
        <img
          src={localSolved && revealSrc ? revealSrc : baseSrc}
          alt={title}
          draggable={false}
          className="h-full w-full object-cover select-none"
        />

        {!localSolved && (
          <canvas
            ref={canvasRef}
            width={640}
            height={400}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drawingRef.current = true;
              horrorAudio.playClick('film');
              wipeAt(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!drawingRef.current) return;
              wipeAt(e.clientX, e.clientY);
            }}
            onPointerUp={() => {
              drawingRef.current = false;
            }}
            onPointerCancel={() => {
              drawingRef.current = false;
            }}
            className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          />
        )}
      </div>

      {localSolved && (
        <div className="border-t border-emerald-300/70 bg-emerald-50/85 px-4 py-3 text-xs leading-relaxed text-emerald-950">
          <div className="mb-1 flex items-center gap-1.5 font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>{revealBadge}</span>
          </div>
          <p className="text-stone-800">{revealDetail}</p>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 2. TornNoteJigsaw — 1998 撕碎绝笔残笺 6 块实体拼图台（点击交换 / 拖拽拼合）
 * ============================================================================ */
export interface TornNoteJigsawProps {
  puzzleId: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  revealBadge: string;
  revealDetail: string;
  solved: boolean;
  onSolved: (puzzleId: string) => void;
}

const INITIAL_SHUFFLE = [4, 1, 5, 0, 3, 2];

export const TornNoteJigsaw: React.FC<TornNoteJigsawProps> = ({
  puzzleId,
  title,
  subtitle,
  imageSrc,
  revealBadge,
  revealDetail,
  solved,
  onSolved,
}) => {
  const [tiles, setTiles] = useState<number[]>(() =>
    solved ? [0, 1, 2, 3, 4, 5] : INITIAL_SHUFFLE
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [localSolved, setLocalSolved] = useState(solved);

  useEffect(() => {
    if (solved) {
      setLocalSolved(true);
      setTiles([0, 1, 2, 3, 4, 5]);
    }
  }, [solved]);

  const correctCount = tiles.filter((val, idx) => val === idx).length;

  const swapPositions = (a: number, b: number) => {
    if (localSolved || a === b) return;
    horrorAudio.playClick('film');
    const next = [...tiles];
    const tmp = next[a];
    next[a] = next[b];
    next[b] = tmp;
    setTiles(next);
    setSelectedIdx(null);

    if (next.every((val, idx) => val === idx)) {
      setLocalSolved(true);
      horrorAudio.playClick('unlock');
      horrorAudio.playBronzeGong(1);
      onSolved(puzzleId);
    }
  };

  const handleTileClick = (idx: number) => {
    if (localSolved) return;
    if (selectedIdx === null) {
      horrorAudio.playClick('ui');
      setSelectedIdx(idx);
    } else if (selectedIdx === idx) {
      setSelectedIdx(null);
    } else {
      swapPositions(selectedIdx, idx);
    }
  };

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-[#d9cfbd] bg-[#faf7f0] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5dfd2] bg-[#f3ede0] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Puzzle className="h-4 w-4 text-[#9e2a2b]" />
          <div>
            <div className="text-xs font-bold text-[#16263f]">{title}</div>
            <div className="text-[11px] text-stone-500">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 font-mono-tech text-[11px] font-semibold ${
              localSolved
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                : 'border-amber-400/70 bg-amber-50 text-amber-900'
            }`}
          >
            {localSolved ? '✓ 残笺已完整拼合' : `已归位 ${correctCount} / 6 块`}
          </span>
          {!localSolved && (
            <button
              type="button"
              onClick={() => {
                setTiles(INITIAL_SHUFFLE);
                setSelectedIdx(null);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-[#d6cebe] bg-white px-2 py-0.5 text-[11px] text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              重置
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#231e19] p-4 sm:p-5">
        {localSolved ? (
          <div className="overflow-hidden rounded-lg border border-amber-500/40 shadow-lg">
            <img
              src={imageSrc}
              alt={title}
              className="block w-full object-cover"
            />
          </div>
        ) : (
          <>
            <p className="mb-3 text-center text-[11px] text-amber-100/80">
              点击任意两张残片即可互换位置（也可直接拖拽交换），将 6 块撕碎的绝笔与铁盒照拼回原貌：
            </p>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {tiles.map((pieceId, slotIdx) => {
                const col = pieceId % 3;
                const row = Math.floor(pieceId / 3);
                const isSelected = selectedIdx === slotIdx;
                const isCorrect = pieceId === slotIdx;
                return (
                  <button
                    key={slotIdx}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(slotIdx));
                      setSelectedIdx(slotIdx);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = Number(e.dataTransfer.getData('text/plain'));
                      if (!Number.isNaN(from)) swapPositions(from, slotIdx);
                    }}
                    onClick={() => handleTileClick(slotIdx)}
                    style={{
                      backgroundImage: `url(${imageSrc})`,
                      backgroundSize: '300% 200%',
                      backgroundPosition: `${col * 50}% ${row * 100}%`,
                    }}
                    className={`relative aspect-[4/3] w-full overflow-hidden rounded-md transition cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-amber-400 scale-[0.97] brightness-110'
                        : isCorrect
                        ? 'ring-1 ring-emerald-400/70'
                        : 'ring-1 ring-stone-600/70 hover:brightness-110'
                    }`}
                  >
                    <span
                      className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 font-mono-tech text-[9px] font-bold backdrop-blur-xs ${
                        isCorrect
                          ? 'bg-emerald-950/80 text-emerald-300'
                          : 'bg-black/70 text-stone-300'
                      }`}
                    >
                      {isCorrect ? `✓ #${slotIdx + 1}` : `槽位 ${slotIdx + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {localSolved && (
        <div className="border-t border-emerald-300/70 bg-emerald-50/85 px-4 py-3 text-xs leading-relaxed text-emerald-950">
          <div className="mb-1 flex items-center gap-1.5 font-bold text-emerald-900">
            <Sparkles className="h-4 w-4 text-emerald-700" />
            <span>{revealBadge}</span>
          </div>
          <p className="text-stone-800">{revealDetail}</p>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 3. FilmOverlayLightbox — 暗房透明底片叠合灯箱（拖拽对位 + 旋转校准）
 * ============================================================================ */
export interface FilmOverlayLightboxProps {
  puzzleId: string;
  title: string;
  subtitle: string;
  baseSrc: string;
  overlaySrc: string;
  overlayMode?: 'uv' | 'woodblock';
  revealBadge: string;
  revealDetail: string;
  solved: boolean;
  onSolved: (puzzleId: string) => void;
}

export const FilmOverlayLightbox: React.FC<FilmOverlayLightboxProps> = ({
  puzzleId,
  title,
  subtitle,
  baseSrc,
  overlaySrc,
  overlayMode = 'uv',
  revealBadge,
  revealDetail,
  solved,
  onSolved,
}) => {
  const [offset, setOffset] = useState<{ x: number; y: number }>(() =>
    solved ? { x: 0, y: 0 } : { x: 46, y: -28 }
  );
  const [angle, setAngle] = useState<number>(() => (solved ? 0 : 7));
  const [localSolved, setLocalSolved] = useState(solved);
  const draggingRef = useRef(false);
  const lastPtrRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (solved) {
      setLocalSolved(true);
      setOffset({ x: 0, y: 0 });
      setAngle(0);
    }
  }, [solved]);

  const checkAlignment = (nx: number, ny: number, na: number) => {
    if (localSolved) return;
    if (Math.abs(nx) <= 12 && Math.abs(ny) <= 12 && Math.abs(na) <= 2.5) {
      setOffset({ x: 0, y: 0 });
      setAngle(0);
      setLocalSolved(true);
      horrorAudio.playClick('unlock');
      onSolved(puzzleId);
    }
  };

  const updateOffset = (nx: number, ny: number) => {
    const cx = Math.max(-120, Math.min(120, Math.round(nx)));
    const cy = Math.max(-90, Math.min(90, Math.round(ny)));
    setOffset({ x: cx, y: cy });
    checkAlignment(cx, cy, angle);
  };

  const updateAngle = (na: number) => {
    const ca = Math.max(-15, Math.min(15, Math.round(na * 2) / 2));
    setAngle(ca);
    checkAlignment(offset.x, offset.y, ca);
  };

  const distance = Math.round(Math.hypot(offset.x, offset.y));
  const isClose = distance <= 26 && Math.abs(angle) <= 4;

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-[#d9cfbd] bg-[#faf7f0] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5dfd2] bg-[#f3ede0] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#9e2a2b]" />
          <div>
            <div className="text-xs font-bold text-[#16263f]">{title}</div>
            <div className="text-[11px] text-stone-500">{subtitle}</div>
          </div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 font-mono-tech text-[11px] font-semibold ${
            localSolved
              ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
              : isClose
              ? 'border-amber-500 bg-amber-100 text-amber-950'
              : 'border-stone-300 bg-white text-stone-600'
          }`}
        >
          {localSolved
            ? '✓ 十字套印已锁定'
            : `偏移 Δ${distance}px · 倾角 ${angle > 0 ? `+${angle}` : angle}°`}
        </span>
      </div>

      {/* 暗房透光灯箱主桌面 */}
      <div className="bg-[#1b1815] p-3.5 sm:p-4">
        <div
          onPointerDown={(e) => {
            if (localSolved) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            draggingRef.current = true;
            lastPtrRef.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current || localSolved) return;
            const dx = e.clientX - lastPtrRef.current.x;
            const dy = e.clientY - lastPtrRef.current.y;
            lastPtrRef.current = { x: e.clientX, y: e.clientY };
            updateOffset(offset.x + dx, offset.y + dy);
          }}
          onPointerUp={() => {
            draggingRef.current = false;
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
          }}
          className={`relative mx-auto aspect-[16/10] w-full overflow-hidden rounded-lg border-2 bg-black select-none touch-none transition-colors ${
            localSolved
              ? 'border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.28)]'
              : isClose
              ? 'border-amber-400 cursor-grab active:cursor-grabbing'
              : 'border-amber-200/35 cursor-grab active:cursor-grabbing'
          }`}
        >
          {/* 固定底层原图 */}
          <img
            src={baseSrc}
            alt={title}
            draggable={false}
            className="h-full w-full object-cover opacity-85 select-none"
          />

          {/* 固定中心基准十字准星 */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-amber-300/70" />
            <div className="absolute bottom-0 top-0 left-1/2 w-px bg-amber-300/70" />
            <div className="absolute inset-2 rounded-full border border-amber-300/70" />
          </div>

          {/* 可拖动旋转的透明显影底片 */}
          <div
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${angle}deg)`,
              opacity: localSolved ? 0.96 : 0.68,
            }}
            className="pointer-events-none absolute inset-0 transition-opacity duration-300 will-change-transform"
          >
            <img
              src={overlaySrc}
              alt="透明叠合显影底片"
              draggable={false}
              className={`h-full w-full object-cover select-none ${
                overlayMode === 'woodblock'
                  ? 'mix-blend-multiply contrast-150 saturate-150'
                  : 'mix-blend-screen brightness-110'
              }`}
            />
            {/* 上层透明片自带的红色套印准星 */}
            {!localSolved && (
              <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2">
                <div className="absolute left-0 right-0 top-1/2 h-px bg-red-400" />
                <div className="absolute bottom-0 top-0 left-1/2 w-px bg-red-400" />
                <div className="absolute inset-2 rounded-full border border-dashed border-red-400" />
              </div>
            )}
          </div>

          {!localSolved && (
            <div className="pointer-events-none absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-[11px] text-amber-100 backdrop-blur-xs">
              <Move className="h-3 w-3 text-amber-300" />
              <span>拖拽上层底片并调平倾角，使红/黄十字准星重合</span>
            </div>
          )}
        </div>

        {/* 旋转校准与微调控制栏 */}
        {!localSolved && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-700 bg-stone-900/90 px-3.5 py-2.5 text-xs text-stone-200">
            <label className="flex flex-1 items-center gap-2.5 min-w-[200px]">
              <span className="shrink-0 font-mono-tech text-[11px] text-amber-300">
                倾角校准 ({angle > 0 ? `+${angle}` : angle}°)
              </span>
              <input
                type="range"
                min={-15}
                max={15}
                step={0.5}
                value={angle}
                onChange={(e) => updateAngle(Number(e.target.value))}
                className="flex-1 accent-amber-500 cursor-pointer"
              />
            </label>

            <div className="flex items-center gap-1 font-mono-tech text-[11px]">
              <button
                type="button"
                onClick={() => updateOffset(offset.x - 8, offset.y)}
                className="rounded border border-stone-700 bg-stone-800 px-2 py-1 hover:border-amber-400 cursor-pointer"
                title="左移"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => updateOffset(offset.x, offset.y - 8)}
                className="rounded border border-stone-700 bg-stone-800 px-2 py-1 hover:border-amber-400 cursor-pointer"
                title="上移"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => updateOffset(offset.x, offset.y + 8)}
                className="rounded border border-stone-700 bg-stone-800 px-2 py-1 hover:border-amber-400 cursor-pointer"
                title="下移"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => updateOffset(offset.x + 8, offset.y)}
                className="rounded border border-stone-700 bg-stone-800 px-2 py-1 hover:border-amber-400 cursor-pointer"
                title="右移"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {localSolved && (
        <div className="border-t border-emerald-300/70 bg-emerald-50/85 px-4 py-3 text-xs leading-relaxed text-emerald-950">
          <div className="mb-1 flex items-center gap-1.5 font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>{revealBadge}</span>
          </div>
          <p className="text-stone-800">{revealDetail}</p>
        </div>
      )}
    </div>
  );
};
