import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { MAIL_MESSAGES, type MailMessage } from '../data/mailData';
import type { CommonSiteProps } from './siteProps';
import type { SiteId } from '../types/game';
import { EditorialProse } from '../components/EditorialProse';
import { horrorAudio } from '../engine/audio';

export const MailSite: React.FC<CommonSiteProps> = ({
  state,
  focusedItemId,
  onClearFocus,
  navCommand,
  onRecordNav,
  onNavigateSite,
  onUnlockSite,
  onMarkRead,
}) => {
  const visibleMails = useMemo(() => {
    return MAIL_MESSAGES.filter((m) => {
      if (m.id === focusedItemId) return true;
      if (m.id === 'mail-prologue') return true;
      if (m.id === 'mail-prologue-step2') return state.readDocIds.includes('qh-37-09');
      if (m.minAct === 1) return state.unlockedSites.includes('bbs');
      return state.act >= m.minAct;
    });
  }, [state.act, state.unlockedSites, state.readDocIds, focusedItemId]);

  const [selectedId, setSelectedId] = useState<string>('mail-prologue');
  const lastNavSeqRef = useRef<number>(0);

  useEffect(() => {
    if (focusedItemId && MAIL_MESSAGES.some((m) => m.id === focusedItemId)) {
      setSelectedId(focusedItemId);
      onClearFocus?.();
    }
  }, [focusedItemId, onClearFocus]);

  useEffect(() => {
    if (!navCommand || navCommand.site !== 'mail' || navCommand.seq === lastNavSeqRef.current) {
      return;
    }
    lastNavSeqRef.current = navCommand.seq;
    if (MAIL_MESSAGES.some((m) => m.id === navCommand.itemId)) {
      setSelectedId(navCommand.itemId);
    }
  }, [navCommand]);

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
    <div className="min-h-[calc(100vh-124px)] bg-[#f5f2ea] px-4 py-8 text-stone-800">
      <div className={`mx-auto ${showSidebar ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {/* 去AI图标化的典雅书信档案页眉 */}
        <div className="mb-6 flex items-center justify-between border-b border-[#e2dbcd] pb-4">
          <div className="border-l-4 border-[#9e2a2b] pl-3.5">
            <div className="font-mono-tech text-[10.5px] tracking-widest text-[#9e2a2b]">
              PROTON-RELAY // DEADMAN-SWITCH ARCHIVE
            </div>
            <h1 className="mt-0.5 font-serif-cn text-lg sm:text-xl font-bold tracking-wide text-[#16263f]">
              加密定时收件箱
            </h1>
            <p className="mt-0.5 text-xs text-stone-500">
              {visibleMails.length === 1
                ? '1 封紧急未读信件 · 发自南州大学课题组备用信箱'
                : `共收到 ${visibleMails.length} 封关联投递记录`}
            </p>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-6 ${showSidebar ? 'lg:grid-cols-12' : ''}`}>
          {showSidebar && (
            <aside className="lg:col-span-4 space-y-2">
              <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-stone-500">
                <span>收件目录</span>
                <span className="font-mono-tech text-[11px]">{visibleMails.length} 封</span>
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
                      onRecordNav?.(mail.id, `收件箱 · ${mail.subject.slice(0, 16)}`);
                    }}
                    className={`w-full rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      selected
                        ? 'border-[#9e2a2b]/55 bg-white shadow-sm'
                        : 'border-[#e3dccf] bg-white/75 hover:border-stone-400 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-[#9e2a2b]">{mail.category}</span>
                      <span className="font-mono-tech text-stone-400">{mail.date.slice(5, 16)}</span>
                    </div>
                    <div className="mt-1.5 flex items-start gap-2">
                      {unread && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#9e2a2b]" />
                      )}
                      <h3 className="line-clamp-2 text-xs font-bold leading-snug text-[#16263f]">
                        {mail.subject}
                      </h3>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-stone-500">{mail.sender}</p>
                  </motion.button>
                );
              })}
            </aside>
          )}

          {/* 纸感信件阅读卡 */}
          <section className={showSidebar ? 'lg:col-span-8' : ''}>
            <AnimatePresence mode="wait">
              <motion.article
                key={activeMail.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24 }}
                className="overflow-hidden rounded-2xl border border-[#dfd8ca] bg-white shadow-sm"
              >
                <div className="border-b border-[#ece6da] bg-[#faf8f3] px-7 py-6">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                    {activeMail.isUrgent && (
                      <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 font-mono-tech text-[11px] font-medium text-[#9e2a2b]">
                        定时死信触发
                      </span>
                    )}
                    <span className="font-mono-tech text-[11px] text-stone-500">
                      投递时间：{activeMail.date}
                    </span>
                  </div>

                  <h2 className="font-serif-cn text-xl sm:text-2xl font-bold leading-snug text-[#16263f]">
                    {activeMail.subject}
                  </h2>

                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-stone-500">
                    <span>
                      发件人：<strong className="font-semibold text-stone-800">{activeMail.sender}</strong>
                    </span>
                    <span className="font-mono-tech text-stone-400">&lt;{activeMail.senderEmail}&gt;</span>
                  </div>
                </div>

                <div className="px-7 py-7">
                  <EditorialProse text={activeMail.content} theme="paper" />
                </div>

                <div className="border-t border-[#ece6da] bg-[#faf8f3] px-7 py-5">
                  {activeMail.id === 'mail-prologue' ? (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="text-xs text-stone-500">
                        提示：核查完照片后，林知夏预设的第二封分段死信会自动送达收件箱，指引后续三条线索。
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => handlePrimaryJump('qinghe')}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#16263f] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1f3557] cursor-pointer transition"
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
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#16263f]/25 bg-white px-4 py-2 text-xs font-semibold text-[#16263f] hover:border-[#9e2a2b] hover:text-[#9e2a2b] cursor-pointer transition"
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
