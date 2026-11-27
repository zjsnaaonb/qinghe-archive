import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Settings,
  Volume2,
  VolumeX,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import type { GameState, SiteId } from '../types/game';
import type { NavSnapshot } from '../sites/siteProps';
import type { RightPanelMode } from './SideWorkspacePanel';
import { horrorAudio } from '../engine/audio';

interface SiteMeta {
  id: SiteId;
  shortName: string;
  tag: string;
  domain: string;
}

export const SITE_METAS: Record<SiteId, SiteMeta> = {
  mail: {
    id: 'mail',
    shortName: '收件箱',
    tag: '信函',
    domain: 'mail://lin_zx_backup',
  },
  qinghe: {
    id: 'qinghe',
    shortName: '青禾数字民俗馆',
    tag: '馆藏',
    domain: 'qinghe-archive.edu.cn',
  },
  bbs: {
    id: 'bbs',
    shortName: '树洞 & 显影液BBS',
    tag: '论坛',
    domain: 'bbs-snapshot.net',
  },
  chronicles: {
    id: 'chronicles',
    shortName: '云溪水利方志网',
    tag: '方志',
    domain: 'yunxi-chronicles.gov.cn',
  },
  oa: {
    id: 'oa',
    shortName: '内部OA系统',
    tag: '内网',
    domain: 'oa.qinghe-internal.cn',
  },
  notes: {
    id: 'notes',
    shortName: '夏夜拾遗笔记',
    tag: '札记',
    domain: 'note.zhixia-memo.me',
  },
  b2: {
    id: 'b2',
    shortName: 'B2审片终端',
    tag: '终控',
    domain: 'terminal.qinghe-b2.local',
  },
};

interface TopInvestigatorBarProps {
  state: GameState;
  unreadMailCount?: number;
  activePanel: RightPanelMode;
  canGoBack?: boolean;
  canGoForward?: boolean;
  backTargetLabel?: string;
  forwardTargetLabel?: string;
  recentFootprints?: NavSnapshot[];
  onGoBack?: () => void;
  onGoForward?: () => void;
  onJumpSnapshot?: (snap: NavSnapshot) => void;
  onTogglePanel: (mode: Exclude<RightPanelMode, null>) => void;
  onSelectSite: (site: SiteId) => void;
  onGlobalSearch: (query: string) => void;
  onToggleMute: () => void;
}

export const TopInvestigatorBar: React.FC<TopInvestigatorBarProps> = ({
  state,
  unreadMailCount = 0,
  activePanel,
  canGoBack = false,
  canGoForward = false,
  backTargetLabel,
  forwardTargetLabel,
  recentFootprints = [],
  onGoBack,
  onGoForward,
  onJumpSnapshot,
  onTogglePanel,
  onSelectSite,
  onGlobalSearch,
  onToggleMute,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [countdownText, setCountdownText] = useState('02:59:59');
  const [showFootprints, setShowFootprints] = useState(false);
  const footprintWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tick = () => {
      const elapsedSec = Math.floor((Date.now() - state.startedAt) / 1000);
      const baseRemaining = Math.max(59, 3 * 3600 - elapsedSec);
      const hrs = String(Math.floor(baseRemaining / 3600)).padStart(2, '0');
      const mins = String(Math.floor((baseRemaining % 3600) / 60)).padStart(2, '0');
      const secs = String(baseRemaining % 60).padStart(2, '0');
      setCountdownText(`${hrs}:${mins}:${secs}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [state.startedAt]);

  useEffect(() => {
    if (!showFootprints) return;
    const onDocClick = (e: MouseEvent) => {
      if (footprintWrapRef.current && !footprintWrapRef.current.contains(e.target as Node)) {
        setShowFootprints(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showFootprints]);

  const currentMeta = SITE_METAS[state.currentSite];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    horrorAudio.playClick('ui');
    onGlobalSearch(searchInput.trim());
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#dfd8ca] bg-[#fbf9f4]/95 text-stone-800 backdrop-blur-md shadow-[0_1px_3px_rgba(24,24,27,0.04)]">
      {/* 第一排：朱砂印记品牌 + 后退/前进/足迹 + 跨站联合检索栏 + 右侧工作台 */}
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2.5 px-4 py-2.5">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            {/* 真实篆刻白文朱砂印记（gpt-image 生成） */}
            <img
              src="./favicon.png"
              alt="禾"
              className="h-5 w-5 rounded-[2px] object-cover shadow-2xs select-none"
            />
            <span className="font-serif-cn text-sm font-bold tracking-[0.14em] text-[#16263f]">
              青禾库
            </span>
          </div>

          <span className="hidden xl:inline-block h-3.5 w-px bg-[#dcd4c4]" />
          <span className="hidden xl:inline text-[11px] font-mono-tech text-stone-500">
            距零点公映 <strong className="text-[#9e2a2b] font-semibold">{countdownText}</strong>
          </span>

          {/* 浏览器式「上一处 / 下一处 / 浏览足迹」导航组（支持同站与跨站任意跳转回退） */}
          <div className="ml-1 flex items-center gap-1" ref={footprintWrapRef}>
            <button
              type="button"
              disabled={!canGoBack}
              onClick={() => {
                if (!canGoBack) return;
                horrorAudio.playClick('ui');
                onGoBack?.();
              }}
              title={backTargetLabel ? `返回上一处：${backTargetLabel}` : '返回上一处浏览页面'}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                canGoBack
                  ? 'border-[#d6cebe] bg-white text-[#16263f] hover:border-[#9e2a2b]/60 hover:text-[#9e2a2b] cursor-pointer shadow-2xs'
                  : 'border-[#e6dfd1] bg-[#f5f1e8] text-stone-300 cursor-not-allowed'
              }`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">上一处</span>
            </button>

            <button
              type="button"
              disabled={!canGoForward}
              onClick={() => {
                if (!canGoForward) return;
                horrorAudio.playClick('ui');
                onGoForward?.();
              }}
              title={forwardTargetLabel ? `前进至：${forwardTargetLabel}` : '前进'}
              className={`inline-flex items-center justify-center rounded-lg border p-1.5 text-xs transition ${
                canGoForward
                  ? 'border-[#d6cebe] bg-white text-[#16263f] hover:border-[#9e2a2b]/60 hover:text-[#9e2a2b] cursor-pointer shadow-2xs'
                  : 'border-[#e6dfd1] bg-[#f5f1e8] text-stone-300 cursor-not-allowed'
              }`}
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            {recentFootprints.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    horrorAudio.playClick('ui');
                    setShowFootprints((v) => !v);
                  }}
                  title="查看最近翻阅过的页面，一键跳回之前核对的线索页"
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium cursor-pointer transition ${
                    showFootprints
                      ? 'border-[#9e2a2b]/60 bg-red-50/70 text-[#9e2a2b]'
                      : 'border-[#d6cebe] bg-white text-stone-600 hover:border-stone-400 hover:text-[#16263f]'
                  }`}
                >
                  <span>足迹</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showFootprints && (
                  <div className="absolute left-0 top-full mt-1.5 z-[95] w-80 rounded-xl border border-[#d6cebe] bg-[#fcfbf8] p-2 shadow-xl">
                    <div className="mb-1.5 flex items-center justify-between border-b border-[#ece6da] px-2 pb-1.5 text-[11px] text-stone-500">
                      <span className="font-semibold text-[#16263f]">最近查阅足迹（点击直达原页）</span>
                      <span className="font-mono-tech">{recentFootprints.length} 条</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-0.5">
                      {recentFootprints.map((snap, idx) => (
                        <button
                          key={`${snap.site}-${snap.itemId}-${idx}`}
                          type="button"
                          onClick={() => {
                            horrorAudio.playClick('ui');
                            setShowFootprints(false);
                            onJumpSnapshot?.(snap);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-[#f2ede2] cursor-pointer transition"
                        >
                          <span className="shrink-0 rounded border border-[#d8d0c0] bg-white px-1.5 py-0.5 font-mono-tech text-[10px] text-stone-600">
                            {SITE_METAS[snap.site].tag}
                          </span>
                          <span className="truncate font-medium text-[#16263f]">{snap.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 跨站联合检索栏 */}
        <form onSubmit={handleSearchSubmit} className="flex flex-1 max-w-lg items-center">
          <div className="relative flex w-full items-center">
            <span className="hidden lg:inline-flex items-center rounded-l-lg border border-r-0 border-[#dcd4c4] bg-[#f2ede2] px-2.5 py-1.5 text-[11px] font-mono-tech text-stone-500 select-all">
              {currentMeta.domain}
            </span>
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={
                  state.act >= 4
                    ? '跨站检索……（切勿回头核对身后光线）'
                    : '跨站搜编号(如3709)、人名或词句（支持空格多词）……'
                }
                className="w-full rounded-lg lg:rounded-l-none border border-[#dcd4c4] bg-white py-1.5 pl-3 pr-8 text-xs text-stone-800 placeholder-stone-400 focus:border-[#9e2a2b]/60 focus:outline-none transition"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#9e2a2b] cursor-pointer transition"
                title="跨站联合检索"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              horrorAudio.playClick('ui');
              onTogglePanel('notebook');
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
              activePanel === 'notebook'
                ? 'border-[#9e2a2b]/60 bg-[#9e2a2b]/10 text-[#9e2a2b]'
                : 'border-[#dcd4c4] bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50'
            }`}
            title="展开/收起右侧分栏手记（主页面会自动左移不遮挡）"
          >
            <span>手记</span>
            {state.discoveredClues.length > 0 && (
              <span className="rounded-full bg-[#9e2a2b]/12 px-1.5 text-[10px] font-mono-tech font-semibold text-[#9e2a2b]">
                {state.discoveredClues.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              horrorAudio.playClick('ui');
              onTogglePanel('hints');
            }}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer transition ${
              activePanel === 'hints'
                ? 'border-emerald-600/60 bg-emerald-50 text-emerald-800'
                : 'border-[#dcd4c4] bg-white text-stone-600 hover:border-stone-400 hover:text-stone-800'
            }`}
            title="卡关时按需查看分级提示"
          >
            <span>提示</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="rounded-lg border border-[#dcd4c4] bg-white p-1.5 text-stone-600 hover:border-stone-400 hover:text-stone-900 cursor-pointer transition"
            title={state.audioMuted ? '开启古琴与环境声效' : '静音'}
          >
            {state.audioMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-[#9e2a2b]" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-emerald-700" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              horrorAudio.playClick('ui');
              onTogglePanel('settings');
            }}
            className={`rounded-lg border p-1.5 cursor-pointer transition ${
              activePanel === 'settings'
                ? 'border-[#16263f]/40 bg-[#16263f]/10 text-[#16263f]'
                : 'border-[#dcd4c4] bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900'
            }`}
            title="设置、惊吓模式与存档码"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 第二排：无黑框、无滚动条溢出的纯净站点切换标签栏 */}
      <div className="border-t border-[#eae4d7] bg-[#f3efe5]/95 px-4 py-1.5">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
          <div className="no-scrollbar flex flex-wrap items-center gap-1.5">
            {state.unlockedSites.map((siteId) => {
              const meta = SITE_METAS[siteId];
              const active = state.currentSite === siteId;
              return (
                <button
                  key={siteId}
                  type="button"
                  onClick={() => {
                    horrorAudio.playClick('ui');
                    onSelectSite(siteId);
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1 text-xs cursor-pointer outline-none focus:outline-none focus-visible:outline-none transition-colors duration-150 ${
                    active
                      ? 'border-[#d4cbb8] bg-white font-semibold text-[#16263f] shadow-2xs'
                      : 'border-transparent bg-transparent font-medium text-stone-600 hover:bg-white/60 hover:text-[#16263f]'
                  }`}
                >
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-[#9e2a2b]" />}
                  <span>{meta.shortName}</span>
                  {siteId === 'mail' && unreadMailCount > 0 && (
                    <span className="rounded-full bg-[#9e2a2b] px-1.5 py-0.2 text-[10px] font-mono-tech font-bold text-white">
                      {unreadMailCount}
                    </span>
                  )}
                  {siteId === 'oa' && state.oaLevel > 0 && (
                    <span className="rounded border border-emerald-300/70 bg-emerald-100 px-1 text-[10px] font-mono-tech text-emerald-800">
                      Lv.{state.oaLevel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] font-mono-tech text-stone-500">
            {state.contamination > 0 && (
              <span className={state.contamination >= 50 ? 'text-[#9e2a2b] font-semibold' : 'text-stone-500'}>
                视网膜残留 {state.contamination}%
              </span>
            )}
            {(state.act >= 3 || state.contamination >= 45) && (
              <span className="text-[#9e2a2b] font-semibold animate-pulse">
                同页阅览：2 人（B2内室同步中）
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
