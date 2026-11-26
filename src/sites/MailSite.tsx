import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  ArrowRight,
  Clock,
  Inbox,
  ShieldAlert,
} from 'lucide-react';
import { MAIL_MESSAGES, type MailMessage } from '../data/mailData';
import type { CommonSiteProps } from './siteProps';
import type { SiteId } from '../types/game';
import { EditorialProse } from '../components/EditorialProse';
import { horrorAudio } from '../engine/audio';

export const MailSite: React.FC<CommonSiteProps> = ({
  state,
  focusedItemId,
  onClearFocus,
  onNavigateSite,
  onUnlockSite,
  onMarkRead,
}) => {
  // 点 9 修复：开局初期只展示林知夏的这 1 封定时求救信，绝不在第一眼堆叠多封技术邮件
  const visibleMails = useMemo(() => {
    return MAIL_MESSAGES.filter((m) => {
      if (m.id === focusedItemId) return true;
      if (m.id === 'mail-prologue') return true;
      // 只有当玩家进入青禾馆并开始调查后，才同步后续第一幕及更高幕次邮件
      if (m.minAct === 1) return state.unlockedSites.includes('bbs');
      return state.act >= m.minAct;
    });
  }, [state.act, state.unlockedSites, focusedItemId]);

  const [selectedId, setSelectedId] = useState<string>('mail-prologue');

  useEffect(() => {
    if (focusedItemId && MAIL_MESSAGES.some((m) => m.id === focusedItemId)) {
      setSelectedId(focusedItemId);
      onClearFocus?.();
    }
  }, [focusedItemId, onClearFocus]);

  const activeMail: MailMessage = useMemo(() => {
    return (
      visibleMails.find((m) => m.id === selectedId) ??
      visibleMails[0] ??
      MAIL_MESSAGES[0]
    );
  }, [visibleMails, selectedId]);

  useEffect(() => {
    if (!activeMail) return;
    if (!state.readDocIds.includes(activeMail.id)) {
      onMarkRead(activeMail.id);
    }
  }, [activeMail, state.readDocIds, onMarkRead]);

  const showSidebar = visibleMails.length > 1;

  const handlePrimaryJump = (targetSite: SiteId) => {
    horrorAudio.playClick('unlock');
    onUnlockSite(targetSite);
    onNavigateSite(targetSite);
  };

  return (
    <div className="min-h-[calc(100vh-124px)] bg-[#0e1015] px-4 py-8 text-zinc-100">
      <div className={`mx-auto ${showSidebar ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {/* 简洁安静的邮件客户端标头 */}
        <div className="mb-6 flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif-cn text-lg font-bold tracking-wide text-zinc-100">
                加密定时收件箱
              </h1>
              <p className="text-xs text-zinc-500">
                {visibleMails.length === 1
                  ? '1 封紧急未读信件 · 发自南州大学课题组备用信箱'
                  : `共收到 ${visibleMails.length} 封关联投递记录`}
              </p>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-6 ${showSidebar ? 'lg:grid-cols-12' : ''}`}>
          {/* 仅当出现多封邮件时才平滑显示左侧信件列表 */}
          {showSidebar && (
            <aside className="lg:col-span-4 space-y-2">
              <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-zinc-400">
                <Inbox className="h-3.5 w-3.5 text-amber-400" />
                <span>收件列表</span>
              </div>
              {visibleMails.map((mail) => {
                const selected = activeMail.id === mail.id;
                const unread = !state.readDocIds.includes(mail.id);
                return (
                  <motion.button
                    whileHover={{ x: 2 }}
                    key={mail.id}
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      setSelectedId(mail.id);
                    }}
                    className={`w-full rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      selected
                        ? 'border-amber-500/50 bg-zinc-900/95 shadow-lg'
                        : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-medium text-amber-300/90">{mail.category}</span>
                      <span className="font-mono-tech text-zinc-500">{mail.date.slice(5, 16)}</span>
                    </div>
                    <div className="mt-1.5 flex items-start gap-2">
                      {unread && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      )}
                      <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-zinc-100">
                        {mail.subject}
                      </h3>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-zinc-500">{mail.sender}</p>
                  </motion.button>
                );
              })}
            </aside>
          )}

          {/* 清爽留白的信件阅读卡 */}
          <section className={showSidebar ? 'lg:col-span-8' : ''}>
            <AnimatePresence mode="wait">
              <motion.article
                key={activeMail.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24 }}
                className="overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#14171f] shadow-2xl"
              >
                <div className="border-b border-zinc-800/80 bg-zinc-900/50 px-7 py-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                    {activeMail.isUrgent && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-800/60 bg-red-950/50 px-2.5 py-0.5 text-[11px] text-red-300">
                        <ShieldAlert className="h-3 w-3" />
                        定时死信开关触发
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 font-mono-tech text-[11px] text-zinc-400">
                      <Clock className="h-3 w-3" />
                      {activeMail.date}
                    </span>
                  </div>

                  <h2 className="font-serif-cn text-xl sm:text-2xl font-bold leading-snug text-zinc-50">
                    {activeMail.subject}
                  </h2>

                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-400">
                    <span>
                      发件人：<strong className="font-medium text-zinc-200">{activeMail.sender}</strong>
                    </span>
                    <span className="font-mono-tech text-zinc-500">&lt;{activeMail.senderEmail}&gt;</span>
                  </div>
                </div>

                {/* 正文：使用宽松清爽的 EditorialProse 排版，支持划词摘录 */}
                <div className="px-7 py-7">
                  <EditorialProse text={activeMail.content} theme="dark" />
                </div>

                {/* 信末清晰单一行动引导按钮 */}
                <div className="border-t border-zinc-800/80 bg-zinc-950/40 px-7 py-5">
                  {activeMail.id === 'mail-prologue' ? (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="text-xs text-zinc-400">
                        提示：读完后可直接前往民俗馆核查信中提到的照片；看到关键信息时，用鼠标划选文字即可摘录进右侧手记。
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => handlePrimaryJump('qinghe')}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-amber-950/40 hover:brightness-110 cursor-pointer transition"
                      >
                        <span>打开「青禾数字民俗馆」查证</span>
                        <ArrowRight className="h-4 w-4" />
                      </motion.button>
                    </div>
                  ) : (
                    activeMail.quickLinks &&
                    activeMail.quickLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2.5">
                        {activeMail.quickLinks.map((ql, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handlePrimaryJump(ql.targetSite)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/20 cursor-pointer transition"
                          >
                            <span>{ql.label}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </motion.article>
            </AnimatePresence>
          </section>
        </div>
      </div>
    </div>
  );
};
