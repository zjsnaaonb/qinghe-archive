import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ArrowLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { QINGHE_ARCHIVE_ENTRIES } from '../data/qingheArchiveData';
import type { ArchiveEntry } from '../types/game';
import type { CommonSiteProps } from './siteProps';
import { ForensicPhotoViewer, VISUAL_CAPTIONS } from '../components/ForensicPhotoViewer';
import { TornNoteJigsaw, WipeRevealBoard } from '../components/TactileDarkroomPuzzle';
import { EditorialProse } from '../components/EditorialProse';
import { extractSearchSnippet, scoreSearchMatch } from '../engine/search';
import { siteUiMemory } from '../engine/siteMemory';
import { horrorAudio } from '../engine/audio';

type CategoryFilter = '全部馆藏' | ArchiveEntry['category'] | '已发现残卷';

const CATEGORIES: CategoryFilter[] = [
  '全部馆藏',
  '工作公示',
  '图像档案',
  '口述访谈',
  '器物标本',
];

export const QinghePortalSite: React.FC<CommonSiteProps> = ({
  state,
  focusedItemId,
  onClearFocus,
  navCommand,
  onRecordNav,
  onNavigateSite,
  onUnlockSite,
  onMarkRead,
  onRecordPhotoView,
  onDiscoverLensAnomaly,
  onSolvePuzzle,
  onAdjustContamination,
  onTriggerScare,
}) => {
  const [viewMode, setViewMode] = useState<'home' | 'detail'>(() => siteUiMemory.qinghe.viewMode);
  const [category, setCategory] = useState<CategoryFilter>(() => siteUiMemory.qinghe.category);
  const [localQuery, setLocalQuery] = useState(() => siteUiMemory.qinghe.localQuery);
  const [selectedEntryId, setSelectedEntryId] = useState<string>(() => siteUiMemory.qinghe.selectedEntryId);
  const [compareOriginalSnapshot, setCompareOriginalSnapshot] = useState(false);
  const [fullCatalogOpen, setFullCatalogOpen] = useState(() => siteUiMemory.qinghe.fullCatalogOpen);
  const lastNavSeqRef = useRef<number>(0);

  useEffect(() => {
    siteUiMemory.qinghe.viewMode = viewMode;
    siteUiMemory.qinghe.category = category;
    siteUiMemory.qinghe.localQuery = localQuery;
    siteUiMemory.qinghe.selectedEntryId = selectedEntryId;
    siteUiMemory.qinghe.fullCatalogOpen = fullCatalogOpen;
  }, [viewMode, category, localQuery, selectedEntryId, fullCatalogOpen]);

  // 响应跨站检索或引导条直达具体条目
  useEffect(() => {
    if (focusedItemId && QINGHE_ARCHIVE_ENTRIES.some((e) => e.id === focusedItemId)) {
      setSelectedEntryId(focusedItemId);
      setViewMode('detail');
      setCompareOriginalSnapshot(false);
      onClearFocus?.();
    }
  }, [focusedItemId, onClearFocus]);

  // 响应顶部「上一处 / 下一处 / 足迹」历史栈精确还原状态（含同站不同条目切换）
  useEffect(() => {
    if (!navCommand || navCommand.site !== 'qinghe' || navCommand.seq === lastNavSeqRef.current) {
      return;
    }
    lastNavSeqRef.current = navCommand.seq;
    if (navCommand.itemId === '__home__' || navCommand.itemId === '__list__') {
      setViewMode('home');
    } else if (QINGHE_ARCHIVE_ENTRIES.some((e) => e.id === navCommand.itemId)) {
      setSelectedEntryId(navCommand.itemId);
      setCompareOriginalSnapshot(false);
      setViewMode('detail');
    }
  }, [navCommand]);

  const discoveredHiddenEntries = useMemo(
    () =>
      QINGHE_ARCHIVE_ENTRIES.filter(
        (e) => e.hiddenFromList && state.readDocIds.includes(e.id)
      ),
    [state.readDocIds]
  );

  const activeQuery = localQuery.trim();

  // 智能高精度馆内检索：实时输入即筛选，支持无连字符编号(3709/1203/qh38)、空格多词与上下文命中摘要
  const searchScoredEntries = useMemo(() => {
    if (!activeQuery) return null;
    const scored: Array<{ entry: ArchiveEntry; score: number; snippet: string }> = [];

    for (const entry of QINGHE_ARCHIVE_ENTRIES) {
      const res = scoreSearchMatch(activeQuery, {
        code: entry.code,
        title: entry.title,
        subtitle: `${entry.village} ${entry.year} ${entry.category} ${entry.photographer ?? ''}`,
        tags: entry.keywords,
        summary: entry.summary,
        body: entry.content,
        // 未挂接隐藏残卷仅在匹配编号/村名/采风人/专属关键词时检出，防止搜普通词误剧透
        allowBodyMatch: !entry.hiddenFromList,
      });
      if (res.matched) {
        scored.push({
          entry,
          score: res.score,
          snippet: extractSearchSnippet(entry.content, activeQuery, entry.summary, res.bestTerm),
        });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }, [activeQuery]);

  const filteredEntries = useMemo(() => {
    if (searchScoredEntries) {
      return searchScoredEntries.map((s) => s.entry);
    }
    if (category === '已发现残卷') return discoveredHiddenEntries;
    return QINGHE_ARCHIVE_ENTRIES.filter((entry) => {
      if (entry.hiddenFromList) return false;
      if (category === '全部馆藏') return true;
      return entry.category === category;
    });
  }, [searchScoredEntries, category, discoveredHiddenEntries]);

  const snippetByEntryId = useMemo(() => {
    const map = new Map<string, string>();
    if (searchScoredEntries) {
      for (const s of searchScoredEntries) {
        map.set(s.entry.id, s.snippet);
      }
    }
    return map;
  }, [searchScoredEntries]);

  const activeEntry = useMemo(() => {
    return (
      QINGHE_ARCHIVE_ENTRIES.find((e) => e.id === selectedEntryId) ??
      QINGHE_ARCHIVE_ENTRIES[0]
    );
  }, [selectedEntryId]);

  const openEntry = (id: string) => {
    const target = QINGHE_ARCHIVE_ENTRIES.find((e) => e.id === id);
    horrorAudio.playClick('ui');
    setSelectedEntryId(id);
    setCompareOriginalSnapshot(false);
    setViewMode('detail');
    if (target) {
      onRecordNav?.(
        target.id,
        `${target.code} · ${target.title.replace(/[《》]/g, '').slice(0, 14)}`
      );
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (viewMode !== 'detail' || !activeEntry) return;
    if (!state.readDocIds.includes(activeEntry.id)) {
      onMarkRead(activeEntry.id);
    }
  }, [viewMode, activeEntry, state.readDocIds, onMarkRead]);

  const handlePortalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    horrorAudio.playClick('ui');
    if (!activeQuery) return;
    // 若仅唯一命中一条（例如精确输入 QH-12-03 或 3709），回车直接打开该卷宗；否则切到列表展示全部命中项
    if (searchScoredEntries && searchScoredEntries.length === 1) {
      openEntry(searchScoredEntries[0].entry.id);
      return;
    }
    if (viewMode !== 'home') {
      setViewMode('home');
      onRecordNav?.('__home__', `青禾馆检索 · “${activeQuery.slice(0, 10)}”`);
    }
  };

  const hasMutationNow =
    (state.act >= 4 && Boolean(activeEntry?.act4MutatedContent)) ||
    (state.act >= 3 && Boolean(activeEntry?.act3MutatedContent));

  const displayedContent = useMemo(() => {
    if (!activeEntry) return '';
    if (compareOriginalSnapshot) return activeEntry.content;
    if (state.act >= 4 && activeEntry.act4MutatedContent) return activeEntry.act4MutatedContent;
    if (state.act >= 3 && activeEntry.act3MutatedContent) return activeEntry.act3MutatedContent;
    return activeEntry.content;
  }, [activeEntry, state.act, compareOriginalSnapshot]);

  const showTwoViewersAnomaly =
    state.act >= 3 ||
    activeEntry?.id === 'qh-37-09' ||
    activeEntry?.id === 'qh-12-03' ||
    activeEntry?.id === 'qh-24-07' ||
    activeEntry?.id === 'qh-36-02' ||
    Boolean(activeEntry?.hiddenFromList);

  const featuredIds = ['qh-37-09', 'qh-overview-grant', 'qh-39-01'];
  const featuredEntries = featuredIds
    .map((id) => QINGHE_ARCHIVE_ENTRIES.find((e) => e.id === id))
    .filter((e): e is ArchiveEntry => Boolean(e));

  const hasInspected3709 = state.readDocIds.includes('qh-37-09');
  const showFullCatalog =
    hasInspected3709 || fullCatalogOpen || Boolean(activeQuery) || category !== '全部馆藏';
  const progressiveBlocks = state.act === 1 ? 2 : state.act === 2 ? 4 : undefined;

  return (
    <div className="min-h-[calc(100vh-124px)] bg-[#f6f3ec] text-[#1f2937]">
      {/* 典雅明亮的高校数字博物馆纸本页眉（纯正排版，零AI图标） */}
      <div className="border-t-4 border-t-[#9e2a2b] border-b border-[#dfd8ca] bg-[#fcfaf5] text-[#16263f]">
        <div className="mx-auto max-w-6xl px-5 py-7">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-[#9e2a2b]">
                <span className="rounded-[2px] border border-[#9e2a2b] px-1.5 py-0.2 font-serif-cn text-[10px] font-bold">
                  典藏
                </span>
                <span>南州大学人文高等研究院</span>
                <span>·</span>
                <span className="font-mono-tech">省社科重点项目 24ZDA0838</span>
              </div>
              <h1 className="mt-1.5 font-serif-cn text-2xl sm:text-3xl font-bold tracking-[0.08em] text-[#16263f]">
                {state.act >= 4 ? '青禾数字民俗馆 · 遗存影像总目' : '青禾数字民俗馆'}
              </h1>
              <p className="mt-1.5 text-xs text-stone-500">
                1996—1999 云溪水库淹没区三十七村抢救性田野影像、口述史与器物数字典藏
              </p>
            </div>

            {/* 实时响应的高精度馆内检索框 */}
            <form onSubmit={handlePortalSearch} className="w-full sm:w-84">
              <div className="relative">
                <input
                  type="text"
                  value={localQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalQuery(val);
                    if (val.trim() && viewMode !== 'home') {
                      setViewMode('home');
                    }
                  }}
                  placeholder="输入编号(如1203/3709)、村名、人名实时检索……"
                  className="w-full rounded-xl border border-[#d6cebe] bg-white py-2.5 pl-4 pr-16 text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:border-[#9e2a2b] focus:outline-none transition"
                />
                {localQuery && (
                  <button
                    type="button"
                    onClick={() => setLocalQuery('')}
                    className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                    title="清空检索词"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#9e2a2b] hover:bg-red-50 cursor-pointer"
                  title="馆内精准检索"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 主体内容区 */}
      <div className="mx-auto max-w-6xl px-5 py-8">
        <AnimatePresence mode="wait">
          {viewMode === 'home' ? (
            <motion.div
              key="qinghe-home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="space-y-9"
            >
              {/* 首屏 3 张精选核心卡片（仅在未搜索时展示） */}
              {!activeQuery && (
                <section>
                  <div className="mb-4 flex items-baseline justify-between">
                    <h2 className="font-serif-cn text-lg font-bold text-[#16263f]">
                      重点推荐典藏与项目公示
                    </h2>
                    <span className="text-xs text-stone-500">
                      按 1999 截流淹没区官方名录编目
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    {featuredEntries.map((item, idx) => (
                      <motion.button
                        key={item.id}
                        type="button"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06, duration: 0.28 }}
                        whileHover={{ y: -3 }}
                        onClick={() => openEntry(item.id)}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-[#dfd8ca] bg-white text-left shadow-sm hover:border-[#9e2a2b]/50 hover:shadow-md cursor-pointer transition"
                      >
                        {item.specialPhotoId && VISUAL_CAPTIONS[item.specialPhotoId] ? (
                          <div className="relative h-36 w-full overflow-hidden bg-zinc-900">
                            <img
                              src={VISUAL_CAPTIONS[item.specialPhotoId].src}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105"
                            />
                            <span className="absolute left-3 top-3 rounded-md bg-[#9e2a2b] px-2 py-0.5 font-mono-tech text-[10px] font-semibold text-white shadow-sm">
                              {item.code}
                            </span>
                            <span className="absolute right-3 bottom-2.5 rounded bg-black/70 px-2 py-0.5 font-mono-tech text-[10px] text-amber-200 backdrop-blur-xs">
                              原片取证
                            </span>
                          </div>
                        ) : (
                          <div className="flex h-36 flex-col justify-between bg-gradient-to-br from-[#f2ede2] to-[#e9e2d3] p-5">
                            <span className="w-fit rounded-md border border-[#16263f]/20 bg-white/80 px-2 py-0.5 font-mono-tech text-[10px] font-semibold text-[#16263f]">
                              {item.code}
                            </span>
                            <div className="font-serif-cn text-xs text-stone-500">
                              {item.category} · {item.year}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="font-serif-cn text-base font-bold text-[#16263f] group-hover:text-[#9e2a2b] transition">
                            {item.title}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-600">
                            {item.summary}
                          </p>
                          <div className="mt-auto pt-4 flex items-center justify-between text-xs font-medium text-[#16263f]">
                            <span>调阅全卷</span>
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </section>
              )}

              {/* 渐进式馆藏目录 */}
              {!showFullCatalog ? (
                <div className="rounded-2xl border border-[#dfd8ca] bg-white/80 p-6 text-center shadow-2xs">
                  <p className="text-xs text-stone-500">
                    建议先调阅上方重点推荐的 <strong className="text-[#9e2a2b]">QH-37-09《晒谷场收工图》</strong>；如需直接翻阅全部三十七村历史归档卡片，可随时展开完整目录。
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      setFullCatalogOpen(true);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#d6cebe] bg-white px-4 py-1.5 text-xs font-semibold text-[#16263f] hover:border-[#9e2a2b] hover:text-[#9e2a2b] cursor-pointer transition"
                  >
                    <span>展开全部公开馆藏目录（{filteredEntries.length} 卷）</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <section>
                  {hasInspected3709 && discoveredHiddenEntries.length === 0 && !activeQuery && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/75 bg-amber-50/75 px-4 py-2.5 text-xs text-amber-950">
                      <span>
                        <strong>馆藏索引说明：</strong>公开列表仅列示已挂接分区（<code className="font-mono-tech">QH-01</code> 至 <code className="font-mono-tech">QH-37</code> 及特展段 <code className="font-mono-tech">QH-39</code>）。未挂接之空缺分区或采集人底稿，可在右上角检索框输入<strong>分区号（如 QH-38）</strong>或<strong>采集人姓名/缩写</strong>调档。
                      </span>
                    </div>
                  )}

                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#dfd8ca] pb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            horrorAudio.playClick('ui');
                            setLocalQuery('');
                            setCategory(cat);
                          }}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-medium cursor-pointer transition ${
                            !activeQuery && category === cat
                              ? 'bg-[#16263f] text-white shadow-sm'
                              : 'bg-white text-stone-600 border border-[#dfd8ca] hover:border-stone-400'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                      {discoveredHiddenEntries.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            horrorAudio.playClick('ui');
                            setLocalQuery('');
                            setCategory('已发现残卷');
                          }}
                          className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium cursor-pointer transition ${
                            !activeQuery && category === '已发现残卷'
                              ? 'bg-[#9e2a2b] text-white'
                              : 'border border-red-900/30 bg-red-50 text-[#9e2a2b]'
                          }`}
                        >
                          <span>未编目残卷 ({discoveredHiddenEntries.length})</span>
                        </button>
                      )}
                    </div>

                    {activeQuery && (
                      <div className="flex items-center gap-2 text-xs text-stone-600">
                        <span>
                          精准检索 “<strong className="text-[#9e2a2b]">{activeQuery}</strong>” 命中 {filteredEntries.length} 条（按相关度排序）
                        </span>
                        <button
                          type="button"
                          onClick={() => setLocalQuery('')}
                          className="underline hover:text-[#16263f] cursor-pointer"
                        >
                          清除
                        </button>
                      </div>
                    )}
                  </div>

                  {filteredEntries.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#d4ccbc] bg-white/60 py-14 text-center text-sm text-stone-500">
                      未在当前馆藏中检索到 “{activeQuery}”。支持直接输入数字编号（如 1203、24、36、3709）、人名或村名。
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                      {filteredEntries.map((entry) => {
                        const isRead = state.readDocIds.includes(entry.id);
                        const thumbSrc = entry.specialPhotoId
                          ? VISUAL_CAPTIONS[entry.specialPhotoId]?.src
                          : undefined;
                        const displaySnippet = snippetByEntryId.get(entry.id) ?? entry.summary;

                        return (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => openEntry(entry.id)}
                            className="group flex items-stretch gap-3.5 rounded-xl border border-[#e3dccf] bg-white p-4 text-left hover:border-[#16263f]/40 hover:shadow-sm cursor-pointer transition"
                          >
                            {thumbSrc && (
                              <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-zinc-900 sm:h-24 sm:w-32">
                                <img
                                  src={thumbSrc}
                                  alt={entry.title}
                                  loading="lazy"
                                  className="h-full w-full object-cover opacity-95 transition duration-300 group-hover:scale-105"
                                />
                                <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 font-mono-tech text-[9px] text-amber-200">
                                  底片
                                </span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px]">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`rounded px-1.5 py-0.5 font-mono-tech font-medium ${
                                        entry.hiddenFromList
                                          ? 'bg-red-50 text-[#9e2a2b] border border-red-200'
                                          : 'bg-stone-100 text-stone-600'
                                      }`}
                                    >
                                      {entry.code}
                                    </span>
                                    <span className="text-stone-500">[{entry.category}]</span>
                                  </div>
                                  <span className="text-stone-400">
                                    {isRead ? '已阅' : entry.year}
                                  </span>
                                </div>
                                <h3 className="font-serif-cn text-[15px] font-bold leading-snug text-[#16263f] group-hover:text-[#9e2a2b] transition line-clamp-2">
                                  {entry.title}
                                </h3>
                                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-stone-500">
                                  {displaySnippet}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </motion.div>
          ) : (
            /* 专注无干扰的博物馆档案阅读与图像取证视图 */
            <motion.article
              key={`detail-${activeEntry.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24 }}
              className="mx-auto max-w-4xl"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    horrorAudio.playClick('ui');
                    setViewMode('home');
                    onRecordNav?.('__home__', '青禾民俗馆 · 馆藏目录');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#d6cfc0] bg-white px-4 py-1.5 text-xs font-medium text-[#16263f] hover:border-[#16263f] cursor-pointer transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>返回馆藏目录</span>
                </button>

                <div className="flex items-center gap-3 text-xs">
                  {hasMutationNow && (
                    <button
                      type="button"
                      onClick={() => setCompareOriginalSnapshot((v) => !v)}
                      className="rounded-full border border-red-900/30 bg-red-50 px-3 py-1 text-xs font-medium text-[#9e2a2b] hover:bg-red-100 cursor-pointer"
                    >
                      {compareOriginalSnapshot ? '查看当前异变页面' : '对照早期原始快照'}
                    </button>
                  )}
                  {showTwoViewersAnomaly && (
                    <span className="rounded-full border border-red-900/25 bg-red-50/80 px-2.5 py-1 font-mono-tech text-[11px] text-[#9e2a2b]">
                      ● 当前同页浏览：2 人
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#dfd8ca] bg-white shadow-sm">
                <div className="border-b border-[#ece6da] bg-[#faf8f3] px-6 sm:px-9 py-6">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-[#16263f] px-2 py-0.5 font-mono-tech text-[11px] text-white">
                      {activeEntry.code}
                    </span>
                    <span className="text-stone-500">{activeEntry.category}</span>
                    <span className="text-stone-300">·</span>
                    <span className="text-stone-600">{activeEntry.village}</span>
                    <span className="text-stone-300">·</span>
                    <span className="font-mono-tech text-stone-500">{activeEntry.year}</span>
                    {activeEntry.photographer && (
                      <>
                        <span className="text-stone-300">·</span>
                        <span className="text-stone-600">采集/摄制：{activeEntry.photographer}</span>
                      </>
                    )}
                  </div>
                  <h2 className="font-serif-cn text-2xl sm:text-[26px] font-bold leading-snug text-[#16263f]">
                    {activeEntry.title}
                  </h2>
                </div>

                <div className="px-6 sm:px-9 py-7">
                  {activeEntry.specialPhotoId && (
                    <div className="mb-7">
                      <ForensicPhotoViewer
                        photoId={activeEntry.specialPhotoId}
                        act={state.act}
                        scareMode={state.scareMode}
                        viewCount={state.photoViewCounts[activeEntry.specialPhotoId] ?? 1}
                        onInspect={onRecordPhotoView}
                        onDiscoverLensAnomaly={onDiscoverLensAnomaly}
                        onTriggerScare={onTriggerScare}
                        onAdjustContamination={onAdjustContamination}
                      />
                    </div>
                  )}

                  {activeEntry.id === 'qh-12-03' && (
                    <WipeRevealBoard
                      puzzleId="wipe-qh-12-03"
                      coatType="fog"
                      baseSrc="./media/qh_12_03.png"
                      revealSrc="./media/qh_12_03_lens.png"
                      title="暗房实物互动：擦拭水银镜面冷雾"
                      subtitle="老式水银镜表层凝结着浓重冷雾，按住反复拭净以核查封条下的反光与急注"
                      revealBadge="冷雾拭净：镜角显露苏晓棠指甲划痕与湿发窥视眼"
                      revealDetail="擦去冷雾后，红纸封条缝隙后方浮现出一双湿发窥视眼，镜角刻着苏晓棠留下的暗记：『凌晨紧急入库40面老式木框镜，查资产入库单与B1-09断屏编号 1140！』"
                      solved={Boolean(state.solvedPuzzleIds?.includes('wipe-qh-12-03'))}
                      onSolved={(id) => onSolvePuzzle?.(id)}
                    />
                  )}

                  {activeEntry.id === 'qh-consumables-audit' && (
                    <WipeRevealBoard
                      puzzleId="wipe-qh-consumables"
                      coatType="mud"
                      baseSrc="./media/horror_mirror_reflection.png"
                      title="暗房实物互动：拭去库底淤泥污损入库副联"
                      subtitle="该资产单副联在 B1 库房受潮沾满泥污，拭净污层以查验凌晨 03:12 隐藏入库项"
                      revealBadge="泥污拭净：凌晨 03:12 异常采购项已显影"
                      revealDetail="红章批注清晰浮现：『2026-11-24 03:12 紧急入库——老式木框梳妆镜 40 面（经手：郑国栋，调拨至 B1-09 善本库及 B2 走廊）』。"
                      solved={Boolean(state.solvedPuzzleIds?.includes('wipe-qh-consumables'))}
                      onSolved={(id) => onSolvePuzzle?.(id)}
                    />
                  )}

                  {activeEntry.id === 'qh-38-n03' && (
                    <TornNoteJigsaw
                      puzzleId="jigsaw-qh-38-n03"
                      imageSrc="./media/qh_38_n03.png"
                      title="暗房残笺拼合台：1998 夹墙铁盒与周怀瑾绝笔"
                      subtitle="抢拍底片与桑皮棉纸绝笔残笺已碎成 6 块，点击或拖拽互换位置拼回原貌"
                      revealBadge="1998 绝笔残笺拼合完成：核心铁盒暗记已锁定"
                      revealDetail="完整拼合后可见铁盒正中暗红漆字【朱砂封存14】，以及周怀瑾血书绝笔：『一九九八年十月十七亥时，切勿撤除黄镜直拍正龛，五人泣血·铁盒永沉夹墙』。"
                      solved={Boolean(state.solvedPuzzleIds?.includes('jigsaw-qh-38-n03'))}
                      onSolved={(id) => onSolvePuzzle?.(id)}
                    />
                  )}

                  <EditorialProse
                    text={displayedContent}
                    theme="paper"
                    defaultVisibleBlocks={progressiveBlocks}
                  />
                </div>
              </div>
            </motion.article>
          )}
        </AnimatePresence>

        {/* 高校官网页脚与内部 OA 入口 */}
        <footer className="mt-14 border-t border-[#ddd6c8] pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            南州大学人文高等研究院 · 青禾民俗影像数字化保护工程（内部编目号段 QH-01 ~ QH-37 / 压测段 QH-39）
          </div>
          <button
            type="button"
            onClick={() => {
              horrorAudio.playClick('unlock');
              onUnlockSite('oa');
              onNavigateSite('oa');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4ccbc] bg-white px-3.5 py-1.5 text-xs font-medium text-[#16263f] hover:border-[#9e2a2b] hover:text-[#9e2a2b] cursor-pointer transition"
          >
            <span>教职工内部 OA 工单系统 →</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
