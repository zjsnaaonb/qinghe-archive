import React, { useEffect, useMemo, useState } from 'react';
import {
  MessageSquare,
  Film,
  Search,
  Flame,
  Lock,
  ExternalLink,
  BookmarkCheck,
  AlertTriangle,
  Unlock,
  Eye,
  Clock,
  MapPin,
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
  onAddClue,
  onAddKeywords,
}) => {
  const [activeBoard, setActiveBoard] = useState<'zijing' | 'developer'>('zijing');
  const [selectedThreadId, setSelectedThreadId] = useState<string>('zijing-40918');
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [hiddenFloorInput, setHiddenFloorInput] = useState('');
  const [unlockedHiddenKeywords, setUnlockedHiddenKeywords] = useState<string[]>([]);
  const [hiddenFloorError, setHiddenFloorError] = useState('');

  // 响应跨站检索定位：自动切换皮肤版块并打开目标帖子
  useEffect(() => {
    if (!focusedItemId) return;
    const target = BBS_THREADS.find((t) => t.id === focusedItemId);
    if (target) {
      setActiveBoard(target.board);
      setSelectedThreadId(target.id);
      onClearFocus?.();
    }
  }, [focusedItemId, onClearFocus]);

  // 若全局检索历史或已解锁关键词中已包含 EyeGen，自动同步解锁隐藏楼层
  const isKeywordUnlocked = (reqKeyword?: string): boolean => {
    if (!reqKeyword) return true;
    const target = reqKeyword.trim().toLowerCase();
    if (activeQuery.trim().toLowerCase().includes(target)) return true;
    if (unlockedHiddenKeywords.some((k) => k.toLowerCase() === target)) return true;
    if (state.searchHistory.some((h) => h.toLowerCase().includes(target))) return true;
    if (state.unlockedKeywords.some((k) => k.toLowerCase().includes(target))) return true;
    return false;
  };

  // 版块帖子过滤（若站内搜索词命中另一版块，也会贴心提示切换）
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
        ...t.replies.map((r) => `${r.author} ${r.content} ${r.hiddenKeywordRequired ?? ''}`),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    }).length;
  }, [activeBoard, activeQuery]);

  const activeThread: BBSThread | undefined = useMemo(() => {
    const inCurrent = boardThreads.find((t) => t.id === selectedThreadId);
    if (inCurrent) return inCurrent;
    return boardThreads[0] ?? BBS_THREADS.find((t) => t.board === activeBoard);
  }, [boardThreads, selectedThreadId, activeBoard]);

  // 阅读帖子自动归档线索并记录已读
  useEffect(() => {
    if (!activeThread) return;
    if (!state.readDocIds.includes(activeThread.id)) {
      onMarkRead(activeThread.id);
    }
    if (
      activeThread.clueNote &&
      !state.discoveredClues.some((c) => c.id === activeThread.clueNote?.id)
    ) {
      onAddClue({
        id: activeThread.clueNote.id,
        title: activeThread.clueNote.title,
        detail: activeThread.clueNote.detail,
        sourceSite: 'bbs',
      });
    }
  }, [activeThread, state.readDocIds, state.discoveredClues, onMarkRead, onAddClue]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    horrorAudio.playClick('ui');
    const q = searchInput.trim();
    setActiveQuery(q);

    if (q.toLowerCase().includes('eyegen')) {
      horrorAudio.playClick('unlock');
      setUnlockedHiddenKeywords((prev) => Array.from(new Set([...prev, 'EyeGen'])));
      onAddKeywords(['EyeGen', '1998']);
      // 自动切到含 EyeGen 隐藏层的热帖
      const targetThread = BBS_THREADS.find((t) =>
        t.replies.some((r) => r.hiddenKeywordRequired?.toLowerCase() === 'eyegen')
      );
      if (targetThread) {
        setActiveBoard(targetThread.board);
        setSelectedThreadId(targetThread.id);
      }
    }
  };

  const handleUnlockHiddenReply = (reqKey: string) => {
    if (hiddenFloorInput.trim().toLowerCase() === reqKey.trim().toLowerCase()) {
      horrorAudio.playClick('unlock');
      setUnlockedHiddenKeywords((prev) => Array.from(new Set([...prev, reqKey])));
      setHiddenFloorError('');
      onAddKeywords([reqKey, '1998']);
      onAddClue({
        id: 'clue-bbs-eyegen-88',
        title: '显影液#88楼隐藏求救：回滚密钥第二段 1998',
        detail:
          '陈默（逆光底片）在折叠隐藏层中透露：郑国栋强行运行 EyeGen 模型为无目泥塑补画眼珠，离线权重回滚密钥第二段为 1998（第一段在 OA 二级 Git 日志，第三段在 B2 底层诊断日志）。',
        sourceSite: 'bbs',
      });
    } else {
      horrorAudio.playClick('ui');
      setHiddenFloorError('索引代号不匹配（提示：留意郑国栋与陈默使用的 AI 眼部补帧模型英文名）');
    }
  };

  const handleJumpExternalChronicles = () => {
    horrorAudio.playClick('unlock');
    onUnlockSite('chronicles');
    onNavigateSite('chronicles');
  };

  // 过滤当前可见回复（第三幕后才浮现 act3Appended 鬼回复）
  const visibleReplies: BBSReply[] = useMemo(() => {
    if (!activeThread) return [];
    return activeThread.replies.filter((r) => !r.act3Appended || state.act >= 3);
  }, [activeThread, state.act]);

  const isZijing = activeBoard === 'zijing';

  // 将回复正文中的 yunxi-chronicles.gov.cn 渲染为可点击外链
  const renderReplyContent = (content: string) => {
    if (!content.includes('yunxi-chronicles.gov.cn')) {
      return <div className="whitespace-pre-line">{content}</div>;
    }
    const parts = content.split(/(yunxi-chronicles\.gov\.cn(?::8080)?)/g);
    return (
      <div className="whitespace-pre-line">
        {parts.map((part, idx) =>
          part.startsWith('yunxi-chronicles.gov.cn') ? (
            <button
              key={idx}
              type="button"
              onClick={handleJumpExternalChronicles}
              className="mx-0.5 inline-flex items-center gap-1 rounded border border-amber-500/60 bg-amber-950/60 px-1.5 py-0.5 font-mono-tech text-xs font-bold text-amber-300 underline hover:bg-amber-900/80 cursor-pointer"
            >
              <span>{part}</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          ) : (
            <React.Fragment key={idx}>{part}</React.Fragment>
          )
        )}
      </div>
    );
  };

  return (
    <div
      className={`min-h-[calc(100vh-84px)] transition-colors duration-300 ${
        isZijing ? 'bg-[#0f0b1c] text-violet-50' : 'bg-[#151b24] text-slate-100'
      }`}
    >
      {/* 顶部双皮肤社区切换栏 + 搜索框 */}
      <div
        className={`border-b px-4 py-3.5 ${
          isZijing
            ? 'border-violet-900/60 bg-[#17112b]'
            : 'border-slate-700 bg-[#1e2938]'
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          {/* 一键切换双版块皮肤 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('ui');
                setActiveBoard('zijing');
                const first = BBS_THREADS.find((t) => t.board === 'zijing');
                if (first) setSelectedThreadId(first.id);
              }}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                isZijing
                  ? 'border-violet-400 bg-violet-600/30 text-violet-100 shadow-sm shadow-violet-950'
                  : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="h-4 w-4 text-violet-400" />
              <div className="text-left">
                <div>南大紫荆站 · 夜间匿名树洞</div>
                <div className="text-[10px] font-normal opacity-75">高校匿名卡片流快照</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('film');
                setActiveBoard('developer');
                const first = BBS_THREADS.find((t) => t.board === 'developer');
                if (first) setSelectedThreadId(first.id);
              }}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                !isZijing
                  ? 'border-amber-500/80 bg-[#2b3b52] text-amber-200 shadow-sm'
                  : 'border-violet-900/60 bg-[#120d22] text-violet-300/70 hover:text-white'
              }`}
            >
              <Film className="h-4 w-4 text-amber-400" />
              <div className="text-left">
                <div>显影液 · 复古DV与银盐胶片论坛</div>
                <div className="text-[10px] font-normal opacity-75">Discuz! 2004 经典表格盖楼风</div>
              </div>
            </button>
          </div>

          {/* 站内搜帖 & 搜隐藏楼层框 */}
          <form onSubmit={handleSearchSubmit} className="flex w-full max-w-md items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜树洞号 / ID（如 40918、逆光底片）或隐藏层代号（如 EyeGen）"
                className={`w-full rounded border py-1.5 pl-3 pr-8 text-xs focus:outline-none ${
                  isZijing
                    ? 'border-violet-800 bg-[#0d0918] text-violet-100 placeholder-violet-400/50 focus:border-violet-400'
                    : 'border-slate-600 bg-[#0f141b] text-slate-100 placeholder-slate-500 focus:border-amber-400'
                }`}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-amber-300 cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
            {activeQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setActiveQuery('');
                }}
                className="rounded border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 hover:text-white cursor-pointer"
              >
                清空
              </button>
            )}
          </form>
        </div>

        {/* 跨版块命中提示条 */}
        {activeQuery && otherBoardMatchCount > 0 && (
          <div className="mx-auto mt-2.5 max-w-7xl rounded border border-amber-700/60 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-200 flex items-center justify-between">
            <span>
              当前搜索词 “{activeQuery}” 在另一版块【
              {isZijing ? '显影液复古DV论坛' : '紫荆站夜间匿名树洞'}】还有{' '}
              <strong>{otherBoardMatchCount}</strong> 条命中帖！
            </span>
            <button
              type="button"
              onClick={() => setActiveBoard(isZijing ? 'developer' : 'zijing')}
              className="font-bold underline hover:text-white cursor-pointer"
            >
              立即切过去查看 →
            </button>
          </div>
        )}
      </div>

      {/* 主体：左侧主题帖列表 + 右侧楼层阅读区 */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-12">
        {/* 左侧帖子索引栏 */}
        <aside className="lg:col-span-4">
          <div
            className={`overflow-hidden rounded-lg border ${
              isZijing
                ? 'border-violet-900/60 bg-[#161029]'
                : 'border-slate-700 bg-[#1b2430]'
            }`}
          >
            <div
              className={`flex items-center justify-between border-b px-3.5 py-2.5 text-xs font-bold ${
                isZijing
                  ? 'border-violet-900/60 bg-[#1f1738] text-violet-200'
                  : 'border-slate-700 bg-[#233042] text-amber-200'
              }`}
            >
              <span>
                {isZijing ? '🌙 紫荆树洞 · 夜间热榜快照' : '🎞️ 显影液 · 窄幅电影与暗房技术版'}
              </span>
              <span className="font-mono-tech text-[11px] opacity-80">
                {boardThreads.length} 帖
              </span>
            </div>

            <div className="max-h-[72vh] overflow-y-auto divide-y divide-white/10">
              {boardThreads.map((t) => {
                const isSelected = activeThread?.id === t.id;
                const isRead = state.readDocIds.includes(t.id);
                const hasAct3Ghost = state.act >= 3 && t.replies.some((r) => r.act3Appended);

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      setSelectedThreadId(t.id);
                    }}
                    className={`w-full p-3.5 text-left transition cursor-pointer ${
                      isSelected
                        ? isZijing
                          ? 'bg-violet-900/35 border-l-4 border-l-violet-400'
                          : 'bg-slate-800 border-l-4 border-l-amber-400'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            isZijing
                              ? 'bg-violet-950 text-violet-300 border border-violet-700/50'
                              : 'bg-slate-900 text-amber-300 border border-slate-600'
                          }`}
                        >
                          {t.tag}
                        </span>
                        {t.isHot && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-rose-950/80 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                            <Flame className="h-2.5 w-2.5" /> 热帖
                          </span>
                        )}
                        {t.isLocked && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                            <Lock className="h-2.5 w-2.5" /> 锁帖
                          </span>
                        )}
                        {hasAct3Ghost && (
                          <span className="rounded bg-red-950/80 px-1.5 py-0.5 text-[10px] font-mono-tech text-red-300 animate-pulse">
                            02:17新跟帖
                          </span>
                        )}
                      </div>
                      {!isRead && (
                        <span className="h-2 w-2 rounded-full bg-amber-400" title="未读帖" />
                      )}
                    </div>

                    <div className="line-clamp-2 text-xs font-bold leading-snug text-white">
                      {t.title}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] opacity-65 font-mono-tech">
                      <span>{t.author}</span>
                      <span>
                        {t.replies.filter((r) => !r.act3Appended || state.act >= 3).length} 楼 ·{' '}
                        {t.views} 阅
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* 右侧盖楼详情区：根据版块自动渲染【树洞深紫卡片风】或【千禧经典表格论坛风】 */}
        <main className="lg:col-span-8">
          {activeThread && (
            <div>
              {/* 帖子主标题头 */}
              <div
                className={`mb-4 rounded-lg border p-4 sm:p-5 ${
                  isZijing
                    ? 'border-violet-800/60 bg-[#191230]'
                    : 'border-slate-600 bg-[#202b3a]'
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded px-2 py-0.5 font-mono-tech ${
                      isZijing
                        ? 'bg-violet-950 text-violet-300'
                        : 'bg-slate-900 text-amber-300'
                    }`}
                  >
                    [{activeThread.tag}]
                  </span>
                  <span className="inline-flex items-center gap-1 text-zinc-400 font-mono-tech">
                    <Clock className="h-3 w-3" /> {activeThread.createdAt}
                  </span>
                  <span className="inline-flex items-center gap-1 text-zinc-400 font-mono-tech">
                    <Eye className="h-3 w-3" /> {activeThread.views} 次浏览
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold leading-snug text-white">
                  {activeThread.title}
                </h2>

                {/* 若该帖解锁外部水利网，展示醒目的外链归档入口 */}
                {activeThread.unlocksSite === 'chronicles' && (
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-600/70 bg-amber-950/40 p-3 text-xs text-amber-100">
                    <div>
                      <strong className="text-amber-300">【帖内关联外部旧网】</strong>{' '}
                      楼主提及核查库底 108.4m 高程的水利政务档案站：
                      <span className="ml-1 font-mono-tech underline">
                        http://yunxi-chronicles.gov.cn:8080
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleJumpExternalChronicles}
                      className="inline-flex items-center gap-1.5 rounded bg-amber-600 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-500 cursor-pointer"
                    >
                      <span>接入云溪水利与方志网</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {activeThread.clueNote && (
                  <div className="mt-3 rounded border border-emerald-800/60 bg-emerald-950/30 px-3.5 py-2.5 text-xs text-emerald-200">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                      <BookmarkCheck className="h-3.5 w-3.5" />
                      <span>已提取关键线索：{activeThread.clueNote.title}</span>
                    </div>
                    <p className="mt-0.5 text-emerald-100/85">{activeThread.clueNote.detail}</p>
                  </div>
                )}
              </div>

              {/* 楼层渲染：紫荆树洞卡片流 vs 显影液千禧年经典双栏表格 */}
              {isZijing ? (
                <div className="space-y-3">
                  {visibleReplies.map((reply) => {
                    const locked = !isKeywordUnlocked(reply.hiddenKeywordRequired);
                    if (locked && reply.hiddenKeywordRequired) {
                      return (
                        <div
                          key={reply.floor}
                          className="rounded-lg border border-dashed border-red-800/70 bg-red-950/20 p-4 text-xs text-red-200"
                        >
                          <div className="font-bold">
                            #{reply.floor}楼 · 折叠数据层（需检索特定模型代号解锁）
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={reply.floor}
                        className={`rounded-xl border p-4 shadow-sm ${
                          reply.act3Appended
                            ? 'border-red-800/80 bg-red-950/30'
                            : reply.isAssimilatedTone
                            ? 'border-amber-800/60 bg-[#1d142b]'
                            : 'border-violet-900/50 bg-[#17112b]'
                        }`}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-violet-700/40 border border-violet-500/40 px-2 py-0.5 font-mono-tech font-bold text-violet-200">
                              #{reply.floor}L · {reply.author}
                            </span>
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-violet-200">
                              {reply.avatarTag}
                            </span>
                            {reply.act3Appended && (
                              <span className="rounded bg-red-900/80 px-1.5 py-0.5 text-[10px] font-bold text-red-200">
                                第三幕异常追加跟帖
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 text-[11px] font-mono-tech text-violet-300/65">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {reply.ipLocation}
                            </span>
                            <span>{reply.time}</span>
                          </div>
                        </div>

                        <div
                          className={`text-sm leading-7 ${
                            reply.isAssimilatedTone ? 'text-red-100/95 font-serif-cn' : 'text-violet-50/95'
                          }`}
                        >
                          {renderReplyContent(reply.content)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 显影液论坛：千禧年经典 Discuz 表格盖楼风 */
                <div className="overflow-hidden rounded border border-slate-600 bg-[#1a222d]">
                  {visibleReplies.map((reply) => {
                    const reqKey = reply.hiddenKeywordRequired;
                    const locked = !isKeywordUnlocked(reqKey);

                    if (locked && reqKey) {
                      return (
                        <div
                          key={reply.floor}
                          className="border-t-2 border-dashed border-red-800/80 bg-[#1b1116] p-5 text-xs text-red-200"
                        >
                          <div className="mb-2 flex items-center gap-2 font-mono-tech text-red-300 font-bold">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            <span>
                              [DISC-CACHE #{reply.floor}楼 · 已被管理员隐藏的异常缓存块]
                            </span>
                          </div>
                          <p className="mb-3 text-zinc-300 leading-relaxed">
                            系统提示：该楼层因触发课题组内部模型代号敏感词被折叠。你可以在上方论坛搜索框检索该
                            <strong> AI 视觉补帧模型英文代号</strong>，或在下方直接输入代号强制解码：
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={hiddenFloorInput}
                              onChange={(e) => setHiddenFloorInput(e.target.value)}
                              placeholder="输入 AI 补帧模型英文名解码 #88楼..."
                              className="rounded border border-red-800 bg-zinc-950 px-3 py-1.5 text-xs font-mono-tech text-zinc-100 focus:border-amber-400 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUnlockHiddenReply(reqKey)}
                              className="inline-flex items-center gap-1 rounded border border-amber-600 bg-amber-950/60 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-900 cursor-pointer"
                            >
                              <Unlock className="h-3.5 w-3.5" />
                              <span>强制解码 #{reply.floor}楼</span>
                            </button>
                          </div>
                          {hiddenFloorError && (
                            <p className="mt-2 text-[11px] text-red-400">{hiddenFloorError}</p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={reply.floor}
                        className={`grid grid-cols-1 border-b border-slate-700 md:grid-cols-12 ${
                          reply.hiddenKeywordRequired
                            ? 'bg-red-950/30'
                            : reply.isAssimilatedTone
                            ? 'bg-[#211d26]'
                            : ''
                        }`}
                      >
                        {/* 左栏：复古论坛发帖人信息框 */}
                        <div className="border-b md:border-b-0 md:border-r border-slate-700 bg-[#151d27] p-3.5 md:col-span-3">
                          <div className="flex items-center gap-2 md:flex-col md:items-start">
                            <div className="flex h-11 w-11 items-center justify-center rounded border border-slate-600 bg-[#233143] font-mono-tech text-xs font-bold text-amber-300">
                              {reply.avatarTag.slice(0, 4)}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-amber-200">
                                {reply.author}
                              </div>
                              <div className="mt-0.5 text-[10px] font-mono-tech text-slate-400">
                                头衔：{reply.avatarTag}
                              </div>
                              <div className="mt-0.5 text-[10px] font-mono-tech text-slate-500">
                                IP：{reply.ipLocation}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 右栏：楼层顶条 + 正文 + 器材签名档 */}
                        <div className="p-4 md:col-span-9 flex flex-col justify-between">
                          <div>
                            <div className="mb-3 flex flex-wrap items-center justify-between border-b border-slate-700/80 pb-1.5 text-[11px] font-mono-tech text-slate-400">
                              <span>发表于 {reply.time}</span>
                              <div className="flex items-center gap-2">
                                {reply.hiddenKeywordRequired && (
                                  <span className="rounded bg-emerald-950 border border-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                    隐藏层已解码 ({reply.hiddenKeywordRequired})
                                  </span>
                                )}
                                {reply.isAssimilatedTone && (
                                  <span className="rounded bg-red-950/90 px-1.5 py-0.5 text-[10px] text-red-300">
                                    语调同化异常
                                  </span>
                                )}
                                <span className="font-bold text-amber-300">
                                  {reply.floor === 1 ? '楼主 (1#)' : `${reply.floor}#`}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`text-sm leading-7 ${
                                reply.isAssimilatedTone
                                  ? 'font-serif-cn text-red-100/90'
                                  : 'text-slate-200'
                              }`}
                            >
                              {renderReplyContent(reply.content)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
