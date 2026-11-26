import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  DiscoveredClue,
  EndingId,
  GameState,
  OALevel,
  RescueStatus,
  ScareMode,
  SiteId,
} from './types/game';
import {
  computeDerivedAct,
  createInitialGameState,
  loadGameState,
  saveGameState,
} from './engine/gameState';
import { horrorAudio } from './engine/audio';
import { TopInvestigatorBar, SITE_METAS } from './components/TopInvestigatorBar';
import { SideWorkspacePanel, type RightPanelMode } from './components/SideWorkspacePanel';
import { InvestigationGuideRibbon } from './components/InvestigationGuideRibbon';
import { SelectionClipPopup } from './components/SelectionClipPopup';
import { IntroCover } from './components/IntroCover';
import { GlobalSearchModal, type SearchHit } from './components/GlobalSearchModal';
import { ScareOverlay } from './components/ScareOverlay';
import { EndingScreen } from './components/EndingScreen';
import type { CommonSiteProps, ScarePayload } from './sites/siteProps';

import { MailSite } from './sites/MailSite';
import { QinghePortalSite } from './sites/QinghePortalSite';
import { BbsSnapshotSite } from './sites/BbsSnapshotSite';
import { ChroniclesGovSite } from './sites/ChroniclesGovSite';
import { OaInternalSite } from './sites/OaInternalSite';
import { ZhixiaNotesSite } from './sites/ZhixiaNotesSite';
import { B2TerminalSite } from './sites/B2TerminalSite';

import { MAIL_MESSAGES } from './data/mailData';
import { QINGHE_ARCHIVE_ENTRIES } from './data/qingheArchiveData';
import { BBS_THREADS } from './data/bbsData';
import { CHRONICLE_DOCS } from './data/chroniclesData';
import { OA_DOCUMENTS } from './data/oaData';
import { ZHIXIA_NOTES } from './data/zhixiaNotesData';
import { ENCRYPTED_VAULT } from './data/encryptedVault';

const ACT_TITLES: Record<number, string> = {
  1: '第一幕 · 表象裂痕',
  2: '第二幕 · 水下亡村',
  3: '第三幕 · 借目十诫',
  4: '第四幕 · 龛中之人',
  5: '第五幕 · 子时封龛',
};

export const App: React.FC = () => {
  const [state, setState] = useState<GameState>(() => loadGameState());
  const [activePanel, setActivePanel] = useState<RightPanelMode>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [newlyUnlockedSite, setNewlyUnlockedSite] = useState<SiteId | null>(null);
  const [activeScare, setActiveScare] = useState<ScarePayload | null>(null);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  const flashToast = useCallback((msg: string) => {
    setToastBanner(msg);
    setTimeout(() => {
      setToastBanner((curr) => (curr === msg ? null : curr));
    }, 4500);
  }, []);

  // 计算当前阶段已送达的可见邮件与未读数，并在新信件抵达时主动轻提示
  const visibleMails = useMemo(() => {
    return MAIL_MESSAGES.filter((m) => {
      if (m.id === 'mail-prologue') return true;
      if (m.minAct === 1) return state.unlockedSites.includes('bbs');
      return state.act >= m.minAct;
    });
  }, [state.act, state.unlockedSites]);

  const unreadMailCount = useMemo(
    () => visibleMails.filter((m) => !state.readDocIds.includes(m.id)).length,
    [visibleMails, state.readDocIds]
  );

  const prevVisibleMailCountRef = useRef<number>(visibleMails.length);
  useEffect(() => {
    if (state.hasEnteredGame && visibleMails.length > prevVisibleMailCountRef.current) {
      const added = visibleMails.length - prevVisibleMailCountRef.current;
      flashToast(`收件箱新到 ${added} 封关联邮件，可点击左上「收件箱」查阅`);
    }
    prevVisibleMailCountRef.current = visibleMails.length;
  }, [visibleMails.length, state.hasEnteredGame, flashToast]);

  // 持久化保存与幕次推导
  useEffect(() => {
    const derived = computeDerivedAct(state);
    if (derived !== state.act) {
      setState((prev) => ({ ...prev, act: derived }));
      if (derived >= 2 && derived <= 4) {
        horrorAudio.playBronzeGong(1);
        flashToast(`已进入 ${ACT_TITLES[derived]}`);
      }
    }
    saveGameState(state);
  }, [state, flashToast]);

  // 统计点击并唤醒声景
  useEffect(() => {
    const onAnyPointer = () => {
      horrorAudio.setMuted(state.audioMuted);
      if (state.hasEnteredGame) {
        horrorAudio.startOrUpdateAmbient(state.act);
      }
      setState((prev) => ({ ...prev, totalClicks: prev.totalClicks + 1 }));
    };
    window.addEventListener('pointerdown', onAnyPointer);
    return () => window.removeEventListener('pointerdown', onAnyPointer);
  }, [state.audioMuted, state.act, state.hasEnteredGame]);

  const handleNavigateSite = useCallback((site: SiteId, targetItemId?: string) => {
    setState((prev) => ({
      ...prev,
      currentSite: site,
      unlockedSites: prev.unlockedSites.includes(site)
        ? prev.unlockedSites
        : [...prev.unlockedSites, site],
    }));
    setFocusedItemId(targetItemId || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleUnlockSite = useCallback(
    (site: SiteId) => {
      setState((prev) => {
        if (prev.unlockedSites.includes(site)) return prev;
        horrorAudio.playClick('unlock');
        flashToast(`已解锁新站点入口：${SITE_METAS[site].shortName}`);
        return {
          ...prev,
          unlockedSites: [...prev.unlockedSites, site],
        };
      });
    },
    [flashToast]
  );

  const handleMarkRead = useCallback(
    (docId: string) => {
      setState((prev) => {
        const nextRead = prev.readDocIds.includes(docId)
          ? prev.readDocIds
          : [...prev.readDocIds, docId];

        // 渐进式引导：查阅核心照片《晒谷场收工图》后，自然解锁【校园树洞 & 显影液BBS】
        let nextSites = prev.unlockedSites;
        if (docId === 'qh-37-09' && !prev.unlockedSites.includes('bbs')) {
          nextSites = [...prev.unlockedSites, 'bbs'];
          horrorAudio.playClick('unlock');
          flashToast('发现异常线索，已同步接入【树洞 & 显影液BBS】快照');
        }

        if (nextRead === prev.readDocIds && nextSites === prev.unlockedSites) return prev;
        return {
          ...prev,
          readDocIds: nextRead,
          unlockedSites: nextSites,
        };
      });
    },
    [flashToast]
  );

  // 点 8 核心修改：不再由页面自动往手记灌输谜底；仅当玩家主动划词摘录（isPlayerClip）时写入手记！
  const handleAddClue = useCallback((clue: Omit<DiscoveredClue, 'discoveredAt'>) => {
    if (!clue.isPlayerClip) return;
    setState((prev) => {
      if (prev.discoveredClues.some((c) => c.detail === clue.detail)) return prev;
      return {
        ...prev,
        discoveredClues: [
          ...prev.discoveredClues,
          {
            ...clue,
            discoveredAt: `第${prev.act}幕`,
          },
        ],
      };
    });
  }, []);

  const handleClipSelection = useCallback(
    (snippet: string, site: SiteId) => {
      setState((prev) => {
        if (prev.discoveredClues.some((c) => c.detail === snippet)) return prev;
        return {
          ...prev,
          discoveredClues: [
            ...prev.discoveredClues,
            {
              id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              title: `${SITE_METAS[site].shortName} 摘录`,
              detail: snippet,
              sourceSite: site,
              discoveredAt: `第${prev.act}幕`,
              isPlayerClip: true,
            },
          ],
        };
      });
      // 若手记未打开，保持非打扰轻提示；若已打开，立刻在右栏看到新增卡片
      flashToast('已摘录至随身手记');
    },
    [flashToast]
  );

  const handleRemoveClue = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      discoveredClues: prev.discoveredClues.filter((c) => c.id !== id),
    }));
  }, []);

  // 不再自动塞入未发现关键词，仅允许玩家手动添加或在跨站搜索命中隐藏残卷时记录
  const handleAddKeywords = useCallback((_keywords: string[]) => {
    // intentionally no-op for auto-dump; player collects manually via handleAddManualKeyword
  }, []);

  const handleAddManualKeyword = useCallback((kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      unlockedKeywords: Array.from(new Set([...prev.unlockedKeywords, trimmed])),
    }));
  }, []);

  const handleRecordPhotoView = useCallback((photoId: string) => {
    setState((prev) => ({
      ...prev,
      photoViewCounts: {
        ...prev.photoViewCounts,
        [photoId]: (prev.photoViewCounts[photoId] || 0) + 1,
      },
    }));
  }, []);

  const handleAdjustContamination = useCallback((delta: number) => {
    setState((prev) => ({
      ...prev,
      contamination: Math.max(0, Math.min(100, prev.contamination + delta)),
    }));
  }, []);

  const handleTriggerScare = useCallback(
    (scare: ScarePayload) => {
      horrorAudio.playScareStinger(state.scareMode);
      setActiveScare(scare);
    },
    [state.scareMode]
  );

  const handleElevateOaLevel = useCallback((level: OALevel) => {
    setState((prev) => ({
      ...prev,
      oaLevel: Math.max(prev.oaLevel, level) as OALevel,
    }));
  }, []);

  const handleUnlockZhixiaDeep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zhixiaDeepUnlocked: true,
    }));
  }, []);

  const handleCacheDecrypted = useCallback((vaultId: string, plaintext: string) => {
    setState((prev) => {
      if (prev.decryptedCache[vaultId] === plaintext) return prev;
      return {
        ...prev,
        decryptedCache: {
          ...prev.decryptedCache,
          [vaultId]: plaintext,
        },
      };
    });
  }, []);

  const handleRescueMember = useCallback(
    (member: keyof RescueStatus) => {
      setState((prev) => {
        if (prev.rescued[member]) return prev;
        horrorAudio.playClick('unlock');
        flashToast('成员污染锚点已切断');
        return {
          ...prev,
          rescued: {
            ...prev.rescued,
            [member]: true,
          },
        };
      });
    },
    [flashToast]
  );

  const handlePassB2Reel = useCallback((reel: 'reel04Passed' | 'reel09Passed' | 'reel12Passed') => {
    setState((prev) => {
      if (prev.b2Progress[reel]) return prev;
      horrorAudio.playClick('unlock');
      return {
        ...prev,
        b2Progress: {
          ...prev.b2Progress,
          [reel]: true,
        },
      };
    });
  }, []);

  const handleRecordB2Violation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      contamination: Math.min(100, prev.contamination + 14),
      b2Progress: {
        ...prev.b2Progress,
        violations: prev.b2Progress.violations + 1,
      },
    }));
  }, []);

  const handleTriggerEnding = useCallback((endingId: EndingId) => {
    horrorAudio.playBronzeGong(3);
    setState((prev) => ({
      ...prev,
      act: 5,
      activeEnding: endingId,
      unlockedEndings: prev.unlockedEndings.includes(endingId)
        ? prev.unlockedEndings
        : [...prev.unlockedEndings, endingId],
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleGlobalSearch = useCallback(
    (rawQuery: string) => {
      const q = rawQuery.trim();
      if (!q) return;
      const ql = q.toLowerCase();

      let unlockedNow: SiteId | null = null;
      const chronTriggers = ['云溪水库', '云溪', 'yunxi-chronicles', '壶口', '108.4', '水利', '县志'];
      const willUnlockChronicles =
        !state.unlockedSites.includes('chronicles') &&
        chronTriggers.some((t) => ql.includes(t.toLowerCase()));

      if (willUnlockChronicles) {
        unlockedNow = 'chronicles';
      }

      const effectiveUnlockedSites: SiteId[] = willUnlockChronicles
        ? [...state.unlockedSites, 'chronicles']
        : state.unlockedSites;

      const hits: SearchHit[] = [];

      if (effectiveUnlockedSites.includes('qinghe')) {
        for (const item of QINGHE_ARCHIVE_ENTRIES) {
          const keywordMatch = item.keywords.some(
            (k) => k.toLowerCase().includes(ql) || ql.includes(k.toLowerCase())
          );
          const textMatch =
            item.title.toLowerCase().includes(ql) ||
            item.code.toLowerCase().includes(ql) ||
            item.village.toLowerCase().includes(ql) ||
            (item.photographer && item.photographer.toLowerCase().includes(ql)) ||
            (!item.hiddenFromList && item.content.toLowerCase().includes(ql));

          if (keywordMatch || textMatch) {
            hits.push({
              id: `hit-qh-${item.id}`,
              siteId: 'qinghe',
              codeOrTag: item.code,
              title: item.title,
              snippet: item.summary,
              isHiddenDiscovery: Boolean(item.hiddenFromList),
              targetItemId: item.id,
            });
          }
        }
      }

      if (effectiveUnlockedSites.includes('bbs')) {
        for (const thread of BBS_THREADS) {
          const visibleReplies = thread.replies.filter(
            (r) =>
              (!r.act3Appended || state.act >= 3) &&
              (!r.hiddenKeywordRequired ||
                r.hiddenKeywordRequired.toLowerCase() === ql ||
                ql.includes(r.hiddenKeywordRequired.toLowerCase()))
          );
          const replyHit = visibleReplies.find(
            (r) => r.content.toLowerCase().includes(ql) || r.author.toLowerCase().includes(ql)
          );
          const headerHit =
            thread.title.toLowerCase().includes(ql) ||
            thread.author.toLowerCase().includes(ql) ||
            thread.keywords.some((k) => k.toLowerCase().includes(ql));

          if (headerHit || replyHit) {
            const hasHiddenFloor = visibleReplies.some((r) => Boolean(r.hiddenKeywordRequired));
            hits.push({
              id: `hit-bbs-${thread.id}`,
              siteId: 'bbs',
              codeOrTag: thread.board === 'zijing' ? '紫荆树洞' : '显影液BBS',
              title: thread.title,
              snippet: replyHit
                ? `${replyHit.author}：${replyHit.content.slice(0, 100)}…`
                : thread.replies[0]?.content.slice(0, 100) || '',
              isHiddenDiscovery: hasHiddenFloor,
              targetItemId: thread.id,
            });
          }
        }
      }

      if (effectiveUnlockedSites.includes('chronicles')) {
        for (const doc of CHRONICLE_DOCS) {
          const kwMatch = doc.keywords.some(
            (k) => k.toLowerCase().includes(ql) || ql.includes(k.toLowerCase())
          );
          const bodyMatch =
            doc.title.toLowerCase().includes(ql) ||
            doc.docNumber.toLowerCase().includes(ql) ||
            (!doc.hiddenFromDefault && doc.content.toLowerCase().includes(ql));

          if (kwMatch || (!doc.hiddenFromDefault && bodyMatch)) {
            hits.push({
              id: `hit-chr-${doc.id}`,
              siteId: 'chronicles',
              codeOrTag: doc.docNumber,
              title: doc.title,
              snippet: doc.summary,
              isHiddenDiscovery: Boolean(doc.hiddenFromDefault),
              targetItemId: doc.id,
            });
          }
        }
      }

      if (effectiveUnlockedSites.includes('oa') && state.oaLevel >= 1) {
        for (const oaDoc of OA_DOCUMENTS) {
          if (oaDoc.minLevel > state.oaLevel) continue;
          const plain =
            oaDoc.fallbackPlainContent ||
            (oaDoc.encryptedVaultId ? state.decryptedCache[oaDoc.encryptedVaultId] || '' : '');
          const matched =
            oaDoc.title.toLowerCase().includes(ql) ||
            oaDoc.code.toLowerCase().includes(ql) ||
            oaDoc.keywords.some((k) => k.toLowerCase().includes(ql)) ||
            plain.toLowerCase().includes(ql);
          if (matched) {
            hits.push({
              id: `hit-oa-${oaDoc.id}`,
              siteId: 'oa',
              codeOrTag: `OA Lv.${oaDoc.minLevel}`,
              title: oaDoc.title,
              snippet: plain ? `${plain.slice(0, 100)}…` : oaDoc.senderOrAuthor,
              targetItemId: oaDoc.id,
            });
          }
        }
      }

      if (effectiveUnlockedSites.includes('notes')) {
        for (const note of ZHIXIA_NOTES) {
          if (note.requiresDeepUnlock && !state.zhixiaDeepUnlocked) continue;
          const text =
            note.plainContent ||
            (note.encryptedVaultId ? state.decryptedCache[note.encryptedVaultId] || '' : '');
          const matched =
            note.title.toLowerCase().includes(ql) ||
            note.keywords.some((k) => k.toLowerCase().includes(ql)) ||
            text.toLowerCase().includes(ql);
          if (matched) {
            hits.push({
              id: `hit-note-${note.id}`,
              siteId: 'notes',
              codeOrTag: note.date,
              title: note.title,
              snippet: text ? `${text.slice(0, 100)}…` : note.title,
              isHiddenDiscovery: Boolean(note.requiresDeepUnlock),
              targetItemId: note.id,
            });
          }
        }
      }

      for (const mail of MAIL_MESSAGES) {
        if (mail.minAct > state.act) continue;
        if (
          mail.subject.toLowerCase().includes(ql) ||
          mail.content.toLowerCase().includes(ql) ||
          mail.sender.toLowerCase().includes(ql)
        ) {
          hits.push({
            id: `hit-mail-${mail.id}`,
            siteId: 'mail',
            codeOrTag: mail.category,
            title: mail.subject,
            snippet: mail.summary,
            targetItemId: mail.id,
          });
        }
      }

      setState((prev) => ({
        ...prev,
        unlockedSites: effectiveUnlockedSites,
        searchHistory: [q, ...prev.searchHistory.filter((x) => x !== q)].slice(0, 30),
      }));
      setNewlyUnlockedSite(unlockedNow);
      setSearchHits(hits);
      setSearchQuery(q);
    },
    [state]
  );

  // 首次访问的清爽沉浸式开局封面（避免首屏信息过载）
  if (!state.hasEnteredGame && !state.activeEnding) {
    return (
      <IntroCover
        scareMode={state.scareMode}
        audioMuted={state.audioMuted}
        onChangeScareMode={(mode: ScareMode) => setState((prev) => ({ ...prev, scareMode: mode }))}
        onToggleMute={() => {
          const next = !state.audioMuted;
          horrorAudio.setMuted(next);
          setState((prev) => ({ ...prev, audioMuted: next }));
        }}
        onEnter={() => setState((prev) => ({ ...prev, hasEnteredGame: true }))}
      />
    );
  }

  if (state.activeEnding) {
    return (
      <EndingScreen
        endingId={state.activeEnding}
        encryptedVault={ENCRYPTED_VAULT}
        cachedPlaintext={state.decryptedCache[state.activeEnding]}
        unlockedEndings={state.unlockedEndings}
        rescued={state.rescued}
        contamination={state.contamination}
        onReturnToConsole={() =>
          setState((prev) => ({
            ...prev,
            activeEnding: null,
            act: computeDerivedAct({ ...prev, activeEnding: null }),
            currentSite: prev.unlockedSites.includes('b2') ? 'b2' : prev.currentSite,
          }))
        }
        onSelectEnding={(eid) =>
          setState((prev) => ({
            ...prev,
            activeEnding: eid,
          }))
        }
        onResetGame={() => {
          const fresh = createInitialGameState();
          fresh.unlockedEndings = state.unlockedEndings;
          setState(fresh);
        }}
      />
    );
  }

  const siteProps: CommonSiteProps = {
    state,
    focusedItemId,
    onClearFocus: () => setFocusedItemId(null),
    onNavigateSite: handleNavigateSite,
    onUnlockSite: handleUnlockSite,
    onMarkRead: handleMarkRead,
    onAddClue: handleAddClue,
    onAddKeywords: handleAddKeywords,
    onRecordPhotoView: handleRecordPhotoView,
    onAdjustContamination: handleAdjustContamination,
    onTriggerScare: handleTriggerScare,
    onElevateOaLevel: handleElevateOaLevel,
    onUnlockZhixiaDeep: handleUnlockZhixiaDeep,
    onCacheDecrypted: handleCacheDecrypted,
    onRescueMember: handleRescueMember,
    onPassB2Reel: handlePassB2Reel,
    onRecordB2Violation: handleRecordB2Violation,
    onTriggerEnding: handleTriggerEnding,
    onGlobalSearch: handleGlobalSearch,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4ed] text-stone-800">
      <TopInvestigatorBar
        state={state}
        unreadMailCount={unreadMailCount}
        activePanel={activePanel}
        onTogglePanel={(mode) => setActivePanel((prev) => (prev === mode ? null : mode))}
        onSelectSite={(s) => handleNavigateSite(s)}
        onGlobalSearch={handleGlobalSearch}
        onToggleMute={() => {
          const next = !state.audioMuted;
          horrorAudio.setMuted(next);
          setState((prev) => ({ ...prev, audioMuted: next }));
        }}
      />

      {/* 克制不剧透的单行阶段引导条 */}
      <InvestigationGuideRibbon state={state} onNavigateSite={handleNavigateSite} />

      {/* 轻量化顶部动态提示气泡 */}
      <AnimatePresence>
        {toastBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="pointer-events-none fixed left-1/2 top-24 z-[85] -translate-x-1/2 rounded-full border border-[#9e2a2b]/35 bg-white/95 px-4 py-1.5 text-xs font-medium text-[#16263f] shadow-xl shadow-stone-900/10 backdrop-blur-md"
          >
            {toastBanner}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 点 5 核心修复：真正的分栏挤压工作台 —— 打开手记/提示/设置时，左侧主页面与图片顺滑左移，绝不遮挡！ */}
      <div className="relative flex flex-1 w-full items-stretch">
        <motion.main
          layout
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 min-w-0"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentSite}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {state.currentSite === 'mail' && <MailSite {...siteProps} />}
              {state.currentSite === 'qinghe' && <QinghePortalSite {...siteProps} />}
              {state.currentSite === 'bbs' && <BbsSnapshotSite {...siteProps} />}
              {state.currentSite === 'chronicles' && <ChroniclesGovSite {...siteProps} />}
              {state.currentSite === 'oa' && <OaInternalSite {...siteProps} />}
              {state.currentSite === 'notes' && <ZhixiaNotesSite {...siteProps} />}
              {state.currentSite === 'b2' && <B2TerminalSite {...siteProps} />}
            </motion.div>
          </AnimatePresence>
        </motion.main>

        <AnimatePresence initial={false}>
          {activePanel && (
            <motion.aside
              key="workspace-side-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 396, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block shrink-0 overflow-hidden sticky top-[90px] h-[calc(100vh-90px)] z-40"
            >
              <div className="w-[396px] h-full">
                <SideWorkspacePanel
                  mode={activePanel}
                  state={state}
                  onClose={() => setActivePanel(null)}
                  onUpdateMemo={(memo) => setState((prev) => ({ ...prev, playerMemo: memo }))}
                  onAddManualKeyword={handleAddManualKeyword}
                  onRemoveClue={handleRemoveClue}
                  onGlobalSearch={handleGlobalSearch}
                  onJumpToSite={(s, d) => handleNavigateSite(s, d)}
                  onChangeScareMode={(mode) => setState((prev) => ({ ...prev, scareMode: mode }))}
                  onImportState={(imported) => setState({ ...imported, hasEnteredGame: true })}
                  onResetGame={() => setState(createInitialGameState())}
                  onViewEnding={(eid) => setState((prev) => ({ ...prev, activeEnding: eid }))}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* 小屏移动设备回退抽屉 */}
        <AnimatePresence>
          {activePanel && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25 }}
              className="fixed inset-y-0 right-0 z-[90] w-full max-w-sm lg:hidden shadow-2xl"
            >
              <SideWorkspacePanel
                mode={activePanel}
                state={state}
                onClose={() => setActivePanel(null)}
                onUpdateMemo={(memo) => setState((prev) => ({ ...prev, playerMemo: memo }))}
                onAddManualKeyword={handleAddManualKeyword}
                onRemoveClue={handleRemoveClue}
                onGlobalSearch={handleGlobalSearch}
                onJumpToSite={(s, d) => {
                  handleNavigateSite(s, d);
                  setActivePanel(null);
                }}
                onChangeScareMode={(mode) => setState((prev) => ({ ...prev, scareMode: mode }))}
                onImportState={(imported) => setState({ ...imported, hasEnteredGame: true })}
                onResetGame={() => setState(createInitialGameState())}
                onViewEnding={(eid) => setState((prev) => ({ ...prev, activeEnding: eid }))}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 全局划词摘录浮层：读到可疑文本随手一划即可摘录到手记或跨站搜索 */}
      <SelectionClipPopup
        currentSite={state.currentSite}
        onClipText={handleClipSelection}
        onSearchText={handleGlobalSearch}
      />

      <GlobalSearchModal
        query={searchQuery}
        hits={searchHits}
        newlyUnlockedSite={newlyUnlockedSite}
        onClose={() => {
          setSearchQuery(null);
          setNewlyUnlockedSite(null);
        }}
        onJumpToHit={(hit) => {
          setSearchQuery(null);
          setNewlyUnlockedSite(null);
          handleNavigateSite(hit.siteId, hit.targetItemId);
        }}
      />

      <ScareOverlay
        scareEvent={activeScare}
        scareMode={state.scareMode}
        onDismiss={() => setActiveScare(null)}
      />
    </div>
  );
};

export default App;
