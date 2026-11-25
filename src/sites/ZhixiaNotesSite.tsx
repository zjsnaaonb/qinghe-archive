import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  CloudRain,
  Feather,
  FileText,
  KeyRound,
  Lock,
  Search,
  Sparkles,
  Terminal,
  Unlock,
} from 'lucide-react';
import { ZHIXIA_NOTES } from '../data/zhixiaNotesData';
import { ENCRYPTED_VAULT, GATE_HASHES } from '../data/encryptedVault';
import { decryptVaultBlock, verifyPassphraseHash } from '../engine/crypto';
import { horrorAudio } from '../engine/audio';
import type { CommonSiteProps } from './siteProps';

type FolderTab = 'surface' | 'deep';

export const ZhixiaNotesSite: React.FC<CommonSiteProps> = ({
  state,
  focusedItemId,
  onClearFocus,
  onNavigateSite,
  onMarkRead,
  onAddClue,
  onAddKeywords,
  onUnlockZhixiaDeep,
  onCacheDecrypted,
}) => {
  const surfaceNotes = useMemo(() => ZHIXIA_NOTES.filter((n) => !n.requiresDeepUnlock), []);
  const deepNotes = useMemo(() => ZHIXIA_NOTES.filter((n) => n.requiresDeepUnlock === true), []);

  const [activeTab, setActiveTab] = useState<FolderTab>('surface');
  const [selectedNoteId, setSelectedNoteId] = useState<string>(surfaceNotes[0]?.id ?? ZHIXIA_NOTES[0]?.id ?? '');
  const [searchQuery, setSearchQuery] = useState('');

  // 深层密保验证状态
  const [passInput, setPassInput] = useState('');
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [justUnlockedBanner, setJustUnlockedBanner] = useState(false);

  // 跨站点检索跳转聚焦
  useEffect(() => {
    if (!focusedItemId) return;
    const target = ZHIXIA_NOTES.find((n) => n.id === focusedItemId);
    if (target) {
      setActiveTab(target.requiresDeepUnlock ? 'deep' : 'surface');
      setSelectedNoteId(target.id);
    }
    onClearFocus?.();
  }, [focusedItemId, onClearFocus]);

  const deepAllCached = useMemo(
    () =>
      deepNotes.length > 0 &&
      deepNotes.every((n) => n.encryptedVaultId && Boolean(state.decryptedCache[n.encryptedVaultId])),
    [deepNotes, state.decryptedCache]
  );

  const isDeepAccessible = state.zhixiaDeepUnlocked && deepAllCached;

  const visibleList = useMemo(() => {
    const base = activeTab === 'surface' ? surfaceNotes : deepNotes;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((note) => {
      const canRead = !note.requiresDeepUnlock || isDeepAccessible;
      const body = note.requiresDeepUnlock
        ? (note.encryptedVaultId ? state.decryptedCache[note.encryptedVaultId] || '' : '')
        : note.plainContent || '';
      const hay = [
        note.date,
        note.title,
        note.weather,
        ...(canRead ? note.keywords : []),
        canRead ? body : '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [activeTab, surfaceNotes, deepNotes, searchQuery, isDeepAccessible, state.decryptedCache]);

  const selectedNote = useMemo(() => {
    const found = ZHIXIA_NOTES.find((n) => n.id === selectedNoteId);
    if (found && Boolean(found.requiresDeepUnlock) === (activeTab === 'deep')) {
      return found;
    }
    return visibleList[0] ?? (activeTab === 'surface' ? surfaceNotes[0] : deepNotes[0]);
  }, [selectedNoteId, activeTab, visibleList, surfaceNotes, deepNotes]);

  const resolvedNoteContent = useMemo(() => {
    if (!selectedNote) return null;
    if (!selectedNote.requiresDeepUnlock) {
      return selectedNote.plainContent ?? '';
    }
    if (!state.zhixiaDeepUnlocked || !selectedNote.encryptedVaultId) {
      return null;
    }
    return state.decryptedCache[selectedNote.encryptedVaultId] ?? null;
  }, [selectedNote, state.zhixiaDeepUnlocked, state.decryptedCache]);

  // 阅读已解锁手记时同步已读、关键词与调查线索
  useEffect(() => {
    if (!selectedNote || resolvedNoteContent === null) return;
    onMarkRead(selectedNote.id);
    if (selectedNote.keywords.length > 0) {
      onAddKeywords(selectedNote.keywords);
    }
    if (selectedNote.clueNote) {
      onAddClue({
        id: selectedNote.clueNote.id,
        title: selectedNote.clueNote.title,
        detail: selectedNote.clueNote.detail,
        sourceSite: 'notes',
      });
    }
  }, [selectedNote, resolvedNoteContent, onMarkRead, onAddKeywords, onAddClue]);

  const handleDeepUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);

    const expectedHash = GATE_HASHES.zhixia_deep;
    if (!expectedHash) {
      setUnlockError('深层密保哈希摘要未加载，请先检查密文金库构建。');
      return;
    }

    setUnlockBusy(true);
    try {
      const ok = await verifyPassphraseHash(passInput, expectedHash);
      if (!ok) {
        horrorAudio.playClick('film');
        setUnlockError(
          '密保答案校验未通过。请核对：①周怀瑾2019临终信访件记载的1998封水时辰（2字，如“某时”） + ②清光绪《云溪风土杂记》所载盲傩绝唱剧目四字正名（共6个汉字，连写无需标点）。'
        );
        return;
      }

      for (const note of deepNotes) {
        if (!note.encryptedVaultId) continue;
        const block = ENCRYPTED_VAULT[note.encryptedVaultId];
        if (!block) continue;
        const plain = await decryptVaultBlock(block, passInput);
        if (plain !== null) {
          onCacheDecrypted(note.encryptedVaultId, plain);
        }
      }

      onUnlockZhixiaDeep();
      horrorAudio.playClick('unlock');
      setPassInput('');
      setJustUnlockedBanner(true);
      if (deepNotes[0]) {
        setSelectedNoteId(deepNotes[0].id);
      }
    } finally {
      setUnlockBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-[#171614] text-stone-200">
      {/* 素雅个人云笔记顶栏 */}
      <header className="border-b border-stone-800/90 bg-[#1d1b18] px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-700/40 bg-stone-900 text-amber-300/90 shadow-inner">
              <Feather className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-serif-cn text-xl font-bold tracking-widest text-stone-100">
                  夏夜拾遗
                </h1>
                <span className="rounded-full border border-stone-700 bg-stone-900/90 px-2.5 py-0.5 font-mono-tech text-[11px] text-stone-400">
                  note.zhixia-memo.me · 只读内网映射
                </span>
              </div>
              <p className="mt-0.5 font-serif-cn text-xs text-stone-400">
                “桂子落时樟木冷，莫向空龛问旧人。” —— 林知夏私人田野札记与外婆口述留存
              </p>
            </div>
          </div>

          {/* 表层 / 深层加密夹切换 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('ui');
                setActiveTab('surface');
                if (surfaceNotes[0]) setSelectedNoteId(surfaceNotes[0].id);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition cursor-pointer ${
                activeTab === 'surface'
                  ? 'border-amber-600/70 bg-amber-950/40 text-amber-200'
                  : 'border-stone-800 bg-stone-900/70 text-stone-400 hover:border-stone-700 hover:text-stone-200'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>表层手记 · 田野日常 ({surfaceNotes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('ui');
                setActiveTab('deep');
                if (deepNotes[0]) setSelectedNoteId(deepNotes[0].id);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition cursor-pointer ${
                activeTab === 'deep'
                  ? 'border-rose-700/80 bg-rose-950/45 text-rose-200'
                  : isDeepAccessible
                  ? 'border-emerald-800/70 bg-emerald-950/30 text-emerald-200 hover:border-emerald-700'
                  : 'border-stone-800 bg-stone-900/70 text-stone-400 hover:border-rose-800/60 hover:text-rose-200'
              }`}
            >
              {isDeepAccessible ? (
                <Unlock className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-rose-400" />
              )}
              <span>深层加密夹 · 龛下遗稿 ({deepNotes.length})</span>
            </button>
          </div>
        </div>
      </header>

      {justUnlockedBanner && (
        <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-xl border border-emerald-800/70 bg-emerald-950/35 px-4 py-2.5 text-xs text-emerald-200">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            深层记忆密保核验通过！已使用 PBKDF2 + AES-256-GCM 实时解密全部 {deepNotes.length} 篇私密手稿。
          </span>
          <button
            type="button"
            onClick={() => setJustUnlockedBanner(false)}
            className="text-emerald-400 hover:text-emerald-200 cursor-pointer"
          >
            收起
          </button>
        </div>
      )}

      {/* 双栏素雅阅读区 */}
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-12">
        {/* 左侧手记目录 */}
        <aside className="space-y-3.5 lg:col-span-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="在当前手记夹中检索日期、题目或词句…"
              className="w-full rounded-xl border border-stone-800 bg-[#1f1d1a] py-2 pl-9 pr-3 text-xs text-stone-200 outline-none focus:border-amber-700/80"
            />
          </div>

          <div className="max-h-[68vh] space-y-2 overflow-y-auto rounded-xl border border-stone-800/90 bg-[#1c1a17] p-2.5">
            {visibleList.length === 0 ? (
              <div className="py-10 text-center font-serif-cn text-xs text-stone-500">
                未检索到相符的札记条目
              </div>
            ) : (
              visibleList.map((note) => {
                const locked = Boolean(note.requiresDeepUnlock) && !isDeepAccessible;
                const selected = selectedNote?.id === note.id;
                const isRead = state.readDocIds.includes(note.id);

                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      setSelectedNoteId(note.id);
                    }}
                    className={`w-full rounded-lg border p-3.5 text-left transition cursor-pointer ${
                      selected
                        ? note.requiresDeepUnlock
                          ? 'border-rose-700/80 bg-rose-950/25 shadow'
                          : 'border-amber-700/80 bg-amber-950/25 shadow'
                        : 'border-stone-800/80 bg-[#161513] hover:border-stone-700'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-stone-400">
                      <span className="inline-flex items-center gap-1 font-mono-tech">
                        <Calendar className="h-3 w-3 text-stone-500" />
                        {note.date}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {locked ? (
                          <span className="inline-flex items-center gap-1 text-rose-400">
                            <Lock className="h-3 w-3" />
                            密文锁定
                          </span>
                        ) : isRead ? (
                          <span className="text-stone-500">已批阅</span>
                        ) : (
                          <span className="text-amber-400">未读</span>
                        )}
                      </span>
                    </div>

                    <div className="font-serif-cn text-sm font-bold leading-6 text-stone-100">
                      {locked ? `【深层私密手稿】${note.title}` : note.title}
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-500">
                      <CloudRain className="h-3 w-3" />
                      <span>{note.weather}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* 右侧信笺正文或深层密保解锁界面 */}
        <main className="lg:col-span-8">
          {activeTab === 'deep' && !isDeepAccessible ? (
            <div className="rounded-2xl border border-rose-900/60 bg-[#1f1c19] p-6 shadow-2xl sm:p-9">
              <div className="mx-auto max-w-xl">
                <div className="mb-5 flex items-center gap-3 border-b border-stone-800 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-800/70 bg-rose-950/40 text-rose-300">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-mono-tech text-[11px] uppercase tracking-widest text-rose-400">
                      CLIENT-SIDE AES-256-GCM VAULT // 私人加密手稿匣
                    </div>
                    <h2 className="font-serif-cn text-xl font-bold text-stone-100">
                      『夏夜拾遗』深层手记 · 记忆密保验证
                    </h2>
                  </div>
                </div>

                <div className="mb-6 rounded-xl border border-stone-800 bg-[#161412] p-4 font-serif-cn text-sm leading-7 text-stone-300">
                  <p className="mb-2 font-bold text-amber-200/90">【林知夏自设密保提示语】：</p>
                  <p>
                    “若我被困在人文楼地下失去联络，拿到这条内网跳板的人——请不要用我的生日或学号尝试暴力破解。这五篇手稿里藏着外婆留给我的保命朱砂符编号，以及周怀瑾恩师1998年亲手抄录的真正封龛古序。”
                  </p>
                  <div className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/20 px-3.5 py-2.5 text-xs leading-6 text-amber-200">
                    <div>
                      <strong>密保构成规则（共 6 个汉字，直接连写）：</strong>
                    </div>
                    <div>
                      ① <strong>周怀瑾 2019 年临终信访件</strong>中写明的 1998 事故夜封水时辰（2字，见云溪水利方志网信访卷宗）
                    </div>
                    <div>
                      ② 拼接 <strong>盲傩绝唱剧目四字正名</strong>（4字，见清光绪《云溪风土杂记·祀典志》）
                    </div>
                  </div>
                </div>

                <form onSubmit={handleDeepUnlockSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-stone-300">
                      输入 6 字记忆密保口令（系统自动忽略空格与连接符）
                    </label>
                    <input
                      type="text"
                      value={passInput}
                      onChange={(e) => setPassInput(e.target.value)}
                      placeholder="请输入：封水时辰(2字) + 盲傩绝唱剧目正名(4字)"
                      className="w-full rounded-xl border border-stone-700 bg-[#141311] px-4 py-3 font-serif-cn text-sm tracking-widest text-stone-100 outline-none focus:border-rose-600"
                    />
                  </div>

                  {unlockError && (
                    <div className="rounded-xl border border-red-900/80 bg-red-950/40 px-4 py-3 text-xs leading-6 text-red-200">
                      {unlockError}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={unlockBusy || !passInput.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-6 py-2.5 text-xs font-bold tracking-wider text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition"
                    >
                      <KeyRound className="h-4 w-4" />
                      {unlockBusy ? '正在校验哈希并实时解密手稿……' : '验证密保并解密深层手记'}
                    </button>

                    {state.unlockedSites.includes('chronicles') && (
                      <button
                        type="button"
                        onClick={() => {
                          horrorAudio.playClick('ui');
                          onNavigateSite('chronicles');
                        }}
                        className="text-xs text-amber-300/90 underline hover:text-amber-200 cursor-pointer"
                      >
                        前往「云溪县水利移民与方志网」核查时辰与剧目名 →
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          ) : selectedNote && resolvedNoteContent !== null ? (
            <article className="rounded-2xl border border-stone-800 bg-[#201e1a] p-6 shadow-2xl sm:p-9">
              <div className="border-b border-stone-800 pb-5">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md border border-stone-700 bg-stone-900 px-2.5 py-0.5 font-mono-tech text-stone-300">
                      <Calendar className="h-3 w-3 text-amber-400/80" />
                      {selectedNote.date}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-stone-800 bg-stone-900/60 px-2.5 py-0.5">
                      <CloudRain className="h-3 w-3 text-stone-400" />
                      {selectedNote.weather}
                    </span>
                  </div>

                  {selectedNote.requiresDeepUnlock && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-rose-800/70 bg-rose-950/40 px-2.5 py-0.5 font-mono-tech text-[11px] text-rose-200">
                      <Sparkles className="h-3 w-3" />
                      深层手稿 · 已解密
                    </span>
                  )}
                </div>

                <h2 className="font-serif-cn text-2xl font-bold leading-snug tracking-wide text-stone-100">
                  {selectedNote.title}
                </h2>
              </div>

              <div className="mt-6 whitespace-pre-wrap rounded-xl border border-stone-800/80 bg-[#181613] p-5 sm:p-7 font-serif-cn text-[15.5px] leading-8 text-stone-200">
                {resolvedNoteContent}
              </div>

              {selectedNote.clueNote && (
                <div className="mt-5 rounded-xl border border-amber-800/60 bg-amber-950/25 p-4 text-xs leading-6 text-amber-100">
                  <div className="mb-1 flex items-center gap-1.5 font-bold text-amber-300">
                    <FileText className="h-4 w-4" />
                    <span>札记关键线索已摘录：{selectedNote.clueNote.title}</span>
                  </div>
                  <p className="text-stone-300">{selectedNote.clueNote.detail}</p>
                </div>
              )}

              {selectedNote.requiresDeepUnlock && state.unlockedSites.includes('b2') && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-900/60 bg-rose-950/20 px-4 py-3 text-xs">
                  <span className="text-rose-200/90">
                    若已从深层遗稿中获知外婆留下的朱砂符登记号或真封龛牌位顺序，可立即前往 B2 终端执行救援与覆写。
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      onNavigateSite('b2');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-700 bg-rose-900/60 px-3.5 py-1.5 font-semibold text-rose-100 hover:bg-rose-800/70 cursor-pointer transition"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    跳转至 B2 远程审片与救援终端
                  </button>
                </div>
              )}
            </article>
          ) : null}
        </main>
      </div>
    </div>
  );
};
