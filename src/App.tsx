import React, { useState, useEffect, useCallback } from 'react';
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
import { TopInvestigatorBar } from './components/TopInvestigatorBar';
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
  1: '第一幕 · 表象裂痕（公开馆藏与都市传说）',
  2: '第二幕 · 水下亡村（淹没台账与内网潜入）',
  3: '第三幕 · 借目十诫（审片规则与四生救赎）',
  4: '第四幕 · 龛中之人（视网膜校准与真伪方志）',
  5: '第五幕 · 子时封龛（终局抉择）',
};

export const App: React.FC = () => {
  const [state, setState] = useState<GameState>(() => loadGameState());
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [newlyUnlockedSite, setNewlyUnlockedSite] = useState<SiteId | null>(null);
  const [activeScare, setActiveScare] = useState<ScarePayload | null>(null);
  const [actBanner, setActBanner] = useState<string | null>(null);

  // 持久化保存与幕次自动推导
  useEffect(() => {
    const derived = computeDerivedAct(state);
    if (derived !== state.act) {
      setState((prev) => ({ ...prev, act: derived }));
      if (derived >= 2 && derived <= 4) {
        horrorAudio.playBronzeGong(1);
        setActBanner(ACT_TITLES[derived]);
        const t = setTimeout(() => setActBanner(null), 5000);
        return () => clearTimeout(t);
      }
    }
    saveGameState(state);
  }, [state]);

  // 首次用户点击后唤醒环境低频声景并统计总点击次数（用于第四幕 Meta 遥测）
  useEffect(() => {
    const onAnyPointer = () => {
      horrorAudio.setMuted(state.audioMuted);
      horrorAudio.startOrUpdateAmbient(state.act);
      setState((prev) => ({ ...prev, totalClicks: prev.totalClicks + 1 }));
    };
    window.addEventListener('pointerdown', onAnyPointer);
    return () => window.removeEventListener('pointerdown', onAnyPointer);
  }, [state.audioMuted, state.act]);

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

  const handleUnlockSite = useCallback((site: SiteId) => {
    setState((prev) => {
      if (prev.unlockedSites.includes(site)) return prev;
      horrorAudio.playClick('unlock');
      return {
        ...prev,
        unlockedSites: [...prev.unlockedSites, site],
      };
    });
  }, []);

  const handleMarkRead = useCallback((docId: string) => {
    setState((prev) => {
      if (prev.readDocIds.includes(docId)) return prev;
      return {
        ...prev,
        readDocIds: [...prev.readDocIds, docId],
      };
    });
  }, []);

  const handleAddClue = useCallback((clue: Omit<DiscoveredClue, 'discoveredAt'>) => {
    setState((prev) => {
      if (prev.discoveredClues.some((c) => c.id === clue.id)) return prev;
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

  const handleAddKeywords = useCallback((keywords: string[]) => {
    setState((prev) => {
      const merged = Array.from(new Set([...prev.unlockedKeywords, ...keywords.filter(Boolean)]));
      if (merged.length === prev.unlockedKeywords.length) return prev;
      return {
        ...prev,
        unlockedKeywords: merged,
      };
    });
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

  const handleRescueMember = useCallback((member: keyof RescueStatus) => {
    setState((prev) => {
      if (prev.rescued[member]) return prev;
      horrorAudio.playClick('unlock');
      return {
        ...prev,
        rescued: {
          ...prev.rescued,
          [member]: true,
        },
      };
    });
  }, []);

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

  // 跨站全文搜索引擎（支持挖掘各站隐藏未编目残卷与自动解锁关联站点）
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
      const discoveredKws: string[] = [];

      // 1. 检索青禾数字民俗馆（含 hiddenFromList 深层残卷）
      if (effectiveUnlockedSites.includes('qinghe')) {
        for (const item of QINGHE_ARCHIVE_ENTRIES) {
          const keywordMatch = item.keywords.some((k) => k.toLowerCase().includes(ql) || ql.includes(k.toLowerCase()));
          const textMatch =
            item.title.toLowerCase().includes(ql) ||
            item.code.toLowerCase().includes(ql) ||
            item.village.toLowerCase().includes(ql) ||
            (item.photographer && item.photographer.toLowerCase().includes(ql)) ||
            (!item.hiddenFromList && item.content.toLowerCase().includes(ql));

          if (keywordMatch || textMatch) {
            if (item.hiddenFromList) {
              discoveredKws.push(q);
            }
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

      // 2. 检索紫荆树洞与显影液论坛（含隐藏 #88 楼关键词匹配）
      if (effectiveUnlockedSites.includes('bbs')) {
        for (const thread of BBS_THREADS) {
          const visibleReplies = thread.replies.filter(
            (r) =>
              (!r.act3Appended || state.act >= 3) &&
              (!r.hiddenKeywordRequired || r.hiddenKeywordRequired.toLowerCase() === ql || ql.includes(r.hiddenKeywordRequired.toLowerCase()))
          );
          const replyHit = visibleReplies.find((r) => r.content.toLowerCase().includes(ql) || r.author.toLowerCase().includes(ql));
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
              snippet: replyHit ? `${replyHit.author}：${replyHit.content.slice(0, 110)}…` : (thread.replies[0]?.content.slice(0, 110) || ''),
              isHiddenDiscovery: hasHiddenFloor,
              targetItemId: thread.id,
            });
          }
        }
      }

      // 3. 检索云溪县水利移民与方志查询网（含周怀瑾2019临终信访件等隐藏卷宗）
      if (effectiveUnlockedSites.includes('chronicles')) {
        for (const doc of CHRONICLE_DOCS) {
          const kwMatch = doc.keywords.some((k) => k.toLowerCase().includes(ql) || ql.includes(k.toLowerCase()));
          const bodyMatch =
            doc.title.toLowerCase().includes(ql) ||
            doc.docNumber.toLowerCase().includes(ql) ||
            (!doc.hiddenFromDefault && doc.content.toLowerCase().includes(ql));

          if (kwMatch || bodyHitHelper(doc.hiddenFromDefault, kwMatch, bodyMatch)) {
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

      // 4. 检索内部 OA 已获权限文档
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
              codeOrTag: `OA-Lv.${oaDoc.minLevel} · ${oaDoc.code}`,
              title: oaDoc.title,
              snippet: plain ? `${plain.slice(0, 105)}…` : `发件/撰稿：${oaDoc.senderOrAuthor}（${oaDoc.date}）`,
              targetItemId: oaDoc.id,
            });
          }
        }
      }

      // 5. 检索林知夏云笔记
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
              snippet: text ? `${text.slice(0, 105)}…` : note.title,
              isHiddenDiscovery: Boolean(note.requiresDeepUnlock),
              targetItemId: note.id,
            });
          }
        }
      }

      // 6. 检索收件箱
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
        unlockedKeywords: Array.from(new Set([...prev.unlockedKeywords, ...discoveredKws])),
      }));
      setNewlyUnlockedSite(unlockedNow);
      setSearchHits(hits);
      setSearchQuery(q);
    },
    [state]
  );

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

  // 若处于结局播放状态，渲染全屏沉浸结局组件
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

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <TopInvestigatorBar
        state={state}
        onSelectSite={(s) => handleNavigateSite(s)}
        onGlobalSearch={handleGlobalSearch}
        onUpdateMemo={(memo) => setState((prev) => ({ ...prev, playerMemo: memo }))}
        onToggleMute={() => {
          const next = !state.audioMuted;
          horrorAudio.setMuted(next);
          setState((prev) => ({ ...prev, audioMuted: next }));
        }}
        onChangeScareMode={(mode: ScareMode) => setState((prev) => ({ ...prev, scareMode: mode }))}
        onImportState={(imported) => setState(imported)}
        onResetGame={() => setState(createInitialGameState())}
        onViewEnding={(eid) => setState((prev) => ({ ...prev, activeEnding: eid }))}
      />

      {/* 幕次推进提示横幅 */}
      {actBanner && (
        <div className="border-b border-red-900/70 bg-red-950/80 px-4 py-2 text-center text-xs font-serif-cn tracking-widest text-red-100 animate-pulse">
          【调查深入】已进入 {actBanner}
        </div>
      )}

      {/* 当前激活的拟真网站主体视图 */}
      <main className="flex-1">
        {state.currentSite === 'mail' && <MailSite {...siteProps} />}
        {state.currentSite === 'qinghe' && <QinghePortalSite {...siteProps} />}
        {state.currentSite === 'bbs' && <BbsSnapshotSite {...siteProps} />}
        {state.currentSite === 'chronicles' && <ChroniclesGovSite {...siteProps} />}
        {state.currentSite === 'oa' && <OaInternalSite {...siteProps} />}
        {state.currentSite === 'notes' && <ZhixiaNotesSite {...siteProps} />}
        {state.currentSite === 'b2' && <B2TerminalSite {...siteProps} />}
      </main>

      {/* 跨站检索弹窗 */}
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

      {/* 分级惊吓/认知警告遮罩 */}
      <ScareOverlay
        scareEvent={activeScare}
        scareMode={state.scareMode}
        onDismiss={() => setActiveScare(null)}
      />
    </div>
  );
};

function bodyHitHelper(hidden: boolean | undefined, kwMatch: boolean, bodyMatch: boolean): boolean {
  if (hidden) return kwMatch;
  return kwMatch || bodyMatch;
}

export default App;
