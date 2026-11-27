import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
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
import { getSiteScroll, resetAllSiteMemory, saveSiteScroll } from './engine/siteMemory';
import {
  extractSearchSnippet,
  normalizeCompactSearch,
  scoreSearchMatch,
} from './engine/search';
import { TopInvestigatorBar, SITE_METAS } from './components/TopInvestigatorBar';
import { SideWorkspacePanel, type RightPanelMode } from './components/SideWorkspacePanel';
import { InvestigationGuideRibbon } from './components/InvestigationGuideRibbon';
import { SelectionClipPopup } from './components/SelectionClipPopup';
import { IntroCover } from './components/IntroCover';
import { GlobalSearchModal, type SearchHit } from './components/GlobalSearchModal';
import { ScareOverlay } from './components/ScareOverlay';
import { EndingScreen } from './components/EndingScreen';
import { HauntedAtmosphereLayer } from './components/HauntedAtmosphereLayer';
import {
  EmergencyHorrorEncounter,
  type EncounterId,
} from './components/EmergencyHorrorEncounter';
import type {
  CommonSiteProps,
  NavCommand,
  NavSnapshot,
  ScarePayload,
} from './sites/siteProps';

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

function resolveItemLabel(site: SiteId, itemId?: string): string {
  if (!itemId || itemId.startsWith('__')) {
    return `${SITE_METAS[site].shortName} · 目录`;
  }
  if (site === 'qinghe') {
    const e = QINGHE_ARCHIVE_ENTRIES.find((x) => x.id === itemId);
    if (e) return `${e.code} · ${e.title.replace(/[《》]/g, '').slice(0, 14)}`;
  }
  if (site === 'bbs') {
    const t = BBS_THREADS.find((x) => x.id === itemId);
    if (t) return `${t.board === 'zijing' ? '树洞' : '显影液'} · ${t.title.slice(0, 15)}`;
  }
  if (site === 'chronicles') {
    const d = CHRONICLE_DOCS.find((x) => x.id === itemId);
    if (d) return `水利方志 · ${d.title.replace(/[《》]/g, '').slice(0, 15)}`;
  }
  if (site === 'oa') {
    const o = OA_DOCUMENTS.find((x) => x.id === itemId || x.code === itemId);
    if (o) return `内部OA · ${o.code}`;
  }
  if (site === 'notes') {
    const n = ZHIXIA_NOTES.find((x) => x.id === itemId);
    if (n) return `夏夜拾遗 · ${n.title.slice(0, 14)}`;
  }
  if (site === 'mail') {
    const m = MAIL_MESSAGES.find((x) => x.id === itemId);
    if (m) return `收件箱 · ${m.subject.slice(0, 16)}`;
  }
  return `${SITE_METAS[site].shortName}`;
}

function getDefaultItemForSite(site: SiteId): string {
  switch (site) {
    case 'mail':
      return 'mail-prologue';
    case 'qinghe':
      return '__home__';
    case 'bbs':
      return '__list:zijing__';
    case 'chronicles':
      return '__list__';
    case 'oa':
      return OA_DOCUMENTS[0]?.id ?? '__home__';
    case 'notes':
      return ZHIXIA_NOTES[0]?.id ?? '__home__';
    case 'b2':
      return 'telecine';
  }
}

export const App: React.FC = () => {
  const [state, setState] = useState<GameState>(() => loadGameState());
  const [activePanel, setActivePanel] = useState<RightPanelMode>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [newlyUnlockedSite, setNewlyUnlockedSite] = useState<SiteId | null>(null);
  const [activeScare, setActiveScare] = useState<ScarePayload | null>(null);
  const [activeEncounter, setActiveEncounter] = useState<EncounterId | null>(null);
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const firedStoryEncountersRef = useRef<Set<string>>(new Set());

  // 跨站/同站统一浏览历史栈 + 各站点独立滚动条与停留页记忆
  const [navStack, setNavStack] = useState<NavSnapshot[]>(() => [
    {
      site: state.currentSite,
      itemId: getDefaultItemForSite(state.currentSite),
      label: resolveItemLabel(state.currentSite, getDefaultItemForSite(state.currentSite)),
    },
  ]);
  const [navIdx, setNavIdx] = useState<number>(0);
  const [navCommand, setNavCommand] = useState<NavCommand | null>(null);

  const navSeqRef = useRef<number>(1);
  const pendingScrollRestoreRef = useRef<number | null>(null);
  const pendingClicksRef = useRef<number>(0);
  const lastSiteSnapRef = useRef<Partial<Record<SiteId, NavSnapshot>>>({
    [state.currentSite]: {
      site: state.currentSite,
      itemId: getDefaultItemForSite(state.currentSite),
      label: resolveItemLabel(state.currentSite, getDefaultItemForSite(state.currentSite)),
    },
  });

  const flashToast = useCallback((msg: string) => {
    setToastBanner(msg);
    setTimeout(() => {
      setToastBanner((curr) => (curr === msg ? null : curr));
    }, 4600);
  }, []);

  const pushNavHistory = useCallback((snap: NavSnapshot) => {
    lastSiteSnapRef.current[snap.site] = snap;
    setNavStack((prev) => {
      const sliced = prev.slice(0, navIdx + 1);
      const top = sliced[sliced.length - 1];
      if (top && top.site === snap.site && top.itemId === snap.itemId) {
        return sliced;
      }
      const next = [...sliced, snap];
      const trimmed = next.length > 60 ? next.slice(next.length - 60) : next;
      setNavIdx(trimmed.length - 1);
      return trimmed;
    });
  }, [navIdx]);

  // 计算当前阶段已送达的可见邮件与未读数（含读完 QH-37-09 自动送达的第二封分段死信）
  const visibleMails = useMemo(() => {
    return MAIL_MESSAGES.filter((m) => {
      if (m.id === 'mail-prologue') return true;
      if (m.id === 'mail-prologue-step2') return state.readDocIds.includes('qh-37-09');
      if (m.minAct === 1) return state.unlockedSites.includes('bbs');
      return state.act >= m.minAct;
    });
  }, [state.act, state.unlockedSites, state.readDocIds]);

  const unreadMailCount = useMemo(
    () => visibleMails.filter((m) => !state.readDocIds.includes(m.id)).length,
    [visibleMails, state.readDocIds]
  );

  const prevVisibleMailCountRef = useRef<number>(visibleMails.length);
  useEffect(() => {
    if (state.hasEnteredGame && visibleMails.length > prevVisibleMailCountRef.current) {
      const added = visibleMails.length - prevVisibleMailCountRef.current;
      flashToast(`收件箱新到 ${added} 封关键邮件（含林知夏后续线索指引），点击左上「收件箱」查阅`);
    }
    prevVisibleMailCountRef.current = visibleMails.length;
  }, [visibleMails.length, state.hasEnteredGame, flashToast]);

  // 幕次推导与防抖持久化（避免每次点击同步阻塞主线程序列化 JSON）
  useEffect(() => {
    const derived = computeDerivedAct(state);
    if (derived !== state.act) {
      setState((prev) => ({ ...prev, act: derived }));
      if (derived >= 2 && derived <= 4) {
        horrorAudio.playBronzeGong(1);
        flashToast(`已进入 ${ACT_TITLES[derived]}`);
      }
    }
    const saveTimer = window.setTimeout(() => {
      saveGameState(state);
    }, 300);
    return () => window.clearTimeout(saveTimer);
  }, [state, flashToast]);

  // 唤醒古琴夜雨声景，并将点击计数合并批处理（彻底消除点击瞬间触发全树重渲染的卡顿）
  useEffect(() => {
    const onAnyPointer = () => {
      horrorAudio.setMuted(state.audioMuted);
      if (state.hasEnteredGame) {
        horrorAudio.startOrUpdateAmbient(state.act);
      }
      pendingClicksRef.current += 1;
    };
    window.addEventListener('pointerdown', onAnyPointer, { passive: true });
    const flushTimer = window.setInterval(() => {
      if (pendingClicksRef.current > 0) {
        const delta = pendingClicksRef.current;
        pendingClicksRef.current = 0;
        setState((prev) => ({ ...prev, totalClicks: prev.totalClicks + delta }));
      }
    }, 5000);
    return () => {
      window.removeEventListener('pointerdown', onAnyPointer);
      window.clearInterval(flushTimer);
    };
  }, [state.audioMuted, state.act, state.hasEnteredGame]);

  // 切换站点后在浏览器绘制前零闪烁还原上次停留的滚动高度
  useLayoutEffect(() => {
    if (pendingScrollRestoreRef.current !== null && typeof window !== 'undefined') {
      const targetY = pendingScrollRestoreRef.current;
      pendingScrollRestoreRef.current = null;
      window.scrollTo(0, targetY);
    }
  }, [state.currentSite]);

  const handleNavigateSite = useCallback(
    (site: SiteId, targetItemId?: string) => {
      if (typeof window !== 'undefined') {
        saveSiteScroll(state.currentSite, window.scrollY);
      }

      setState((prev) => ({
        ...prev,
        currentSite: site,
        unlockedSites: prev.unlockedSites.includes(site)
          ? prev.unlockedSites
          : [...prev.unlockedSites, site],
      }));

      if (targetItemId) {
        const snap: NavSnapshot = {
          site,
          itemId: targetItemId,
          label: resolveItemLabel(site, targetItemId),
        };
        pushNavHistory(snap);
        setFocusedItemId(targetItemId);
        pendingScrollRestoreRef.current = 0;
      } else {
        const remembered = lastSiteSnapRef.current[site] ?? {
          site,
          itemId: getDefaultItemForSite(site),
          label: resolveItemLabel(site, getDefaultItemForSite(site)),
        };
        pushNavHistory(remembered);
        pendingScrollRestoreRef.current = getSiteScroll(site);
      }
    },
    [state.currentSite, pushNavHistory]
  );

  const applySnapshotNavigation = useCallback(
    (target: NavSnapshot, nextIdx: number) => {
      if (typeof window !== 'undefined') {
        saveSiteScroll(state.currentSite, window.scrollY);
      }
      lastSiteSnapRef.current[target.site] = target;
      setNavIdx(nextIdx);
      setState((prev) => ({
        ...prev,
        currentSite: target.site,
        unlockedSites: prev.unlockedSites.includes(target.site)
          ? prev.unlockedSites
          : [...prev.unlockedSites, target.site],
      }));
      navSeqRef.current += 1;
      setNavCommand({
        seq: navSeqRef.current,
        site: target.site,
        itemId: target.itemId,
      });
      pendingScrollRestoreRef.current = 0;
    },
    [state.currentSite]
  );

  const handleGoBack = useCallback(() => {
    if (navIdx <= 0) return;
    const prevSnap = navStack[navIdx - 1];
    if (!prevSnap) return;
    applySnapshotNavigation(prevSnap, navIdx - 1);
  }, [navIdx, navStack, applySnapshotNavigation]);

  const handleGoForward = useCallback(() => {
    if (navIdx >= navStack.length - 1) return;
    const nextSnap = navStack[navIdx + 1];
    if (!nextSnap) return;
    applySnapshotNavigation(nextSnap, navIdx + 1);
  }, [navIdx, navStack, applySnapshotNavigation]);

  const handleJumpSnapshot = useCallback(
    (snap: NavSnapshot) => {
      if (typeof window !== 'undefined') {
        saveSiteScroll(state.currentSite, window.scrollY);
      }
      pushNavHistory(snap);
      setState((prev) => ({
        ...prev,
        currentSite: snap.site,
        unlockedSites: prev.unlockedSites.includes(snap.site)
          ? prev.unlockedSites
          : [...prev.unlockedSites, snap.site],
      }));
      navSeqRef.current += 1;
      setNavCommand({
        seq: navSeqRef.current,
        site: snap.site,
        itemId: snap.itemId,
      });
      pendingScrollRestoreRef.current = 0;
    },
    [state.currentSite, pushNavHistory]
  );

  // 支持浏览器习惯快捷键 Alt + ← / Alt + → 快速回退上一条线索页
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGoBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleGoForward();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleGoBack, handleGoForward]);

  const recentFootprints = useMemo(() => {
    const seen = new Set<string>();
    const list: NavSnapshot[] = [];
    for (let i = navStack.length - 1; i >= 0; i--) {
      const item = navStack[i];
      const key = `${item.site}::${item.itemId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(item);
      if (list.length >= 12) break;
    }
    return list;
  }, [navStack]);

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

        let nextSites = prev.unlockedSites;
        if (docId === 'qh-37-09' && !prev.unlockedSites.includes('bbs')) {
          nextSites = [...prev.unlockedSites, 'bbs'];
          horrorAudio.playClick('unlock');
          flashToast('发现异常黑影线索！已接入【树洞 & 显影液BBS】并收到林知夏第二封续信');
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
      const currentSnap = navStack[navIdx];
      const exactDocId =
        currentSnap && currentSnap.site === site && !currentSnap.itemId.startsWith('__')
          ? currentSnap.itemId
          : undefined;
      const exactTitle =
        currentSnap && currentSnap.site === site
          ? currentSnap.label
          : `${SITE_METAS[site].shortName} 摘录`;

      setState((prev) => {
        if (prev.discoveredClues.some((c) => c.detail === snippet)) return prev;
        return {
          ...prev,
          discoveredClues: [
            ...prev.discoveredClues,
            {
              id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              title: exactTitle,
              detail: snippet,
              sourceSite: site,
              sourceDocId: exactDocId,
              discoveredAt: `第${prev.act}幕`,
              isPlayerClip: true,
            },
          ],
        };
      });
      flashToast(`已摘录自「${exactTitle}」至随身手记`);
    },
    [flashToast, navStack, navIdx]
  );

  const handleDiscoverLensAnomaly = useCallback((photoId: string) => {
    setState((prev) => {
      const cur = prev.discoveredLensIds ?? [];
      if (cur.includes(photoId)) return prev;
      return {
        ...prev,
        discoveredLensIds: [...cur, photoId],
      };
    });
  }, []);

  const handleDiscoverCapture = useCallback((captureId: string) => {
    setState((prev) => {
      const cur = prev.discoveredCaptureIds ?? [];
      if (cur.includes(captureId)) return prev;
      return {
        ...prev,
        discoveredCaptureIds: [...cur, captureId],
      };
    });
  }, []);

  const handleSolvePuzzle = useCallback(
    (puzzleId: string) => {
      setState((prev) => {
        const cur = prev.solvedPuzzleIds ?? [];
        if (cur.includes(puzzleId)) return prev;
        return {
          ...prev,
          solvedPuzzleIds: [...cur, puzzleId],
        };
      });
      flashToast('暗房实物取证完成！新发现已写入当前档案页');
    },
    [flashToast]
  );

  const handleSurviveEncounter = useCallback(
    (encounterId: EncounterId) => {
      setActiveEncounter(null);
      setState((prev) => {
        const cur = prev.survivedEncounters ?? [];
        if (cur.includes(encounterId)) return prev;
        return {
          ...prev,
          survivedEncounters: [...cur, encounterId],
        };
      });
      flashToast('异象已暂时镇压，记录已归档至暗房收集册');
    },
    [flashToast]
  );

  const handleFailEncounter = useCallback(
    (_encounterId: EncounterId, scare: ScarePayload) => {
      setActiveEncounter(null);
      setState((prev) => ({
        ...prev,
        contamination: Math.min(100, prev.contamination + 12),
      }));
      horrorAudio.playScareStinger(state.scareMode);
      setActiveScare(scare);
    },
    [state.scareMode]
  );

  const handleRemoveClue = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      discoveredClues: prev.discoveredClues.filter((c) => c.id !== id),
    }));
  }, []);

  const handleAddKeywords = useCallback((_keywords: string[]) => {
    // 玩家通过划词或手记自主整理
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

  // 升级版高精度跨站联合检索引擎（按权重相关性排序 + 真实上下文摘录）
  const handleGlobalSearch = useCallback(
    (rawQuery: string) => {
      const q = rawQuery.trim();
      if (!q) return;
      const qCompact = normalizeCompactSearch(q);

      let unlockedNow: SiteId | null = null;
      const chronTriggers = ['云溪水库', '云溪', 'yunxichronicles', '壶口', '1084', '水利', '县志'];
      const willUnlockChronicles =
        !state.unlockedSites.includes('chronicles') &&
        chronTriggers.some((t) => qCompact.includes(t));

      if (willUnlockChronicles) {
        unlockedNow = 'chronicles';
      }

      const effectiveUnlockedSites: SiteId[] = willUnlockChronicles
        ? [...state.unlockedSites, 'chronicles']
        : state.unlockedSites;

      const hits: SearchHit[] = [];

      if (effectiveUnlockedSites.includes('qinghe')) {
        for (const item of QINGHE_ARCHIVE_ENTRIES) {
          const res = scoreSearchMatch(q, {
            code: item.code,
            title: item.title,
            subtitle: `${item.village} ${item.year} ${item.photographer ?? ''}`,
            tags: item.keywords,
            summary: item.summary,
            body: item.content,
            allowBodyMatch: !item.hiddenFromList,
          });
          if (res.matched) {
            hits.push({
              id: `hit-qh-${item.id}`,
              siteId: 'qinghe',
              codeOrTag: item.code,
              title: item.title,
              snippet: extractSearchSnippet(item.content, q, item.summary, res.bestTerm),
              score: res.score,
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
                qCompact.includes(normalizeCompactSearch(r.hiddenKeywordRequired)))
          );
          const repliesText = visibleReplies
            .map((r) => `${r.author}：${r.content}`)
            .join('\n');
          const res = scoreSearchMatch(q, {
            code: `${thread.tag} ${thread.id}`,
            title: thread.title,
            subtitle: thread.author,
            tags: thread.keywords,
            summary: thread.replies[0]?.content ?? '',
            body: repliesText,
            allowBodyMatch: true,
          });

          if (res.matched) {
            const hasHiddenFloor = visibleReplies.some((r) => Boolean(r.hiddenKeywordRequired));
            hits.push({
              id: `hit-bbs-${thread.id}`,
              siteId: 'bbs',
              codeOrTag: thread.board === 'zijing' ? '紫荆树洞' : '显影液BBS',
              title: thread.title,
              snippet: extractSearchSnippet(
                repliesText,
                q,
                thread.replies[0]?.content ?? '',
                res.bestTerm
              ),
              score: res.score,
              isHiddenDiscovery: hasHiddenFloor,
              targetItemId: thread.id,
            });
          }
        }
      }

      if (effectiveUnlockedSites.includes('chronicles')) {
        for (const doc of CHRONICLE_DOCS) {
          const res = scoreSearchMatch(q, {
            code: doc.docNumber,
            title: doc.title,
            subtitle: `${doc.department} ${doc.year} ${doc.classification}`,
            tags: doc.keywords,
            summary: doc.summary,
            body: doc.content,
            allowBodyMatch: !doc.hiddenFromDefault,
          });
          if (res.matched) {
            hits.push({
              id: `hit-chr-${doc.id}`,
              siteId: 'chronicles',
              codeOrTag: doc.docNumber,
              title: doc.title,
              snippet: extractSearchSnippet(doc.content, q, doc.summary, res.bestTerm),
              score: res.score,
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
          const res = scoreSearchMatch(q, {
            code: oaDoc.code,
            title: oaDoc.title,
            subtitle: `${oaDoc.senderOrAuthor} ${oaDoc.folder}`,
            tags: oaDoc.keywords,
            body: plain,
            allowBodyMatch: true,
          });
          if (res.matched) {
            hits.push({
              id: `hit-oa-${oaDoc.id}`,
              siteId: 'oa',
              codeOrTag: `OA Lv.${oaDoc.minLevel}`,
              title: oaDoc.title,
              snippet: extractSearchSnippet(plain, q, oaDoc.senderOrAuthor, res.bestTerm),
              score: res.score,
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
          const res = scoreSearchMatch(q, {
            code: note.date,
            title: note.title,
            subtitle: note.weather,
            tags: note.keywords,
            body: text,
            allowBodyMatch: true,
          });
          if (res.matched) {
            hits.push({
              id: `hit-note-${note.id}`,
              siteId: 'notes',
              codeOrTag: note.date,
              title: note.title,
              snippet: extractSearchSnippet(text, q, note.title, res.bestTerm),
              score: res.score,
              isHiddenDiscovery: Boolean(note.requiresDeepUnlock),
              targetItemId: note.id,
            });
          }
        }
      }

      for (const mail of visibleMails) {
        const res = scoreSearchMatch(q, {
          code: mail.category,
          title: mail.subject,
          subtitle: mail.sender,
          summary: mail.summary,
          body: mail.content,
          allowBodyMatch: true,
        });
        if (res.matched) {
          hits.push({
            id: `hit-mail-${mail.id}`,
            siteId: 'mail',
            codeOrTag: mail.category,
            title: mail.subject,
            snippet: extractSearchSnippet(mail.content, q, mail.summary, res.bestTerm),
            score: res.score,
            targetItemId: mail.id,
          });
        }
      }

      hits.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      setState((prev) => ({
        ...prev,
        unlockedSites: effectiveUnlockedSites,
        searchHistory: [q, ...prev.searchHistory.filter((x) => x !== q)].slice(0, 30),
      }));
      setNewlyUnlockedSite(unlockedNow);
      setSearchHits(hits);
      setSearchQuery(q);
    },
    [state, visibleMails]
  );

  // 开局封面
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
          resetAllSiteMemory();
          const fresh = createInitialGameState();
          fresh.unlockedEndings = state.unlockedEndings;
          setState(fresh);
        }}
      />
    );
  }

  const makeSiteProps = (siteId: SiteId): CommonSiteProps => ({
    state,
    focusedItemId: state.currentSite === siteId ? focusedItemId : null,
    onClearFocus: () => setFocusedItemId(null),
    navCommand: navCommand?.site === siteId ? navCommand : null,
    onRecordNav: (itemId: string, label: string) => pushNavHistory({ site: siteId, itemId, label }),
    onNavigateSite: handleNavigateSite,
    onUnlockSite: handleUnlockSite,
    onMarkRead: handleMarkRead,
    onAddClue: handleAddClue,
    onAddKeywords: handleAddKeywords,
    onRecordPhotoView: handleRecordPhotoView,
    onDiscoverLensAnomaly: handleDiscoverLensAnomaly,
    onSolvePuzzle: handleSolvePuzzle,
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
  });

  const activeNavSnap = navStack[navIdx];
  const activeDocKey = activeNavSnap ? `${activeNavSnap.site}:${activeNavSnap.itemId}` : '';

  // 限时民俗灵异突发事件：关键剧情节点必触发（每类一次）+ 探索途中 3.5 分钟低频随机突袭（绝不打断输入密码！）
  useEffect(() => {
    if (!state.hasEnteredGame || state.activeEnding) return;

    const milestoneMap: Record<string, EncounterId> = {
      'qinghe:qh-12-03': 'knock_hold',
      'chronicles:chr-elevation-map': 'fog_wipe_seal',
      'oa:oa-l1-attendance': 'mirror_cross_seal',
      'notes:note-s3': 'gong_freeze',
    };

    const encounterToFire = milestoneMap[activeDocKey];
    if (!encounterToFire || firedStoryEncountersRef.current.has(encounterToFire)) return;

    const timer = window.setTimeout(() => {
      const el = document.activeElement;
      const isTyping =
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (isTyping || activeScare || activeEncounter || searchQuery) return;
      firedStoryEncountersRef.current.add(encounterToFire);
      setActiveEncounter(encounterToFire);
    }, 8200);

    return () => window.clearTimeout(timer);
  }, [activeDocKey, state.hasEnteredGame, state.activeEnding, activeScare, activeEncounter, searchQuery]);

  useEffect(() => {
    if (!state.hasEnteredGame || state.activeEnding || !state.readDocIds.includes('qh-37-09')) return;

    const interval = window.setInterval(() => {
      const el = document.activeElement;
      const isTyping =
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (isTyping || activeScare || activeEncounter || searchQuery || document.hidden) return;

      const allIds: EncounterId[] = ['knock_hold', 'fog_wipe_seal', 'mirror_cross_seal', 'gong_freeze'];
      const survived = state.survivedEncounters ?? [];
      const candidates = allIds.filter((id) => !survived.includes(id));
      const pool = candidates.length > 0 ? candidates : allIds;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      setActiveEncounter(picked);
    }, 210000);

    return () => window.clearInterval(interval);
  }, [
    state.hasEnteredGame,
    state.activeEnding,
    state.readDocIds,
    state.survivedEncounters,
    activeScare,
    activeEncounter,
    searchQuery,
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f4ed] text-stone-800">
      <TopInvestigatorBar
        state={state}
        unreadMailCount={unreadMailCount}
        activePanel={activePanel}
        canGoBack={navIdx > 0}
        canGoForward={navIdx < navStack.length - 1}
        backTargetLabel={navIdx > 0 ? navStack[navIdx - 1]?.label : undefined}
        forwardTargetLabel={navIdx < navStack.length - 1 ? navStack[navIdx + 1]?.label : undefined}
        recentFootprints={recentFootprints}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onJumpSnapshot={handleJumpSnapshot}
        onTogglePanel={(mode) => setActivePanel((prev) => (prev === mode ? null : mode))}
        onSelectSite={(s) => handleNavigateSite(s)}
        onGlobalSearch={handleGlobalSearch}
        onToggleMute={() => {
          const next = !state.audioMuted;
          horrorAudio.setMuted(next);
          setState((prev) => ({ ...prev, audioMuted: next }));
        }}
      />

      <InvestigationGuideRibbon state={state} onNavigateSite={handleNavigateSite} />

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

      {/* 120fps 丝滑切站过渡动画 + 单活动站点瞬开记忆架构 */}
      <div className="relative flex flex-1 w-full items-stretch">
        <main className="flex-1 min-w-0 overflow-x-clip">
          <motion.div
            key={state.currentSite}
            initial={{ opacity: 0, y: 12, scale: 0.994 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="will-change-[transform,opacity]"
          >
            {state.currentSite === 'mail' && <MailSite {...makeSiteProps('mail')} />}
            {state.currentSite === 'qinghe' && <QinghePortalSite {...makeSiteProps('qinghe')} />}
            {state.currentSite === 'bbs' && <BbsSnapshotSite {...makeSiteProps('bbs')} />}
            {state.currentSite === 'chronicles' && <ChroniclesGovSite {...makeSiteProps('chronicles')} />}
            {state.currentSite === 'oa' && <OaInternalSite {...makeSiteProps('oa')} />}
            {state.currentSite === 'notes' && <ZhixiaNotesSite {...makeSiteProps('notes')} />}
            {state.currentSite === 'b2' && <B2TerminalSite {...makeSiteProps('b2')} />}
          </motion.div>
        </main>

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
                  onResetGame={() => {
                    resetAllSiteMemory();
                    setState(createInitialGameState());
                  }}
                  onViewEnding={(eid) => setState((prev) => ({ ...prev, activeEnding: eid }))}
                  onReplayEncounter={(eid) => setActiveEncounter(eid)}
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
                onResetGame={() => {
                  resetAllSiteMemory();
                  setState(createInitialGameState());
                }}
                onViewEnding={(eid) => setState((prev) => ({ ...prev, activeEnding: eid }))}
                onReplayEncounter={(eid) => setActiveEncounter(eid)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 全局中式民俗恐怖实景异变演出层 */}
      <HauntedAtmosphereLayer
        state={state}
        activeDocKey={activeDocKey}
        onTriggerScare={handleTriggerScare}
        onDiscoverCapture={handleDiscoverCapture}
      />

      {/* 限时突发灵异紧急应对事件层 */}
      <EmergencyHorrorEncounter
        encounterId={activeEncounter}
        scareMode={state.scareMode}
        onSurvive={handleSurviveEncounter}
        onFail={handleFailEncounter}
      />

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
