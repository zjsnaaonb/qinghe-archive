import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EditorialProseProps {
  text: string;
  theme?: 'paper' | 'dark' | 'gov' | 'journal';
  defaultCollapsedChars?: number; // 若超过该长度，可折叠长附注但保持前段干净易读
}

interface ParsedBlock {
  type: 'heading' | 'callout' | 'divider' | 'table' | 'paragraph';
  text: string;
}

/**
 * 将长篇纯文本档案自动排版为清晰、有呼吸感的分段阅读视图：
 * - 自动识别【小节标题】/ 校注批注 / 表格行 / 分割线
 * - 限制单行宽度 max-w-[66ch]，增加行距与段间距，消除“字海压迫感”
 */
export const EditorialProse: React.FC<EditorialProseProps> = ({
  text,
  theme = 'paper',
  defaultCollapsedChars,
}) => {
  const [expanded, setExpanded] = useState(!defaultCollapsedChars);

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
      if (/^【(编目员校注|审计|批注|按语|警告|求救|附注|备忘|绝密|系统提示)/.test(p)) {
        return { type: 'callout', text: p };
      }
      return { type: 'paragraph', text: p };
    });
  }, [text]);

  const shouldCollapse =
    Boolean(defaultCollapsedChars) && !expanded && text.length > (defaultCollapsedChars ?? 99999) && blocks.length > 4;
  const visibleBlocks = shouldCollapse ? blocks.slice(0, 4) : blocks;

  const palette = {
    paper: {
      body: 'text-stone-700',
      heading: 'text-[#1b2a4a] border-l-2 border-[#9e2a2b] pl-3 font-serif-cn font-bold text-[15px]',
      callout: 'rounded-lg border border-amber-800/20 bg-amber-50/75 px-4 py-3 text-stone-800 text-[13.5px]',
      table: 'rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 font-mono-tech text-xs text-stone-700 overflow-x-auto',
      divider: 'border-stone-200',
    },
    gov: {
      body: 'text-slate-800',
      heading: 'text-[#1b365d] border-l-2 border-[#9e2a2b] pl-3 font-serif-cn font-bold text-[15px]',
      callout: 'rounded border border-red-900/25 bg-red-50/60 px-4 py-3 text-slate-900 text-[13.5px]',
      table: 'rounded border border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono-tech text-xs text-slate-800 overflow-x-auto',
      divider: 'border-slate-300',
    },
    journal: {
      body: 'text-stone-700 font-serif-cn',
      heading: 'text-stone-900 font-serif-cn font-bold text-base tracking-wide',
      callout: 'rounded-lg border border-stone-300/80 bg-[#f3ede2] px-4 py-3 text-stone-800 text-[13.5px]',
      table: 'rounded border border-stone-300 bg-stone-100/70 px-3.5 py-2.5 font-mono-tech text-xs text-stone-700 overflow-x-auto',
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

      {defaultCollapsedChars && blocks.length > 4 && text.length > defaultCollapsedChars && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium cursor-pointer transition ${
            theme === 'dark'
              ? 'border-zinc-700 bg-zinc-900 text-amber-300 hover:border-amber-500/60'
              : 'border-stone-300 bg-white text-stone-700 hover:border-stone-500'
          }`}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              <span>收起后半段记录</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              <span>展开完整档案正文（余下 {blocks.length - 4} 段，建议细读附注）</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
