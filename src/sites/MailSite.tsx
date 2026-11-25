import React, { useEffect, useMemo, useState } from 'react';
import {
  Mail,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
  Clock,
  CheckCircle2,
  BookmarkCheck,
  Inbox,
  Terminal,
  Lock,
} from 'lucide-react';
import { MAIL_MESSAGES, type MailMessage } from '../data/mailData';
import type { CommonSiteProps } from './siteProps';
import type { SiteId } from '../types/game';
import { horrorAudio } from '../engine/audio';

const CATEGORY_STYLES: Record<
  MailMessage['category'],
  { badge: string; dot: string }
> = {
  定时密信: {
    badge: 'border-amber-700/70 bg-amber-950/50 text-amber-200',
    dot: 'bg-amber-400',
  },
  网关退信: {
    badge: 'border-sky-800/70 bg-sky-950/50 text-sky-200',
    dot: 'bg-sky-400',
  },
  政务回执: {
    badge: 'border-emerald-800/70 bg-emerald-950/50 text-emerald-200',
    dot: 'bg-emerald-400',
  },
  监控告警: {
    badge: 'border-red-800/80 bg-red-950/60 text-red-200',
    dot: 'bg-red-500',
  },
  异常投递: {
    badge: 'border-purple-800/80 bg-purple-950/60 text-purple-200',
    dot: 'bg-purple-400',
  },
};

export const MailSite: React.FC<CommonSiteProps> = ({
  state,
  focusedItemId,
  onClearFocus,
  onNavigateSite,
  onUnlockSite,
  onMarkRead,
  onAddClue,
}) => {
  const visibleMails = useMemo(() => {
    return MAIL_MESSAGES.filter(
      (m) => state.act >= m.minAct || m.id === focusedItemId
    );
  }, [state.act, focusedItemId]);

  const [selectedId, setSelectedId] = useState<string>(
    () => visibleMails[0]?.id ?? 'mail-prologue'
  );

  useEffect(() => {
    if (focusedItemId && MAIL_MESSAGES.some((m) => m.id === focusedItemId)) {
      setSelectedId(focusedItemId);
      onClearFocus?.();
    }
  }, [focusedItemId, onClearFocus]);

  const activeMail = useMemo(() => {
    return (
      visibleMails.find((m) => m.id === selectedId) ??
      visibleMails[0] ??
      MAIL_MESSAGES[0]
    );
  }, [visibleMails, selectedId]);

  // 阅读邮件时自动标记已读并归档附带线索
  useEffect(() => {
    if (!activeMail) return;
    if (!state.readDocIds.includes(activeMail.id)) {
      onMarkRead(activeMail.id);
    }
    if (
      activeMail.clueNote &&
      !state.discoveredClues.some((c) => c.id === activeMail.clueNote?.id)
    ) {
      onAddClue({
        id: activeMail.clueNote.id,
        title: activeMail.clueNote.title,
        detail: activeMail.clueNote.detail,
        sourceSite: 'mail',
      });
    }
  }, [activeMail, state.readDocIds, state.discoveredClues, onMarkRead, onAddClue]);

  const handleQuickJump = (targetSite: SiteId) => {
    horrorAudio.playClick('ui');
    if (targetSite === 'chronicles' && !state.unlockedSites.includes('chronicles')) {
      onUnlockSite('chronicles');
    }
    if (!state.unlockedSites.includes(targetSite) && targetSite !== 'chronicles') {
      return;
    }
    onNavigateSite(targetSite);
  };

  const unreadCount = visibleMails.filter((m) => !state.readDocIds.includes(m.id)).length;

  return (
    <div className="min-h-[calc(100vh-84px)] bg-zinc-950 text-zinc-100">
      {/* 邮件客户端顶栏 */}
      <div className="border-b border-zinc-800 bg-zinc-900/90 px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-700/60 bg-amber-950/40 text-amber-300">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-wide text-zinc-100">
                  Proton-Relay 离线死信备份信箱
                </h1>
                <span className="rounded border border-emerald-800/60 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-mono-tech text-emerald-300">
                  PGP-MIRROR ACTIVE
                </span>
              </div>
              <p className="text-xs font-mono-tech text-zinc-400">
                绑定转发源：zhixia.lin@nanzhou.edu.cn → external.investigator@proton-relay.org
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 font-mono-tech text-zinc-300">
              收件箱 ({visibleMails.length}) · 未读 {unreadCount}
            </span>
            <button
              type="button"
              onClick={() => handleQuickJump('qinghe')}
              className="inline-flex items-center gap-1 rounded border border-sky-800/70 bg-sky-950/40 px-2.5 py-1 text-sky-200 hover:bg-sky-900/50 cursor-pointer transition"
            >
              <span>跳转青禾民俗馆</span>
              <ExternalLink className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => handleQuickJump('bbs')}
              className="inline-flex items-center gap-1 rounded border border-purple-800/70 bg-purple-950/40 px-2.5 py-1 text-purple-200 hover:bg-purple-900/50 cursor-pointer transition"
            >
              <span>跳转校园树洞/BBS</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 主体双栏布局 */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-12">
        {/* 左侧收件列表 */}
        <aside className="border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-950/80 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-2.5 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5 font-medium text-zinc-300">
              <Inbox className="h-3.5 w-3.5 text-amber-400" />
              按调查阶段同步投递列表
            </span>
            <span className="font-mono-tech text-[11px]">ACT {state.act} SYNC</span>
          </div>

          <div className="divide-y divide-zinc-800/70">
            {visibleMails.map((mail) => {
              const isSelected = activeMail?.id === mail.id;
              const isUnread = !state.readDocIds.includes(mail.id);
              const catStyle = CATEGORY_STYLES[mail.category];

              return (
                <button
                  key={mail.id}
                  type="button"
                  onClick={() => {
                    horrorAudio.playClick('ui');
                    setSelectedId(mail.id);
                  }}
                  className={`w-full text-left p-3.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 border-l-2 border-l-amber-400'
                      : 'hover:bg-zinc-900/55'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isUnread && (
                        <span
                          className={`h-2 w-2 rounded-full ${catStyle.dot} animate-pulse`}
                          title="新投递未读信件"
                        />
                      )}
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] ${catStyle.badge}`}>
                        {mail.category}
                      </span>
                      {mail.isUrgent && (
                        <span className="rounded bg-red-950/80 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                          紧急
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono-tech text-zinc-500">
                      {mail.date.slice(5, 16)}
                    </span>
                  </div>

                  <div
                    className={`mb-1 line-clamp-2 text-xs leading-snug ${
                      isUnread ? 'font-bold text-white' : 'font-semibold text-zinc-200'
                    }`}
                  >
                    {mail.subject}
                  </div>

                  <div className="mb-1 text-[11px] text-zinc-400 truncate">{mail.sender}</div>
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                    {mail.summary}
                  </p>
                </button>
              );
            })}
          </div>

          {state.act >= 4 && (
            <div className="m-3 rounded border border-red-900/60 bg-red-950/25 p-3 text-[11px] font-mono-tech text-red-300/90">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                <span>回环监听告警</span>
              </div>
              <p className="mt-1 leading-relaxed text-red-200/80">
                自动已读回执状态：已向 B2-RACK03 回传当前收件箱停留焦点。
              </p>
            </div>
          )}
        </aside>

        {/* 右侧信件正文阅读器 */}
        <section className="p-5 sm:p-7 lg:col-span-8">
          {activeMail && (
            <div className="mx-auto max-w-3xl">
              {/* 异变/污染告警横幅 */}
              {activeMail.isMutated && (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-900/75 bg-red-950/35 p-3.5 text-xs text-red-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <div>
                    <div className="font-bold text-red-300">
                      [中继网关异常] 检测到信件包含内网异常混入段或非标准回环头
                    </div>
                    <p className="mt-0.5 text-red-200/80">
                      请仔细甄别邮件正文中的客观技术事实与经过模因篡改的诱导性话术，切勿轻信任何要求摘除滤镜或采信新版电子校录文本的建议。
                    </p>
                  </div>
                </div>
              )}

              {/* 信头元数据卡 */}
              <div className="mb-5 rounded-lg border border-zinc-800 bg-zinc-900/75 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 text-xs ${
                      CATEGORY_STYLES[activeMail.category].badge
                    }`}
                  >
                    {activeMail.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-mono-tech text-zinc-400">
                    <Clock className="h-3.5 w-3.5" />
                    {activeMail.date}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-mono-tech text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已解密验证
                  </span>
                </div>

                <h2 className="mb-3 font-serif-cn text-xl font-bold leading-snug text-zinc-50">
                  {activeMail.subject}
                </h2>

                <div className="space-y-1 border-t border-zinc-800/90 pt-2.5 text-xs font-mono-tech text-zinc-400">
                  <div>
                    <span className="text-zinc-500">发件人 (From): </span>
                    <span className="text-zinc-200">{activeMail.sender}</span>{' '}
                    <span className="text-amber-300/90">&lt;{activeMail.senderEmail}&gt;</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">收件人 (To): </span>
                    <span className="text-zinc-300">{activeMail.recipient}</span>
                  </div>
                </div>
              </div>

              {/* 邮件正文 */}
              <article className="mb-6 rounded-lg border border-zinc-800/90 bg-zinc-900/35 p-5 sm:p-6 shadow-inner">
                <div className="whitespace-pre-line text-sm leading-7 text-zinc-200">
                  {activeMail.content}
                </div>
              </article>

              {/* 自动归档线索提示 */}
              {activeMail.clueNote && (
                <div className="mb-6 rounded-lg border border-amber-800/60 bg-amber-950/25 p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <BookmarkCheck className="h-4 w-4" />
                    <span>已自动记入调查手记：{activeMail.clueNote.title}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-100/85">
                    {activeMail.clueNote.detail}
                  </p>
                </div>
              )}

              {/* 快捷调查跳转区 */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/65 p-4">
                <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                  <Terminal className="h-3.5 w-3.5 text-amber-400" />
                  <span>关联调查节点快捷跳转</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(
                    activeMail.quickLinks ?? [
                      {
                        label: '前往「青禾数字民俗馆」公开检索门户',
                        targetSite: 'qinghe' as SiteId,
                        hint: '检索馆藏条目、工作经费公示与老照片细节',
                      },
                      {
                        label: '前往「紫荆站树洞 & 显影液论坛」',
                        targetSite: 'bbs' as SiteId,
                        hint: '翻阅校园匿名讨论与 16mm 胶片修复求助帖',
                      },
                    ]
                  ).map((link, idx) => {
                    const canAccess =
                      state.unlockedSites.includes(link.targetSite) ||
                      link.targetSite === 'chronicles';

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!canAccess}
                        onClick={() => handleQuickJump(link.targetSite)}
                        className={`flex flex-col items-start justify-between rounded-lg border p-3 text-left transition ${
                          canAccess
                            ? 'border-zinc-700 bg-zinc-950 hover:border-amber-500/80 hover:bg-zinc-900 cursor-pointer'
                            : 'border-zinc-800 bg-zinc-950/50 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between gap-2 text-xs font-bold text-amber-200">
                          <span>{link.label}</span>
                          {canAccess ? (
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                          ) : (
                            <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                          )}
                        </div>
                        {link.hint && (
                          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                            {canAccess ? link.hint : '需先从内部 OA 二级修复工单获取该内网节点入口'}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
