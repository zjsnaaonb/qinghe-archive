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
  Camera,
  Eye,
  Zap,
} from 'lucide-react';
import type { EndingId, GameState, ScareMode, SiteId } from '../types/game';
import { PROGRESSIVE_HINTS } from '../data/hints';
import { exportSaveCode, importSaveCode } from '../engine/gameState';
import { SITE_METAS } from './TopInvestigatorBar';
import { stripInlineMarkdown } from './EditorialProse';
import { HORROR_CAPTURE_CATALOG } from './HauntedAtmosphereLayer';
import { ENCOUNTER_METAS, type EncounterId } from './EmergencyHorrorEncounter';
import { horrorAudio } from '../engine/audio';

const LENS_ANOMALY_CATALOG: Array<{ id: string; label: string; src: string }> = [
  { id: 'nuo_mask', label: 'QH-38-M01 无目盲傩眼窝活眼', src: './media/nuo_mask_lens.png' },
  { id: 'qh_12_03', label: 'QH-12-03 十月封镜湿发窥视眼', src: './media/qh_12_03_lens.png' },
  { id: 'shrine_1998', label: 'QH-38-S00 戏台回首与泥胎睁眼', src: './media/shrine_1998_lens.png' },
  { id: 'qh_26_03', label: 'QH-26-03 辞灶门外白雾湿衣人', src: './media/qh_26_03_lens.png' },
  { id: 'qh_10_04', label: 'QH-10-04 空心古樟泥脸窥视', src: './media/qh_10_04_lens.png' },
  { id: 'village_mist', label: 'QH-38-F02 拱桥整排黑褂仰望', src: './media/village_mist_lens.png' },
  { id: 'qh_05_08', label: 'QH-05-08 宗祠黑门洞滞留人影', src: './media/qh_05_08_lens.png' },
  { id: 'qh_19_02', label: 'QH-19-02 福春班账本暗红血书', src: './media/qh_19_02_lens.png' },
  { id: 'qh_01_02', label: 'QH-01-02 镇水铁牛拓片泣血眼', src: './media/qh_01_02_lens.png' },
  { id: 'thumbprint_ledger', label: '附表38 124枚红指模睁眼异变', src: './media/thumbprint_ledger_lens.png' },
];

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
  onReplayEncounter?: (encounterId: EncounterId) => void;
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
  onReplayEncounter,
}) => {
  const [kwDraft, setKwDraft] = useState('');
  const [revealedHintTiers, setRevealedHintTiers] = useState<Record<string, number>>({});
  const [saveInput, setSaveInput] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [codexTab, setCodexTab] = useState<'lens' | 'captures' | 'encounters'>('lens');
  const [previewPlate, setPreviewPlate] = useState<{ title: string; src: string } | null>(null);

  const discoveredLensIds = state.discoveredLensIds ?? [];
  const discoveredCaptureIds = state.discoveredCaptureIds ?? [];
  const survivedEncounters = state.survivedEncounters ?? [];
  const solvedPuzzleIds = state.solvedPuzzleIds ?? [];

  const rescuedCount = Object.values(state.rescued).filter(Boolean).length;
  const reelsDoneCount = [
    state.b2Progress.reel04Passed,
    state.b2Progress.reel09Passed,
    state.b2Progress.reel12Passed,
  ].filter(Boolean).length;

  const handleAddKw = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = kwDraft.trim();
    if (!trimmed) return;
    horrorAudio.playClick('ui');
    onAddManualKeyword(trimmed);
    setKwDraft('');
  };

  return (
    <div className="flex h-full flex-col bg-[#faf7f0] text-stone-800 border-l border-[#dfd8ca]">
      {/* 面板顶栏 */}
      <div className="flex items-center justify-between border-b border-[#e5dfd2] bg-[#f4efe4] px-5 py-3.5 shrink-0">
        <div>
          <h2 className="font-serif-cn text-base font-bold text-[#16263f]">
            {mode === 'notebook' && '随身调查手记'}
            {mode === 'hints' && '渐进式思路提示'}
            {mode === 'settings' && '偏好设置与存档'}
          </h2>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {mode === 'notebook' && '左栏页面与图片保持可见，直接划选原文即可摘录至此'}
            {mode === 'hints' && '仅在卡关时按需逐层展开，保留自主推演乐趣'}
            {mode === 'settings' && '惊吓分级、结局图鉴与跨设备存档码'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#d8d0c0] bg-white p-1.5 text-stone-500 hover:border-stone-400 hover:text-stone-900 cursor-pointer transition"
          title="收起侧栏"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 面板滚动内容区 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {mode === 'notebook' && (
          <>
            {/* 自由推理草稿板 */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                手写推理备忘（自动保存）
              </label>
              <textarea
                rows={6}
                value={state.playerMemo}
                onChange={(e) => onUpdateMemo(e.target.value)}
                placeholder="在此记录你发现的人数矛盾、项目编号、日期、密码推算或牌位顺序……"
                className="w-full rounded-xl border border-[#dcd4c4] bg-white p-3 text-xs leading-relaxed text-stone-800 placeholder-stone-400 shadow-2xs focus:border-[#9e2a2b]/60 focus:outline-none transition"
              />
            </div>

            {/* 玩家自建检索词标签 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  我的线索词签（点击直接跨站搜）
                </span>
              </div>
              <form onSubmit={handleAddKw} className="mb-2.5 flex gap-1.5">
                <input
                  type="text"
                  value={kwDraft}
                  onChange={(e) => setKwDraft(e.target.value)}
                  placeholder="记下可疑人名/编号/村名……"
                  className="flex-1 rounded-lg border border-[#dcd4c4] bg-white px-2.5 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-[#9e2a2b]/60 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#d6cebe] bg-white px-2.5 py-1.5 text-xs font-medium text-[#16263f] hover:border-[#9e2a2b]/60 hover:text-[#9e2a2b] cursor-pointer transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>记下</span>
                </button>
              </form>

              {state.unlockedKeywords.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#dcd4c4] bg-white/60 px-3 py-2 text-[11px] text-stone-500">
                  尚未收藏词签。在正文里发现异常名字或编号后，可在此添加或直接划词检索。
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {state.unlockedKeywords.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => onGlobalSearch(kw)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#9e2a2b]/30 bg-red-50/70 px-2.5 py-0.5 text-xs font-medium text-[#9e2a2b] hover:bg-red-100/80 cursor-pointer transition"
                    >
                      <Search className="h-2.5 w-2.5 opacity-75" />
                      <span>{kw}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 玩家亲自划词摘录的证据卡片 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  划词摘录剪贴板（{state.discoveredClues.length}）
                </span>
              </div>

              {state.discoveredClues.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#dcd4c4] bg-white/70 p-4 text-center">
                  <Pin className="mx-auto mb-2 h-5 w-5 text-stone-400" />
                  <p className="text-xs font-medium text-stone-600">手记目前是空白的</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                    本游戏不会替你自动提取谜底。阅读档案或论坛时，用鼠标
                    <strong className="text-[#9e2a2b]">划选任意可疑文字</strong>
                    ，即可一键摘录到这里随时对照。
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {[...state.discoveredClues].reverse().map((clue) => (
                    <div
                      key={clue.id}
                      className="group rounded-xl border border-[#e3dccf] bg-white p-3 shadow-2xs transition hover:border-[#9e2a2b]/45"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onJumpToSite(clue.sourceSite, clue.sourceDocId)}
                          className="inline-flex min-w-0 items-center gap-1 text-[11px] font-semibold text-[#9e2a2b] hover:underline cursor-pointer"
                          title={clue.sourceDocId ? `直接跳回原卷宗：${clue.title}` : `返回 ${SITE_METAS[clue.sourceSite].shortName}`}
                        >
                          <span className="truncate">
                            {clue.title && !clue.title.endsWith('摘录')
                              ? clue.title
                              : SITE_METAS[clue.sourceSite].shortName}
                          </span>
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveClue(clue.id)}
                          className="rounded p-1 text-stone-400 opacity-0 group-hover:opacity-100 hover:text-red-600 cursor-pointer transition"
                          title="移除该条摘录"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs leading-relaxed text-stone-700 whitespace-pre-line">
                        “{stripInlineMarkdown(clue.detail)}”
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 随游玩深入自然展开的非剧透调查脉络卡 */}
            <div className="rounded-xl border border-[#e3dccf] bg-white p-3.5 shadow-2xs">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                <span>当前调查脉络</span>
                <span className="font-mono-tech text-[#9e2a2b]">第 {state.act} 幕</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-stone-700">
                  <span>核查 QH-37-09《晒谷场收工图》与编号断层</span>
                  {state.readDocIds.includes('qh-37-09') ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <span className="text-[10px] text-amber-700">待查</span>
                  )}
                </div>
                {state.unlockedSites.includes('bbs') && (
                  <div className="flex items-center justify-between text-stone-700">
                    <span>排查校园社区线索，接入水利档案网与内部 OA</span>
                    {state.unlockedSites.includes('chronicles') && state.oaLevel >= 1 ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <span className="text-[10px] text-amber-700">进行中</span>
                    )}
                  </div>
                )}
                {state.act >= 2 && (
                  <div className="flex items-center justify-between text-stone-700">
                    <span>核实陈默考勤异常，解锁 OA 二级运维卷宗</span>
                    {state.oaLevel >= 2 ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <span className="text-[10px] text-amber-700">进行中</span>
                    )}
                  </div>
                )}
                {state.act >= 3 && (
                  <>
                    <div className="flex items-center justify-between text-stone-700">
                      <span>B2 逐帧台合规审看三卷母带（合成院长口令）</span>
                      <span className={`font-mono-tech text-[11px] ${reelsDoneCount === 3 ? 'text-emerald-700 font-semibold' : 'text-amber-700'}`}>
                        {reelsDoneCount}/3
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-stone-700">
                      <span>切断地下锚点解救四名受困成员</span>
                      <span className={`font-mono-tech text-[11px] ${rescuedCount === 4 ? 'text-emerald-700 font-semibold' : 'text-amber-700'}`}>
                        {rescuedCount}/4
                      </span>
                    </div>
                  </>
                )}
                {state.act >= 4 && (
                  <div className="flex items-center justify-between text-stone-700">
                    <span>核对木刻原叶真序与铁盒暗记，阻断零点推流</span>
                    <span className="text-[10px] font-semibold text-[#9e2a2b]">终局决战</span>
                  </div>
                )}
              </div>
            </div>

            {/* 第三幕以后才展示受困成员救援状态 */}
            {state.act >= 3 && (
              <div className="rounded-xl border border-[#e3dccf] bg-white p-3.5 shadow-2xs">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#16263f]">
                  <span>受困课题组成员状态</span>
                  <span className="font-mono-tech text-[#9e2a2b]">{rescuedCount} / 4</span>
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
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : 'border-stone-200 bg-stone-50 text-stone-600'
                      }`}
                    >
                      <span>{m.name}</span>
                      {m.ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <span className="text-[10px] text-stone-400">失联</span>
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
                      ? 'border-emerald-500/45 bg-white shadow-2xs'
                      : 'border-[#e3dccf] bg-white/60 opacity-60'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#16263f]">{h.stageTitle}</span>
                    {relevant && (
                      <span className="shrink-0 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                        当前阶段
                      </span>
                    )}
                  </div>

                  {tier >= 1 && (
                    <div className="mb-2 rounded-lg bg-emerald-50/70 p-2.5 text-xs leading-relaxed text-stone-800 border-l-2 border-emerald-600">
                      <strong className="text-emerald-800">方向提示：</strong>
                      {h.tier1}
                    </div>
                  )}
                  {tier >= 2 && (
                    <div className="mb-2 rounded-lg bg-amber-50/80 p-2.5 text-xs leading-relaxed text-stone-800 border-l-2 border-amber-600">
                      <strong className="text-amber-900">关联档案：</strong>
                      {h.tier2}
                    </div>
                  )}
                  {tier >= 3 && (
                    <div className="mb-2 rounded-lg bg-red-50/80 p-2.5 text-xs leading-relaxed text-stone-900 border-l-2 border-[#9e2a2b]">
                      <strong className="text-[#9e2a2b]">破局答案：</strong>
                      {h.tier3}
                    </div>
                  )}

                  {tier < 3 && (
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedHintTiers((prev) => ({ ...prev, [h.id]: (prev[h.id] || 0) + 1 }))
                      }
                      className="mt-1 rounded-lg border border-[#d6cebe] bg-[#f8f5ed] px-3 py-1 text-[11px] font-medium text-[#16263f] hover:border-emerald-600 hover:text-emerald-800 cursor-pointer transition"
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
            <div className="rounded-xl border border-[#e3dccf] bg-white p-3.5 shadow-2xs">
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-[#16263f]">
                <ShieldAlert className="h-4 w-4 text-[#9e2a2b]" />
                <span>感官与惊吓演出模式</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeScareMode('full')}
                  className={`rounded-lg border p-2.5 text-left text-xs cursor-pointer transition ${
                    state.scareMode === 'full'
                      ? 'border-[#9e2a2b]/60 bg-red-50/70 text-[#7f1d1d]'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <div className="font-bold">完整惊悚模式（默认）</div>
                  <div className="mt-0.5 text-[11px] opacity-85">
                    含转头扫描惊悚演出、故障音效与违规惊吓提示
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeScareMode('psychological')}
                  className={`rounded-lg border p-2.5 text-left text-xs cursor-pointer transition ${
                    state.scareMode === 'psychological'
                      ? 'border-amber-600/60 bg-amber-50/80 text-amber-950'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <div className="font-bold">心理压迫模式（护眼无贴脸）</div>
                  <div className="mt-0.5 text-[11px] opacity-85">
                    保留全部老照片异变与 Meta 反转，移除高分贝炸耳声效
                  </div>
                </button>
              </div>
            </div>

            {/* 暗房异象收集册（镜片潜影 10 + 实景抓拍 13 + 突发应对 4 + 实物互动 7） */}
            <div className="rounded-xl border border-[#e3dccf] bg-white p-3.5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#16263f]">
                <span className="inline-flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-[#9e2a2b]" />
                  暗房异象收集册
                </span>
                <span className="font-mono-tech text-[11px] text-stone-500">
                  互动解谜 {solvedPuzzleIds.length}/7
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCodexTab('lens')}
                  className={`rounded-lg border px-2 py-1.5 font-medium transition cursor-pointer ${
                    codexTab === 'lens'
                      ? 'border-[#9e2a2b]/60 bg-red-50 text-[#9e2a2b]'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  镜片潜影 {discoveredLensIds.length}/10
                </button>
                <button
                  type="button"
                  onClick={() => setCodexTab('captures')}
                  className={`rounded-lg border px-2 py-1.5 font-medium transition cursor-pointer ${
                    codexTab === 'captures'
                      ? 'border-[#9e2a2b]/60 bg-red-50 text-[#9e2a2b]'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  实景抓拍 {discoveredCaptureIds.length}/13
                </button>
                <button
                  type="button"
                  onClick={() => setCodexTab('encounters')}
                  className={`rounded-lg border px-2 py-1.5 font-medium transition cursor-pointer ${
                    codexTab === 'encounters'
                      ? 'border-[#9e2a2b]/60 bg-red-50 text-[#9e2a2b]'
                      : 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  突发应对 {survivedEncounters.length}/4
                </button>
              </div>

              {codexTab === 'lens' && (
                <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {LENS_ANOMALY_CATALOG.map((item) => {
                    const found = discoveredLensIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!found}
                        onClick={() => {
                          horrorAudio.playClick('film');
                          setPreviewPlate({ title: item.label, src: item.src });
                        }}
                        className={`flex flex-col overflow-hidden rounded-lg border text-left transition ${
                          found
                            ? 'border-[#dcd4c4] bg-[#faf7f0] hover:border-[#9e2a2b] cursor-pointer'
                            : 'border-stone-200 bg-stone-50 opacity-60 cursor-default'
                        }`}
                      >
                        <div className="relative h-14 w-full bg-zinc-900">
                          {found ? (
                            <img src={item.src} alt={item.label} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] font-mono-tech text-stone-500">
                              待放大镜显影
                            </div>
                          )}
                        </div>
                        <div className="truncate px-2 py-1 text-[10px] font-medium text-stone-700">
                          {found ? item.label : '？？？未显影底片'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {codexTab === 'captures' && (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {HORROR_CAPTURE_CATALOG.map((cap) => {
                    const found = discoveredCaptureIds.includes(cap.id);
                    return (
                      <div
                        key={cap.id}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${
                          found
                            ? 'border-[#dcd4c4] bg-[#faf7f0] text-stone-800'
                            : 'border-stone-200 bg-stone-50 text-stone-400'
                        }`}
                      >
                        <span className="truncate">{found ? cap.tag : '？？？未触发实景异象'}</span>
                        {found && (
                          <button
                            type="button"
                            onClick={() => {
                              horrorAudio.playClick('film');
                              setPreviewPlate({ title: cap.tag, src: cap.imageSrc });
                            }}
                            className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#9e2a2b] hover:underline cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                            检视
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {codexTab === 'encounters' && (
                <div className="space-y-2">
                  {(Object.keys(ENCOUNTER_METAS) as EncounterId[]).map((eid) => {
                    const meta = ENCOUNTER_METAS[eid];
                    const survived = survivedEncounters.includes(eid);
                    return (
                      <div
                        key={eid}
                        className={`rounded-lg border p-2.5 text-[11px] ${
                          survived
                            ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950'
                            : 'border-stone-200 bg-stone-50 text-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold">{meta.title}</span>
                          {onReplayEncounter && (
                            <button
                              type="button"
                              onClick={() => {
                                horrorAudio.playClick('film');
                                onClose();
                                onReplayEncounter(eid);
                              }}
                              className="inline-flex items-center gap-1 rounded border border-[#9e2a2b]/40 bg-white px-2 py-0.5 text-[10px] font-semibold text-[#9e2a2b] hover:bg-red-50 cursor-pointer"
                            >
                              <Zap className="h-2.5 w-2.5" />
                              {survived ? '重温演练' : '立即演练'}
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-[10.5px] leading-relaxed text-stone-500">
                          {survived ? `✓ 已成功镇压 · ${meta.shortRule}` : meta.shortRule}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#e3dccf] bg-white p-3.5 shadow-2xs">
              <div className="mb-2.5 flex items-center justify-between text-xs font-bold text-[#16263f]">
                <span className="inline-flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-600" />
                  结局收集图鉴
                </span>
                <span className="font-mono-tech text-[#9e2a2b]">{state.unlockedEndings.length} / 5</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {(Object.keys(ENDING_NAMES) as EndingId[]).map((eid) => {
                  const done = state.unlockedEndings.includes(eid);
                  return (
                    <div
                      key={eid}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                        done
                          ? 'border-amber-400/60 bg-amber-50/70 text-amber-950'
                          : 'border-stone-200 bg-stone-50 text-stone-400'
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
                          className="text-[11px] font-medium text-[#9e2a2b] underline hover:text-red-900 cursor-pointer"
                        >
                          重温
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[#e3dccf] bg-white p-3.5 shadow-2xs space-y-2.5">
              <h3 className="text-xs font-bold text-[#16263f]">跨设备存档码</h3>
              <button
                type="button"
                onClick={() => {
                  const code = exportSaveCode(state);
                  navigator.clipboard?.writeText(code);
                  setSaveInput(code);
                  setCopyFeedback('已生成并复制存档码');
                  setTimeout(() => setCopyFeedback(''), 2500);
                }}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#d6cebe] bg-[#f8f5ed] py-2 text-xs font-medium text-[#16263f] hover:border-[#9e2a2b] hover:text-[#9e2a2b] cursor-pointer transition"
              >
                <Copy className="h-3.5 w-3.5" />
                生成并复制存档码
              </button>
              {copyFeedback && <p className="text-center text-xs font-medium text-emerald-700">{copyFeedback}</p>}

              <textarea
                rows={3}
                value={saveInput}
                onChange={(e) => setSaveInput(e.target.value)}
                placeholder="粘贴 QH98- 开头的存档码……"
                className="w-full rounded-lg border border-[#dcd4c4] bg-stone-50 p-2 text-[11px] font-mono-tech text-stone-700"
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
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100 cursor-pointer transition"
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
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 py-2 text-xs font-medium text-[#9e2a2b] hover:bg-red-100 cursor-pointer transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重置进度从头开始
            </button>
          </>
        )}
      </div>

      {/* 收集册高清底片全屏检视弹窗 */}
      {previewPlate && (
        <div
          onClick={() => setPreviewPlate(null)}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/88 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-stone-700 bg-zinc-950 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3 text-xs text-stone-200">
              <span className="font-serif-cn font-bold">{previewPlate.title}</span>
              <button
                type="button"
                onClick={() => setPreviewPlate(null)}
                className="rounded-lg border border-stone-700 px-2.5 py-1 text-[11px] text-stone-300 hover:bg-stone-800 cursor-pointer"
              >
                关闭
              </button>
            </div>
            <img
              src={previewPlate.src}
              alt={previewPlate.title}
              className="max-h-[75vh] w-full object-contain bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};
