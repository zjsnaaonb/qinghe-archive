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
  User,
  Camera,
  Sparkles,
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
  const [onlyOp, setOnlyOp] = useState(false);
  const [expandAllThreads, setExpandAllThreads] = useState(false);

  useEffect(() => {
    if (!focusedItemId) return;
    const target = BBS_THREADS.find((t) => t.id === focusedItemId);
    if (target) {
      setActiveBoard(target.board);
      setSelectedThreadId(target.id);
      setVisibleFloorLimit(12);
      setOnlyOp(false);
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

  // 渐进式帖列展示：第一幕未主动搜索时优先聚焦 3 条核心热议帖，其余历史水帖可一键展开，降低初期信息噪点
  const shouldFoldMinorThreads = state.act === 1 && !activeQuery && !expandAllThreads && boardThreads.length > 3;
  const displayedThreads = useMemo(() => {
    if (!shouldFoldMinorThreads) return boardThreads;
    const hot = boardThreads.filter((t) => t.isHot);
    if (hot.length >= 3) return hot.slice(0, 3);
    const rest = boardThreads.filter((t) => !t.isHot);
    return [...hot, ...rest].slice(0, 3);
  }, [boardThreads, shouldFoldMinorThreads]);

  const foldedThreadCount = Math.max(0, boardThreads.length - displayedThreads.length);

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
    setVisibleFloorLimit(state.act >= 2 ? 12 : 8);
    setOnlyOp(false);
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
        setOnlyOp(false);
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
    return activeThread.replies.filter((r) => {
      if (r.act3Appended && state.act < 3) return false;
      if (onlyOp && r.author !== activeThread.author && !r.hiddenKeywordRequired) return false;
      return true;
    });
  }, [activeThread, state.act, onlyOp]);

  const hiddenFloorReply = useMemo(
    () => activeThread?.replies.find((r) => Boolean(r.hiddenKeywordRequired)),
    [activeThread]
  );

  const displayedReplies = onlyOp ? visibleReplies : visibleReplies.slice(0, visibleFloorLimit);
  const hiddenRemainingCount = onlyOp ? 0 : Math.max(0, visibleReplies.length - displayedReplies.length);

  const isZijing = activeBoard === 'zijing';

  const jumpToHiddenFloor = () => {
    horrorAudio.playClick('ui');
    setOnlyOp(false);
    setVisibleFloorLimit(999);
    setTimeout(() => {
      document.getElementById('bbs-hidden-floor-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const renderTextWithLinks = (text: string) => {
    const parts = text.split(/(yunxi-chronicles\.gov\.cn)/gi);
    return parts.map((part, idx) => {
      if (part.toLowerCase() === 'yunxi-chronicles.gov.cn') {
        return (
          <button
            key={idx}
            type="button"
            onClick={handleJumpExternalChronicles}
            className="mx-1 inline-flex items-center gap-1 rounded-md border border-[#9e2a2b]/35 bg-red-50 px-2 py-0.5 font-mono-tech text-xs font-semibold text-[#9e2a2b] underline hover:bg-red-100 cursor-pointer transition"
          >
            <span>yunxi-chronicles.gov.cn</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  // 自动拆分经典老论坛底部的「器材签名档」，视觉清晰醒目不淹没在长文里
  const splitBodyAndSignature = (raw: string): { body: string; signature: string | null } => {
    const match = raw.match(/^([\s\S]*?)\n[—─-]{6,}\n([\s\S]*签名档[\s\S]*)$/);
    if (!match) return { body: raw, signature: null };
    return { body: match[1].trimEnd(), signature: match[2].trim() };
  };

  return (
    <div
      className={`min-h-[calc(100vh-124px)] transition-colors duration-300 ${
        isZijing ? 'bg-[#f6f5fa] text-slate-800' : 'bg-[#f6f2e8] text-stone-800'
      }`}
    >
      {/* 清爽双版块切换顶栏 */}
      <div
        className={`border-b ${
          isZijing ? 'border-purple-200/80 bg-white/95' : 'border-[#e2d9c5] bg-[#fcfaf4]/95'
        }`}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100/80 p-1">
            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('ui');
                setActiveBoard('zijing');
                setViewMode('list');
              }}
              className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer transition ${
                isZijing ? 'text-purple-900' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {isZijing && (
                <motion.span
                  layoutId="bbsBoardTab"
                  className="absolute inset-0 rounded-lg bg-white border border-purple-300/80 shadow-2xs"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
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
                !isZijing ? 'text-amber-950' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {!isZijing && (
                <motion.span
                  layoutId="bbsBoardTab"
                  className="absolute inset-0 rounded-lg bg-white border border-amber-400/70 shadow-2xs"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-amber-700" />
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
                className="w-full rounded-xl border border-stone-300 bg-white py-2 pl-3.5 pr-9 text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:border-[#9e2a2b] focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#9e2a2b] cursor-pointer"
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
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                <span>
                  {isZijing
                    ? '匿名校园讨论区网页镜像快照（精选置顶热帖）'
                    : '民间 16mm / 老式 DV 胶片转磁技术交流版块快照'}
                </span>
                {activeQuery && (
                  <div className="flex items-center gap-2">
                    <span>
                      当前筛选 “<strong className="text-[#9e2a2b]">{activeQuery}</strong>”（{boardThreads.length} 帖
                      {otherBoardMatchCount > 0 ? `，另一版块另有 ${otherBoardMatchCount} 帖` : ''}）
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuery('');
                        setSearchInput('');
                      }}
                      className="text-[#9e2a2b] font-medium underline cursor-pointer"
                    >
                      重置
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {displayedThreads.map((thread, idx) => {
                  const isRead = state.readDocIds.includes(thread.id);
                  return (
                    <motion.button
                      key={thread.id}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.24) }}
                      onClick={() => openThread(thread)}
                      className={`group flex w-full items-start justify-between gap-4 rounded-2xl border p-5 text-left transition cursor-pointer shadow-2xs ${
                        isZijing
                          ? 'border-purple-200/80 bg-white hover:border-purple-400 hover:shadow-sm'
                          : 'border-[#e3dac7] bg-[#fffdf9] hover:border-amber-500/60 hover:shadow-sm'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span
                            className={`rounded-md px-2 py-0.5 font-medium ${
                              isZijing
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-amber-50 text-amber-900 border border-amber-200'
                            }`}
                          >
                            {thread.tag}
                          </span>
                          {thread.isHot && (
                            <span className="inline-flex items-center gap-0.5 rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 font-medium text-[#9e2a2b]">
                              <Flame className="h-3 w-3" />
                              热议焦点
                            </span>
                          )}
                          <span className="font-medium text-stone-600">{thread.author}</span>
                          <span className="text-stone-300">·</span>
                          <span className="font-mono-tech text-stone-400">{thread.createdAt}</span>
                        </div>

                        <h3 className="text-[15px] font-bold leading-snug text-[#16263f] group-hover:text-[#9e2a2b] transition">
                          {thread.title}
                        </h3>
                        <p className="mt-1.5 line-clamp-1 text-xs text-stone-500">
                          {thread.replies[0]?.content}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2 text-xs">
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 font-mono-tech text-[11px] text-stone-600">
                          {thread.replies.length} 楼
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-stone-400 group-hover:text-[#9e2a2b]">
                          {isRead ? '已阅' : '进帖'}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {foldedThreadCount > 0 && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      setExpandAllThreads(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-1.5 text-xs font-medium text-stone-600 hover:border-[#16263f] hover:text-[#16263f] cursor-pointer transition"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span>展开更多历史归档旧帖（其余 {foldedThreadCount} 帖）</span>
                  </button>
                </div>
              )}
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
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('ui');
                        setViewMode('list');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-1.5 text-xs font-medium text-[#16263f] hover:border-[#16263f] cursor-pointer transition"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>返回帖子列表</span>
                    </button>

                    {/* 经典 BBS「只看楼主」筛选开关 */}
                    <button
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('ui');
                        setOnlyOp((v) => !v);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition ${
                        onlyOp
                          ? 'border-[#16263f] bg-[#16263f] text-white'
                          : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>{onlyOp ? '正在只看楼主（点击看全楼）' : '只看楼主'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {hiddenFloorReply && (
                      <button
                        type="button"
                        onClick={jumpToHiddenFloor}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 cursor-pointer transition"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-700" />
                        <span>直达末楼折叠异常层 (#{hiddenFloorReply.floor}F)</span>
                      </button>
                    )}

                    {activeThread.unlocksSite === 'chronicles' && (
                      <button
                        type="button"
                        onClick={handleJumpExternalChronicles}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#9e2a2b]/40 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-[#9e2a2b] hover:bg-red-100 cursor-pointer transition"
                      >
                        <span>访问贴内「云溪水利方志网」</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 帖子主标题头 */}
                <div className="mb-5 rounded-2xl border border-[#dfd8ca] bg-white px-6 py-5 shadow-2xs">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                        isZijing
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : 'bg-amber-50 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {activeThread.tag}
                    </span>
                    <span className="text-stone-600">楼主：{activeThread.author}</span>
                    <span className="text-stone-300">·</span>
                    <span className="font-mono-tech text-stone-400">{activeThread.createdAt}</span>
                  </div>
                  <h2 className="font-serif-cn text-xl font-bold leading-snug text-[#16263f]">
                    {activeThread.title}
                  </h2>
                </div>

                {/* 清爽分层的楼层卡片 */}
                <div className="space-y-3.5">
                  {displayedReplies.map((reply) => {
                    const isHiddenTarget = Boolean(reply.hiddenKeywordRequired);
                    const locked =
                      isHiddenTarget && !isKeywordUnlocked(reply.hiddenKeywordRequired);

                    if (locked && reply.hiddenKeywordRequired) {
                      return (
                        <div
                          id="bbs-hidden-floor-anchor"
                          key={reply.floor}
                          className="rounded-2xl border-2 border-dashed border-amber-500/70 bg-amber-50/85 p-5 shadow-2xs"
                        >
                          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-950">
                            <Lock className="h-4 w-4 text-amber-700" />
                            <span>#{reply.floor} 楼 · 已被站务折叠的异常缓存楼层</span>
                          </div>
                          <p className="mb-3 text-xs leading-relaxed text-stone-600">
                            该楼层已被屏蔽。输入该楼层涉及的核心技术模型英文关键词可调出网页镜像缓存：
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={hiddenFloorInput}
                              onChange={(e) => setHiddenFloorInput(e.target.value)}
                              placeholder="输入折叠索引关键词（如课题组使用的超分补帧模型名）……"
                              className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs text-stone-800 focus:border-[#9e2a2b] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUnlockHiddenReply(reply.hiddenKeywordRequired!)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#16263f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1f3557] cursor-pointer"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              <span>调出缓存</span>
                            </button>
                          </div>
                          {hiddenFloorError && (
                            <p className="mt-2 text-xs font-medium text-[#9e2a2b]">{hiddenFloorError}</p>
                          )}
                        </div>
                      );
                    }

                    const { body, signature } = splitBodyAndSignature(reply.content);
                    const isOpAuthor = reply.author === activeThread.author;

                    return (
                      <div
                        id={isHiddenTarget ? 'bbs-hidden-floor-anchor' : undefined}
                        key={reply.floor}
                        className={`rounded-2xl border p-5 shadow-2xs transition ${
                          isHiddenTarget
                            ? 'border-emerald-400 bg-emerald-50/50'
                            : reply.act3Appended
                            ? 'border-red-200 bg-[#fff6f6]'
                            : reply.isAssimilatedTone
                            ? 'border-amber-300/80 bg-[#fcf7eb]'
                            : 'border-[#e5dfd3] bg-white'
                        }`}
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono-tech text-[11px] font-medium text-stone-600">
                              #{reply.floor}F
                            </span>
                            <span className="font-bold text-[#16263f]">{reply.author}</span>
                            {isOpAuthor && (
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900">
                                楼主
                              </span>
                            )}
                            {reply.act3Appended && (
                              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-[#9e2a2b]">
                                新同步缓存
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-stone-400 font-mono-tech">
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

                        <div className="whitespace-pre-line text-[14px] leading-[1.9] text-stone-800">
                          {renderTextWithLinks(body)}
                        </div>

                        {/* 复古论坛标志性虚线个人器材签名档 */}
                        {signature && (
                          <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-amber-400/80 bg-amber-50/65 px-3.5 py-2 font-mono-tech text-xs text-amber-950">
                            <Camera className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                            <span>{signature}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {hiddenRemainingCount > 0 && (
                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('ui');
                        setVisibleFloorLimit((n) => n + 10);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-5 py-2 text-xs font-semibold text-[#16263f] shadow-2xs hover:border-[#9e2a2b] hover:text-[#9e2a2b] cursor-pointer transition"
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
