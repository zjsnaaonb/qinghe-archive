import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  BookOpen,
  Lightbulb,
  Settings,
  Volume2,
  VolumeX,
  Mail,
  Globe,
  MessageSquare,
  Landmark,
  Lock,
  FileText,
  Radio,
} from 'lucide-react';
import type { GameState, SiteId } from '../types/game';
import type { RightPanelMode } from './SideWorkspacePanel';
import { horrorAudio } from '../engine/audio';

interface SiteMeta {
  id: SiteId;
  shortName: string;
  domain: string;
  icon: React.ReactNode;
}

export const SITE_METAS: Record<SiteId, SiteMeta> = {
  mail: {
    id: 'mail',
    shortName: '收件箱',
    domain: 'mail://lin_zx_backup',
    icon: <Mail className="w-3.5 h-3.5" />,
  },
  qinghe: {
    id: 'qinghe',
    shortName: '青禾数字民俗馆',
    domain: 'qinghe-archive.edu.cn',
    icon: <Globe className="w-3.5 h-3.5" />,
  },
  bbs: {
    id: 'bbs',
    shortName: '树洞 & 显影液BBS',
    domain: 'bbs-snapshot.net',
    icon: <MessageSquare className="w-3.5 h-3.5" />,
  },
  chronicles: {
    id: 'chronicles',
    shortName: '云溪水利方志网',
    domain: 'yunxi-chronicles.gov.cn',
    icon: <Landmark className="w-3.5 h-3.5" />,
  },
  oa: {
    id: 'oa',
    shortName: '内部OA系统',
    domain: 'oa.qinghe-internal.cn',
    icon: <Lock className="w-3.5 h-3.5" />,
  },
  notes: {
    id: 'notes',
    shortName: '夏夜拾遗笔记',
    domain: 'note.zhixia-memo.me',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  b2: {
    id: 'b2',
    shortName: 'B2审片终端',
    domain: 'terminal.qinghe-b2.local',
    icon: <Radio className="w-3.5 h-3.5" />,
  },
};

interface TopInvestigatorBarProps {
  state: GameState;
  activePanel: RightPanelMode;
  onTogglePanel: (mode: Exclude<RightPanelMode, null>) => void;
  onSelectSite: (site: SiteId) => void;
  onGlobalSearch: (query: string) => void;
  onToggleMute: () => void;
}

export const TopInvestigatorBar: React.FC<TopInvestigatorBarProps> = ({
  state,
  activePanel,
  onTogglePanel,
  onSelectSite,
  onGlobalSearch,
  onToggleMute,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [countdownText, setCountdownText] = useState('02:59:59');

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

  const currentMeta = SITE_METAS[state.currentSite];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    horrorAudio.playClick('ui');
    onGlobalSearch(searchInput.trim());
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/90 bg-[#0b0c10]/95 text-zinc-200 backdrop-blur-md">
      {/* 精简优雅的第一排：品牌标识 + 融合搜索栏 + 右侧核心工具 */}
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="font-serif-cn text-sm font-bold tracking-widest text-zinc-100">
              青禾库
            </span>
          </div>
          <span className="hidden md:inline-block h-3.5 w-px bg-zinc-800" />
          <span className="hidden md:inline text-[11px] font-mono-tech text-zinc-400">
            距零点公映 <strong className="text-amber-300 font-normal">{countdownText}</strong>
          </span>
        </div>

        {/* 仅在解锁青禾馆后再高亮跨站搜索，避免开局首屏干扰 */}
        <form onSubmit={handleSearchSubmit} className="flex flex-1 max-w-lg items-center">
          <div className="relative flex w-full items-center">
            <span className="hidden lg:inline-flex items-center rounded-l-lg border border-r-0 border-zinc-800 bg-zinc-900/90 px-2.5 py-1.5 text-[11px] font-mono-tech text-zinc-500 select-all">
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
                    : '跨站检索关键词、村名或编号……'
                }
                className="w-full rounded-lg lg:rounded-l-none border border-zinc-800 bg-zinc-950/90 py-1.5 pl-3 pr-8 text-xs text-zinc-100 placeholder-zinc-500 focus:border-amber-500/60 focus:outline-none transition"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-400 cursor-pointer transition"
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
                ? 'border-amber-500/80 bg-amber-500/15 text-amber-200'
                : 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-600 hover:text-white'
            }`}
            title="展开/收起右侧分栏手记（主页面会自动左移不遮挡）"
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-400" />
            <span>手记</span>
            {state.discoveredClues.length > 0 && (
              <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-mono-tech text-amber-300">
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
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition ${
              activePanel === 'hints'
                ? 'border-emerald-500/80 bg-emerald-500/15 text-emerald-200'
                : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
            }`}
            title="卡关时按需查看分级提示"
          >
            <Lightbulb className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">提示</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-1.5 text-zinc-400 hover:border-zinc-600 hover:text-white cursor-pointer transition"
            title={state.audioMuted ? '开启声效' : '静音'}
          >
            {state.audioMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-red-400" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
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
                ? 'border-zinc-500 bg-zinc-800 text-white'
                : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-zinc-600 hover:text-white'
            }`}
            title="设置、惊吓模式与存档码"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 第二排：仅展示已解锁的站点标签，配合 Framer Motion layoutId 顺滑滑块！ */}
      <div className="border-t border-zinc-800/70 bg-zinc-950/75 px-4 py-1.5">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
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
                  className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium cursor-pointer transition ${
                    active ? 'text-amber-100' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="activeSiteTab"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-lg border border-amber-500/45 bg-amber-500/12"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {meta.icon}
                    <span>{meta.shortName}</span>
                    {siteId === 'oa' && state.oaLevel > 0 && (
                      <span className="rounded bg-emerald-950 px-1 text-[10px] font-mono-tech text-emerald-300">
                        Lv.{state.oaLevel}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-3 shrink-0 text-[11px] font-mono-tech text-zinc-500">
            {state.contamination > 0 && (
              <span className={state.contamination >= 50 ? 'text-red-400' : 'text-zinc-400'}>
                视网膜残留 {state.contamination}%
              </span>
            )}
            {state.act >= 4 && (
              <span className="text-red-400 animate-pulse">同页浏览：2 人</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
