import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Lightbulb,
  Settings,
  Volume2,
  VolumeX,
  ShieldAlert,
  Eye,
  Mail,
  Globe,
  MessageSquare,
  Landmark,
  Lock,
  FileText,
  Radio,
  X,
  CheckCircle2,
  Copy,
  Upload,
  RotateCcw,
  Award,
} from 'lucide-react';
import type { EndingId, GameState, ScareMode, SiteId } from '../types/game';
import { PROGRESSIVE_HINTS } from '../data/hints';
import { exportSaveCode, importSaveCode } from '../engine/gameState';
import { horrorAudio } from '../engine/audio';

interface SiteMeta {
  id: SiteId;
  shortName: string;
  domain: string;
  icon: React.ReactNode;
}

export const SITE_METAS: Record<SiteId, SiteMeta> = {
  mail: {
    id: 'mail',
    shortName: '匿名收件箱',
    domain: 'mail://lin_zx_backup@nzu-edu.mail',
    icon: <Mail className="w-3.5 h-3.5" />,
  },
  qinghe: {
    id: 'qinghe',
    shortName: '青禾数字民俗馆',
    domain: 'https://qinghe-archive.edu.cn',
    icon: <Globe className="w-3.5 h-3.5" />,
  },
  bbs: {
    id: 'bbs',
    shortName: '紫荆树洞 & 显影液BBS',
    domain: 'https://bbs-snapshot.net/cache-2026',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
  },
  chronicles: {
    id: 'chronicles',
    shortName: '云溪水利与方志网',
    domain: 'http://yunxi-chronicles.gov.cn:8080',
    icon: <Landmark className="w-3.5 h-3.5" />,
  },
  oa: {
    id: 'oa',
    shortName: '青禾内部OA工单网',
    domain: 'https://oa.qinghe-internal.cn',
    icon: <Lock className="w-3.5 h-3.5" />,
  },
  notes: {
    id: 'notes',
    shortName: '夏夜拾遗·云笔记',
    domain: 'https://note.zhixia-memo.me',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  b2: {
    id: 'b2',
    shortName: 'B2远程审片与监控台',
    domain: 'wss://terminal.qinghe-b2.local:9838',
    icon: <Radio className="w-3.5 h-3.5" />,
  },
};

const ENDING_NAMES: Record<EndingId, string> = {
  ending_assimilation: '结局一：万目同龛（同化结局）',
  ending_overload: '结局二：断电沉渊（惨胜结局）',
  ending_sacrifice: '结局三：替影封门（孤身守龛）',
  ending_mirror_leak: '结局四：盲戏重开（反转结局）',
  ending_true: '结局五：水落青禾（完美真结局）',
};

interface TopInvestigatorBarProps {
  state: GameState;
  onSelectSite: (site: SiteId) => void;
  onGlobalSearch: (query: string) => void;
  onUpdateMemo: (memo: string) => void;
  onToggleMute: () => void;
  onChangeScareMode: (mode: ScareMode) => void;
  onImportState: (newState: GameState) => void;
  onResetGame: () => void;
  onViewEnding?: (ending: EndingId) => void;
}

export const TopInvestigatorBar: React.FC<TopInvestigatorBarProps> = ({
  state,
  onSelectSite,
  onGlobalSearch,
  onUpdateMemo,
  onToggleMute,
  onChangeScareMode,
  onImportState,
  onResetGame,
  onViewEnding,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [activeDrawer, setActiveDrawer] = useState<'notebook' | 'hints' | 'settings' | null>(null);
  const [revealedHintTiers, setRevealedHintTiers] = useState<Record<string, number>>({});
  const [saveInput, setSaveInput] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [countdownText, setCountdownText] = useState('02:17:44');

  // 模拟距 11月26日 00:00 线上百年民俗特展全网自动推流的压迫感倒计时
  useEffect(() => {
    const tick = () => {
      const elapsedSec = Math.floor((Date.now() - state.startedAt) / 1000);
      const baseRemaining = Math.max(59, 4 * 3600 - elapsedSec);
      const hrs = String(Math.floor(baseRemaining / 3600)).padStart(2, '0');
      const mins = String(Math.floor((baseRemaining % 3600) / 60)).padStart(2, '0');
      const secs = String(baseRemaining % 60).padStart(2, '0');
      setCountdownText(`${hrs}:${mins}:${secs}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [state.startedAt]);

  const rescuedCount = Object.values(state.rescued).filter(Boolean).length;
  const currentMeta = SITE_METAS[state.currentSite];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    horrorAudio.playClick('ui');
    onGlobalSearch(searchInput.trim());
  };

  // 第四幕 Meta 诡异搜索框占位词
  const searchPlaceholder =
    state.act >= 4
      ? '跨站检索关键词……（系统提示：请勿回头核对身后光线）'
      : '跨站检索关键词 / 村名 / 编号 / 人名（如：晒谷场收工图、周怀瑾、祠下村）';

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 text-zinc-200 backdrop-blur">
        {/* 第一排：终端状态顶栏 + 地址/跨站搜索 + 功能抽屉按钮 */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded border border-red-900/60 bg-red-950/40 px-2 py-0.5 text-xs font-mono-tech text-red-300">
              <Eye className="h-3.5 w-3.5 text-red-400" />
              第 {state.act} 幕
            </span>
            <span className="hidden sm:inline text-xs font-mono-tech text-zinc-400">
              特展公映倒计时: <strong className="text-amber-400">{countdownText}</strong>
            </span>
            <span
              className={`hidden md:inline-flex items-center gap-1 text-xs font-mono-tech ${
                state.contamination >= 55 ? 'text-red-400' : 'text-zinc-400'
              }`}
              title="违反审片规范或直视未过滤母带会升高视网膜残留指数"
            >
              视网膜残留: <strong>{state.contamination}%</strong>
            </span>
          </div>

          {/* 模拟地址栏与跨站搜索引擎 */}
          <form onSubmit={handleSearchSubmit} className="flex flex-1 max-w-xl items-center gap-1.5">
            <div className="hidden lg:flex items-center gap-1 rounded-l border border-r-0 border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-mono-tech text-zinc-400 select-all">
              {currentMeta.domain}
            </div>
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded lg:rounded-l-none border border-zinc-700 bg-zinc-900/90 py-1 pl-3 pr-8 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-600 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-amber-400 cursor-pointer"
                title="执行跨站检索"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          {/* 右侧调查工具组 */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                horrorAudio.playClick('ui');
                setActiveDrawer(activeDrawer === 'notebook' ? null : 'notebook');
              }}
              className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium cursor-pointer transition ${
                activeDrawer === 'notebook'
                  ? 'border-amber-500 bg-amber-950/50 text-amber-200'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-400" />
              <span>手记</span>
              <span className="rounded bg-zinc-800 px-1 text-[10px] font-mono-tech text-amber-300">
                {state.discoveredClues.length}
              </span>
            </button>

            <button
              onClick={() => {
                horrorAudio.playClick('ui');
                setActiveDrawer(activeDrawer === 'hints' ? null : 'hints');
              }}
              className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium cursor-pointer transition ${
                activeDrawer === 'hints'
                  ? 'border-emerald-500 bg-emerald-950/50 text-emerald-200'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500'
              }`}
              title="不剧透分级推理引导"
            >
              <Lightbulb className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">思路提示</span>
            </button>

            <button
              onClick={onToggleMute}
              className="rounded border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-300 hover:border-zinc-500 cursor-pointer"
              title={state.audioMuted ? '开启环境声效' : '静音环境声效'}
            >
              {state.audioMuted ? (
                <VolumeX className="h-3.5 w-3.5 text-red-400" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </button>

            <button
              onClick={() => {
                horrorAudio.playClick('ui');
                setActiveDrawer(activeDrawer === 'settings' ? null : 'settings');
              }}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs cursor-pointer ${
                activeDrawer === 'settings'
                  ? 'border-zinc-400 bg-zinc-800 text-white'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
              }`}
              title="惊吓模式、存档导入导出与多结局图鉴"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden md:inline">设置/存档</span>
            </button>
          </div>
        </div>

        {/* 第二排：已解锁的多站点书签切换栏 */}
        <div className="border-t border-zinc-800/80 bg-zinc-900/80 px-3 py-1">
          <div className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="mr-1 shrink-0 text-[11px] font-mono-tech text-zinc-500">已接入站点:</span>
            {(['mail', 'qinghe', 'bbs', 'chronicles', 'oa', 'notes', 'b2'] as SiteId[]).map((siteId) => {
              const unlocked = state.unlockedSites.includes(siteId);
              if (!unlocked) {
                return (
                  <span
                    key={siteId}
                    className="inline-flex shrink-0 items-center gap-1 rounded border border-dashed border-zinc-800 px-2 py-0.5 text-[11px] text-zinc-600 select-none"
                    title="尚未通过调查发现该站点入口"
                  >
                    <Lock className="h-3 w-3" />
                    未知节点
                  </span>
                );
              }
              const meta = SITE_METAS[siteId];
              const active = state.currentSite === siteId;
              return (
                <button
                  key={siteId}
                  onClick={() => {
                    horrorAudio.playClick('ui');
                    onSelectSite(siteId);
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium cursor-pointer transition ${
                    active
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-500/60 shadow-sm'
                      : 'bg-zinc-950/60 text-zinc-300 border border-zinc-800 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  {meta.icon}
                  <span>{meta.shortName}</span>
                  {siteId === 'oa' && state.oaLevel > 0 && (
                    <span className="rounded bg-emerald-950 px-1 text-[10px] font-mono-tech text-emerald-300">
                      Lv.{state.oaLevel}
                    </span>
                  )}
                </button>
              );
            })}

            {state.act >= 3 && (
              <span className="ml-auto shrink-0 text-[11px] font-mono-tech text-zinc-500">
                {state.act >= 4 ? (
                  <span className="text-red-400 animate-pulse">当前同页浏览：2 人</span>
                ) : (
                  <span>受困成员救援：{rescuedCount}/4</span>
                )}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 抽屉 1：调查手记、已收集关键词、四名研究生状态与自由备忘录 */}
      {activeDrawer === 'notebook' && (
        <div className="fixed inset-y-0 right-0 z-[90] w-full max-w-md border-l border-zinc-800 bg-zinc-950/98 p-5 text-zinc-200 shadow-2xl overflow-y-auto">
          <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="font-serif-cn text-lg font-bold text-amber-200">调查员随身手记</h2>
              <p className="text-xs text-zinc-400">自动归档关键发现 · 点击词条可快速跨站检索</p>
            </div>
            <button
              onClick={() => setActiveDrawer(null)}
              className="rounded border border-zinc-700 p-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 课题组失联人员救援进度 */}
          <div className="mb-5 rounded border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-zinc-300">
              <span>课题组受困成员状态（影响终局走向）</span>
              <span className="font-mono-tech text-amber-300">{rescuedCount} / 4 已脱离污染</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: 'suXiaotang', name: '苏晓棠 (编目组)', ok: state.rescued.suXiaotang, hint: '善本库镜面隔离' },
                { key: 'zhaoYiming', name: '赵一鸣 (音频组)', ok: state.rescued.zhaoYiming, hint: '消音棚伪声辨伪' },
                { key: 'chenMo', name: '陈默 (技术组)', ok: state.rescued.chenMo, hint: 'AI补帧模型回滚' },
                { key: 'linZhixia', name: '林知夏 (大师姐)', ok: state.rescued.linZhixia, hint: '双重视野朱砂锚点' },
              ].map((m) => (
                <div
                  key={m.key}
                  className={`rounded border p-2 ${
                    m.ok
                      ? 'border-emerald-800/80 bg-emerald-950/30 text-emerald-200'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium">
                    <span>{m.name}</span>
                    {m.ok && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                  <div className="mt-0.5 text-[11px] opacity-75">
                    {m.ok ? '已切断视觉/听觉锚点' : `待调查：${m.hint}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 已提取的高价值检索词 */}
          <div className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              已发现的检索关键词（点击直接搜索）
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {state.unlockedKeywords.map((kw) => (
                <button
                  key={kw}
                  onClick={() => {
                    onGlobalSearch(kw);
                    setActiveDrawer(null);
                  }}
                  className="rounded border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 text-xs text-amber-200 hover:bg-amber-900/50 cursor-pointer"
                >
                  #{kw}
                </button>
              ))}
            </div>
          </div>

          {/* 自由推理备忘录 */}
          <div className="mb-5">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              自由推理备忘板（实时自动保存）
            </h3>
            <textarea
              rows={5}
              value={state.playerMemo}
              onChange={(e) => onUpdateMemo(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-900 p-2.5 text-xs font-mono-tech leading-relaxed text-zinc-200 focus:border-amber-500 focus:outline-none"
              placeholder="在此随手记下可疑的编号、日期、密码碎片或牌位顺序……"
            />
          </div>

          {/* 自动归档线索时间轴 */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              关键证据归档（{state.discoveredClues.length} 条）
            </h3>
            <div className="space-y-2.5">
              {[...state.discoveredClues].reverse().map((clue) => (
                <div key={clue.id} className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-200">{clue.title}</span>
                    <span className="text-[10px] font-mono-tech text-zinc-500">
                      {SITE_METAS[clue.sourceSite].shortName}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-zinc-300">{clue.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 抽屉 2：三级渐进式不剧透思维提示 */}
      {activeDrawer === 'hints' && (
        <div className="fixed inset-y-0 right-0 z-[90] w-full max-w-md border-l border-zinc-800 bg-zinc-950/98 p-5 text-zinc-200 shadow-2xl overflow-y-auto">
          <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="font-serif-cn text-lg font-bold text-emerald-300">渐进式调查思路引导</h2>
              <p className="text-xs text-zinc-400">长流程防卡关辅助：按需逐层展开，保留自主推理乐趣</p>
            </div>
            <button
              onClick={() => setActiveDrawer(null)}
              className="rounded border border-zinc-700 p-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {PROGRESSIVE_HINTS.map((h) => {
              const relevant = h.isRelevant(state);
              const tier = revealedHintTiers[h.id] || 0;
              return (
                <div
                  key={h.id}
                  className={`rounded border p-3.5 ${
                    relevant
                      ? 'border-emerald-800/70 bg-zinc-900/90'
                      : 'border-zinc-800/60 bg-zinc-950 opacity-55'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-100">{h.stageTitle}</span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                        relevant ? 'bg-emerald-950 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {relevant ? '当前可推进' : '已完成/后续阶段'}
                    </span>
                  </div>

                  {tier >= 1 && (
                    <div className="mb-2 rounded bg-zinc-950 p-2 text-xs text-zinc-300 border-l-2 border-emerald-600">
                      <strong className="text-emerald-400">提示 1（观察方向）：</strong>
                      {h.tier1}
                    </div>
                  )}
                  {tier >= 2 && (
                    <div className="mb-2 rounded bg-zinc-950 p-2 text-xs text-zinc-300 border-l-2 border-amber-500">
                      <strong className="text-amber-400">提示 2（关联档案）：</strong>
                      {h.tier2}
                    </div>
                  )}
                  {tier >= 3 && (
                    <div className="mb-2 rounded bg-zinc-950 p-2 text-xs text-zinc-200 border-l-2 border-red-500">
                      <strong className="text-red-400">提示 3（推理突破口）：</strong>
                      {h.tier3}
                    </div>
                  )}

                  {tier < 3 && (
                    <button
                      onClick={() =>
                        setRevealedHintTiers((prev) => ({ ...prev, [h.id]: (prev[h.id] || 0) + 1 }))
                      }
                      className="mt-1 rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-200 hover:border-emerald-500 cursor-pointer"
                    >
                      {tier === 0 ? '展开第一层方向提示' : tier === 1 ? '展开第二层关联档案' : '展开最终推理突破口'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 抽屉 3：惊吓强度开关、结局收集图鉴与跨设备存档码 */}
      {activeDrawer === 'settings' && (
        <div className="fixed inset-y-0 right-0 z-[90] w-full max-w-md border-l border-zinc-800 bg-zinc-950/98 p-5 text-zinc-200 shadow-2xl overflow-y-auto">
          <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="font-serif-cn text-lg font-bold text-zinc-100">惊吓分级、结局图鉴与存档</h2>
              <p className="text-xs text-zinc-400">进度自动保存在本地浏览器，也可导出存档码跨设备续玩</p>
            </div>
            <button
              onClick={() => setActiveDrawer(null)}
              className="rounded border border-zinc-700 p-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 惊吓模式切换 */}
          <div className="mb-5 rounded border border-zinc-800 bg-zinc-900/80 p-3.5">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-zinc-200">
              <ShieldAlert className="h-4 w-4 text-red-400" />
              <span>感官与惊吓演出模式</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onChangeScareMode('full')}
                className={`rounded border p-2.5 text-left text-xs cursor-pointer ${
                  state.scareMode === 'full'
                    ? 'border-red-600 bg-red-950/40 text-red-100'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                }`}
              >
                <div className="font-bold">完整惊悚模式（默认推荐）</div>
                <div className="mt-0.5 text-[11px] opacity-80">
                  包含老照片动态转头异变、CRT 故障闪烁、铜锣声效压迫及违规时的贴脸惊吓演出。
                </div>
              </button>
              <button
                onClick={() => onChangeScareMode('psychological')}
                className={`rounded border p-2.5 text-left text-xs cursor-pointer ${
                  state.scareMode === 'psychological'
                    ? 'border-amber-600 bg-amber-950/40 text-amber-100'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                }`}
              >
                <div className="font-bold">心理压迫模式（无突发贴脸 / 直播友好）</div>
                <div className="mt-0.5 text-[11px] opacity-80">
                  完整保留细思极恐文本、照片渐进异变与 Meta 第四面墙反转，移除高分贝炸耳与突发贴脸画面。
                </div>
              </button>
            </div>
          </div>

          {/* 五大分支结局解锁图鉴 */}
          <div className="mb-5 rounded border border-zinc-800 bg-zinc-900/80 p-3.5">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-200">
              <span className="inline-flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-400" />
                五大分支结局收集进度
              </span>
              <span className="font-mono-tech text-amber-300">{state.unlockedEndings.length} / 5</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {(Object.keys(ENDING_NAMES) as EndingId[]).map((eid) => {
                const done = state.unlockedEndings.includes(eid);
                return (
                  <div
                    key={eid}
                    className={`flex items-center justify-between rounded border px-2.5 py-1.5 ${
                      done
                        ? 'border-amber-800/60 bg-amber-950/25 text-amber-200'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                    }`}
                  >
                    <span>{done ? ENDING_NAMES[eid] : '？？？未知结局（尚未达成）'}</span>
                    {done && onViewEnding && (
                      <button
                        onClick={() => {
                          onViewEnding(eid);
                          setActiveDrawer(null);
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

          {/* 存档导入导出 */}
          <div className="mb-5 rounded border border-zinc-800 bg-zinc-900/80 p-3.5">
            <h3 className="mb-2 text-xs font-bold text-zinc-200">跨设备存档码（Base64）</h3>
            <button
              onClick={() => {
                const code = exportSaveCode(state);
                navigator.clipboard?.writeText(code);
                setSaveInput(code);
                setCopyFeedback('已生成并复制存档码！');
                setTimeout(() => setCopyFeedback(''), 2500);
              }}
              className="mb-2 inline-flex w-full items-center justify-center gap-1.5 rounded border border-zinc-700 bg-zinc-800 py-1.5 text-xs text-zinc-100 hover:border-amber-500 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              一键生成并复制当前存档码
            </button>
            {copyFeedback && <p className="mb-2 text-center text-xs text-emerald-400">{copyFeedback}</p>}

            <textarea
              rows={3}
              value={saveInput}
              onChange={(e) => setSaveInput(e.target.value)}
              placeholder="在此粘贴 QH98- 开头的存档码以恢复进度……"
              className="mb-2 w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-[11px] font-mono-tech text-zinc-300"
            />
            <button
              onClick={() => {
                const loaded = importSaveCode(saveInput);
                if (loaded) {
                  onImportState(loaded);
                  setCopyFeedback('存档恢复成功！');
                } else {
                  setCopyFeedback('存档码格式无效，请检查是否复制完整。');
                }
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-emerald-800 bg-emerald-950/50 py-1.5 text-xs text-emerald-200 hover:bg-emerald-900/60 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              导入并载入存档码
            </button>
          </div>

          {/* 重置调查 */}
          <div className="border-t border-zinc-800 pt-3">
            <button
              onClick={() => {
                if (window.confirm('确定要清空当前调查进度并回到序幕求救邮件吗？（已解锁结局可先导出存档码备份）')) {
                  onResetGame();
                  setActiveDrawer(null);
                }
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-red-900/70 bg-red-950/30 py-2 text-xs text-red-300 hover:bg-red-900/50 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              清空当前记录并从头开始调查
            </button>
          </div>
        </div>
      )}
    </>
  );
};
