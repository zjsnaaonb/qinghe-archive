import React, { useEffect, useState } from 'react';
import {
  Award,
  RotateCcw,
  ArrowLeft,
  FileText,
  Sparkles,
  AlertOctagon,
  ShieldCheck,
  EyeOff,
  Flame,
} from 'lucide-react';
import type { EndingId, EndingPayload, EncryptedBlock, RescueStatus } from '../types/game';
import { decryptVaultBlock } from '../engine/crypto';
import { horrorAudio } from '../engine/audio';

export interface EndingScreenProps {
  endingId: EndingId;
  payload?: EndingPayload | null;
  encryptedVault?: Record<string, EncryptedBlock>;
  cachedPlaintext?: string;
  trueEndingPassphrase?: string;
  unlockedEndings: EndingId[];
  rescued: RescueStatus;
  contamination: number;
  onReturnToConsole: () => void;
  onSelectEnding?: (endingId: EndingId) => void;
  onResetGame: () => void;
}

const DEFAULT_ENDING_KEYS: Record<EndingId, string> = {
  ending_assimilation: 'ending_key_assimilation',
  ending_overload: 'ending_key_overload',
  ending_sacrifice: 'ending_key_sacrifice',
  ending_mirror_leak: 'ending_key_mirror_leak',
  ending_true: '',
};

const ENDING_LABELS: Record<EndingId, string> = {
  ending_assimilation: '结局一：已归档分支 #01',
  ending_overload: '结局二：已归档分支 #02',
  ending_sacrifice: '结局三：已归档分支 #03',
  ending_mirror_leak: '结局四：已归档分支 #04',
  ending_true: '结局五：终局归档卷宗 #05',
};

const FALLBACK_ENDINGS: Record<EndingId, EndingPayload> = {
  ending_assimilation: {
    id: 'ending_assimilation',
    code: 'ENDING-01 // ARCHIVE_LOCKED',
    subtitle: '结局卷宗 #01',
    title: '信号同频终止',
    tone: 'bad',
    paragraphs: [
      '零点的钟声敲响时，终端滤光保护层已解除，未压缩的底片噪点在屏幕上骤然亮起。',
      '耳机外侧的走廊深处传来了三声沉闷的铜锣余响，连接会话随即转入静默归档状态。',
    ],
    epilogueDocTitle: '《系统终端会话归档回执》',
    epilogueDocBody: '当前会话记录已封存写入本地缓存，可返回总控台重新检视其他操作路径。',
  },
  ending_overload: {
    id: 'ending_overload',
    code: 'ENDING-02 // ARCHIVE_LOCKED',
    subtitle: '结局卷宗 #02',
    title: '断电沉渊',
    tone: 'normal',
    paragraphs: [
      '高压配电柜过载合闸的电弧切断了地下机房的全部推流队列，醋酸纤维母带与磁盘阵列一同熔断停机。',
      '零点线上排期因硬件离线被迫中止，外部公网仅收到一页静态网关中断通告。',
    ],
    epilogueDocTitle: '《人文楼地下配电室断电处置简报》',
    epilogueDocBody: '经现场核查，地下二层数字化设备已物理断电停运，相关展映计划无限期搁置。',
  },
  ending_sacrifice: {
    id: 'ending_sacrifice',
    code: 'ENDING-03 // ARCHIVE_LOCKED',
    subtitle: '结局卷宗 #03',
    title: '替影封门',
    tone: 'bittersweet',
    paragraphs: [
      '当受困的四名课题组成员全部撤出地面通道后，远程终端执行了单向隔离回路锁死指令。',
      '所有公网推流端口均已物理闭合，仅余当前外部会话留在日志末尾守住最后一道门禁。',
    ],
    epilogueDocTitle: '《匿名调查终端离线备忘》',
    epilogueDocBody: '四名受困研究生均已脱离险境，地下通道自即日起永久封闭。',
  },
  ending_mirror_leak: {
    id: 'ending_mirror_leak',
    code: 'ENDING-04 // ARCHIVE_LOCKED',
    subtitle: '结局卷宗 #04',
    title: '伪序回响',
    tone: 'twist',
    paragraphs: [
      '终端校验返回了表面正常的绿色完成提示，但底层推流队列并未如预期般清空。',
      '未经古籍原叶核验的工序触发了反向映射逻辑，零点首映信号仍在后台悄然扩散。',
    ],
    epilogueDocTitle: '《流媒体网关并发异常日志》',
    epilogueDocBody: '检测到未经古籍原刻校勘的指令序列，建议返回总控台核对善本原件后重试。',
  },
  ending_true: {
    id: 'ending_true',
    code: 'ENDING-05 // ENCRYPTED_TRUE_ARCHIVE',
    subtitle: '终局加密卷宗 #05',
    title: '待凭终局仪轨密钥解密',
    tone: 'true',
    paragraphs: [
      '该终局卷宗受 AES-256-GCM 离线高强度加密保护，静态包内不存储任何明文剧透。',
      '请在地下 B2 发布总控台完成全部受困成员救援并提交正确的古籍原刻次序与封存暗记以实时解密本卷。',
    ],
    epilogueDocTitle: '《终局密文保护说明》',
    epilogueDocBody: '未检测到有效解密缓存，请返回 B2 总控台通过完整仪轨校验后调阅真结局全文。',
  },
};

export const EndingScreen: React.FC<EndingScreenProps> = ({
  endingId,
  payload,
  encryptedVault,
  cachedPlaintext,
  trueEndingPassphrase,
  unlockedEndings,
  rescued,
  contamination,
  onReturnToConsole,
  onSelectEnding,
  onResetGame,
}) => {
  const [resolved, setResolved] = useState<EndingPayload | null>(payload ?? null);
  const [decrypting, setDecrypting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function loadEnding() {
      if (payload && payload.id === endingId) {
        setResolved(payload);
        setVisibleCount(1);
        return;
      }

      if (cachedPlaintext) {
        try {
          const parsed = JSON.parse(cachedPlaintext) as EndingPayload;
          if (!cancelled) {
            setResolved(parsed);
            setVisibleCount(1);
            return;
          }
        } catch {
          // continue to vault decryption
        }
      }

      const block = encryptedVault?.[endingId];
      const key =
        endingId === 'ending_true'
          ? (trueEndingPassphrase ?? '')
          : DEFAULT_ENDING_KEYS[endingId];

      if (block && key) {
        setDecrypting(true);
        const plain = await decryptVaultBlock(block, key);
        if (!cancelled) {
          setDecrypting(false);
          if (plain) {
            try {
              const parsed = JSON.parse(plain) as EndingPayload;
              setResolved(parsed);
              setVisibleCount(1);
              return;
            } catch {
              setResolved({
                ...FALLBACK_ENDINGS[endingId],
                paragraphs: plain.split(/\n\n+/).filter(Boolean),
              });
              setVisibleCount(1);
              return;
            }
          }
        }
      }

      if (!cancelled) {
        setResolved(FALLBACK_ENDINGS[endingId]);
        setVisibleCount(1);
      }
    }

    loadEnding();
    return () => {
      cancelled = true;
    };
  }, [endingId, payload, encryptedVault, cachedPlaintext, trueEndingPassphrase]);

  useEffect(() => {
    if (!resolved) return;
    if (visibleCount >= resolved.paragraphs.length) return;
    const timer = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, 850);
    return () => clearTimeout(timer);
  }, [resolved, visibleCount]);

  const data = resolved || FALLBACK_ENDINGS[endingId];
  const rescuedCount = Object.values(rescued).filter(Boolean).length;

  const themeMap: Record<
    EndingPayload['tone'],
    { bg: string; border: string; accent: string; badge: string; icon: React.ReactNode }
  > = {
    bad: {
      bg: 'from-red-950/90 via-zinc-950 to-black',
      border: 'border-red-900/80',
      accent: 'text-red-300',
      badge: 'bg-red-950/80 text-red-200 border-red-800',
      icon: <EyeOff className="h-6 w-6 text-red-400" />,
    },
    normal: {
      bg: 'from-amber-950/70 via-zinc-950 to-black',
      border: 'border-amber-800/70',
      accent: 'text-amber-200',
      badge: 'bg-amber-950/80 text-amber-200 border-amber-700',
      icon: <Flame className="h-6 w-6 text-amber-400" />,
    },
    bittersweet: {
      bg: 'from-slate-900 via-zinc-950 to-black',
      border: 'border-sky-800/70',
      accent: 'text-sky-200',
      badge: 'bg-sky-950/80 text-sky-200 border-sky-700',
      icon: <ShieldCheck className="h-6 w-6 text-sky-400" />,
    },
    twist: {
      bg: 'from-purple-950/75 via-red-950/40 to-zinc-950',
      border: 'border-rose-800/80',
      accent: 'text-rose-200',
      badge: 'bg-rose-950/80 text-rose-200 border-rose-700',
      icon: <AlertOctagon className="h-6 w-6 text-rose-400" />,
    },
    true: {
      bg: 'from-emerald-950/75 via-teal-950/40 to-zinc-950',
      border: 'border-emerald-600/80',
      accent: 'text-emerald-200',
      badge: 'bg-emerald-950/80 text-emerald-200 border-emerald-600',
      icon: <Sparkles className="h-6 w-6 text-emerald-400" />,
    },
  };

  const theme = themeMap[data.tone] || themeMap.normal;

  return (
    <div className={`min-h-screen bg-gradient-to-b ${theme.bg} px-4 py-10 text-zinc-100`}>
      <div className="mx-auto max-w-4xl">
        {/* 顶部结局铭牌 */}
        <div className={`mb-8 rounded-xl border ${theme.border} bg-zinc-950/85 p-6 shadow-2xl backdrop-blur`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2.5">
              {theme.icon}
              <span className={`rounded border px-2.5 py-0.5 text-xs font-mono-tech ${theme.badge}`}>
                {data.code}
              </span>
              <span className="text-xs text-zinc-400">{data.subtitle}</span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono-tech text-zinc-400">
              <span>已救出成员: {rescuedCount}/4</span>
              <span>视网膜残留: {contamination}%</span>
              <span className="text-amber-300">结局收集: {unlockedEndings.length}/5</span>
            </div>
          </div>

          <h1 className={`mb-6 font-serif-cn text-3xl sm:text-4xl font-bold tracking-widest ${theme.accent}`}>
            {data.title}
          </h1>

          {decrypting ? (
            <div className="py-12 text-center font-mono-tech text-sm text-amber-300 animate-pulse">
              [AES-256-GCM] 正在使用终局密钥实时解密档案收束卷宗……
            </div>
          ) : (
            <>
              <div className="space-y-4 font-serif-cn text-base leading-8 text-zinc-200">
                {data.paragraphs.slice(0, visibleCount).map((p, idx) => (
                  <p key={idx} className="indent-8 transition-opacity duration-500">
                    {p}
                  </p>
                ))}
              </div>

              {visibleCount < data.paragraphs.length && (
                <div className="mt-4 text-right">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(data.paragraphs.length)}
                    className="text-xs font-mono-tech text-zinc-400 underline hover:text-zinc-200 cursor-pointer"
                  >
                    立即展开全部段落 ({visibleCount}/{data.paragraphs.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 尾声档案阅读器 */}
        {!decrypting && visibleCount >= data.paragraphs.length && (
          <div className="mb-8 rounded-xl border border-zinc-700/90 bg-zinc-900/90 p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <FileText className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-mono-tech uppercase tracking-wider text-amber-300">
                EPILOGUE ARCHIVE // 尾声解密附件
              </span>
            </div>
            <h2 className="mb-4 font-serif-cn text-xl font-bold text-amber-100">
              {data.epilogueDocTitle}
            </h2>
            <div className="whitespace-pre-line rounded border border-zinc-800 bg-zinc-950/90 p-5 font-serif-cn text-sm leading-7 text-zinc-300">
              {data.epilogueDocBody}
            </div>
          </div>
        )}

        {/* 结局分支导航与操作栏 */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
              <Award className="h-4 w-4 text-amber-400" />
              <span>已解锁分支结局图鉴（可在总控台继续探索未达成结局）</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ENDING_LABELS) as EndingId[]).map((eid) => {
                const isUnlocked = unlockedEndings.includes(eid);
                const isCurrent = eid === endingId;
                return (
                  <button
                    key={eid}
                    type="button"
                    disabled={!isUnlocked || !onSelectEnding}
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      onSelectEnding?.(eid);
                    }}
                    className={`rounded border px-2.5 py-1 text-xs transition ${
                      isCurrent
                        ? 'border-amber-500 bg-amber-950/60 text-amber-200 font-bold'
                        : isUnlocked
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-600 cursor-pointer'
                        : 'border-zinc-800/70 bg-zinc-950 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    {isUnlocked ? ENDING_LABELS[eid] : '？？？未解锁'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('ui');
                onReturnToConsole();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-600/80 bg-amber-950/50 px-5 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-900/60 cursor-pointer transition"
            >
              <ArrowLeft className="h-4 w-4" />
              返回 B2 发布总控台（体验其他分支结局）
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('确定要清空本局存档并回到序幕第一封求救信重新开始吗？')) {
                  horrorAudio.playClick('ui');
                  onResetGame();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-300 hover:border-red-700 hover:text-red-200 cursor-pointer transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              清空记录并开启新周目
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
