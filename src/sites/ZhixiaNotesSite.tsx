import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  CloudRain,
  Feather,
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
import { EditorialProse } from '../components/EditorialProse';
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

  const [passInput, setPassInput] = useState('');
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [justUnlockedBanner, setJustUnlockedBanner] = useState(false);

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
    <div className="min-h-[calc(100vh-7rem)] bg-[#f7f3eb] text-stone-800">
      {/* 素雅米白纸笺个人云笔记顶栏 */}
      <header className="border-b border-[#e5dec9] bg-[#fcfaf5] px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/35 bg-amber-50 text-amber-800 shadow-2xs">
              <Feather className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-serif-cn text-xl font-bold tracking-widest text-[#2c241b]">
                  夏夜拾遗
                </h1>
                <span className="rounded-full border border-[#dfd7c5] bg-[#f4efe4] px-2.5 py-0.5 font-mono-tech text-[11px] text-stone-500">
                  note.zhixia-memo.me · 只读内网映射
                </span>
              </div>
              <p className="mt-0.5 font-serif-cn text-xs text-stone-500">
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
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                activeTab === 'surface'
                  ? 'border-amber-500/70 bg-amber-50 text-amber-950 shadow-2xs'
                  : 'border-[#ddd5c4] bg-white text-stone-600 hover:border-stone-400 hover:text-stone-900'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-700" />
              <span>表层手记 · 田野日常 ({surfaceNotes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('ui');
                setActiveTab('deep');
                if (deepNotes[0]) setSelectedNoteId(deepNotes[0].id);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                activeTab === 'deep'
                  ? 'border-[#9e2a2b]/60 bg-red-50 text-[#9e2a2b] shadow-2xs'
                  : isDeepAccessible
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-900 hover:border-emerald-500'
                  : 'border-[#ddd5c4] bg-white text-stone-600 hover:border-[#9e2a2b]/50 hover:text-[#9e2a2b]'
              }`}
            >
              {isDeepAccessible ? (
                <Unlock className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-[#9e2a2b]" />
              )}
              <span>深层加密夹 · 龛下遗稿 ({deepNotes.length})</span>
            </button>
          </div>
        </div>
      </header>

      {justUnlockedBanner && (
        <div className="mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            深层记忆密保核验通过！已使用 PBKDF2 + AES-256-GCM 实时解密全部 {deepNotes.length} 篇私密手稿。
          </span>
          <button
            type="button"
            onClick={() => setJustUnlockedBanner(false)}
            className="font-semibold text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            收起
          </button>
        </div>
      )}

      {/* 双栏素雅纸笺阅读区 */}
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-12">
        {/* 左侧手记目录 */}
        <aside className="space-y-3.5 lg:col-span-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="在当前手记夹中检索日期、题目或词句…"
              className="w-full rounded-xl border border-[#ddd5c4] bg-white py-2 pl-9 pr-3 text-xs text-stone-800 placeholder-stone-400 shadow-2xs outline-none focus:border-[#9e2a2b]"
            />
          </div>

          <div className="max-h-[68vh] space-y-2 overflow-y-auto rounded-xl border border-[#e5dec9] bg-[#fcfaf5] p-2.5">
            {visibleList.length === 0 ? (
              <div className="py-10 text-center font-serif-cn text-xs text-stone-400">
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
                          ? 'border-[#9e2a2b]/60 bg-red-50/50 shadow-xs'
                          : 'border-amber-500/70 bg-amber-50/50 shadow-xs'
                        : 'border-[#e6dfd1] bg-white hover:border-stone-400'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-stone-500">
                      <span className="inline-flex items-center gap-1 font-mono-tech">
                        <Calendar className="h-3 w-3 text-stone-400" />
                        {note.date}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {locked ? (
                          <span className="inline-flex items-center gap-1 font-medium text-[#9e2a2b]">
                            <Lock className="h-3 w-3" />
                            密文锁定
                          </span>
                        ) : isRead ? (
                          <span className="text-stone-400">已批阅</span>
                        ) : (
                          <span className="font-semibold text-amber-700">未读</span>
                        )}
                      </span>
                    </div>

                    <div className="font-serif-cn text-sm font-bold leading-6 text-[#2c241b]">
                      {locked ? `【深层私密手稿】${note.title}` : note.title}
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-400">
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
            <div className="rounded-2xl border border-[#e3d9c8] bg-white p-6 shadow-md sm:p-9">
              <div className="mx-auto max-w-xl">
                <div className="mb-5 flex items-center gap-3 border-b border-stone-200 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-[#9e2a2b]">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-mono-tech text-[11px] uppercase tracking-widest text-[#9e2a2b]">
                      CLIENT-SIDE AES-256-GCM VAULT // 私人加密手稿匣
                    </div>
                    <h2 className="font-serif-cn text-xl font-bold text-[#2c241b]">
                      『夏夜拾遗』深层手记 · 记忆密保验证
                    </h2>
                  </div>
                </div>

                <div className="mb-6 rounded-xl border border-[#e6dfd1] bg-[#faf7f0] p-4 font-serif-cn text-sm leading-7 text-stone-700">
                  <p className="mb-2 font-bold text-[#9e2a2b]">【林知夏自设密保提示语】：</p>
                  <p>
                    “若我被困在人文楼地下失去联络，拿到这条内网跳板的人——请不要用我的生日或学号尝试暴力破解。这五篇手稿里藏着外婆留给我的保命朱砂符编号，以及周怀瑾恩师1998年亲手抄录的真正封龛古序。”
                  </p>
                  <div className="mt-3 rounded-lg border border-amber-300/80 bg-amber-50/80 px-3.5 py-2.5 text-xs leading-6 text-amber-950 font-sans">
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
                    <label className="mb-1.5 block text-xs font-semibold text-stone-700">
                      输入 6 字记忆密保口令（系统自动忽略空格与连接符）
                    </label>
                    <input
                      type="text"
                      value={passInput}
                      onChange={(e) => setPassInput(e.target.value)}
                      placeholder="请输入：封水时辰(2字) + 盲傩绝唱剧目正名(4字)"
                      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 font-serif-cn text-sm tracking-widest text-stone-900 placeholder-stone-400 outline-none focus:border-[#9e2a2b]"
                    />
                  </div>

                  {unlockError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-6 text-[#9e2a2b]">
                      {unlockError}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={unlockBusy || !passInput.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#9e2a2b] px-6 py-2.5 text-xs font-bold tracking-wider text-white hover:bg-[#822021] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition"
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
                        className="text-xs font-medium text-[#1e3554] underline hover:text-[#9e2a2b] cursor-pointer"
                      >
                        前往「云溪县水利移民与方志网」核查时辰与剧目名 →
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          ) : selectedNote && resolvedNoteContent !== null ? (
            <article className="rounded-2xl border border-[#e3dac7] bg-[#fffdf9] p-6 shadow-sm sm:p-9">
              <div className="border-b border-[#ece5d5] pb-5">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#e0d8c6] bg-[#faf7f0] px-2.5 py-0.5 font-mono-tech text-stone-700">
                      <Calendar className="h-3 w-3 text-amber-700" />
                      {selectedNote.date}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#eae3d3] bg-[#faf7f0] px-2.5 py-0.5 text-stone-600">
                      <CloudRain className="h-3 w-3 text-stone-400" />
                      {selectedNote.weather}
                    </span>
                  </div>

                  {selectedNote.requiresDeepUnlock && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-0.5 font-mono-tech text-[11px] font-medium text-[#9e2a2b]">
                      <Sparkles className="h-3 w-3" />
                      深层手稿 · 已解密
                    </span>
                  )}
                </div>

                <h2 className="font-serif-cn text-2xl font-bold leading-snug tracking-wide text-[#2c241b]">
                  {selectedNote.title}
                </h2>
              </div>

              <div className="mt-6 rounded-xl border border-[#ece5d5] bg-[#fcfaf4] p-6 sm:p-8">
                <EditorialProse text={resolvedNoteContent} theme="journal" />
                <div className="mt-6 border-t border-[#e8e0cf] pt-3 text-[11px] text-stone-400">
                  提示：用鼠标划选正文中的关键数字或词句，可直接摘录至右侧随身手记。
                </div>
              </div>

              {selectedNote.requiresDeepUnlock && state.unlockedSites.includes('b2') && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/75 px-4 py-3 text-xs">
                  <span className="text-[#7f1d1d]">
                    若已从深层遗稿中获知外婆留下的朱砂符登记号或真封龛牌位顺序，可立即前往 B2 终端执行救援与覆写。
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      onNavigateSite('b2');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#9e2a2b] px-3.5 py-1.5 font-semibold text-white hover:bg-[#822021] cursor-pointer transition"
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
