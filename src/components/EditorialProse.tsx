import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EditorialProseProps {
  text: string;
  theme?: 'paper' | 'dark' | 'gov' | 'journal';
  defaultCollapsedChars?: number;
  defaultVisibleBlocks?: number;
}

interface ParsedBlock {
  type: 'heading' | 'callout' | 'blockquote' | 'divider' | 'table' | 'paragraph';
  text: string;
}

/**
 * 清除搜索摘要或旧缓存中的原始 Markdown 星号与反引号（保留身份证号等连续脱敏 ****）
 */
export function stripInlineMarkdown(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/(^|\n)\s*\*\s+/g, '$1· ')
    .replace(/(^|\n)>\s?/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1');
}

/**
 * 将字符串中的 **加粗**、`行内编号/代码` 与行首 * 列表符渲染为干净排版，彻底消除裸露 * 号
 * （连续 3 个以上星号如身份证脱敏 3601021939******** 原样保留）
 */
export function renderInlineRichText(
  raw: string,
  theme: 'paper' | 'dark' | 'gov' | 'journal' = 'paper'
): React.ReactNode {
  if (!raw) return null;

  const normalized = raw
    .replace(/(^|\n)\s*\*\s+/g, '$1· ')
    .replace(/(^|\n)>\s?/g, '$1');

  const strongClass =
    theme === 'dark'
      ? 'font-semibold text-amber-100'
      : theme === 'gov'
      ? 'font-semibold text-slate-950'
      : 'font-semibold text-[#16263f]';

  const codeClass =
    theme === 'dark'
      ? 'mx-0.5 rounded bg-zinc-800 px-1.5 py-0.5 font-mono-tech text-[0.9em] text-amber-200'
      : 'mx-0.5 rounded border border-stone-200/90 bg-stone-100/90 px-1.5 py-0.2 font-mono-tech text-[0.9em] text-[#16263f]';

  const tokenRegex = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;
  const parts = normalized.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className={strongClass}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={idx} className={codeClass}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
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
      const cleanForHeadingCheck = stripInlineMarkdown(p);
      if (/^[-=—─]{4,}$/.test(p)) {
        return { type: 'divider', text: p };
      }
      if (p.includes('|') && p.split('\n').length >= 2) {
        return { type: 'table', text: stripInlineMarkdown(p) };
      }
      if (/^>\s/.test(p)) {
        return { type: 'blockquote', text: p };
      }
      if (
        /^【[^】]{2,32}】[：:]?$/.test(cleanForHeadingCheck) ||
        (/^[一二三四五六七八九十]+[、.]/.test(cleanForHeadingCheck) && cleanForHeadingCheck.length < 36)
      ) {
        return { type: 'heading', text: cleanForHeadingCheck };
      }
      if (/^【[^】]*(校注|审计|批注|按语|警告|求救|附注|备忘|绝密|系统提示|核校)/.test(cleanForHeadingCheck)) {
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
      blockquote: 'border-l-2 border-[#9e2a2b]/50 bg-[#faf7f0] pl-4 pr-3 py-2.5 font-serif-cn text-stone-700',
      table: 'rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 font-mono-tech text-xs text-stone-700 overflow-x-auto',
      divider: 'border-stone-200',
    },
    gov: {
      body: 'text-slate-800',
      heading: 'text-[#1b365d] border-l-2 border-[#9e2a2b] pl-3 font-serif-cn font-bold text-[15px]',
      callout: 'rounded-lg border border-red-900/25 bg-red-50/65 px-4 py-3 text-slate-900 text-[13.5px]',
      blockquote: 'border-l-2 border-[#1b365d]/50 bg-slate-50 pl-4 pr-3 py-2.5 font-serif-cn text-slate-800',
      table: 'rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono-tech text-xs text-slate-800 overflow-x-auto',
      divider: 'border-slate-200',
    },
    journal: {
      body: 'text-stone-700 font-serif-cn',
      heading: 'text-stone-900 font-serif-cn font-bold text-base tracking-wide',
      callout: 'rounded-lg border border-stone-300/80 bg-[#f3ede2] px-4 py-3 text-stone-800 text-[13.5px]',
      blockquote: 'border-l-2 border-amber-700/50 bg-[#f7f2e7] pl-4 pr-3 py-2.5 font-serif-cn text-stone-800',
      table: 'rounded-lg border border-stone-300 bg-stone-100/70 px-3.5 py-2.5 font-mono-tech text-xs text-stone-700 overflow-x-auto',
      divider: 'border-stone-300/70',
    },
    dark: {
      body: 'text-zinc-300',
      heading: 'text-amber-200 border-l-2 border-amber-500/70 pl-3 font-serif-cn font-bold text-[15px]',
      callout: 'rounded-lg border border-amber-700/35 bg-amber-950/25 px-4 py-3 text-amber-100/90 text-[13.5px]',
      blockquote: 'border-l-2 border-amber-500/50 bg-zinc-900/60 pl-4 pr-3 py-2.5 font-serif-cn text-zinc-300',
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
              {renderInlineRichText(block.text, theme)}
            </div>
          );
        }
        if (block.type === 'blockquote') {
          return (
            <blockquote key={idx} className={`whitespace-pre-line leading-[1.85] rounded-r-lg ${palette.blockquote}`}>
              {renderInlineRichText(block.text, theme)}
            </blockquote>
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
            {renderInlineRichText(block.text, theme)}
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
