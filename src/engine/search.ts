import { stripInlineMarkdown } from '../components/EditorialProse';

/**
 * 归一化编号与紧凑检索串（忽略空格、连字符、井号、书名号等符号）
 * 例："QH-37-09" / "qh 3709" / "《QH-37-09》" -> "qh3709"
 */
export function normalizeCompactSearch(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s\-_—·.,，。:：;；!?！？"'“”‘’《》〈〉【】[\]()（）#/\\|+*`~]/g, '');
}

const CJK_STOP_CHARS = /[的了在有是和与及或把被让去到从向个位号篇卷条页里中上下呢吗吧啊呀]/g;

/**
 * 拆解用户输入的检索词：支持空格/顿号/逗号多词组合，并为自然语言长句生成双字词组回退
 */
export function parseSearchQuery(rawQuery: string): {
  raw: string;
  terms: string[];
  compactTerms: string[];
  cjkBigrams: string[];
} {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return { raw: '', terms: [], compactTerms: [], cjkBigrams: [] };
  }

  const terms = trimmed
    .toLowerCase()
    .split(/[\s,，、;；/+|]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const compactTerms = terms.map(normalizeCompactSearch).filter(Boolean);

  // 若用户输入一整句自然中文（如“盲傩戏年份”“陈默摄影机机身号”），提取去虚词后的双字词元用于智能容错召回
  const cleanedCjk = trimmed.replace(CJK_STOP_CHARS, '').replace(/[^\u4e00-\u9fff]/g, '');
  const cjkBigrams: string[] = [];
  if (cleanedCjk.length >= 4) {
    for (let i = 0; i < cleanedCjk.length - 1; i++) {
      const bg = cleanedCjk.slice(i, i + 2);
      if (!cjkBigrams.includes(bg)) {
        cjkBigrams.push(bg);
      }
    }
  }

  return { raw: trimmed, terms, compactTerms, cjkBigrams };
}

export interface SearchableDocFields {
  code?: string;
  title: string;
  subtitle?: string;
  tags?: string[];
  summary?: string;
  body?: string;
  /** 对隐藏残卷设为 false 时，仅允许编号/标题/关键词命中，不允许靠普通正文泛词误搜出 */
  allowBodyMatch?: boolean;
}

export interface SearchScoreResult {
  matched: boolean;
  score: number;
  bestTerm: string;
}

/**
 * 多字段加权精准相关性打分（编号 > 标题 > 标签/作者/关键词 > 摘要 > 正文）
 * 彻底修复旧版短词反向包含误报、连字符编号搜不到、多关键词空格组合搜不到等问题
 */
export function scoreSearchMatch(
  rawQuery: string,
  fields: SearchableDocFields
): SearchScoreResult {
  const parsed = parseSearchQuery(rawQuery);
  if (parsed.terms.length === 0) {
    return { matched: false, score: 0, bestTerm: '' };
  }

  const allowBody = fields.allowBodyMatch !== false;
  const codeLower = (fields.code || '').toLowerCase();
  const codeCompact = normalizeCompactSearch(fields.code || '');
  const titleLower = fields.title.toLowerCase();
  const titleCompact = normalizeCompactSearch(fields.title);
  const subLower = (fields.subtitle || '').toLowerCase();
  const tagsLower = (fields.tags || []).map((t) => t.toLowerCase());
  const tagsCompact = (fields.tags || []).map(normalizeCompactSearch);
  const summaryLower = (fields.summary || '').toLowerCase();
  const bodyLower = allowBody ? (fields.body || '').toLowerCase() : '';
  const bodyCompact = allowBody && parsed.compactTerms.some((c) => /^[a-z0-9]{3,}$/.test(c))
    ? normalizeCompactSearch(fields.body || '')
    : '';

  let totalScore = 0;
  let allTermsMatched = true;
  let bestTerm = parsed.terms[0] || '';

  for (let i = 0; i < parsed.terms.length; i++) {
    const term = parsed.terms[i];
    const compact = parsed.compactTerms[i] || term;
    let termScore = 0;

    // 1. 编号匹配（支持无连字符模糊输码，如 qh3709 / 3709 / 1203 / 40918）
    if (codeLower) {
      if (codeLower === term || (compact.length >= 2 && codeCompact === compact)) {
        termScore = Math.max(termScore, 180);
      } else if (
        codeLower.includes(term) ||
        (compact.length >= 2 && codeCompact.includes(compact))
      ) {
        termScore = Math.max(termScore, 125);
      }
    }

    // 2. 标题匹配
    if (titleLower.includes(term) || (compact.length >= 2 && titleCompact.includes(compact))) {
      termScore += 85;
      bestTerm = term;
    }

    // 3. 关键词 / 标签 / 作者 / 村名匹配（不再使用错误的短词反向包含）
    if (
      subLower.includes(term) ||
      tagsLower.some((tg) => tg.includes(term)) ||
      (compact.length >= 2 && tagsCompact.some((tc) => tc.includes(compact)))
    ) {
      termScore += 55;
      bestTerm = term;
    }

    // 4. 摘要与正文匹配
    if (allowBody && summaryLower.includes(term)) {
      termScore += 32;
      bestTerm = term;
    }
    if (
      allowBody &&
      (bodyLower.includes(term) || (bodyCompact && compact.length >= 3 && bodyCompact.includes(compact)))
    ) {
      termScore += 16;
      bestTerm = term;
    }

    if (termScore === 0) {
      allTermsMatched = false;
      break;
    }
    totalScore += termScore;
  }

  if (allTermsMatched && totalScore > 0) {
    return { matched: true, score: totalScore, bestTerm };
  }

  // 智能容错层：当玩家输入无空格自然中文短语（>=4汉字）未逐字精确连中时，按核心双字词元聚合召回
  if (parsed.terms.length === 1 && parsed.cjkBigrams.length >= 2) {
    const combinedHeader = `${titleLower} ${subLower} ${tagsLower.join(' ')} ${allowBody ? summaryLower : ''}`;
    const combinedAll = allowBody ? `${combinedHeader} ${bodyLower}` : combinedHeader;

    const matchedBigrams = parsed.cjkBigrams.filter((bg) => combinedAll.includes(bg));
    const headerMatchedBigrams = parsed.cjkBigrams.filter((bg) => combinedHeader.includes(bg));
    const ratio = matchedBigrams.length / parsed.cjkBigrams.length;

    if (matchedBigrams.length >= 2 && ratio >= 0.6) {
      const fallbackScore = headerMatchedBigrams.length * 22 + matchedBigrams.length * 9;
      return {
        matched: true,
        score: fallbackScore,
        bestTerm: headerMatchedBigrams[0] || matchedBigrams[0],
      };
    }
  }

  return { matched: false, score: 0, bestTerm: '' };
}

/**
 * 提取命中词前后的真实原文上下文摘要（自动剥离 Markdown 标记）
 */
export function extractSearchSnippet(
  bodyText: string | undefined,
  rawQuery: string,
  fallbackSummary: string,
  bestTermHint?: string,
  maxLen: number = 96
): string {
  const cleanFallback = stripInlineMarkdown(fallbackSummary || '');
  if (!bodyText) return cleanFallback;

  const cleanBody = stripInlineMarkdown(bodyText).replace(/\s+/g, ' ').trim();
  if (!cleanBody) return cleanFallback;

  const parsed = parseSearchQuery(rawQuery);
  const candidates = [
    ...(bestTermHint ? [bestTermHint] : []),
    ...parsed.terms,
    ...parsed.cjkBigrams,
  ].filter(Boolean);

  const lowerBody = cleanBody.toLowerCase();
  let hitIdx = -1;
  let hitLen = 0;

  for (const cand of candidates) {
    const idx = lowerBody.indexOf(cand.toLowerCase());
    if (idx !== -1) {
      hitIdx = idx;
      hitLen = cand.length;
      break;
    }
  }

  if (hitIdx === -1) {
    return cleanFallback || (cleanBody.length > maxLen ? `${cleanBody.slice(0, maxLen)}…` : cleanBody);
  }

  const half = Math.floor((maxLen - hitLen) / 2);
  const start = Math.max(0, hitIdx - half);
  const end = Math.min(cleanBody.length, start + maxLen);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < cleanBody.length ? '…' : '';
  return `${prefix}${cleanBody.slice(start, end)}${suffix}`;
}
