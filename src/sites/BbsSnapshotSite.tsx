import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Film,
  Search,
  Flame,
  Lock,
  ExternalLink,
  ArrowLeft,
  Unlock,
  Clock,
  MapPin,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { BBS_THREADS } from '../data/bbsData';
import type { BBSReply, BBSThread } from '../types/game';
import type { CommonSiteProps } from './siteProps';
import { horrorAudio } from '../engine/audio';

export const BbsSnapshotSite: React.FC<CommonSiteProps> = ({
  state,
  focusedItemId,
  onClearFocus,
  onNavigateSite,
  onUnlockSite,
  onMarkRead,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'thread'>('list');
  const [activeBoard, setActiveBoard] = useState<'zijing' | 'developer'>('zijing');
  const [selectedThreadId, setSelectedThreadId] = useState<string>('zijing-40918');
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [hiddenFloorInput, setHiddenFloorInput] = useState('');
  const [unlockedHiddenKeywords, setUnlockedHiddenKeywords] = useState<string[]>([]);
  const [hiddenFloorError, setHiddenFloorError] = useState('');
  const [visibleFloorLimit, setVisibleFloorLimit] = useState<number>(8);

  useEffect(() => {
    if (!focusedItemId) return;
    const target = BBS_THREADS.find((t) => t.id === focusedItemId);
    if (target) {
      setActiveBoard(target.board);
      setSelectedThreadId(target.id);
      setVisibleFloorLimit(12);
      setViewMode('thread');
      onClearFocus?.();
    }
  }, [focusedItemId, onClearFocus]);

  const isKeywordUnlocked = (reqKeyword?: string): boolean => {
    if (!reqKeyword) return true;
    const target = reqKeyword.trim().toLowerCase();
    if (activeQuery.trim().toLowerCase().includes(target)) return true;
    if (unlockedHiddenKeywords.some((k) => k.toLowerCase() === target)) return true;
    if (state.searchHistory.some((h) => h.toLowerCase().includes(target))) return true;
    if (state.unlockedKeywords.some((k) => k.toLowerCase() === target)) return true;
    return false;
  };

  const boardThreads = useMemo(() => {
    const q = activeQuery.trim().toLowerCase();
    return BBS_THREADS.filter((t) => {
      if (t.board !== activeBoard) return false;
      if (!q) return true;
      const hay = [
        t.id,
        t.tag,
        t.title,
        t.author,
        ...t.keywords,
        ...t.replies.map((r) => `${r.author} ${r.content} ${r.hiddenKeywordRequired ?? ''}`),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [activeBoard, activeQuery]);

  const otherBoardMatchCount = useMemo(() => {
    const q = activeQuery.trim().toLowerCase();
    if (!q) return 0;
    const other = activeBoard === 'zijing' ? 'developer' : 'zijing';
    return BBS_THREADS.filter((t) => {
      if (t.board !== other) return false;
      const hay = [
        t.id,
        t.tag,
        t.title,
        t.author,
        ...t.keywords,
        ...t.replies.map((r) => `${r.author} ${r.content}`),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    }).length;
  }, [activeBoard, activeQuery]);

  const activeThread: BBSThread | undefined = useMemo(() => {
    return (
      BBS_THREADS.find((t) => t.id === selectedThreadId) ??
      boardThreads[0] ??
      BBS_THREADS.find((t) => t.board === activeBoard)
    );
  }, [boardThreads, selectedThreadId, activeBoard]);

  const openThread = (thread: BBSThread) => {
    horrorAudio.playClick('ui');
    setSelectedThreadId(thread.id);
    setVisibleFloorLimit(8);
    setViewMode('thread');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (viewMode !== 'thread' || !activeThread) return;
    if (!state.readDocIds.includes(activeThread.id)) {
      onMarkRead(activeThread.id);
    }
  }, [viewMode, activeThread, state.readDocIds, onMarkRead]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    horrorAudio.playClick('ui');
    const q = searchInput.trim();
    setActiveQuery(q);
    setViewMode('list');

    if (q.toLowerCase().includes('eyegen')) {
      horrorAudio.playClick('unlock');
      setUnlockedHiddenKeywords((prev) => Array.from(new Set([...prev, 'EyeGen'])));
      const targetThread = BBS_THREADS.find((t) =>
        t.replies.some((r) => r.hiddenKeywordRequired?.toLowerCase() === 'eyegen')
      );
      if (targetThread) {
        setActiveBoard(targetThread.board);
        setSelectedThreadId(targetThread.id);
        setVisibleFloorLimit(99);
        setViewMode('thread');
      }
    }
  };

  const handleUnlockHiddenReply = (reqKey: string) => {
    if (hiddenFloorInput.trim().toLowerCase() === reqKey.trim().toLowerCase()) {
      horrorAudio.playClick('unlock');
      setUnlockedHiddenKeywords((prev) => Array.from(new Set([...prev, reqKey])));
      setHiddenFloorError('');
    } else {
      horrorAudio.playClick('ui');
      setHiddenFloorError('折叠索引代号不匹配（提示：留意课题组使用的 AI 眼部补帧模型英文名）');
    }
  };

  const handleJumpExternalChronicles = () => {
    horrorAudio.playClick('unlock');
    onUnlockSite('chronicles');
    onNavigateSite('chronicles');
  };

  const visibleReplies: BBSReply[] = useMemo(() => {
    if (!activeThread) return [];
    return activeThread.replies.filter((r) => !r.act3Appended || state.act >= 3);
  }, [activeThread, state.act]);

  const displayedReplies = visibleReplies.slice(0, visibleFloorLimit);
  const hiddenRemainingCount = Math.max(0, visibleReplies.length - displayedReplies.length);

  const isZijing = activeBoard === 'zijing';

  // 将正文中的 yunxi-chronicles.gov.cn 渲染为可点击外链
  const renderReplyContent = (text: string) => {
    const parts = text.split(/(yunxi-chronicles\.gov\.cn)/gi);
    return parts.map((part, idx) => {
      if (part.toLowerCase() === 'yunxi-chronicles.gov.cn') {
        return (
          <button
            key={idx}
            type="button"
            onClick={handleJumpExternalChronicles}
            className="mx-1 inline-flex items-center gap-1 rounded-md border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 font-mono-tech text-xs text-amber-300 underline hover:bg-amber-500/25 cursor-pointer transition"
          >
            <span>yunxi-chronicles.gov.cn</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  return (
    <div
      className={`min-h-[calc(100vh-124px)] transition-colors duration-300 ${
        isZijing ? 'bg-[#0f0d17] text-zinc-100' : 'bg-[#12161d] text-slate-100'
      }`}
    >
      {/* 极简双版块切换顶栏 */}
      <div
        className={`border-b ${
          isZijing ? 'border-purple-900/40 bg-[#151122]/90' : 'border-amber-900/30 bg-[#171c26]/90'
        }`}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-1">
            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('ui');
                setActiveBoard('zijing');
                setViewMode('list');
              }}
              className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer transition ${
                isZijing ? 'text-purple-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isZijing && (
                <motion.span
                  layoutId="bbsBoardTab"
                  className="absolute inset-0 rounded-lg bg-purple-600/25 border border-purple-500/40"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
                南大紫荆站 · 夜间树洞
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('ui');
                setActiveBoard('developer');
                setViewMode('list');
              }}
              className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer transition ${
                !isZijing ? 'text-amber-100' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {!isZijing && (
                <motion.span
                  layoutId="bbsBoardTab"
                  className="absolute inset-0 rounded-lg bg-amber-600/20 border border-amber-500/40"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-amber-400" />
                显影液 · 老式 DV 胶片论坛
              </span>
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="w-full sm:w-72">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜帖子标题、楼层关键词……"
                className="w-full rounded-xl border border-white/10 bg-black/35 py-2 pl-3.5 pr-9 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-amber-300 cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-7">
        <AnimatePresence mode="wait">
          {viewMode === 'list' ? (
            <motion.div
              key={`bbs-list-${activeBoard}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <span>
                  {isZijing
                    ? '匿名校园讨论区网页镜像快照（2026年10月—11月）'
                    : '民间 16mm / 老式 DV 胶片转磁技术交流版块快照'}
                </span>
                {activeQuery && (
                  <div className="flex items-center gap-2">
                    <span>
                      当前筛选 “{activeQuery}”（{boardThreads.length} 帖
                      {otherBoardMatchCount > 0 ? `，另一版块另有 ${otherBoardMatchCount} 帖` : ''}）
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuery('');
                        setSearchInput('');
                      }}
                      className="text-amber-300 underline cursor-pointer"
                    >
                      重置
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {boardThreads.map((thread, idx) => {
                  const isRead = state.readDocIds.includes(thread.id);
                  return (
                    <motion.button
                      key={thread.id}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.24) }}
                      onClick={() => openThread(thread)}
                      className={`group flex w-full items-start justify-between gap-4 rounded-2xl border p-5 text-left transition cursor-pointer ${
                        isZijing
                          ? 'border-purple-900/35 bg-[#171324]/80 hover:border-purple-500/50 hover:bg-[#1d182e]'
                          : 'border-slate-800 bg-[#181e28]/90 hover:border-amber-500/45 hover:bg-[#1d2431]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span
                            className={`rounded-md px-2 py-0.5 font-medium ${
                              isZijing
                                ? 'bg-purple-950/80 text-purple-300 border border-purple-800/50'
                                : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                            }`}
                          >
                            {thread.tag}
                          </span>
                          {thread.isHot && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-red-950/70 px-1.5 py-0.5 text-red-300">
                              <Flame className="h-3 w-3" />
                              热议
                            </span>
                          )}
                          <span className="text-zinc-400">{thread.author}</span>
                          <span className="text-zinc-600">·</span>
                          <span className="font-mono-tech text-zinc-500">{thread.createdAt}</span>
                        </div>

                        <h3 className="text-[15px] font-bold leading-snug text-zinc-100 group-hover:text-amber-200 transition">
                          {thread.title}
                        </h3>
                        <p className="mt-1.5 line-clamp-1 text-xs text-zinc-400">
                          {thread.replies[0]?.content}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2 text-xs">
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono-tech text-[11px] text-zinc-400">
                          {thread.replies.length} 楼
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-zinc-500 group-hover:text-amber-300">
                          {isRead ? '已阅' : '进帖'}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            activeThread && (
              <motion.div
                key={`bbs-thread-${activeThread.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="mx-auto max-w-3xl"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      setViewMode('list');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-zinc-200 hover:border-amber-500/50 cursor-pointer transition"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>返回帖子列表</span>
                  </button>

                  {activeThread.unlocksSite === 'chronicles' && (
                    <button
                      type="button"
                      onClick={handleJumpExternalChronicles}
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/15 px-3.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/25 cursor-pointer transition"
                    >
                      <span>访问贴内提及的「云溪水利方志网」</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* 帖子主标题头 */}
                <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] text-amber-300">
                      {activeThread.tag}
                    </span>
                    <span className="text-zinc-400">楼主：{activeThread.author}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="font-mono-tech text-zinc-500">{activeThread.createdAt}</span>
                  </div>
                  <h2 className="font-serif-cn text-xl font-bold leading-snug text-white">
                    {activeThread.title}
                  </h2>
                </div>

                {/* 清爽分层的楼层卡片 */}
                <div className="space-y-3.5">
                  {displayedReplies.map((reply) => {
                    const locked =
                      Boolean(reply.hiddenKeywordRequired) &&
                      !isKeywordUnlocked(reply.hiddenKeywordRequired);

                    if (locked && reply.hiddenKeywordRequired) {
                      return (
                        <div
                          key={reply.floor}
                          className="rounded-2xl border border-dashed border-amber-700/50 bg-amber-950/15 p-5"
                        >
                          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-300">
                            <Lock className="h-4 w-4" />
                            <span>#{reply.floor} 楼 · 已被站务折叠的异常缓存楼层</span>
                          </div>
                          <p className="mb-3 text-xs leading-relaxed text-zinc-400">
                            该楼层已被屏蔽。输入该楼层涉及的核心技术模型英文关键词可调出网页镜像缓存：
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={hiddenFloorInput}
                              onChange={(e) => setHiddenFloorInput(e.target.value)}
                              placeholder="输入折叠索引关键词……"
                              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUnlockHiddenReply(reply.hiddenKeywordRequired!)}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-500 cursor-pointer"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              <span>调出缓存</span>
                            </button>
                          </div>
                          {hiddenFloorError && (
                            <p className="mt-2 text-xs text-red-400">{hiddenFloorError}</p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={reply.floor}
                        className={`rounded-2xl border p-5 transition ${
                          reply.act3Appended
                            ? 'border-red-900/60 bg-red-950/20'
                            : reply.isAssimilatedTone
                            ? 'border-amber-900/40 bg-[#1a1820]'
                            : 'border-white/8 bg-white/[0.025]'
                        }`}
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono-tech text-[11px] text-zinc-300">
                              #{reply.floor}F
                            </span>
                            <span className="font-semibold text-zinc-100">{reply.author}</span>
                            {reply.floor === 1 && (
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">
                                楼主
                              </span>
                            )}
                            {reply.act3Appended && (
                              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-300">
                                新同步缓存
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono-tech">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {reply.time}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {reply.ipLocation}
                            </span>
                          </div>
                        </div>

                        <div className="whitespace-pre-line text-[14px] leading-[1.9] text-zinc-200/95">
                          {renderReplyContent(reply.content)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 分批展开长帖楼层，消除第一眼眼花缭乱 */}
                {hiddenRemainingCount > 0 && (
                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('ui');
                        setVisibleFloorLimit((n) => n + 10);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-medium text-amber-200 hover:border-amber-500/60 hover:bg-white/10 cursor-pointer transition"
                    >
                      <ChevronDown className="h-4 w-4" />
                      <span>展开后续楼层（还有 {hiddenRemainingCount} 楼回复）</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
