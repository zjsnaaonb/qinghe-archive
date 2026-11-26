import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Pin,
  Trash2,
  Plus,
  Search,
  ShieldAlert,
  Award,
  Copy,
  Upload,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import type { EndingId, GameState, ScareMode, SiteId } from '../types/game';
import { PROGRESSIVE_HINTS } from '../data/hints';
import { exportSaveCode, importSaveCode } from '../engine/gameState';
import { SITE_METAS } from './TopInvestigatorBar';
import { horrorAudio } from '../engine/audio';

export type RightPanelMode = 'notebook' | 'hints' | 'settings' | null;

const ENDING_NAMES: Record<EndingId, string> = {
  ending_assimilation: '结局一：万目同龛（同化结局）',
  ending_overload: '结局二：断电沉渊（惨胜结局）',
  ending_sacrifice: '结局三：替影封门（孤身守龛）',
  ending_mirror_leak: '结局四：盲戏重开（反转结局）',
  ending_true: '结局五：水落青禾（完美真结局）',
};

interface SideWorkspacePanelProps {
  mode: Exclude<RightPanelMode, null>;
  state: GameState;
  onClose: () => void;
  onUpdateMemo: (memo: string) => void;
  onAddManualKeyword: (kw: string) => void;
  onRemoveClue: (id: string) => void;
  onGlobalSearch: (query: string) => void;
  onJumpToSite: (site: SiteId, docId?: string) => void;
  onChangeScareMode: (mode: ScareMode) => void;
  onImportState: (newState: GameState) => void;
  onResetGame: () => void;
  onViewEnding?: (ending: EndingId) => void;
}

export const SideWorkspacePanel: React.FC<SideWorkspacePanelProps> = ({
  mode,
  state,
  onClose,
  onUpdateMemo,
  onAddManualKeyword,
  onRemoveClue,
  onGlobalSearch,
  onJumpToSite,
  onChangeScareMode,
  onImportState,
  onResetGame,
  onViewEnding,
}) => {
  const [kwDraft, setKwDraft] = useState('');
  const [revealedHintTiers, setRevealedHintTiers] = useState<Record<string, number>>({});
  const [saveInput, setSaveInput] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');

  const rescuedCount = Object.values(state.rescued).filter(Boolean).length;

  const handleAddKw = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = kwDraft.trim();
    if (!trimmed) return;
    horrorAudio.playClick('ui');
    onAddManualKeyword(trimmed);
    setKwDraft('');
  };

  return (
    <div className="flex h-full flex-col bg-[#0d0e12] text-zinc-200 border-l border-zinc-800/90">
      {/* 面板顶栏 */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-3.5 shrink-0">
        <div>
          <h2 className="font-serif-cn text-base font-bold text-zinc-100">
            {mode === 'notebook' && '随身调查手记'}
            {mode === 'hints' && '渐进式思路提示'}
            {mode === 'settings' && '偏好设置与存档'}
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {mode === 'notebook' && '左栏页面与图片保持可见，直接划选原文即可摘录至此'}
            {mode === 'hints' && '仅在卡关时按需逐层展开，保留自主推演乐趣'}
            {mode === 'settings' && '惊吓分级、结局图鉴与跨设备存档码'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-400 hover:border-zinc-600 hover:text-white cursor-pointer transition"
          title="收起侧栏"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 面板滚动内容区 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {mode === 'notebook' && (
          <>
            {/* 自由推理草稿板放在最顺手的位置 */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                手写推理备忘（自动保存）
              </label>
              <textarea
                rows={6}
                value={state.playerMemo}
                onChange={(e) => onUpdateMemo(e.target.value)}
                placeholder="在此记录你发现的人数矛盾、项目编号、日期、密码推算或牌位顺序……"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 p-3 text-xs leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-amber-500/70 focus:outline-none transition"
              />
            </div>

            {/* 玩家自建检索词标签 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  我的线索词签（点击直接跨站搜）
                </span>
              </div>
              <form onSubmit={handleAddKw} className="mb-2.5 flex gap-1.5">
                <input
                  type="text"
                  value={kwDraft}
                  onChange={(e) => setKwDraft(e.target.value)}
                  placeholder="记下可疑人名/编号/村名……"
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:border-amber-500/70 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-amber-500/70 hover:text-amber-200 cursor-pointer transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>记下</span>
                </button>
              </form>

              {state.unlockedKeywords.length === 0 ? (
                <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-2 text-[11px] text-zinc-500">
                  尚未收藏词签。在正文里发现异常名字或编号后，可在此添加或直接划词检索。
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {state.unlockedKeywords.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => onGlobalSearch(kw)}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-700/40 bg-amber-950/30 px-2.5 py-0.5 text-xs text-amber-200 hover:bg-amber-900/40 cursor-pointer transition"
                    >
                      <Search className="h-2.5 w-2.5 opacity-70" />
                      <span>{kw}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 玩家亲自划词摘录的证据卡片 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  划词摘录剪贴板（{state.discoveredClues.length}）
                </span>
              </div>

              {state.discoveredClues.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 p-4 text-center">
                  <Pin className="mx-auto mb-2 h-5 w-5 text-zinc-600" />
                  <p className="text-xs text-zinc-400">手记目前是空白的</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                    本游戏不会替你自动提取谜底。阅读档案或论坛时，用鼠标<strong className="text-amber-300">划选任意可疑文字</strong>，即可一键摘录到这里随时对照。
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[...state.discoveredClues].reverse().map((clue) => (
                    <div
                      key={clue.id}
                      className="group rounded-xl border border-zinc-800/90 bg-zinc-900/50 p-3 transition hover:border-zinc-700"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onJumpToSite(clue.sourceSite, clue.sourceDocId)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300/90 hover:text-amber-200 cursor-pointer"
                        >
                          <span>{SITE_METAS[clue.sourceSite].shortName}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveClue(clue.id)}
                          className="rounded p-1 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400 cursor-pointer transition"
                          title="移除该条摘录"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-200 whitespace-pre-line">
                        “{clue.detail}”
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 第三幕以后才展示受困成员救援状态（避免前期信息过载与剧透！） */}
            {state.act >= 3 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-zinc-300">
                  <span>受困课题组成员状态</span>
                  <span className="font-mono-tech text-amber-300">{rescuedCount} / 4</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'suXiaotang', name: '苏晓棠', ok: state.rescued.suXiaotang },
                    { key: 'zhaoYiming', name: '赵一鸣', ok: state.rescued.zhaoYiming },
                    { key: 'chenMo', name: '陈默', ok: state.rescued.chenMo },
                    { key: 'linZhixia', name: '林知夏', ok: state.rescued.linZhixia },
                  ].map((m) => (
                    <div
                      key={m.key}
                      className={`flex items-center justify-between rounded-lg border px-2.5 py-2 ${
                        m.ok
                          ? 'border-emerald-800/70 bg-emerald-950/30 text-emerald-200'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                      }`}
                    >
                      <span>{m.name}</span>
                      {m.ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <span className="text-[10px] text-zinc-600">失联</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'hints' && (
          <div className="space-y-3">
            {PROGRESSIVE_HINTS.map((h) => {
              const relevant = h.isRelevant(state);
              const tier = revealedHintTiers[h.id] || 0;
              return (
                <div
                  key={h.id}
                  className={`rounded-xl border p-3.5 transition ${
                    relevant
                      ? 'border-emerald-800/60 bg-zinc-900/75'
                      : 'border-zinc-800/60 bg-zinc-950/50 opacity-50'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-100">{h.stageTitle}</span>
                    {relevant && (
                      <span className="shrink-0 rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-300">
                        当前阶段
                      </span>
                    )}
                  </div>

                  {tier >= 1 && (
                    <div className="mb-2 rounded-lg bg-zinc-950 p-2.5 text-xs leading-relaxed text-zinc-300 border-l-2 border-emerald-500">
                      <strong className="text-emerald-400">方向提示：</strong>
                      {h.tier1}
                    </div>
                  )}
                  {tier >= 2 && (
                    <div className="mb-2 rounded-lg bg-zinc-950 p-2.5 text-xs leading-relaxed text-zinc-300 border-l-2 border-amber-500">
                      <strong className="text-amber-400">关联档案：</strong>
                      {h.tier2}
                    </div>
                  )}
                  {tier >= 3 && (
                    <div className="mb-2 rounded-lg bg-zinc-950 p-2.5 text-xs leading-relaxed text-zinc-200 border-l-2 border-red-500">
                      <strong className="text-red-400">破局答案：</strong>
                      {h.tier3}
                    </div>
                  )}

                  {tier < 3 && (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedHintTiers((prev) => ({ ...prev, [h.id]: (prev[h.id] || 0) + 1 }))
                      }
                      className="mt-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1 text-[11px] text-zinc-200 hover:border-emerald-500 cursor-pointer transition"
                    >
                      {tier === 0 ? '查看第一层方向提示' : tier === 1 ? '查看关联档案提示' : '实在卡关：展开直接答案'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {mode === 'settings' && (
          <>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                <ShieldAlert className="h-4 w-4 text-red-400" />
                <span>感官与惊吓演出模式</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeScareMode('full')}
                  className={`rounded-lg border p-2.5 text-left text-xs cursor-pointer transition ${
                    state.scareMode === 'full'
                      ? 'border-red-600/80 bg-red-950/40 text-red-100'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                  }`}
                >
                  <div className="font-bold">完整惊悚模式（默认）</div>
                  <div className="mt-0.5 text-[11px] opacity-80">
                    含转头扫描惊悚演出、CRT 故障音效与违规惊吓提示
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeScareMode('psychological')}
                  className={`rounded-lg border p-2.5 text-left text-xs cursor-pointer transition ${
                    state.scareMode === 'psychological'
                      ? 'border-amber-600/80 bg-amber-950/40 text-amber-100'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                  }`}
                >
                  <div className="font-bold">心理压迫模式（护眼无贴脸）</div>
                  <div className="mt-0.5 text-[11px] opacity-80">
                    保留全部老照片异变与 Meta 反转，移除高分贝炸耳声效
                  </div>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
              <div className="mb-2.5 flex items-center justify-between text-xs font-bold text-zinc-200">
                <span className="inline-flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-400" />
                  结局收集图鉴
                </span>
                <span className="font-mono-tech text-amber-300">{state.unlockedEndings.length} / 5</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {(Object.keys(ENDING_NAMES) as EndingId[]).map((eid) => {
                  const done = state.unlockedEndings.includes(eid);
                  return (
                    <div
                      key={eid}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                        done
                          ? 'border-amber-800/60 bg-amber-950/25 text-amber-200'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                      }`}
                    >
                      <span>{done ? ENDING_NAMES[eid] : '？？？未知结局'}</span>
                      {done && onViewEnding && (
                        <button
                          type="button"
                          onClick={() => {
                            onViewEnding(eid);
                            onClose();
                          }}
                          className="text-[11px] underline hover:text-white cursor-pointer"
                        >
                          重温
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2.5">
              <h3 className="text-xs font-bold text-zinc-200">跨设备存档码</h3>
              <button
                type="button"
                onClick={() => {
                  const code = exportSaveCode(state);
                  navigator.clipboard?.writeText(code);
                  setSaveInput(code);
                  setCopyFeedback('已生成并复制存档码');
                  setTimeout(() => setCopyFeedback(''), 2500);
                }}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 py-2 text-xs text-zinc-100 hover:border-amber-500 cursor-pointer transition"
              >
                <Copy className="h-3.5 w-3.5" />
                生成并复制存档码
              </button>
              {copyFeedback && <p className="text-center text-xs text-emerald-400">{copyFeedback}</p>}

              <textarea
                rows={3}
                value={saveInput}
                onChange={(e) => setSaveInput(e.target.value)}
                placeholder="粘贴 QH98- 开头的存档码……"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-[11px] font-mono-tech text-zinc-300"
              />
              <button
                type="button"
                onClick={() => {
                  const loaded = importSaveCode(saveInput);
                  if (loaded) {
                    onImportState(loaded);
                    setCopyFeedback('存档已载入');
                  } else {
                    setCopyFeedback('存档码无效');
                  }
                }}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-800/80 bg-emerald-950/40 py-2 text-xs text-emerald-200 hover:bg-emerald-900/50 cursor-pointer transition"
              >
                <Upload className="h-3.5 w-3.5" />
                导入存档码
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('确定清空当前调查进度并回到序幕封面吗？')) {
                  onResetGame();
                  onClose();
                }
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-900/60 bg-red-950/25 py-2 text-xs text-red-300 hover:bg-red-900/40 cursor-pointer transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重置进度从头开始
            </button>
          </>
        )}
      </div>
    </div>
  );
};
