import React, { useEffect, useMemo, useState } from 'react';
import {
  Landmark,
  Search,
  FileWarning,
  Archive,
  BookmarkCheck,
  AlertTriangle,
  FileText,
  FolderOpen,
  ShieldAlert,
} from 'lucide-react';
import { CHRONICLE_DOCS } from '../data/chroniclesData';
import type { ChronicleDoc } from '../types/game';
import type { CommonSiteProps } from './siteProps';
import { ForensicPhotoViewer } from '../components/ForensicPhotoViewer';
import { horrorAudio } from '../engine/audio';

type GovTab = '全部公开卷宗' | ChronicleDoc['classification'];

const GOV_TABS: GovTab[] = [
  '全部公开卷宗',
  '公开政务',
  '历史台账',
  '古籍影印',
  '内部协查',
  '信访卷宗',
];

export const ChroniclesGovSite: React.FC<CommonSiteProps> = ({
  state,
  focusedItemId,
  onClearFocus,
  onMarkRead,
  onAddClue,
  onAddKeywords,
  onRecordPhotoView,
  onAdjustContamination,
  onTriggerScare,
}) => {
  const [activeTab, setActiveTab] = useState<GovTab>('全部公开卷宗');
  const [searchInput, setSearchInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>(
    () => CHRONICLE_DOCS[0]?.id ?? 'chr-1999-closure'
  );

  // 支持跨站检索直达（含默认隐藏的周怀瑾 2019 信访件）
  useEffect(() => {
    if (!focusedItemId) return;
    const target = CHRONICLE_DOCS.find((d) => d.id === focusedItemId);
    if (target) {
      if (target.hiddenFromDefault || target.classification === '信访卷宗') {
        setActiveTab('信访卷宗');
      }
      setSelectedDocId(target.id);
      onClearFocus?.();
    }
  }, [focusedItemId, onClearFocus]);

  // 过滤列表：默认「全部公开卷宗」不直接暴露 hiddenFromDefault 信访件，但切入【历史信访归档调阅（信访卷宗）】或通过站内检索词均可调出！
  const visibleDocs = useMemo(() => {
    const q = submittedQuery.trim().toLowerCase();

    if (q.length > 0) {
      return CHRONICLE_DOCS.filter((doc) => {
        const hay = [
          doc.id,
          doc.docNumber,
          doc.department,
          doc.year,
          doc.title,
          doc.classification,
          doc.summary,
          doc.content,
          ...doc.keywords,
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    if (activeTab === '信访卷宗') {
      return CHRONICLE_DOCS.filter(
        (d) => d.classification === '信访卷宗' || d.hiddenFromDefault
      );
    }

    return CHRONICLE_DOCS.filter((d) => {
      if (d.hiddenFromDefault) return false;
      if (activeTab === '全部公开卷宗') return true;
      return d.classification === activeTab;
    });
  }, [activeTab, submittedQuery]);

  const activeDoc = useMemo(() => {
    return (
      CHRONICLE_DOCS.find((d) => d.id === selectedDocId) ??
      visibleDocs[0] ??
      CHRONICLE_DOCS[0]
    );
  }, [selectedDocId, visibleDocs]);

  // 阅读归档记录
  useEffect(() => {
    if (!activeDoc) return;
    if (!state.readDocIds.includes(activeDoc.id)) {
      onMarkRead(activeDoc.id);
    }
    if (
      activeDoc.clueNote &&
      !state.discoveredClues.some((c) => c.id === activeDoc.clueNote?.id)
    ) {
      onAddClue({
        id: activeDoc.clueNote.id,
        title: activeDoc.clueNote.title,
        detail: activeDoc.clueNote.detail,
        sourceSite: 'chronicles',
      });
    }
    if (activeDoc.hiddenFromDefault || activeDoc.specialVisual) {
      onAddKeywords(activeDoc.keywords.slice(0, 4));
    }
  }, [
    activeDoc,
    state.readDocIds,
    state.discoveredClues,
    onMarkRead,
    onAddClue,
    onAddKeywords,
  ]);

  const handleGovSearch = (e: React.FormEvent) => {
    e.preventDefault();
    horrorAudio.playClick('ui');
    const q = searchInput.trim();
    setSubmittedQuery(q);
    if (q) {
      const qLower = q.toLowerCase();
      const hit = CHRONICLE_DOCS.find((doc) =>
        [doc.docNumber, doc.title, doc.summary, ...doc.keywords]
          .join(' ')
          .toLowerCase()
          .includes(qLower)
      );
      if (hit) setSelectedDocId(hit.id);
    }
  };

  return (
    <div className="min-h-[calc(100vh-84px)] bg-[#dce5ef] text-slate-900">
      {/* 2008年代复古蓝灰地方政务网顶栏 */}
      <div className="border-b-4 border-[#b91c1c] bg-gradient-to-b from-[#17468a] to-[#235ba8] text-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded border border-white/35 bg-[#103468] shadow-inner">
                <Landmark className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <div className="text-[11px] tracking-widest text-sky-200">
                  YUNXI COUNTY WATER CONSERVANCY &amp; LOCAL CHRONICLES ARCHIVE SYSTEM (2008改版)
                </div>
                <h1 className="font-serif-cn text-xl sm:text-2xl font-bold tracking-wider">
                  云溪县水利移民安置办 · 地方志历史档案联合查询网
                </h1>
              </div>
            </div>

            {/* 公文文号/信访人检索框 */}
            <form onSubmit={handleGovSearch} className="w-full max-w-md">
              <div className="flex overflow-hidden rounded border-2 border-[#93b4dc] bg-white">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="输入发文字号、高程、村名或信访人姓名（如：108.4、郑国栋、周怀瑾）"
                  className="w-full px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {submittedQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSubmittedQuery('');
                    }}
                    className="px-2 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    重置
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 bg-[#b91c1c] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#991b1b] cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>公文检索</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 政务栏目导航条（含专门的【历史信访归档调阅】入口） */}
        <div className="border-t border-white/20 bg-[#113569] px-4 py-1.5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {GOV_TABS.map((tab) => {
                const isPetition = tab === '信访卷宗';
                const active = !submittedQuery && activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      horrorAudio.playClick('ui');
                      setSubmittedQuery('');
                      setSearchInput('');
                      setActiveTab(tab);
                      if (isPetition) {
                        const firstPetition = CHRONICLE_DOCS.find(
                          (d) => d.classification === '信访卷宗' || d.hiddenFromDefault
                        );
                        if (firstPetition) setSelectedDocId(firstPetition.id);
                      }
                    }}
                    className={`inline-flex items-center gap-1 rounded px-3 py-1 text-xs font-bold transition cursor-pointer ${
                      active
                        ? isPetition
                          ? 'bg-[#b91c1c] text-white shadow-xs'
                          : 'bg-white text-[#113569]'
                        : isPetition
                        ? 'border border-amber-400/60 bg-amber-950/50 text-amber-200 hover:bg-[#b91c1c] hover:text-white'
                        : 'text-sky-100 hover:bg-white/10'
                    }`}
                  >
                    {isPetition && <Archive className="h-3.5 w-3.5" />}
                    <span>{isPetition ? '历史信访归档调阅' : tab}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] font-mono-tech text-sky-200/80">
              内网镜像端口 :8080 · 皖/浙赣水文档案库
            </span>
          </div>
        </div>
      </div>

      {/* 主体：左侧复古政务卷宗索引 + 右侧标准红头文件阅读器 */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-6 lg:grid-cols-12">
        {/* 左侧栏 */}
        <aside className="space-y-4 lg:col-span-4">
          {/* 专门的历史信访专匣醒目入口卡片（确保玩家既能搜出也能直接翻出周怀瑾2019信访件！） */}
          <div className="rounded border-2 border-[#8c2d2d] bg-[#fdf8f6] p-3.5 shadow-xs">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#991b1b]">
              <FileWarning className="h-4 w-4" />
              <span>历史信访与不予公开旧卷调阅专窗</span>
            </div>
            <p className="mb-2.5 text-[11px] leading-relaxed text-slate-600">
              收录 1998—2020 年间涉及云溪水库库底清底、老粮站缓拆及实名阻拦打捞之归档信访原件（默认不列入常规政务列表）。
            </p>
            <button
              type="button"
              onClick={() => {
                horrorAudio.playClick('unlock');
                setSubmittedQuery('');
                setActiveTab('信访卷宗');
                const zhouDoc = CHRONICLE_DOCS.find(
                  (d) => d.id === 'chr-zhou-petition-2019' || d.classification === '信访卷宗'
                );
                if (zhouDoc) setSelectedDocId(zhouDoc.id);
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded bg-[#991b1b] py-1.5 text-xs font-bold text-white hover:bg-[#7f1d1d] cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span>打开「历史信访归档专匣」</span>
            </button>
          </div>

          {/* 卷宗目录列表 */}
          <div className="overflow-hidden rounded border border-[#9cb3cc] bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-[#b8cbe0] bg-[#e6eef7] px-3.5 py-2 text-xs font-bold text-[#17468a]">
              <span>
                {submittedQuery
                  ? `检索 “${submittedQuery}” 结果 (${visibleDocs.length})`
                  : `${activeTab}列表 (${visibleDocs.length})`}
              </span>
              <span className="font-mono-tech text-[10px] text-slate-500">GOV-DB v2.04</span>
            </div>

            <div className="max-h-[64vh] overflow-y-auto divide-y divide-slate-200">
              {visibleDocs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  未查找到符合条件的政务卷宗，请尝试切换上方【历史信访归档调阅】或缩短检索词。
                </div>
              ) : (
                visibleDocs.map((doc) => {
                  const isSelected = activeDoc?.id === doc.id;
                  const isRead = state.readDocIds.includes(doc.id);

                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => {
                        horrorAudio.playClick('ui');
                        setSelectedDocId(doc.id);
                      }}
                      className={`w-full p-3 text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#eaf2fb] border-l-4 border-l-[#b91c1c]'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-1.5">
                        <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono-tech text-slate-700">
                          {doc.docNumber}
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              doc.classification === '信访卷宗' || doc.classification === '内部协查'
                                ? 'bg-red-100 text-red-800'
                                : doc.classification === '古籍影印'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-sky-100 text-sky-900'
                            }`}
                          >
                            {doc.classification}
                          </span>
                          {!isRead && (
                            <span className="h-2 w-2 rounded-full bg-[#b91c1c]" title="未阅" />
                          )}
                        </div>
                      </div>

                      <div className="line-clamp-2 font-serif-cn text-xs font-bold leading-snug text-slate-900">
                        {doc.title}
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate">{doc.department}</span>
                        <span className="shrink-0 font-mono-tech">{doc.year}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* 右侧：拟真中国地方政务红头文件/古籍扫描阅读器 */}
        <main className="lg:col-span-8">
          {activeDoc && (
            <div className="relative overflow-hidden rounded border border-[#9cb3cc] bg-[#fffef9] p-6 sm:p-10 shadow-md">
              {/* 红头文件版头 */}
              <div className="mb-6 text-center">
                <div className="font-serif-cn text-xl sm:text-2xl font-bold tracking-[0.18em] text-[#cc0000]">
                  {activeDoc.department}归档卷宗
                </div>
                <div className="mt-2 font-serif-cn text-xs text-slate-600">
                  发文字号 / 卷宗号：<span className="font-mono-tech">{activeDoc.docNumber}</span>
                  <span className="mx-3">|</span>
                  归档年度：{activeDoc.year}
                  <span className="mx-3">|</span>
                  卷宗类别：{activeDoc.classification}
                </div>
                {/* 标准红头双红线 + 五角星隔断 */}
                <div className="mt-3 flex items-center">
                  <div className="h-[2px] flex-1 bg-[#cc0000]" />
                  <span className="px-2 text-xs text-[#cc0000]">★</span>
                  <div className="h-[2px] flex-1 bg-[#cc0000]" />
                </div>
              </div>

              {/* 古籍电子校录版防篡改重点警示条 */}
              {activeDoc.specialVisual === 'woodblock_seal' && (
                <div className="mb-5 flex items-start gap-2.5 rounded border border-amber-400 bg-amber-50 p-3.5 text-xs text-amber-950">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div>
                    <div className="font-bold">
                      【古籍数字化校勘异文提示】本卷同时收录「2025年课题组报送电子录入文本」与「清光绪十九年木刻雕版原件扫描图」
                    </div>
                    <p className="mt-0.5 leading-relaxed">
                      请研究人员务必放大下方<strong>木刻雕版原叶骑缝红印破裂处</strong>核对原刻阳文字序，切勿未经校勘直接引用电子录入稿！
                    </p>
                  </div>
                </div>
              )}

              {activeDoc.hiddenFromDefault && (
                <div className="mb-5 flex items-center gap-2 rounded border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-900">
                  <ShieldAlert className="h-4 w-4 text-red-700 shrink-0" />
                  <span>【内部封存信访原件】本件依规不予主动公开，仅供历史水文与文物安全核查调阅</span>
                </div>
              )}

              {/* 公文正题 */}
              <h2 className="mb-5 text-center font-serif-cn text-xl sm:text-2xl font-bold leading-snug text-slate-950">
                {activeDoc.title}
              </h2>

              {/* 摘要提要框 */}
              <div className="mb-6 rounded border border-slate-300 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-700">
                <strong className="text-slate-900">【归档提要】</strong> {activeDoc.summary}
              </div>

              {/* 内嵌高程蓝图 / 清光绪木刻原叶 / 124户同指模附表38 视觉取证组件 */}
              {activeDoc.specialVisual && (
                <div className="mb-6">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#991b1b]">
                    <FileText className="h-4 w-4" />
                    <span>随文附卷：原始档案高精度扫描件（支持放大镜与斜射显影取证）</span>
                  </div>
                  <ForensicPhotoViewer
                    photoId={activeDoc.specialVisual}
                    act={state.act}
                    scareMode={state.scareMode}
                    viewCount={state.photoViewCounts[activeDoc.specialVisual] || 0}
                    onInspect={onRecordPhotoView}
                    onTriggerScare={onTriggerScare}
                    onAdjustContamination={onAdjustContamination}
                  />
                </div>
              )}

              {/* 公文正文 */}
              <article className="relative mb-8 whitespace-pre-line font-serif-cn text-[15px] leading-8 text-slate-900">
                {activeDoc.content}

                {/* 拟真右下角红色圆形档案骑缝公章 SVG */}
                <div className="pointer-events-none mt-6 flex justify-end pr-4 select-none">
                  <svg viewBox="0 0 130 130" className="h-28 w-28 text-red-700/75 -rotate-12">
                    <circle
                      cx="65"
                      cy="65"
                      r="58"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.2"
                    />
                    <circle
                      cx="65"
                      cy="65"
                      r="53"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                    <text
                      x="65"
                      y="36"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="11"
                      fontWeight="bold"
                      className="font-serif-cn"
                    >
                      云溪县水利与方志馆
                    </text>
                    <text
                      x="65"
                      y="72"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="24"
                    >
                      ★
                    </text>
                    <text
                      x="65"
                      y="98"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="10.5"
                      fontWeight="bold"
                      className="font-serif-cn"
                    >
                      历史档案核验章
                    </text>
                  </svg>
                </div>
              </article>

              {/* 自动归档线索提示 */}
              {activeDoc.clueNote && (
                <div className="rounded border border-amber-400 bg-amber-50 p-4 text-xs text-amber-950">
                  <div className="mb-1 flex items-center gap-1.5 font-bold text-amber-900">
                    <BookmarkCheck className="h-4 w-4 text-amber-700" />
                    <span>关键证据已记入手记：{activeDoc.clueNote.title}</span>
                  </div>
                  <p className="leading-relaxed">{activeDoc.clueNote.detail}</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
