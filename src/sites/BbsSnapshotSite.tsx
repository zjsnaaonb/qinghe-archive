import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ExternalLink,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { BBS_THREADS } from '../data/bbsData';
import type { BBSReply, BBSThread } from '../types/game';
import type { CommonSiteProps } from './siteProps';
import { renderInlineRichText, stripInlineMarkdown } from '../components/EditorialProse';
import { extractSearchSnippet, scoreSearchMatch } from '../engine/search';
import { siteUiMemory } from '../engine/siteMemory';
import { horrorAudio } from '../engine/audio';

export const BbsSnapshotSite: React.FC<CommonSiteProps> = ({
  state,
  focusedItemId,
  onClearFocus,
  navCommand,
  onRecordNav,
  onNavigateSite,
  onUnlockSite,
  onMarkRead,
  onTriggerScare,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'thread'>(() => siteUiMemory.bbs.viewMode);
  const [activeBoard, setActiveBoard] = useState<'zijing' | 'developer'>(() => siteUiMemory.bbs.activeBoard);
  const [selectedThreadId, setSelectedThreadId] = useState<string>(() => siteUiMemory.bbs.selectedThreadId);
  const [searchInput, setSearchInput] = useState(() => siteUiMemory.bbs.searchInput);
  const [hiddenFloorInput, setHiddenFloorInput] = useState('');
  const [unlockedHiddenKeywords, setUnlockedHiddenKeywords] = useState<string[]>([]);
  const [hiddenFloorError, setHiddenFloorError] = useState('');
  const [visibleFloorLimit, setVisibleFloorLimit] = useState<number>(() => siteUiMemory.bbs.visibleFloorLimit);
  const [onlyOp, setOnlyOp] = useState(() => siteUiMemory.bbs.onlyOp);
  const [expandAllThreads, setExpandAllThreads] = useState(() => siteUiMemory.bbs.expandAllThreads);
  const lastNavSeqRef = useRef<number>(0);

  useEffect(() => {
    siteUiMemory.bbs.viewMode = viewMode;
    siteUiMemory.bbs.activeBoard = activeBoard;
    siteUiMemory.bbs.selectedThreadId = selectedThreadId;
    siteUiMemory.bbs.searchInput = searchInput;
    siteUiMemory.bbs.visibleFloorLimit = visibleFloorLimit;
    siteUiMemory.bbs.onlyOp = onlyOp;
    siteUiMemory.bbs.expandAllThreads = expandAllThreads;
  }, [viewMode, activeBoard, selectedThreadId, searchInput, visibleFloorLimit, onlyOp, expandAllThreads]);

  // 论坛实况灵异盖楼状态：阅读核心帖数秒后，B2暗房离线节点实时正在输入并刷出第四面墙鬼回复
  const [ghostReplyStage, setGhostReplyStage] = useState<'idle' | 'typing' | 'posted'>('idle');
  const ghostPlayedThreadsRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    if (!navCommand || navCommand.site !== 'bbs' || navCommand.seq === lastNavSeqRef.current) {
      return;
    }
    lastNavSeqRef.current = navCommand.seq;
    if (navCommand.itemId.startsWith('__list')) {
      if (navCommand.itemId === '__list:developer__') setActiveBoard('developer');
      if (navCommand.itemId === '__list:zijing__') setActiveBoard('zijing');
      setViewMode('list');
      return;
    }
    const target = BBS_THREADS.find((t) => t.id === navCommand.itemId);
    if (target) {
      setActiveBoard(target.board);
      setSelectedThreadId(target.id);
      setVisibleFloorLimit(12);
      setOnlyOp(false);
      setViewMode('thread');
    }
  }, [navCommand]);

  const activeQuery = searchInput.trim();

  const isKeywordUnlocked = (reqKeyword?: string): boolean => {
    if (!reqKeyword) return true;
    const target = reqKeyword.trim().toLowerCase();
    if (activeQuery.toLowerCase().includes(target)) return true;
    if (unlockedHiddenKeywords.some((k) => k.toLowerCase() === target)) return true;
    if (state.searchHistory.some((h) => h.toLowerCase().includes(target))) return true;
    if (state.unlockedKeywords.some((k) => k.toLowerCase() === target)) return true;
    return false;
  };

  const scoreThread = (t: BBSThread, q: string) => {
    const repliesBody = t.replies
      .filter((r) => !r.act3Appended || state.act >= 3)
      .map((r) => `${r.author}：${r.content} ${r.hiddenKeywordRequired ?? ''}`)
      .join('\n');
    const res = scoreSearchMatch(q, {
      code: `${t.tag} ${t.id}`,
      title: t.title,
      subtitle: t.author,
      tags: t.keywords,
      summary: t.replies[0]?.content ?? '',
      body: repliesBody,
      allowBodyMatch: true,
    });
    return {
      ...res,
      snippet: extractSearchSnippet(
        repliesBody,
        q,
        t.replies[0]?.content ?? '',
        res.bestTerm
      ),
    };
  };

  const scoredBoardThreads = useMemo(() => {
    const inBoard = BBS_THREADS.filter((t) => t.board === activeBoard);
    if (!activeQuery) {
      return inBoard.map((t) => ({
        thread: t,
        score: 1,
        snippet: stripInlineMarkdown(t.replies[0]?.content ?? ''),
      }));
    }
    const hits: Array<{ thread: BBSThread; score: number; snippet: string }> = [];
    for (const t of inBoard) {
      const s = scoreThread(t, activeQuery);
      if (s.matched) {
        hits.push({ thread: t, score: s.score, snippet: s.snippet });
      }
    }
    hits.sort((a, b) => b.score - a.score);
    return hits;
  }, [activeBoard, activeQuery, state.act]);

  const boardThreads = useMemo(
    () => scoredBoardThreads.map((x) => x.thread),
    [scoredBoardThreads]
  );

  const snippetByThreadId = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of scoredBoardThreads) {
      m.set(x.thread.id, x.snippet);
    }
    return m;
  }, [scoredBoardThreads]);

  const shouldFoldMinorThreads =
    state.act === 1 && !activeQuery && !expandAllThreads && boardThreads.length > 3;
  const displayedThreads = useMemo(() => {
    if (!shouldFoldMinorThreads) return boardThreads;
    const hot = boardThreads.filter((t) => t.isHot);
    if (hot.length >= 3) return hot.slice(0, 3);
    const rest = boardThreads.filter((t) => !t.isHot);
    return [...hot, ...rest].slice(0, 3);
  }, [boardThreads, shouldFoldMinorThreads]);

  const foldedThreadCount = Math.max(0, boardThreads.length - displayedThreads.length);

  const otherBoardMatchCount = useMemo(() => {
    if (!activeQuery) return 0;
    const other = activeBoard === 'zijing' ? 'developer' : 'zijing';
    return BBS_THREADS.filter((t) => t.board === other && scoreThread(t, activeQuery).matched).length;
  }, [activeBoard, activeQuery, state.act]);

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
    onRecordNav?.(
      thread.id,
      `${thread.board === 'zijing' ? '树洞' : '显影液'} · ${thread.title.slice(0, 15)}`
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (viewMode !== 'thread' || !activeThread) return;
    if (!state.readDocIds.includes(activeThread.id)) {
      onMarkRead(activeThread.id);
    }
  }, [viewMode, activeThread, state.readDocIds, onMarkRead]);

  // 帖内实况民俗惊悚演出：在静态快照帖中停留片刻后，B2暗房节点实时敲字回帖并回传真实恐怖抓拍图！
  useEffect(() => {
    if (viewMode !== 'thread' || !activeThread) {
      setGhostReplyStage('idle');
      return;
    }

    if (ghostPlayedThreadsRef.current.has(activeThread.id)) {
      setGhostReplyStage('posted');
      return;
    }

    setGhostReplyStage('idle');
    const t1 = window.setTimeout(() => {
      setGhostReplyStage('typing');
    }, 2800);

    const t2 = window.setTimeout(() => {
      ghostPlayedThreadsRef.current.add(activeThread.id);
      horrorAudio.playMirrorChill(state.scareMode);
      setGhostReplyStage('posted');
    }, 5400);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [viewMode, activeThread, state.scareMode]);

  const ghostLivePayload = useMemo(() => {
    if (!activeThread) return null;
    if (activeThread.id === 'zijing-40918') {
      return {
        author: '匿名树洞 #40918-回声',
        ip: '南大校内 · 人文楼B2湿法暗房专线',
        text: '别帮苏晓棠算访客口令了。她把自己锁在 B1 善本库里，把眼镜片都磨花了，看不见门缝底下塞进去的红纸条；你面前这块屏幕这么亮，替她低头看一眼你自己的电脑桌底吧。',
        imgSrc: './media/horror_under_desk.png',
        imgCaption: '附件：DESK_FLOOR_IR.JPG（刚刚上传 · 终端桌底红外抓拍）',
        scareType: 'under_desk' as const,
      };
    }
    if (activeThread.id === 'dev-9816mm') {
      return {
        author: '逆光底片 [离线托管态]',
        ip: '10.14.202.38 · B2三号机柜',
        text: '师姐托你翻我旧帖的？Bolex 取景器里全是水库底下的白雾……我数了一宿，晒谷场上明明站着十二个人，你怎么只数出十一个？我刚调了你屏幕顶上的反向取景，你自己数数你椅背后面站着几个。',
        imgSrc: './media/horror_webcam_behind.png',
        imgCaption: '附件：CAM-EXT-39_0217.JPG（刚刚上传 · 屏幕上方反向夜视帧）',
        scareType: 'webcam' as const,
      };
    }
    return {
      author: '祠下戏班看箱人',
      ip: '未知内网节点 · 高程 108.4m',
      text: '三通铜锣还没敲完，客官翻帖子翻得这么急做什么。方才有人端着第 40 面木框梳妆镜贴在善本库门镜外头往里照——借你的眼睛认认，镜子里排着队的是哪一村的乡亲？',
      imgSrc: './media/horror_peephole_corridor.png',
      imgCaption: '附件：VAULT_B1_PEEPHOLE.JPG（刚刚上传 · 地下库房防盗猫眼实拍）',
      scareType: 'peephole' as const,
    };
  }, [activeThread]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    horrorAudio.playClick('ui');
    const q = searchInput.trim();
    if (!q) return;

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
        onRecordNav?.(targetThread.id, `显影液 · #88F 异常缓存层`);
        return;
      }
    }

    // 若当前版块无命中但另一版块有命中，自动切过去方便玩家直达（如在树洞搜“逆光底片”自动跳显影液论坛！）
    if (boardThreads.length === 0 && otherBoardMatchCount > 0) {
      const nextBoard = activeBoard === 'zijing' ? 'developer' : 'zijing';
      setActiveBoard(nextBoard);
    }
    setViewMode('list');
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
      return <React.Fragment key={idx}>{renderInlineRichText(part, 'paper')}</React.Fragment>;
    });
  };

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
      {/* 纯文字质感双版块切换顶栏（去除AI图标） */}
      <div
        className={`border-b ${
          isZijing ? 'border-purple-200/80 bg-white/95' : 'border-[#e2d9c5] bg-[#fcfaf4]/95'
        }`}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div className="flex items-center gap-1.5 overflow-hidden rounded-xl border border-stone-200 bg-stone-100/80 p-1">
            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('ui');
                setActiveBoard('zijing');
                setViewMode('list');
                onRecordNav?.('__list:zijing__', '紫荆站 · 夜间树洞列表');
              }}
              className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer outline-none focus:outline-none transition-colors duration-150 ${
                isZijing ? 'text-purple-900' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {isZijing && (
                <motion.span
                  layoutId="bbsBoardTabPill"
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                  className="pointer-events-none absolute inset-0 rounded-lg border border-purple-300/80 bg-white shadow-2xs"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span className="font-mono-tech text-[10px] opacity-75">[ZIJING]</span>
                <span>南大紫荆站 · 夜间树洞</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('ui');
                setActiveBoard('developer');
                setViewMode('list');
                onRecordNav?.('__list:developer__', '显影液 · 胶片论坛列表');
              }}
              className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer outline-none focus:outline-none transition-colors duration-150 ${
                !isZijing ? 'text-amber-950' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {!isZijing && (
                <motion.span
                  layoutId="bbsBoardTabPill"
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                  className="pointer-events-none absolute inset-0 rounded-lg border border-amber-400/70 bg-white shadow-2xs"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <span className="font-mono-tech text-[10px] opacity-75">[16MM]</span>
                <span>显影液 · 老式 DV 胶片论坛</span>
              </span>
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="w-full sm:w-80">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchInput(val);
                  if (val.trim() && viewMode !== 'list') {
                    setViewMode('list');
                  }
                }}
                placeholder="实时搜帖号(40918)、作者(逆光底片)或关键词……"
                className="w-full rounded-xl border border-stone-300 bg-white py-2 pl-3.5 pr-14 text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:border-[#9e2a2b] focus:outline-none"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      筛选 “<strong className="text-[#9e2a2b]">{activeQuery}</strong>” 命中 {boardThreads.length} 帖
                    </span>
                    {otherBoardMatchCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          horrorAudio.playClick('ui');
                          setActiveBoard(isZijing ? 'developer' : 'zijing');
                        }}
                        className="rounded-full border border-[#9e2a2b]/40 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-[#9e2a2b] hover:bg-red-100 cursor-pointer"
                      >
                        切换查看另一版块的 {otherBoardMatchCount} 条命中 →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSearchInput('')}
                      className="text-stone-600 underline cursor-pointer"
                    >
                      重置
                    </button>
                  </div>
                )}
              </div>

              {displayedThreads.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 py-12 text-center text-xs text-stone-500">
                  {otherBoardMatchCount > 0 ? (
                    <div className="space-y-2">
                      <p>当前版块未命中 “{activeQuery}”，但在另一版块中找到了 {otherBoardMatchCount} 篇关联帖子。</p>
                      <button
                        type="button"
                        onClick={() => setActiveBoard(isZijing ? 'developer' : 'zijing')}
                        className="rounded-lg bg-[#9e2a2b] px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        立即切往{isZijing ? '「显影液论坛」' : '「紫荆站树洞」'}查看命中帖 →
                      </button>
                    </div>
                  ) : (
                    <span>未找到包含 “{activeQuery}” 的帖子，可尝试搜 40918、逆光底片、7104 或 EyeGen。</span>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedThreads.map((thread, idx) => {
                    const isRead = state.readDocIds.includes(thread.id);
                    const snippet = snippetByThreadId.get(thread.id) ?? stripInlineMarkdown(thread.replies[0]?.content ?? '');
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
                              className={`rounded-md px-2 py-0.5 font-mono-tech font-medium ${
                                isZijing
                                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                  : 'bg-amber-50 text-amber-900 border border-amber-200'
                              }`}
                            >
                              {thread.tag}
                            </span>
                            {thread.isHot && (
                              <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 font-medium text-[#9e2a2b]">
                                置顶热议
                              </span>
                            )}
                            <span className="font-medium text-stone-600">{thread.author}</span>
                            <span className="text-stone-300">·</span>
                            <span className="font-mono-tech text-stone-400">{thread.createdAt}</span>
                          </div>

                          <h3 className="text-[15px] font-bold leading-snug text-[#16263f] group-hover:text-[#9e2a2b] transition">
                            {thread.title}
                          </h3>
                          <p className="mt-1.5 line-clamp-2 text-xs text-stone-500">
                            {snippet}
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
              )}

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
                        onRecordNav?.(
                          `__list:${activeBoard}__`,
                          `${isZijing ? '紫荆站树洞' : '显影液论坛'} · 帖子列表`
                        );
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-1.5 text-xs font-medium text-[#16263f] hover:border-[#16263f] cursor-pointer transition"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>返回帖子列表</span>
                    </button>

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
                      className={`rounded px-2 py-0.5 font-mono-tech text-[11px] font-medium ${
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

                {/* 楼层卡片 */}
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
                            <span className="rounded bg-amber-200/80 px-1.5 py-0.5 font-mono-tech text-[10px]">
                              FOLDED
                            </span>
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
                              className="rounded-lg bg-[#16263f] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1f3557] cursor-pointer"
                            >
                              调出缓存
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
                            <span>{reply.time}</span>
                            <span>IP：{reply.ipLocation}</span>
                          </div>
                        </div>

                        <div className="whitespace-pre-line text-[14px] leading-[1.9] text-stone-800">
                          {renderTextWithLinks(body)}
                        </div>

                        {signature && (
                          <div className="mt-4 rounded-lg border border-dashed border-amber-400/80 bg-amber-50/65 px-3.5 py-2 font-mono-tech text-xs text-amber-950">
                            {signature}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 实况灵异盖楼：原本静态的归档快照里，B2暗房突然有人正在敲字回帖！ */}
                  <AnimatePresence mode="wait">
                    {ghostReplyStage === 'typing' && (
                      <motion.div
                        key="ghost-typing"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl border border-dashed border-[#9e2a2b]/45 bg-red-50/60 px-5 py-3.5 font-mono-tech text-xs text-[#9e2a2b]"
                      >
                        <span className="inline-block animate-pulse">
                          ● [快照异常写入] 检测到校内局域网节点 10.14.202.38（人文楼 B2 湿法暗房）正在本帖底部输入新回复……
                        </span>
                      </motion.div>
                    )}

                    {ghostReplyStage === 'posted' && ghostLivePayload && (
                      <motion.div
                        key="ghost-posted"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="rounded-2xl border border-[#9e2a2b]/50 bg-[#fff5f4] p-5 shadow-sm"
                      >
                        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-red-200/70 pb-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-[#9e2a2b] px-1.5 py-0.5 font-mono-tech text-[10px] font-bold text-white">
                              #LIVE
                            </span>
                            <span className="font-bold text-[#7f1d1d]">{ghostLivePayload.author}</span>
                            <span className="rounded border border-red-300 bg-white px-1.5 py-0.2 font-mono-tech text-[10px] text-[#9e2a2b]">
                              非静态快照 · 刚刚写入
                            </span>
                          </div>
                          <span className="font-mono-tech text-[11px] text-[#9e2a2b]">
                            IP：{ghostLivePayload.ip}
                          </span>
                        </div>
                        <p className="font-serif-cn text-[14px] leading-[1.9] text-[#5c1616]">
                          {ghostLivePayload.text}
                        </p>

                        {/* 暗房实时显影的恐怖抓拍附件（点击可全屏放大检视） */}
                        <div className="mt-3.5 overflow-hidden rounded-xl border border-[#9e2a2b]/40 bg-black">
                          <button
                            type="button"
                            onClick={() =>
                              onTriggerScare({
                                title: ghostLivePayload.imgCaption,
                                message: ghostLivePayload.text,
                                visualType: ghostLivePayload.scareType,
                              })
                            }
                            className="group relative block w-full overflow-hidden text-left cursor-pointer"
                          >
                            <motion.img
                              src={ghostLivePayload.imgSrc}
                              alt={ghostLivePayload.imgCaption}
                              initial={{ filter: 'brightness(0.18) blur(5px) grayscale(0.6)' }}
                              animate={{ filter: 'brightness(0.92) blur(0px) grayscale(0)' }}
                              transition={{ duration: 2.4, ease: 'easeOut' }}
                              className="h-52 sm:h-64 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="flex items-center justify-between bg-[#160f0f] px-3.5 py-2 font-mono-tech text-[11px] text-red-200/90">
                              <span>{ghostLivePayload.imgCaption}</span>
                              <span className="underline text-amber-200 group-hover:text-white">
                                点击全幅放大检视 →
                              </span>
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
