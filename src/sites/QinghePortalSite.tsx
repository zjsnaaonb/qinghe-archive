import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Lock,
  ArrowLeft,
  History,
  Eye,
  ChevronRight,
  Sparkles,
  FileText,
  Camera,
  Mic,
  Compass,
} from 'lucide-react';
import { QINGHE_ARCHIVE_ENTRIES } from '../data/qingheArchiveData';
import type { ArchiveEntry } from '../types/game';
import type { CommonSiteProps } from './siteProps';
import { ForensicPhotoViewer, VISUAL_CAPTIONS } from '../components/ForensicPhotoViewer';
import { EditorialProse } from '../components/EditorialProse';
import { horrorAudio } from '../engine/audio';

type CategoryFilter = '全部馆藏' | ArchiveEntry['category'] | '已发现残卷';

const CATEGORIES: CategoryFilter[] = [
  '全部馆藏',
  '工作公示',
  '图像档案',
  '口述访谈',
  '器物标本',
];

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  图像档案: <Camera className="h-3.5 w-3.5" />,
  口述访谈: <Mic className="h-3.5 w-3.5" />,
  工作公示: <FileText className="h-3.5 w-3.5" />,
  器物标本: <Compass className="h-3.5 w-3.5" />,
};

export const QinghePortalSite: React.FC<CommonSiteProps> = ({
  state,
  focusedItemId,
  onClearFocus,
  onNavigateSite,
  onUnlockSite,
  onMarkRead,
  onRecordPhotoView,
  onAdjustContamination,
  onTriggerScare,
}) => {
  // 清爽博物馆双视图：'home'（清爽精选导览与分类卡片）| 'detail'（专注阅读与高清取证）
  const [viewMode, setViewMode] = useState<'home' | 'detail'>('home');
  const [category, setCategory] = useState<CategoryFilter>('全部馆藏');
  const [localQuery, setLocalQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string>('qh-37-09');
  const [compareOriginalSnapshot, setCompareOriginalSnapshot] = useState(false);
  const [fullCatalogOpen, setFullCatalogOpen] = useState(false);

  // 响应顶部跨站检索直达具体条目
  useEffect(() => {
    if (focusedItemId && QINGHE_ARCHIVE_ENTRIES.some((e) => e.id === focusedItemId)) {
      setSelectedEntryId(focusedItemId);
      setViewMode('detail');
      setCompareOriginalSnapshot(false);
      onClearFocus?.();
    }
  }, [focusedItemId, onClearFocus]);

  const discoveredHiddenEntries = useMemo(
    () =>
      QINGHE_ARCHIVE_ENTRIES.filter(
        (e) => e.hiddenFromList && state.readDocIds.includes(e.id)
      ),
    [state.readDocIds]
  );

  const filteredEntries = useMemo(() => {
    const q = submittedQuery.trim().toLowerCase();
    if (q.length > 0) {
      return QINGHE_ARCHIVE_ENTRIES.filter((entry) =>
        [
          entry.code,
          entry.title,
          entry.village,
          entry.year,
          entry.category,
          entry.photographer ?? '',
          entry.summary,
          entry.content,
          ...entry.keywords,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    if (category === '已发现残卷') return discoveredHiddenEntries;
    return QINGHE_ARCHIVE_ENTRIES.filter((entry) => {
      if (entry.hiddenFromList) return false;
      if (category === '全部馆藏') return true;
      return entry.category === category;
    });
  }, [submittedQuery, category, discoveredHiddenEntries]);

  const activeEntry = useMemo(() => {
    return (
      QINGHE_ARCHIVE_ENTRIES.find((e) => e.id === selectedEntryId) ??
      QINGHE_ARCHIVE_ENTRIES[0]
    );
  }, [selectedEntryId]);

  const openEntry = (id: string) => {
    horrorAudio.playClick('ui');
    setSelectedEntryId(id);
    setCompareOriginalSnapshot(false);
    setViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 进入详情页时仅标记已读（绝不自动往手记灌输剧透答案！）
  useEffect(() => {
    if (viewMode !== 'detail' || !activeEntry) return;
    if (!state.readDocIds.includes(activeEntry.id)) {
      onMarkRead(activeEntry.id);
    }
  }, [viewMode, activeEntry, state.readDocIds, onMarkRead]);

  const handlePortalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    horrorAudio.playClick('ui');
    const trimmed = localQuery.trim();
    setSubmittedQuery(trimmed);
    setViewMode('home');
    if (trimmed) {
      const qLower = trimmed.toLowerCase();
      const exactOrHidden = QINGHE_ARCHIVE_ENTRIES.find(
        (entry) =>
          entry.hiddenFromList &&
          [entry.code, entry.title, ...entry.keywords]
            .join(' ')
            .toLowerCase()
            .includes(qLower)
      );
      if (exactOrHidden) {
        openEntry(exactOrHidden.id);
      }
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
    Boolean(activeEntry?.hiddenFromList);

  const featuredIds = ['qh-37-09', 'qh-overview-grant', 'qh-39-01'];
  const featuredEntries = featuredIds
    .map((id) => QINGHE_ARCHIVE_ENTRIES.find((e) => e.id === id))
    .filter((e): e is ArchiveEntry => Boolean(e));

  const hasInspected3709 = state.readDocIds.includes('qh-37-09');
  const showFullCatalog = hasInspected3709 || fullCatalogOpen || Boolean(submittedQuery) || category !== '全部馆藏';
  const progressiveBlocks = state.act === 1 ? 2 : state.act === 2 ? 4 : undefined;

  return (
    <div className="min-h-[calc(100vh-124px)] bg-[#f6f3ec] text-[#1f2937]">
      {/* 典雅明亮的高校数字博物馆纸本页眉 */}
      <div className="border-t-4 border-t-[#9e2a2b] border-b border-[#dfd8ca] bg-[#fcfaf5] text-[#16263f]">
        <div className="mx-auto max-w-6xl px-5 py-7">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-[#9e2a2b]">
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

            {/* 干净利落的站内检索框 */}
            <form onSubmit={handlePortalSearch} className="w-full sm:w-80">
              <div className="relative">
                <input
                  type="text"
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  placeholder="搜馆藏名、编号或人名（如：晒谷场收工图）"
                  className="w-full rounded-xl border border-[#d6cebe] bg-white py-2.5 pl-4 pr-10 text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:border-[#9e2a2b] focus:outline-none transition"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[#9e2a2b] hover:bg-red-50 cursor-pointer"
                  title="馆内检索"
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
              {/* 首屏 3 张精选核心卡片（仅在未搜索时展示，一眼抓住焦点，零信息过载！） */}
              {!submittedQuery && (
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
                            <span className="absolute right-3 bottom-2.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] text-amber-200 backdrop-blur-xs">
                              <Camera className="h-2.5 w-2.5" />
                              含原片取证
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

              {/* 渐进式馆藏目录：初次进入时默认折叠全量列表，避免首屏信息轰炸；核查过 QH-37-09 后自然展开并提示未挂接号段可检索 */}
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
                  {hasInspected3709 && discoveredHiddenEntries.length === 0 && !submittedQuery && (
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/75 bg-amber-50/75 px-4 py-2.5 text-xs text-amber-950">
                      <span>
                        <strong>馆藏索引说明：</strong>公开列表仅列示已挂接分区（<code className="font-mono-tech">QH-01</code> 至 <code className="font-mono-tech">QH-37</code> 及特展段 <code className="font-mono-tech">QH-39</code>）。未挂接之空缺分区或采集人底稿，可在右上角检索框输入<strong>精确分区号</strong>或<strong>采集人姓名/缩写</strong>调档。
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
                          setSubmittedQuery('');
                          setLocalQuery('');
                          setCategory(cat);
                        }}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium cursor-pointer transition ${
                          !submittedQuery && category === cat
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
                          setSubmittedQuery('');
                          setCategory('已发现残卷');
                        }}
                        className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium cursor-pointer transition ${
                          category === '已发现残卷'
                            ? 'bg-[#9e2a2b] text-white'
                            : 'border border-red-900/30 bg-red-50 text-[#9e2a2b]'
                        }`}
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>已检出未编目残卷 ({discoveredHiddenEntries.length})</span>
                      </button>
                    )}
                  </div>

                  {submittedQuery && (
                    <div className="flex items-center gap-2 text-xs text-stone-600">
                      <span>
                        检索 “<strong className="text-[#9e2a2b]">{submittedQuery}</strong>” 命中 {filteredEntries.length} 条
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSubmittedQuery('');
                          setLocalQuery('');
                        }}
                        className="underline hover:text-[#16263f] cursor-pointer"
                      >
                        清除
                      </button>
                    </div>
                  )}
                </div>

                {filteredEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d4ccbc] bg-white/60 py-14 text-center text-sm text-stone-500">
                    未在当前公开目录中检索到 “{submittedQuery}”。可尝试更简短的人名、村名或索书号。
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    {filteredEntries.map((entry) => {
                      const isRead = state.readDocIds.includes(entry.id);
                      const thumbSrc = entry.specialPhotoId
                        ? VISUAL_CAPTIONS[entry.specialPhotoId]?.src
                        : undefined;
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
                              <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 font-mono-tech text-[9px] text-amber-200">
                                <Camera className="h-2.5 w-2.5" />
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
                                  <span className="inline-flex items-center gap-1 text-stone-500">
                                    {CATEGORY_ICON[entry.category]}
                                    {entry.category}
                                  </span>
                                </div>
                                <span className="text-stone-400">
                                  {isRead ? '已阅' : entry.year}
                                </span>
                              </div>
                              <h3 className="font-serif-cn text-[15px] font-bold leading-snug text-[#16263f] group-hover:text-[#9e2a2b] transition line-clamp-2">
                                {entry.title}
                              </h3>
                              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-stone-500">
                                {entry.summary}
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
                      className="inline-flex items-center gap-1 rounded-full border border-red-900/30 bg-red-50 px-3 py-1 text-xs font-medium text-[#9e2a2b] hover:bg-red-100 cursor-pointer"
                    >
                      <History className="h-3.5 w-3.5" />
                      <span>{compareOriginalSnapshot ? '查看当前异变页面' : '对照早期原始快照'}</span>
                    </button>
                  )}
                  {showTwoViewersAnomaly && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-900/25 bg-red-50/80 px-2.5 py-1 font-mono-tech text-[11px] text-[#9e2a2b]">
                      <Eye className="h-3 w-3" />
                      当前同页浏览：2 人
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#dfd8ca] bg-white shadow-sm">
                {/* 精炼元数据头部 */}
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

                {/* 正文与高精度光学取证图 */}
                <div className="px-6 sm:px-9 py-7">
                  {activeEntry.specialPhotoId && (
                    <div className="mb-7">
                      <ForensicPhotoViewer
                        photoId={activeEntry.specialPhotoId}
                        act={state.act}
                        scareMode={state.scareMode}
                        viewCount={state.photoViewCounts[activeEntry.specialPhotoId] ?? 1}
                        onInspect={onRecordPhotoView}
                        onTriggerScare={onTriggerScare}
                        onAdjustContamination={onAdjustContamination}
                      />
                    </div>
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

        {/* 克制逼真的高校官网底部与内部 OA 入口 */}
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
            <Lock className="h-3.5 w-3.5" />
            <span>教职工内部 OA 工单系统</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
