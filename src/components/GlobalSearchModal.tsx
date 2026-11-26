import React from 'react';
import { Search, ExternalLink, Sparkles, X, FileText, MessageSquare, Landmark, Lock, BookOpen } from 'lucide-react';
import type { SiteId } from '../types/game';
import { SITE_METAS } from './TopInvestigatorBar';

export interface SearchHit {
  id: string;
  siteId: SiteId;
  codeOrTag: string;
  title: string;
  snippet: string;
  isHiddenDiscovery?: boolean;
  targetItemId: string;
}

interface GlobalSearchModalProps {
  query: string | null;
  hits: SearchHit[];
  newlyUnlockedSite?: SiteId | null;
  onClose: () => void;
  onJumpToHit: (hit: SearchHit) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  query,
  hits,
  newlyUnlockedSite,
  onClose,
  onJumpToHit,
}) => {
  if (!query) return null;

  const siteIcon = (site: SiteId) => {
    switch (site) {
      case 'qinghe':
        return <FileText className="h-3.5 w-3.5 text-sky-600" />;
      case 'bbs':
        return <MessageSquare className="h-3.5 w-3.5 text-purple-600" />;
      case 'chronicles':
        return <Landmark className="h-3.5 w-3.5 text-amber-700" />;
      case 'oa':
        return <Lock className="h-3.5 w-3.5 text-emerald-700" />;
      default:
        return <BookOpen className="h-3.5 w-3.5 text-[#9e2a2b]" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-stone-900/35 p-4 pt-16 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-[#dcd4c4] bg-[#fcfbf8] text-stone-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e5dfd2] bg-[#f4efe4] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#9e2a2b]" />
            <h2 className="text-sm font-bold text-[#16263f]">
              跨站联合检索结果：<span className="font-mono-tech text-[#9e2a2b]">“{query}”</span>
            </h2>
            <span className="rounded-full border border-[#d8d0c0] bg-white px-2.5 py-0.5 text-xs font-mono-tech text-stone-600">
              共 {hits.length} 条命中
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[#d8d0c0] bg-white p-1 text-stone-500 hover:text-stone-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {newlyUnlockedSite && (
          <div className="border-b border-amber-300 bg-amber-50 px-5 py-2.5 text-xs text-amber-950 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              发现关联外部节点！已自动为你解锁新网站入口：
              <strong className="ml-1 underline text-[#9e2a2b]">{SITE_METAS[newlyUnlockedSite].shortName}</strong>
            </span>
          </div>
        )}

        <div className="max-h-[68vh] overflow-y-auto divide-y divide-[#ece6da] p-3">
          {hits.length === 0 ? (
            <div className="py-12 text-center text-sm text-stone-600">
              <p className="mb-1 font-medium">在当前已接入的站点中未检索到与 “{query}” 直接匹配的公开条目。</p>
              <p className="text-xs text-stone-400">
                建议：尝试更简短的核心词（如人名、村名、2位或4位编号），或先解锁更高权限节点。
              </p>
            </div>
          ) : (
            hits.map((hit) => (
              <div
                key={hit.id}
                onClick={() => onJumpToHit(hit)}
                className="group flex flex-col gap-1.5 rounded-xl p-3.5 hover:bg-[#f4efe4]/80 cursor-pointer transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {siteIcon(hit.siteId)}
                    <span className="text-xs font-medium text-stone-500">
                      {SITE_METAS[hit.siteId].shortName}
                    </span>
                    <span className="rounded bg-stone-100 border border-stone-200 px-1.5 py-0.5 text-[10px] font-mono-tech text-stone-600">
                      {hit.codeOrTag}
                    </span>
                    {hit.isHiddenDiscovery && (
                      <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-[#9e2a2b]">
                        深层隐藏未编目命中
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#9e2a2b] opacity-80 group-hover:opacity-100">
                    调阅原文 <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#16263f] group-hover:text-[#9e2a2b]">
                  {hit.title}
                </h3>
                <p className="line-clamp-2 text-xs leading-relaxed text-stone-500">{hit.snippet}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
