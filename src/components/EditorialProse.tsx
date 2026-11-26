import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EditorialProseProps {
  text: string;
  theme?: 'paper' | 'dark' | 'gov' | 'journal';
  defaultCollapsedChars?: number;
  defaultVisibleBlocks?: number; // 随游玩阶段递进控制首屏展示段数（前期精简清爽，后期完整深读）
}

interface ParsedBlock {
  type: 'heading' | 'callout' | 'divider' | 'table' | 'paragraph';
  text: string;
}

export const EditorialProse: React.FC<EditorialProseProps> = ({
  text,
  theme = 'paper',
  defaultCollapsedChars,
  defaultVisibleBlocks,
}) => {
  const hasCollapsePolicy = Boolean(defaultCollapsedChars || defaultVisibleBlocks);
  const [expanded, setExpanded] = useState(!hasCollapsePolicy);

  const blocks = useMemo<ParsedBlock[]>(() => {
    const rawParas = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    return rawParas.map((p) => {
      if (/^[-=—─]{4,}$/.test(p)) {
        return { type: 'divider', text: p };
      }
      if (p.includes('|') && p.split('\n').length >= 2) {
        return { type: 'table', text: p };
      }
      if (/^【[^】]{2,32}】[：:]?$/.test(p) || (/^[一二三四五六七八九十]+[、.]/.test(p) && p.length < 36)) {
        return { type: 'heading', text: p };
      }
      if (/^【[^】]*(校注|审计|批注|按语|警告|求救|附注|备忘|绝密|系统提示|核校)/.test(p)) {
        return { type: 'callout', text: p };
      }
      return { type: 'paragraph', text: p };
    });
  }, [text]);

  const cutoff = defaultVisibleBlocks ?? 4;
  const exceedsBlocks = Boolean(defaultVisibleBlocks) && blocks.length > cutoff + 1;
  const exceedsChars =
    Boolean(defaultCollapsedChars) && text.length > (defaultCollapsedChars ?? 99999) && blocks.length > 4;

  const shouldCollapse = !expanded && (exceedsBlocks || exceedsChars);

  // 折叠状态下：仅展示前 cutoff 段精要内容，但始终保留底部的紧急求救/核校批注（绝不漏掉关键校注！）
  const { visibleBlocks, hiddenCount } = useMemo(() => {
    if (!shouldCollapse) {
      return { visibleBlocks: blocks, hiddenCount: 0 };
    }
    const head = blocks.slice(0, cutoff);
    const tailCallouts = blocks.slice(cutoff).filter((b) => b.type === 'callout');
    const hidden = Math.max(0, blocks.length - cutoff - tailCallouts.length);
    if (hidden === 0) {
      return { visibleBlocks: blocks, hiddenCount: 0 };
    }
    return {
      visibleBlocks: [...head, ...tailCallouts],
      hiddenCount: hidden,
    };
  }, [blocks, cutoff, shouldCollapse]);

  const palette = {
    paper: {
      body: 'text-stone-700',
      heading: 'text-[#1b2a4a] border-l-2 border-[#9e2a2b] pl-3 font-serif-cn font-bold text-[15px]',
      callout: 'rounded-lg border border-amber-800/20 bg-amber-50/80 px-4 py-3 text-stone-800 text-[13.5px]',
      table: 'rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 font-mono-tech text-xs text-stone-700 overflow-x-auto',
      divider: 'border-stone-200',
    },
    gov: {
      body: 'text-slate-800',
      heading: 'text-[#1b365d] border-l-2 border-[#9e2a2b] pl-3 font-serif-cn font-bold text-[15px]',
      callout: 'rounded-lg border border-red-900/25 bg-red-50/65 px-4 py-3 text-slate-900 text-[13.5px]',
      table: 'rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono-tech text-xs text-slate-800 overflow-x-auto',
      divider: 'border-slate-200',
    },
    journal: {
      body: 'text-stone-700 font-serif-cn',
      heading: 'text-stone-900 font-serif-cn font-bold text-base tracking-wide',
      callout: 'rounded-lg border border-stone-300/80 bg-[#f3ede2] px-4 py-3 text-stone-800 text-[13.5px]',
      table: 'rounded-lg border border-stone-300 bg-stone-100/70 px-3.5 py-2.5 font-mono-tech text-xs text-stone-700 overflow-x-auto',
      divider: 'border-stone-300/70',
    },
    dark: {
      body: 'text-zinc-300',
      heading: 'text-amber-200 border-l-2 border-amber-500/70 pl-3 font-serif-cn font-bold text-[15px]',
      callout: 'rounded-lg border border-amber-700/35 bg-amber-950/25 px-4 py-3 text-amber-100/90 text-[13.5px]',
      table: 'rounded-lg border border-zinc-800 bg-zinc-900/80 px-3.5 py-2.5 font-mono-tech text-xs text-zinc-300 overflow-x-auto',
      divider: 'border-zinc-800',
    },
  }[theme];

  return (
    <div className="mx-auto w-full max-w-[68ch] space-y-4 text-[14.5px] leading-[1.95] tracking-[0.015em]">
      {visibleBlocks.map((block, idx) => {
        if (block.type === 'divider') {
          return <hr key={idx} className={`my-4 ${palette.divider}`} />;
        }
        if (block.type === 'heading') {
          return (
            <h4 key={idx} className={`pt-2 ${palette.heading}`}>
              {block.text}
            </h4>
          );
        }
        if (block.type === 'callout') {
          return (
            <div key={idx} className={`whitespace-pre-line leading-[1.85] ${palette.callout}`}>
              {block.text}
            </div>
          );
        }
        if (block.type === 'table') {
          return (
            <pre key={idx} className={`whitespace-pre leading-[1.7] ${palette.table}`}>
              {block.text}
            </pre>
          );
        }
        return (
          <p key={idx} className={`whitespace-pre-line ${palette.body}`}>
            {block.text}
          </p>
        );
      })}

      {(hiddenCount > 0 || (expanded && hasCollapsePolicy && blocks.length > cutoff + 1)) && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium cursor-pointer transition ${
              theme === 'dark'
                ? 'border-zinc-700 bg-zinc-900 text-amber-300 hover:border-amber-500/60'
                : 'border-[#d6cebe] bg-[#faf8f3] text-[#16263f] hover:border-[#9e2a2b] hover:text-[#9e2a2b]'
            }`}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>收起详细考据长卷</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>展开完整原始卷宗（另有 {hiddenCount} 段田野详录）</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
