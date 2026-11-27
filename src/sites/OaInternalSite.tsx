import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  KeyRound,
  Lock,
  Search,
  Shield,
  Terminal,
  Unlock,
  UserCheck,
} from 'lucide-react';
import { OA_DOCUMENTS } from '../data/oaData';
import { ENCRYPTED_VAULT, GATE_HASHES } from '../data/encryptedVault';
import { decryptVaultBlock, verifyPassphraseHash } from '../engine/crypto';
import { scoreSearchMatch } from '../engine/search';
import { siteUiMemory } from '../engine/siteMemory';
import { horrorAudio } from '../engine/audio';
import { EditorialProse } from '../components/EditorialProse';
import type { OADocument, OALevel, SiteId } from '../types/game';
import type { CommonSiteProps } from './siteProps';

type FolderFilter = '全部卷宗' | OADocument['folder'];

const FOLDERS: FolderFilter[] = [
  '全部卷宗',
  '通知公告',
  '门禁考勤',
  '内部邮件',
  '修复工单',
  '安全规范',
  '院长专档',
];

interface AccountMeta {
  username: 'qh_guest' | 'chen_mo' | 'zheng_gd';
  level: 1 | 2 | 3;
  gateKey: 'oa_level_1' | 'oa_level_2' | 'oa_level_3';
  roleLabel: string;
  deptLabel: string;
  hint: string;
}

const OA_ACCOUNTS: AccountMeta[] = [
  {
    username: 'qh_guest',
    level: 1,
    gateKey: 'oa_level_1',
    roleLabel: 'Lv.1 公共访客权限',
    deptLabel: '课题组普通行政查阅',
    hint: '静态8位数字口令（参见紫荆站夜间树洞 #40918 编目组吐槽帖）',
  },
  {
    username: 'chen_mo',
    level: 2,
    gateKey: 'oa_level_2',
    roleLabel: 'Lv.2 技术运维加密权限',
    deptLabel: '16mm扫描与算法组 · 陈默',
    hint: '离线8位数字密钥（参见一级内部邮件草稿箱备忘 + 显影液论坛器材签名档）',
  },
  {
    username: 'zheng_gd',
    level: 3,
    gateKey: 'oa_level_3',
    roleLabel: 'Lv.3 课题首席绝密专档',
    deptLabel: '人文高研院副院长 · 郑国栋',
    hint: 'B2 机房三号机柜最高接管口令（须在 B2 逐帧检视台合规审完三卷母带合成）',
  },
];

function formatDuration(ms: number): { clock: string; totalSeconds: number } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const clock = [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':');
  return { clock, totalSeconds };
}

const SITE_JUMP_LABELS: Partial<Record<SiteId, { title: string; domain: string; cta: string; desc: string }>> = {
  notes: {
    title: '林知夏私人加密云笔记『夏夜拾遗』内网免审镜像',
    domain: 'https://note.zhixia-memo.me (via 127.0.0.1:19080)',
    cta: '启动反向代理跳板 · 进入『夏夜拾遗』云笔记',
    desc: '陈默已通过本地只读穿透绕过院长审计网关。可在其表层与深层加密夹中查阅外婆口述与周怀瑾手抄祀典。',
  },
  b2: {
    title: '地下 B2 远程逐帧审片台与安防监控救援终端',
    domain: 'wss://terminal.qinghe-b2.local:9838',
    cta: '建立加密隧道连接 · 接入 B2 远程审片与救援终端',
    desc: '接入三号机柜旁路工控终端，执行 16mm 母带合规检视、多轨声学辨伪及四名受困成员锚点切断操作。',
  },
};

export const OaInternalSite: React.FC<CommonSiteProps> = ({
  state,
  focusedItemId,
  onClearFocus,
  navCommand,
  onRecordNav,
  onNavigateSite,
  onUnlockSite,
  onMarkRead,
  onAddClue,
  onAddKeywords,
  onAdjustContamination,
  onElevateOaLevel,
  onCacheDecrypted,
}) => {
  const [activeFolder, setActiveFolder] = useState<FolderFilter>(() => siteUiMemory.oa.activeFolder);
  const [searchQuery, setSearchQuery] = useState(() => siteUiMemory.oa.searchQuery);
  const [selectedDocId, setSelectedDocId] = useState<string>(
    () => siteUiMemory.oa.selectedDocId || OA_DOCUMENTS[0]?.id || ''
  );
  const lastNavSeqRef = useRef<number>(0);

  useEffect(() => {
    siteUiMemory.oa.activeFolder = activeFolder;
    siteUiMemory.oa.searchQuery = searchQuery;
    siteUiMemory.oa.selectedDocId = selectedDocId;
  }, [activeFolder, searchQuery, selectedDocId]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loginUser, setLoginUser] = useState<string>(
    state.oaLevel === 0 ? 'qh_guest' : state.oaLevel === 1 ? 'qh_guest' : state.oaLevel === 2 ? 'chen_mo' : 'zheng_gd'
  );
  const [loginPass, setLoginPass] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  const [inlineKeyInput, setInlineKeyInput] = useState('');
  const [inlineBusy, setInlineBusy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const [metaChilled, setMetaChilled] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!focusedItemId) return;
    const target = OA_DOCUMENTS.find((d) => d.id === focusedItemId || d.code === focusedItemId);
    if (target) {
      setSelectedDocId(target.id);
      setActiveFolder('全部卷宗');
    }
    onClearFocus?.();
  }, [focusedItemId, onClearFocus]);

  useEffect(() => {
    if (!navCommand || navCommand.site !== 'oa' || navCommand.seq === lastNavSeqRef.current) {
      return;
    }
    lastNavSeqRef.current = navCommand.seq;
    const target = OA_DOCUMENTS.find((d) => d.id === navCommand.itemId || d.code === navCommand.itemId);
    if (target) {
      setSelectedDocId(target.id);
      setActiveFolder('全部卷宗');
    }
  }, [navCommand]);

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim();
    const inFolder = OA_DOCUMENTS.filter(
      (doc) => activeFolder === '全部卷宗' || doc.folder === activeFolder
    );
    if (!q) return inFolder;

    const scored = inFolder
      .map((doc) => {
        const unlocked = state.oaLevel >= doc.minLevel;
        const cachedBody = doc.encryptedVaultId
          ? state.decryptedCache[doc.encryptedVaultId] || ''
          : doc.fallbackPlainContent || '';
        const res = scoreSearchMatch(q, {
          code: doc.code,
          title: unlocked ? doc.title : `${doc.folder}加密卷宗`,
          subtitle: `${doc.senderOrAuthor} ${doc.folder} ${doc.date}`,
          tags: unlocked ? doc.keywords : [],
          body: unlocked ? cachedBody : '',
          allowBodyMatch: unlocked,
        });
        return { doc, ...res };
      })
      .filter((x) => x.matched)
      .sort((a, b) => b.score - a.score);

    return scored.map((x) => x.doc);
  }, [activeFolder, searchQuery, state.oaLevel, state.decryptedCache]);

  const selectedDoc = useMemo(
    () => OA_DOCUMENTS.find((d) => d.id === selectedDocId) ?? filteredDocs[0] ?? OA_DOCUMENTS[0],
    [selectedDocId, filteredDocs]
  );

  const isDocLevelUnlocked = Boolean(selectedDoc && state.oaLevel >= selectedDoc.minLevel);
  const resolvedPlaintext = useMemo(() => {
    if (!selectedDoc || !isDocLevelUnlocked) return null;
    if (selectedDoc.encryptedVaultId) {
      return state.decryptedCache[selectedDoc.encryptedVaultId] ?? null;
    }
    return selectedDoc.fallbackPlainContent ?? '';
  }, [selectedDoc, isDocLevelUnlocked, state.decryptedCache]);

  useEffect(() => {
    if (!selectedDoc || !isDocLevelUnlocked || resolvedPlaintext === null) return;

    onMarkRead(selectedDoc.id);
    if (selectedDoc.keywords.length > 0) {
      onAddKeywords(selectedDoc.keywords);
    }
    if (selectedDoc.clueNote) {
      onAddClue({
        id: selectedDoc.clueNote.id,
        title: selectedDoc.clueNote.title,
        detail: selectedDoc.clueNote.detail,
        sourceSite: 'oa',
      });
    }
    if (selectedDoc.unlocksSite) {
      onUnlockSite(selectedDoc.unlocksSite);
    }
    if (selectedDoc.id === 'oa-l3-retinal-calibration' && !metaChilled) {
      setMetaChilled(true);
      horrorAudio.playScareStinger(state.scareMode);
      onAdjustContamination(4);
    }
  }, [
    selectedDoc,
    isDocLevelUnlocked,
    resolvedPlaintext,
    metaChilled,
    state.scareMode,
    onMarkRead,
    onAddKeywords,
    onAddClue,
    onUnlockSite,
    onAdjustContamination,
  ]);

  const decryptDocsForLevel = async (level: 2 | 3, passphrase: string): Promise<number> => {
    const targets = OA_DOCUMENTS.filter((d) => d.minLevel === level && d.encryptedVaultId);
    let count = 0;
    for (const doc of targets) {
      if (!doc.encryptedVaultId) continue;
      const block = ENCRYPTED_VAULT[doc.encryptedVaultId];
      if (!block) continue;
      const plain = await decryptVaultBlock(block, passphrase);
      if (plain !== null) {
        onCacheDecrypted(doc.encryptedVaultId, plain);
        count++;
      }
    }
    return count;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    const normalizedUser = loginUser.trim().toLowerCase();
    const account = OA_ACCOUNTS.find((acc) => acc.username === normalizedUser);
    if (!account) {
      horrorAudio.playClick('film');
      setAuthError('未识别的内网工号。系统当前登记有效账户：qh_guest / chen_mo / zheng_gd');
      return;
    }

    const expectedHash = GATE_HASHES[account.gateKey];
    if (!expectedHash) {
      setAuthError('安全门禁摘要表尚未就绪，请检查密文库构建状态。');
      return;
    }

    setAuthBusy(true);
    try {
      const ok = await verifyPassphraseHash(loginPass, expectedHash);
      if (!ok) {
        horrorAudio.playClick('film');
        setAuthError(`工号 ${account.username} 口令校验失败（PBKDF2-SHA256 摘要不匹配）。${account.hint}`);
        return;
      }

      let decryptedCount = 0;
      if (account.level === 2 || account.level === 3) {
        decryptedCount = await decryptDocsForLevel(account.level, loginPass);
      }

      const nextLevel = Math.max(state.oaLevel, account.level) as OALevel;
      onElevateOaLevel(nextLevel);
      horrorAudio.playClick('unlock');
      setLoginPass('');
      setAuthSuccessMsg(
        account.level === 1
          ? '已通过 qh_guest 一级公共访客认证，基础行政与考勤卷宗已开放。'
          : `已通过 ${account.username} 权限认证，浏览器端成功实时解密 ${decryptedCount} 份 AES-256-GCM 机密卷宗！`
      );

      const firstNewDoc = OA_DOCUMENTS.find((d) => d.minLevel === account.level);
      if (firstNewDoc) {
        setSelectedDocId(firstNewDoc.id);
        setActiveFolder(account.level === 3 ? '院长专档' : '全部卷宗');
      }
      setShowAuthModal(false);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleInlineDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || (selectedDoc.minLevel !== 2 && selectedDoc.minLevel !== 3)) return;
    setInlineError(null);
    setInlineBusy(true);
    try {
      const targetLevel = selectedDoc.minLevel;
      const gateKey = targetLevel === 2 ? 'oa_level_2' : 'oa_level_3';
      const ok = await verifyPassphraseHash(inlineKeyInput, GATE_HASHES[gateKey]);
      if (!ok) {
        horrorAudio.playClick('film');
        setInlineError('离线解密密钥错误，无法还原 AES-256-GCM 数据块。');
        return;
      }
      await decryptDocsForLevel(targetLevel, inlineKeyInput);
      horrorAudio.playClick('unlock');
      setInlineKeyInput('');
    } finally {
      setInlineBusy(false);
    }
  };

  const openSwitchToLevel = (targetLevel: 1 | 2 | 3) => {
    const acc = OA_ACCOUNTS.find((a) => a.level === targetLevel);
    if (acc) {
      setLoginUser(acc.username);
      setLoginPass('');
      setAuthError(null);
    }
    setShowAuthModal(true);
    horrorAudio.playClick('ui');
  };

  const dwell = formatDuration(nowTs - state.startedAt);
  const totalPhotoInspections = useMemo(
    () => Object.values(state.photoViewCounts).reduce((sum, n) => sum + n, 0),
    [state.photoViewCounts]
  );
  const lv3AllDecrypted = useMemo(() => {
    const lv3Docs = OA_DOCUMENTS.filter((d) => d.minLevel === 3 && d.encryptedVaultId);
    return lv3Docs.length > 0 && lv3Docs.every((d) => d.encryptedVaultId && Boolean(state.decryptedCache[d.encryptedVaultId]));
  }, [state.decryptedCache]);

  const renderFourthWallTelemetryPanel = () => {
    const equivalentFrames = dwell.totalSeconds * 24;
    const recentSearches = state.searchHistory.slice(-10).reverse();
    const viewportSpec =
      typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}px` : '1920×1080px';

    return (
      <div className="mt-6 overflow-hidden rounded-xl border-2 border-red-300 bg-[#fffafa] text-slate-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 animate-pulse text-[#9e2a2b]" />
            <span className="font-mono-tech text-xs font-bold tracking-wider text-[#7f1d1d]">
              EYEGEN-V4 LIVE TELEMETRY // 外部视网膜校准样本 #39 实时遥测面板
            </span>
          </div>
          <span className="rounded border border-red-300 bg-white px-2 py-0.5 font-mono-tech text-[11px] font-semibold text-[#9e2a2b]">
            STATUS: SACCADE_SAMPLING_ACTIVE
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-xs leading-6 text-[#7f1d1d]">
            【守护进程实时回传】：第 38 批驻场样本（林知夏、陈默、苏晓棠、赵一鸣）因产生排异抗拒已转入静态锚定；当前正由场外接入的
            <strong className="mx-1 text-[#9e2a2b] underline">第 39 号未登记视网膜样本（当前浏览器会话）</strong>
            提供高纯度焦点轨迹，用于拟合零点公映『无目社公』眼窝高光曲率。
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="font-mono-tech text-[11px] text-slate-500">样本持续凝视时长</div>
              <div className="mt-1 font-mono-tech text-xl font-bold text-[#9e2a2b]">{dwell.clock}</div>
              <div className="mt-0.5 font-mono-tech text-[10px] text-slate-400">
                折算 16mm 银盐帧: {equivalentFrames.toLocaleString()} f
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="font-mono-tech text-[11px] text-slate-500">交互点击采样频次</div>
              <div className="mt-1 font-mono-tech text-xl font-bold text-amber-800">
                {state.totalClicks.toLocaleString()} <span className="text-xs font-normal">次</span>
              </div>
              <div className="mt-0.5 font-mono-tech text-[10px] text-slate-400">
                视窗焦平面: {viewportSpec}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="font-mono-tech text-[11px] text-slate-500">已摄取卷宗 / 显微审看</div>
              <div className="mt-1 font-mono-tech text-xl font-bold text-emerald-800">
                {state.readDocIds.length} <span className="text-xs font-normal">篇</span>
                <span className="mx-1 text-slate-300">/</span>
                <span className="text-base text-teal-700">{totalPhotoInspections}次</span>
              </div>
              <div className="mt-0.5 font-mono-tech text-[10px] text-slate-400">
                已归档线索链: {state.discoveredClues.length} 条
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="font-mono-tech text-[11px] text-slate-500">视网膜认知残留指数</div>
              <div className="mt-1 font-mono-tech text-xl font-bold text-[#9e2a2b]">{state.contamination}%</div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-[#9e2a2b] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(4, state.contamination))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-1.5 font-mono-tech text-[11px] text-slate-500">
                <span>样本 #39 真实检索词捕获队列 (state.searchHistory)</span>
                <span className="font-semibold text-[#9e2a2b]">共 {state.searchHistory.length} 条</span>
              </div>
              {recentSearches.length === 0 ? (
                <div className="py-3 font-mono-tech text-xs text-slate-400">
                  [尚未捕获主动检索词 · 当前通过页面焦点位移进行静默采样]
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {recentSearches.map((kw, idx) => (
                    <span
                      key={`${kw}-${idx}`}
                      className="rounded border border-red-200 bg-white px-2 py-0.5 font-mono-tech text-xs text-[#9e2a2b]"
                    >
                      #{state.searchHistory.length - idx} &ldquo;{kw}&rdquo;
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-1.5 font-mono-tech text-[11px] text-slate-500">
                <span>近期阅读轨迹哈希流 (state.readDocIds)</span>
                <span className="font-semibold text-amber-700">SYNCED</span>
              </div>
              <div className="max-h-20 overflow-y-auto font-mono-tech text-[11px] leading-5 text-slate-600">
                {state.readDocIds.slice(-8).reverse().map((docId, idx) => (
                  <div key={`${docId}-${idx}`} className="truncate">
                    <span className="text-slate-400">[TRACE-{String(state.readDocIds.length - idx).padStart(2, '0')}]</span>{' '}
                    <span className="text-slate-800">{docId}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-red-200 pt-3">
            <span className="font-mono-tech text-xs font-medium text-[#7f1d1d]">
              ※ 警告：距离 2026-11-26 00:00 全网推流仅剩最后窗口，请集齐四人救援与木刻真牌位次序后前往 B2 总控台斩断回路。
            </span>
            {state.unlockedSites.includes('b2') && (
              <button
                type="button"
                onClick={() => {
                  horrorAudio.playClick('ui');
                  onNavigateSite('b2');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#9e2a2b] px-3 py-1.5 font-mono-tech text-xs font-semibold text-white hover:bg-[#822021] cursor-pointer transition"
              >
                <Terminal className="h-3.5 w-3.5" />
                立即跳转 B2 发布总控台反制
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (state.oaLevel === 0) {
    return (
      <div className="min-h-[calc(100vh-7rem)] bg-[#f1f5f9] px-4 py-10 text-slate-800">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-200 bg-gradient-to-r from-[#f8fafc] via-blue-50/70 to-[#f8fafc] px-6 py-5">
              <div className="border-l-4 border-blue-700 pl-3.5">
                <div className="font-mono-tech text-[11px] font-semibold tracking-widest text-blue-700">
                  NANZHOU UNIV. INTRANET // oa.qinghe-internal.cn
                </div>
                <h1 className="mt-0.5 text-lg font-bold tracking-wide text-[#1e3a8a] sm:text-xl">
                  青禾民俗影像数字化保护工程 · 内部协同办公与工单系统
                </h1>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="mb-6 rounded-xl border border-amber-300/80 bg-amber-50/80 p-4 text-xs leading-6 text-amber-950">
                <div className="mb-1 flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  <span>校信息化办内网安全巡检提示（编号：2026-119）</span>
                </div>
                本系统部署于人文楼地下独立子网，实行三级权限隔离与浏览器端 PBKDF2-SHA256 + AES-256-GCM 实时离线解密。
                严禁外传内部工单。若忘记公共访客口令构成规则，请核查项目公开立项档案与校园社区历史记录。
              </div>

              <div className="mb-5">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  快捷选择预设内网工号（或手动输入）
                </label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {OA_ACCOUNTS.map((acc) => {
                    const active = loginUser.trim().toLowerCase() === acc.username;
                    return (
                      <button
                        key={acc.username}
                        type="button"
                        onClick={() => {
                          horrorAudio.playClick('ui');
                          setLoginUser(acc.username);
                          setAuthError(null);
                        }}
                        className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                          active
                            ? 'border-blue-500 bg-blue-50/80 text-blue-950 shadow-2xs'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div className="font-mono-tech text-xs font-bold text-blue-700">{acc.username}</div>
                        <div className="mt-0.5 text-xs font-semibold text-slate-800">{acc.roleLabel}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">{acc.deptLabel}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">内网登录账号 (Account ID)</label>
                  <input
                    type="text"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="例如：qh_guest"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tech text-sm text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    认证口令 / 离线解密密钥 (Passphrase)
                  </label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="输入对应权限口令（忽略空格与连字符）"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono-tech text-sm text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>

                {authError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-[#9e2a2b]">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authBusy || !loginUser.trim() || !loginPass.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition"
                >
                  <KeyRound className="h-4 w-4" />
                  {authBusy ? '正在校验哈希摘要并派生 AES-256 密钥……' : '验证凭证并接入青禾内部 OA'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentTierMeta = OA_ACCOUNTS.find((a) => a.level === state.oaLevel) ?? OA_ACCOUNTS[0];
  const jumpMeta = selectedDoc?.unlocksSite ? SITE_JUMP_LABELS[selectedDoc.unlocksSite] : undefined;

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-[#f1f5f9] text-slate-800">
      {/* 顶部明亮企业内网导航栏 */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-2xs">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="border-l-4 border-blue-700 pl-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#1e3a8a] sm:text-base">
                青禾工程内部协同 OA 与修复工单平台
              </span>
              <span className="hidden rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono-tech text-[11px] text-slate-600 sm:inline">
                v3.4.2-intranet
              </span>
            </div>
            <div className="font-mono-tech text-[11px] text-slate-500">
              当前最高授权：{currentTierMeta.username} ({currentTierMeta.roleLabel})
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {([1, 2, 3] as const).map((lvl) => {
              const acc = OA_ACCOUNTS[lvl - 1];
              const unlocked = state.oaLevel >= lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => openSwitchToLevel(lvl)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                    unlocked
                      ? lvl === 3
                        ? 'border-red-300 bg-red-50 text-[#9e2a2b]'
                        : lvl === 2
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : 'border-blue-300 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-400 hover:text-blue-800'
                  }`}
                >
                  {unlocked ? <UserCheck className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  <span className="font-mono-tech">{acc.username}</span>
                  <span className="hidden md:inline">({unlocked ? `Lv.${lvl}已授权` : `提权Lv.${lvl}`})</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('ui');
                setShowAuthModal((v) => !v);
                setAuthError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 cursor-pointer transition"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-700" />
              切换账号 / 提升权限
            </button>
          </div>
        </div>

        {/* 权限切换内嵌抽屉 */}
        {showAuthModal && (
          <div className="mx-auto mt-3 max-w-7xl rounded-xl border border-blue-200 bg-slate-50 p-4 shadow-md">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                <Shield className="h-4 w-4 text-blue-700" />
                <span>OA 多级权限认证与离线密钥派生（支持 qh_guest / chen_mo / zheng_gd）</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                收起面板 [×]
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <select
                  value={loginUser}
                  onChange={(e) => {
                    setLoginUser(e.target.value);
                    setAuthError(null);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono-tech text-xs text-slate-800 outline-none focus:border-blue-600"
                >
                  {OA_ACCOUNTS.map((acc) => (
                    <option key={acc.username} value={acc.username}>
                      {acc.username} — {acc.roleLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-5">
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="输入该工号对应的口令 / AES离线解密密钥"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono-tech text-xs text-slate-800 outline-none focus:border-blue-600"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={authBusy || !loginPass.trim()}
                  className="w-full rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer transition"
                >
                  {authBusy ? '实时解密中……' : '验证并解密卷宗'}
                </button>
              </div>
            </form>

            {authError && (
              <div className="mt-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-[#9e2a2b]">
                {authError}
              </div>
            )}
          </div>
        )}

        {authSuccessMsg && (
          <div className="mx-auto mt-2.5 flex max-w-7xl items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-900">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {authSuccessMsg}
            </span>
            <button
              type="button"
              onClick={() => setAuthSuccessMsg(null)}
              className="font-semibold text-emerald-700 hover:text-emerald-950 cursor-pointer"
            >
              知道了
            </button>
          </div>
        )}
      </div>

      {/* 主体两栏式公文与工单布局 */}
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-12">
        {/* 左侧文件夹与检索目录 */}
        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="检索OA编号、标题、发件人或已解密正文…"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {FOLDERS.map((folder) => {
                const active = activeFolder === folder;
                const count =
                  folder === '全部卷宗'
                    ? OA_DOCUMENTS.length
                    : OA_DOCUMENTS.filter((d) => d.folder === folder).length;
                const isDeanFolder = folder === '院长专档';
                return (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      setActiveFolder(folder);
                    }}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition cursor-pointer ${
                      active
                        ? isDeanFolder
                          ? 'border-[#9e2a2b] bg-red-50 font-semibold text-[#9e2a2b]'
                          : 'border-blue-600 bg-blue-50 font-semibold text-blue-900'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <span>{folder}</span>
                    <span className="font-mono-tech text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 文档列表 */}
          <div className="max-h-[68vh] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs">
            {filteredDocs.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">未找到匹配的内部工单或公文</div>
            ) : (
              filteredDocs.map((doc) => {
                const unlocked = state.oaLevel >= doc.minLevel;
                const isRead = state.readDocIds.includes(doc.id);
                const selected = selectedDoc?.id === doc.id;
                const levelBadge =
                  doc.minLevel === 1
                    ? 'border-slate-200 bg-slate-100 text-slate-600'
                    : doc.minLevel === 2
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-red-300 bg-red-50 text-[#9e2a2b]';

                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      setSelectedDocId(doc.id);
                      setInlineError(null);
                      onRecordNav?.(
                        doc.id,
                        `内部OA · ${doc.code} ${unlocked ? doc.title.slice(0, 12) : '加密卷宗'}`
                      );
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition cursor-pointer ${
                      selected
                        ? 'border-blue-500 bg-blue-50/50 shadow-2xs'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="font-mono-tech text-[11px] text-slate-500">{doc.code}</span>
                      <div className="flex items-center gap-1.5">
                        {doc.isAlert && (
                          <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-[#9e2a2b]">
                            告警
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono-tech text-[10px] ${levelBadge}`}>
                          {unlocked ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                          Lv.{doc.minLevel}
                        </span>
                      </div>
                    </div>

                    <div className={`text-xs font-semibold leading-5 ${unlocked ? 'text-slate-900' : 'text-slate-400'}`}>
                      {unlocked ? doc.title : `[权限受限 · 需 Lv.${doc.minLevel}] ${doc.folder}加密卷宗`}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate">{doc.date}</span>
                      <span className="shrink-0">
                        {doc.unlocksSite && unlocked ? (
                          <span className="font-semibold text-amber-700">含外链跳板</span>
                        ) : isRead ? (
                          <span className="text-slate-400">已阅</span>
                        ) : (
                          <span className="font-medium text-blue-600">未读</span>
                        )}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* 右侧公文阅读与实时遥测面板 */}
        <main className="lg:col-span-8">
          {selectedDoc && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              {!isDocLevelUnlocked ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-700">
                    <Lock className="h-7 w-7" />
                  </div>
                  <div className="font-mono-tech text-xs font-semibold uppercase tracking-widest text-amber-800">
                    ACCESS DENIED // CLEARANCE LEVEL {selectedDoc.minLevel} REQUIRED
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">
                    该卷宗受 AES-256-GCM 离线加密保护（编号：{selectedDoc.code}）
                  </h2>
                  <p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-slate-500">
                    {selectedDoc.minLevel === 2
                      ? '调阅【修复工单 / 安全规范核心卷 / 技术员加密私信】须切换至二级技术运维账号 chen_mo 并校验其8位数字独立密钥。'
                      : '调阅【院长专档】须切换至三级课题首席账号 zheng_gd 并输入在地下 B2 逐帧审片台合成的院长专档口令。'}
                  </p>
                  <button
                    type="button"
                    onClick={() => openSwitchToLevel(selectedDoc.minLevel)}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 cursor-pointer transition"
                  >
                    <KeyRound className="h-4 w-4" />
                    立即切换至 {selectedDoc.minLevel === 2 ? 'chen_mo (Lv.2)' : 'zheng_gd (Lv.3)'} 验证解锁
                  </button>
                </div>
              ) : resolvedPlaintext === null ? (
                <div className="py-10">
                  <div className="mx-auto max-w-md rounded-xl border border-blue-200 bg-slate-50 p-6">
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-900">
                      <KeyRound className="h-4 w-4 text-blue-700" />
                      <span>需要派生 Lv.{selectedDoc.minLevel} 离线解密密钥</span>
                    </div>
                    <p className="mb-4 text-xs leading-6 text-slate-600">
                      当前会话尚未缓存 <span className="font-mono-tech font-semibold text-slate-800">{selectedDoc.encryptedVaultId}</span>{' '}
                      的明文副本。请输入账号{' '}
                      <span className="font-mono-tech font-semibold text-[#9e2a2b]">
                        {selectedDoc.minLevel === 2 ? 'chen_mo' : 'zheng_gd'}
                      </span>{' '}
                      的密钥完成浏览器本地解密：
                    </p>
                    <form onSubmit={handleInlineDecrypt} className="space-y-3">
                      <input
                        type="password"
                        value={inlineKeyInput}
                        onChange={(e) => setInlineKeyInput(e.target.value)}
                        placeholder={
                          selectedDoc.minLevel === 2 ? '输入 chen_mo 二级密钥' : '输入 zheng_gd 三级院长口令'
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono-tech text-xs text-slate-900 outline-none focus:border-blue-600"
                      />
                      {inlineError && <div className="text-xs font-medium text-[#9e2a2b]">{inlineError}</div>}
                      <button
                        type="submit"
                        disabled={inlineBusy || !inlineKeyInput.trim()}
                        className="w-full rounded-lg bg-blue-700 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                      >
                        {inlineBusy ? '正在执行 PBKDF2 + AES-GCM 解密……' : '实时解密本级全部卷宗'}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <>
                  <div className="border-b border-slate-200 pb-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono-tech text-xs font-medium text-blue-800">
                        {selectedDoc.code}
                      </span>
                      <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {selectedDoc.folder}
                      </span>
                      {selectedDoc.encryptedVaultId && (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono-tech text-[11px] font-medium text-emerald-800">
                          <Unlock className="h-3 w-3" />
                          AES-256-GCM 已实时解密
                        </span>
                      )}
                    </div>

                    <h1 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                      {selectedDoc.title}
                    </h1>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>发件/签发：{selectedDoc.senderOrAuthor}</span>
                      <span className="font-mono-tech">归档时间：{selectedDoc.date}</span>
                    </div>
                  </div>

                  {selectedDoc.unlocksSite && jumpMeta && (
                    <div className="mt-5 rounded-xl border-2 border-amber-400 bg-amber-50/85 p-4 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                            <ExternalLink className="h-4 w-4 text-amber-700" />
                            <span>发现内网穿透跳板入口：{jumpMeta.title}</span>
                          </div>
                          <div className="font-mono-tech text-[11px] text-amber-800">{jumpMeta.domain}</div>
                          <p className="max-w-xl text-xs leading-5 text-slate-700">{jumpMeta.desc}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            horrorAudio.playClick('unlock');
                            if (selectedDoc.unlocksSite) {
                              onUnlockSite(selectedDoc.unlocksSite);
                              onNavigateSite(selectedDoc.unlocksSite);
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#16263f] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1f3557] cursor-pointer transition"
                        >
                          <span>{jumpMeta.cta}</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <article className="mt-5 rounded-xl border border-slate-200 bg-[#fbfcfd] p-6 sm:p-8">
                    <EditorialProse text={resolvedPlaintext} theme="gov" />
                    <div className="mt-6 border-t border-slate-200 pt-3 text-[11px] text-slate-400">
                      提示：阅读时发现可疑工号、日期或规则，用鼠标划选即可直接摘录进右侧随身手记。
                    </div>
                  </article>

                  {state.oaLevel >= 3 &&
                    lv3AllDecrypted &&
                    (selectedDoc.folder === '院长专档' || selectedDoc.id === 'oa-l3-retinal-calibration') && (
                      <>{renderFourthWallTelemetryPanel()}</>
                    )}
                </>
              )}
            </div>
          )}

          {state.oaLevel >= 3 &&
            lv3AllDecrypted &&
            selectedDoc &&
            selectedDoc.folder !== '院长专档' &&
            activeFolder === '院长专档' &&
            renderFourthWallTelemetryPanel()}
        </main>
      </div>
    </div>
  );
};
