import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  BookOpen,
  FileText,
  Lock,
  AlertCircle,
  Eye,
  BookmarkCheck,
  History,
  Database,
  Building2,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { QINGHE_ARCHIVE_ENTRIES } from '../data/qingheArchiveData';
import type { ArchiveEntry } from '../types/game';
import type { CommonSiteProps } from './siteProps';
import { ForensicPhotoViewer } from '../components/ForensicPhotoViewer';
import { horrorAudio } from '../engine/audio';

type CategoryFilter = '全部馆藏' | ArchiveEntry['category'] | '已调阅残卷';

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
  onNavigateSite,
  onUnlockSite,
  onMarkRead,
  onAddClue,
  onAddKeywords,
  onRecordPhotoView,
  onAdjustContamination,
  onTriggerScare,
  onGlobalSearch,
}) => {
  const [category, setCategory] = useState<CategoryFilter>('全部馆藏');
  const [localQuery, setLocalQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string>('qh-overview-grant');
  const [compareOriginalSnapshot, setCompareOriginalSnapshot] = useState(false);

  // 响应顶部跨站搜索跳转定位
  useEffect(() => {
    if (focusedItemId && QINGHE_ARCHIVE_ENTRIES.some((e) => e.id === focusedItemId)) {
      setSelectedEntryId(focusedItemId);
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

  // 门户检索逻辑：平时隐藏 hiddenFromList 残卷；一旦在站内检索框输入匹配关键词，可直接调出深层隐藏残卷！
  const filteredEntries = useMemo(() => {
    const q = submittedQuery.trim().toLowerCase();

    if (q.length > 0) {
      return QINGHE_ARCHIVE_ENTRIES.filter((entry) => {
        const haystacks = [
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
          .toLowerCase();
        return haystacks.includes(q);
      });
    }

    if (category === '已调阅残卷') {
      return discoveredHiddenEntries;
    }

    return QINGHE_ARCHIVE_ENTRIES.filter((entry) => {
      if (entry.hiddenFromList) return false;
      if (category === '全部馆藏') return true;
      return entry.category === category;
    });
  }, [submittedQuery, category, discoveredHiddenEntries]);

  const activeEntry = useMemo(() => {
    return (
      QINGHE_ARCHIVE_ENTRIES.find((e) => e.id === selectedEntryId) ??
      filteredEntries[0] ??
      QINGHE_ARCHIVE_ENTRIES[0]
    );
  }, [selectedEntryId, filteredEntries]);

  // 阅读条目时记录已读、线索与核心关键词
  useEffect(() => {
    if (!activeEntry) return;
    if (!state.readDocIds.includes(activeEntry.id)) {
      onMarkRead(activeEntry.id);
    }
    if (
      activeEntry.clueNote &&
      !state.discoveredClues.some((c) => c.id === activeEntry.clueNote?.id)
    ) {
      onAddClue({
        id: activeEntry.clueNote.id,
        title: activeEntry.clueNote.title,
        detail: activeEntry.clueNote.detail,
        sourceSite: 'qinghe',
      });
    }
    if (activeEntry.hiddenFromList) {
      onAddKeywords(activeEntry.keywords.slice(0, 3));
    }
  }, [
    activeEntry,
    state.readDocIds,
    state.discoveredClues,
    onMarkRead,
    onAddClue,
    onAddKeywords,
  ]);

  const handlePortalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    horrorAudio.playClick('ui');
    const trimmed = localQuery.trim();
    setSubmittedQuery(trimmed);
    if (trimmed) {
      // 若搜中第一个条目则自动打开，方便玩家立即查看搜出的隐藏残卷
      const qLower = trimmed.toLowerCase();
      const firstHit = QINGHE_ARCHIVE_ENTRIES.find((entry) =>
        [
          entry.code,
          entry.title,
          entry.village,
          entry.photographer ?? '',
          entry.summary,
          ...entry.keywords,
        ]
          .join(' ')
          .toLowerCase()
          .includes(qLower)
      );
      if (firstHit) {
        setSelectedEntryId(firstHit.id);
      }
    }
  };

  // 动态异变文本计算
  const hasMutationNow =
    (state.act >= 4 && Boolean(activeEntry?.act4MutatedContent)) ||
    (state.act >= 3 && Boolean(activeEntry?.act3MutatedContent));

  const displayedContent = useMemo(() => {
    if (!activeEntry) return '';
    if (compareOriginalSnapshot) return activeEntry.content;
    if (state.act >= 4 && activeEntry.act4MutatedContent) {
      return activeEntry.act4MutatedContent;
    }
    if (state.act >= 3 && activeEntry.act3MutatedContent) {
      return activeEntry.act3MutatedContent;
    }
    return activeEntry.content;
  }, [activeEntry, state.act, compareOriginalSnapshot]);

  // 呼应紫荆树洞 #41184 的经典细思极恐彩蛋：查阅 QH-37-09、隐藏残卷或进入第三/四幕时显示【当前同页浏览：2人】！
  const showTwoViewersAnomaly =
    state.act >= 3 ||
    activeEntry?.id === 'qh-37-09' ||
    Boolean(activeEntry?.hiddenFromList);

  const handleOpenInternalOa = () => {
    horrorAudio.playClick('unlock');
    onUnlockSite('oa');
    onNavigateSite('oa');
  };

  return (
    <div className="min-h-[calc(100vh-84px)] bg-[#f3f6fa] text-slate-800">
      {/* 高校学术门户深蓝顶栏 */}
      <div className="border-b-4 border-[#9a7b38] bg-gradient-to-r from-[#132c4e] via-[#1b3b66] to-[#132c4e] text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#d4b46a] bg-[#0e223d] font-serif-cn text-lg font-bold text-[#ebd399] shadow-inner">
                青禾
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-sky-200/90">
                  <span>南州大学人文高等研究院 · 数字人文中心</span>
                  <span>|</span>
                  <span className="font-mono-tech">省社科重点项目 24ZDA0838</span>
                </div>
                <h1 className="mt-0.5 font-serif-cn text-2xl font-bold tracking-wider text-white">
                  {state.act >= 4
                    ? '青禾数字民俗馆 · 云溪库区遗存影像总目'
                    : '南州大学青禾数字民俗馆'}
                </h1>
                <p className="mt-0.5 text-xs text-slate-200/85">
                  {state.act >= 4
                    ? '1996—1999 云溪水库淹没区田野文献库（特展并机推流预热中 · 请保持正面凝视）'
                    : '1996—1999 云溪水库淹没区三十七村抢救性民俗影像、口述史与器物数字典藏门户'}
                </p>
              </div>
            </div>

            {/* 站内学术检索框 */}
            <form onSubmit={handlePortalSearch} className="w-full max-w-md">
              <div className="flex overflow-hidden rounded border border-sky-300/40 bg-white shadow-sm">
                <input
                  type="text"
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  placeholder="站内馆藏检索（支持馆藏号/村名/摄影师/未公开关键词）"
                  className="w-full px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                {submittedQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalQuery('');
                      setSubmittedQuery('');
                    }}
                    className="px-2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    清除
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 bg-[#1b3b66] px-4 py-2 text-xs font-semibold text-white hover:bg-[#254d82] cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>馆藏检索</span>
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-sky-200/85">
                <span>热门索引：</span>
                {['晒谷场收工图', '24ZDA0838', '梳妆镜', '周怀瑾', 'QH-38'].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      setLocalQuery(kw);
                      setSubmittedQuery(kw);
                    }}
                    className="underline decoration-sky-300/50 hover:text-amber-200 cursor-pointer"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>

        {/* 二级分类导航条与在线人数角标 */}
        <div className="border-t border-white/15 bg-[#0f233f]/90 px-4 py-2">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {CATEGORIES.map((cat) => {
                const active = !submittedQuery && category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      setSubmittedQuery('');
                      setLocalQuery('');
                      setCategory(cat);
                    }}
                    className={`rounded px-3 py-1 text-xs font-medium transition cursor-pointer ${
                      active
                        ? 'bg-[#c49f50] text-slate-950 font-bold'
                        : 'text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}

              {discoveredHiddenEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    horrorAudio.playClick('ui');
                    setSubmittedQuery('');
                    setCategory('已调阅残卷');
                  }}
                  className={`rounded border px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                    !submittedQuery && category === '已调阅残卷'
                      ? 'border-red-400 bg-red-900/70 text-red-100'
                      : 'border-red-400/40 bg-red-950/40 text-red-200 hover:bg-red-900/50'
                  }`}
                >
                  已调阅隐藏残卷 ({discoveredHiddenEntries.length})
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono-tech">
              <span
                className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 ${
                  showTwoViewersAnomaly
                    ? 'bg-red-950/80 text-red-200 border border-red-500/40'
                    : 'bg-sky-950/70 text-sky-200'
                }`}
                title="调用节点：shrine_presence_counter"
              >
                <Eye className="h-3 w-3" />
                {showTwoViewersAnomaly ? '当前同页浏览：2人' : '当前同页浏览：1人'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 主体：左馆藏编目列表 + 右详单与老照片取证区 */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-6 lg:grid-cols-12">
        {/* 左侧馆藏目录栏 */}
        <aside className="lg:col-span-4">
          <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Database className="h-3.5 w-3.5 text-[#1b3b66]" />
                <span>
                  {submittedQuery
                    ? `检索 “${submittedQuery}” 命中 (${filteredEntries.length})`
                    : `${category}目录 (${filteredEntries.length})`}
                </span>
              </div>
              {submittedQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedQuery('');
                    setLocalQuery('');
                  }}
                  className="text-[11px] text-[#1b3b66] underline cursor-pointer"
                >
                  返回全目
                </button>
              )}
            </div>

            <div className="max-h-[72vh] overflow-y-auto divide-y divide-slate-200">
              {filteredEntries.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <p className="font-medium text-slate-700">未检索到匹配的公开编目记录。</p>
                  <p className="mt-1">
                    请尝试检索人名（如：周怀瑾）、缺失批次号（如：QH-38）或村落旧称（如：祠下村、盲傩）。
                  </p>
                </div>
              ) : (
                filteredEntries.map((entry, idx) => {
                  const isSelected = activeEntry?.id === entry.id;
                  const isRead = state.readDocIds.includes(entry.id);
                  const nextEntry = filteredEntries[idx + 1];
                  // 在列表自然浏览到 QH-37-09 与 QH-39-01 交界处直观呈现编号跳号断层！
                  const showMissingBatch38Banner =
                    !submittedQuery &&
                    entry.code.startsWith('QH-37') &&
                    nextEntry?.code.startsWith('QH-39');

                  return (
                    <React.Fragment key={entry.id}>
                      <button
                        type="button"
                        onClick={() => {
                          horrorAudio.playClick('ui');
                          setSelectedEntryId(entry.id);
                          setCompareOriginalSnapshot(false);
                        }}
                        className={`w-full p-3 text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#e8f0fe] border-l-4 border-l-[#1b3b66]'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono-tech font-bold ${
                                entry.hiddenFromList
                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {entry.code}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                              {entry.category}
                            </span>
                            {entry.hiddenFromList && (
                              <span className="rounded bg-red-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                未公开残卷
                              </span>
                            )}
                          </div>
                          {!isRead && (
                            <span className="h-2 w-2 rounded-full bg-[#1b3b66]" title="未查阅" />
                          )}
                        </div>

                        <div className="line-clamp-2 text-xs font-bold leading-snug text-slate-900">
                          {entry.title}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate">{entry.village}</span>
                          <span className="shrink-0 font-mono-tech">{entry.year}</span>
                        </div>
                      </button>

                      {showMissingBatch38Banner && (
                        <div className="bg-amber-50/90 px-3 py-2 text-[11px] text-amber-900 border-y border-amber-200/80 flex items-center justify-between">
                          <span>
                            [索书号异常断层] <strong>QH-38</strong> 分区记录在公开目录中缺失
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setLocalQuery('QH-38');
                              setSubmittedQuery('QH-38');
                            }}
                            className="font-bold underline hover:text-red-700 cursor-pointer"
                          >
                            强制检索 QH-38
                          </button>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* 右侧档案详情与取证阅读器 */}
        <main className="lg:col-span-8">
          {activeEntry && (
            <div className="rounded-lg border border-slate-300 bg-white p-5 sm:p-7 shadow-sm">
              {/* 深层残卷警告条 */}
              {activeEntry.hiddenFromList && (
                <div className="mb-4 flex items-start gap-2.5 rounded border border-red-300 bg-red-50 p-3 text-xs text-red-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <div>
                    <div className="font-bold">
                      【受限未公开残卷】该条目未列入公开导览树（hiddenFromList = true），系通过底层索引词直连调出
                    </div>
                    <p className="mt-0.5 text-red-800/85">
                      原件封存于老馆善本库及人文楼地下 B2 修复内室，未经课题负责人郑国栋签批严禁对外引用。
                    </p>
                  </div>
                </div>
              )}

              {/* 标题与学术著录元数据卡 */}
              <div className="mb-5 border-b border-slate-200 pb-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[#1b3b66] px-2 py-0.5 text-xs font-mono-tech font-bold text-white">
                    馆藏号：{activeEntry.code}
                  </span>
                  <span className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {activeEntry.category}
                  </span>
                  {hasMutationNow && (
                    <button
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('ui');
                        setCompareOriginalSnapshot((v) => !v);
                      }}
                      className="ml-auto inline-flex items-center gap-1 rounded border border-red-300 bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-800 hover:bg-red-100 cursor-pointer"
                    >
                      <History className="h-3 w-3" />
                      <span>
                        {compareOriginalSnapshot
                          ? '正在查看：早期原始缓存快照（点击切回实时页面）'
                          : 'CMS缓存校验偏移：点击对比早期原始快照'}
                      </span>
                    </button>
                  )}
                </div>

                <h2 className="font-serif-cn text-xl sm:text-2xl font-bold leading-snug text-slate-900">
                  {activeEntry.title}
                </h2>

                <div className="mt-3 grid grid-cols-1 gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-3">
                  <div>
                    <span className="font-semibold text-slate-800">采集归属村落：</span>
                    {activeEntry.village}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">摄制/采集年代：</span>
                    {activeEntry.year}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">责任采集/摄影：</span>
                    {activeEntry.photographer ?? '青禾联合考察队'}
                  </div>
                </div>
              </div>

              {/* 若含老照片/标本图像，嵌入高精度取证渲染器 */}
              {activeEntry.specialPhotoId && (
                <ForensicPhotoViewer
                  photoId={activeEntry.specialPhotoId}
                  act={state.act}
                  scareMode={state.scareMode}
                  viewCount={state.photoViewCounts[activeEntry.specialPhotoId] || 0}
                  onInspect={onRecordPhotoView}
                  onTriggerScare={onTriggerScare}
                  onAdjustContamination={onAdjustContamination}
                />
              )}

              {/* 馆藏摘要 */}
              <div className="mb-4 rounded border-l-4 border-[#1b3b66] bg-slate-50 px-4 py-2.5 text-xs leading-relaxed text-slate-700">
                <strong className="text-slate-900">【提要】</strong> {activeEntry.summary}
              </div>

              {/* 馆藏正文（支持编目校注高亮与幕次异变） */}
              <article className="mb-6 whitespace-pre-line font-serif-cn text-[15px] leading-8 text-slate-800">
                {displayedContent}
              </article>

              {/* 自动归档线索提示 */}
              {activeEntry.clueNote && (
                <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <BookmarkCheck className="h-4 w-4 text-amber-700" />
                    <span>调查手记已归档：{activeEntry.clueNote.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-900/90">
                    {activeEntry.clueNote.detail}
                  </p>
                </div>
              )}

              {/* 关联主题词（点击可在站内或跨站检索） */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Tag className="h-3.5 w-3.5" />
                    馆藏主题标引：
                  </span>
                  {activeEntry.keywords.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('ui');
                        setLocalQuery(kw);
                        setSubmittedQuery(kw);
                      }}
                      className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs text-slate-700 hover:border-[#1b3b66] hover:text-[#1b3b66] cursor-pointer"
                    >
                      {kw}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onGlobalSearch(activeEntry.code)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1b3b66] hover:underline cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>跨站联查该编号</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 页脚：学术版权声明 + 关键【内部教职工 OA 与工单系统入口】按钮 */}
      <footer className="mt-8 border-t border-slate-300 bg-slate-200/85 px-4 py-6 text-slate-600">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Building2 className="h-4 w-4 text-[#1b3b66]" />
              <span>南州大学人文高等研究院 · 青禾民俗影像数字化保护工程课题组</span>
            </div>
            <p>
              地址：南州市鼓楼区学府路 109 号南州大学人文楼三层 / 地下 B2 胶片数字化实验室 · 省社科立项批准号：24ZDA0838
            </p>
            <p className="text-[11px] text-slate-500">
              {state.act >= 4
                ? '系统状态：B2 推流阵列已就绪 · 严禁任何人员在铜锣三响后擅自切断机房照明与显示器电源'
                : '版权所有 © 2024–2026 南州大学数字人文中心 · 未经许可禁止将高动态母带用于商业放映'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleOpenInternalOa}
              className="inline-flex items-center gap-2 rounded border border-[#1b3b66] bg-white px-4 py-2 text-xs font-bold text-[#1b3b66] shadow-sm hover:bg-[#1b3b66] hover:text-white cursor-pointer transition"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>内部教职工 OA 与修复工单系统入口</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              内网节点 v4.2
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
