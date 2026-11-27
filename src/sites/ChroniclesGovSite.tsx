import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ArrowLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { CHRONICLE_DOCS } from '../data/chroniclesData';
import type { ChronicleDoc } from '../types/game';
import type { CommonSiteProps } from './siteProps';
import { ForensicPhotoViewer } from '../components/ForensicPhotoViewer';
import { EditorialProse } from '../components/EditorialProse';
import { extractSearchSnippet, scoreSearchMatch } from '../engine/search';
import { horrorAudio } from '../engine/audio';

type GovTab = '全部公开卷宗' | ChronicleDoc['classification'];

const GOV_TABS: GovTab[] = [
  '全部公开卷宗',
  '公开政务',
  '历史台账',
  '古籍影印',
  '内部协查',
  '信访卷宗',
];

export const ChroniclesGovSite: React.FC<CommonSiteProps> = ({
  state,
  focusedItemId,
  onClearFocus,
  navCommand,
  onRecordNav,
  onMarkRead,
  onRecordPhotoView,
  onAdjustContamination,
  onTriggerScare,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [activeTab, setActiveTab] = useState<GovTab>('全部公开卷宗');
  const [searchInput, setSearchInput] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>(
    () => CHRONICLE_DOCS[0]?.id ?? 'chr-1999-closure'
  );
  const lastNavSeqRef = useRef<number>(0);

  useEffect(() => {
    if (!focusedItemId) return;
    const target = CHRONICLE_DOCS.find((d) => d.id === focusedItemId);
    if (target) {
      if (target.hiddenFromDefault || target.classification === '信访卷宗') {
        setActiveTab('信访卷宗');
      }
      setSelectedDocId(target.id);
      setViewMode('detail');
      onClearFocus?.();
    }
  }, [focusedItemId, onClearFocus]);

  useEffect(() => {
    if (!navCommand || navCommand.site !== 'chronicles' || navCommand.seq === lastNavSeqRef.current) {
      return;
    }
    lastNavSeqRef.current = navCommand.seq;
    if (navCommand.itemId === '__list__' || navCommand.itemId === '__home__') {
      setViewMode('list');
    } else {
      const target = CHRONICLE_DOCS.find((d) => d.id === navCommand.itemId);
      if (target) {
        if (target.hiddenFromDefault || target.classification === '信访卷宗') {
          setActiveTab('信访卷宗');
        }
        setSelectedDocId(target.id);
        setViewMode('detail');
      }
    }
  }, [navCommand]);

  const activeQuery = searchInput.trim();

  const scoredDocs = useMemo(() => {
    if (!activeQuery) return null;
    const list: Array<{ doc: ChronicleDoc; score: number; snippet: string }> = [];
    for (const doc of CHRONICLE_DOCS) {
      const res = scoreSearchMatch(activeQuery, {
        code: doc.docNumber,
        title: doc.title,
        subtitle: `${doc.department} ${doc.year} ${doc.classification}`,
        tags: doc.keywords,
        summary: doc.summary,
        body: doc.content,
        allowBodyMatch: true,
      });
      if (res.matched) {
        list.push({
          doc,
          score: res.score,
          snippet: extractSearchSnippet(doc.content, activeQuery, doc.summary, res.bestTerm),
        });
      }
    }
    list.sort((a, b) => b.score - a.score);
    return list;
  }, [activeQuery]);

  const visibleDocs = useMemo(() => {
    if (scoredDocs) {
      return scoredDocs.map((s) => s.doc);
    }

    if (activeTab === '信访卷宗') {
      return CHRONICLE_DOCS.filter(
        (d) => d.classification === '信访卷宗' || d.hiddenFromDefault
      );
    }

    return CHRONICLE_DOCS.filter((d) => {
      if (d.hiddenFromDefault) return false;
      if (activeTab === '全部公开卷宗') return true;
      return d.classification === activeTab;
    });
  }, [activeTab, scoredDocs]);

  const snippetByDocId = useMemo(() => {
    const map = new Map<string, string>();
    if (scoredDocs) {
      for (const s of scoredDocs) {
        map.set(s.doc.id, s.snippet);
      }
    }
    return map;
  }, [scoredDocs]);

  const activeDoc = useMemo(() => {
    return (
      CHRONICLE_DOCS.find((d) => d.id === selectedDocId) ??
      visibleDocs[0] ??
      CHRONICLE_DOCS[0]
    );
  }, [selectedDocId, visibleDocs]);

  const openDoc = (id: string) => {
    const target = CHRONICLE_DOCS.find((d) => d.id === id);
    horrorAudio.playClick('ui');
    setSelectedDocId(id);
    setViewMode('detail');
    if (target) {
      onRecordNav?.(
        target.id,
        `水利方志 · ${target.title.replace(/[《》]/g, '').slice(0, 15)}`
      );
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (viewMode !== 'detail' || !activeDoc) return;
    if (!state.readDocIds.includes(activeDoc.id)) {
      onMarkRead(activeDoc.id);
    }
  }, [viewMode, activeDoc, state.readDocIds, onMarkRead]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    horrorAudio.playClick('ui');
    if (scoredDocs && scoredDocs.length === 1) {
      openDoc(scoredDocs[0].doc.id);
      return;
    }
    setViewMode('list');
  };

  return (
    <div className="min-h-[calc(100vh-124px)] bg-[#eef1f5] text-slate-800">
      {/* 正统地方档案馆白底红头页眉（无AI圆角图标盒，改用兰台朱文方印） */}
      <div className="border-t-4 border-t-[#9e2a2b] border-b border-slate-300 bg-white text-slate-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-[3px] border-2 border-[#9e2a2b] bg-[#fff9f7] font-serif-cn text-[11px] font-bold leading-tight text-[#9e2a2b] select-none">
              <span>云溪</span>
              <span>兰台</span>
            </div>
            <div>
              <div className="text-[11px] font-semibold tracking-widest text-[#9e2a2b]">
                云溪县档案馆 · 水利移民历史信息公开平台
              </div>
              <h1 className="font-serif-cn text-xl sm:text-2xl font-bold tracking-wider text-[#1e3554]">
                云溪水利移民与地方志查询网
              </h1>
            </div>
          </div>

          <form onSubmit={handleSearch} className="w-full sm:w-80">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchInput(v);
                  if (v.trim() && viewMode !== 'list') {
                    setViewMode('list');
                  }
                }}
                placeholder="实时检索公文号、附表38、周怀瑾或朱砂……"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-3.5 pr-14 text-xs text-slate-800 placeholder-slate-400 focus:border-[#9e2a2b] focus:bg-white focus:outline-none transition"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1e3554] hover:text-[#9e2a2b] cursor-pointer"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <AnimatePresence mode="wait">
          {viewMode === 'list' ? (
            <motion.div
              key="gov-list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {GOV_TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('ui');
                        setSearchInput('');
                        setActiveTab(tab);
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-xs font-medium cursor-pointer transition ${
                        !activeQuery && activeTab === tab
                          ? 'bg-[#1e3554] text-white shadow-sm'
                          : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {tab === '信访卷宗' && (
                        <span className="font-mono-tech text-[10px] font-bold text-[#9e2a2b]">[专匣]</span>
                      )}
                      <span>{tab === '信访卷宗' ? '历史信访归档调阅' : tab}</span>
                    </button>
                  ))}
                </div>

                {activeQuery && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>
                      检索 “<strong className="text-[#9e2a2b]">{activeQuery}</strong>” 命中 {visibleDocs.length} 份
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="text-[#9e2a2b] underline cursor-pointer"
                    >
                      清除
                    </button>
                  </div>
                )}
              </div>

              {visibleDocs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 py-12 text-center text-xs text-slate-500">
                  未检索到与 “{activeQuery}” 匹配的政务公文或信访卷宗。
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                  {visibleDocs.map((doc) => {
                    const isRead = state.readDocIds.includes(doc.id);
                    const snippet = snippetByDocId.get(doc.id) ?? doc.summary;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => openDoc(doc.id)}
                        className="group flex flex-col justify-between rounded-xl border border-slate-300/90 bg-white p-5 text-left hover:border-[#1e3554] hover:shadow-sm cursor-pointer transition"
                      >
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono-tech text-slate-700">
                              {doc.docNumber}
                            </span>
                            <span className="text-slate-400">
                              {isRead ? '已调阅' : `${doc.year} · ${doc.classification}`}
                            </span>
                          </div>
                          <h3 className="font-serif-cn text-[15px] font-bold leading-snug text-[#1e3554] group-hover:text-[#9e2a2b] transition">
                            {doc.title}
                          </h3>
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                            {snippet}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                          <span>{doc.department}</span>
                          <span className="inline-flex items-center gap-0.5 text-[#1e3554] font-medium">
                            调阅卷宗 <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            activeDoc && (
              <motion.article
                key={`gov-doc-${activeDoc.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24 }}
                className="mx-auto max-w-4xl"
              >
                <div className="mb-5">
                  <button
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      setViewMode('list');
                      onRecordNav?.('__list__', '水利方志网 · 卷宗目录');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-[#1e3554] hover:border-[#1e3554] cursor-pointer transition"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>返回卷宗目录</span>
                  </button>
                </div>

                {/* 红头文件 / 档案影印纸张卡 */}
                <div className="overflow-hidden rounded-2xl border border-slate-300 bg-[#fbfaf7] shadow-md">
                  <div className="border-b-2 border-[#9e2a2b] px-7 sm:px-10 py-7 text-center">
                    <div className="font-serif-cn text-base font-bold tracking-[0.25em] text-[#9e2a2b]">
                      {activeDoc.department}
                    </div>
                    <div className="mt-1.5 font-mono-tech text-xs text-slate-500">
                      {activeDoc.docNumber} · 归档年份：{activeDoc.year} · {activeDoc.classification}
                    </div>
                    <h2 className="mt-4 font-serif-cn text-xl sm:text-2xl font-bold leading-snug text-slate-900">
                      {activeDoc.title}
                    </h2>
                  </div>

                  <div className="px-7 sm:px-10 py-8">
                    {activeDoc.specialVisual && (
                      <div className="mb-7">
                        <ForensicPhotoViewer
                          photoId={activeDoc.specialVisual}
                          act={state.act}
                          scareMode={state.scareMode}
                          viewCount={state.photoViewCounts[activeDoc.specialVisual] ?? 1}
                          onInspect={onRecordPhotoView}
                          onTriggerScare={onTriggerScare}
                          onAdjustContamination={onAdjustContamination}
                        />
                      </div>
                    )}

                    <EditorialProse
                      text={activeDoc.content}
                      theme="gov"
                      defaultVisibleBlocks={state.act <= 2 ? 3 : undefined}
                    />

                    <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-400">
                      <span>云溪县档案馆历史扫描件复核稿</span>
                      <span className="font-mono-tech">提示：划选正文任意文字可摘录至右侧手记</span>
                    </div>
                  </div>
                </div>
              </motion.article>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
