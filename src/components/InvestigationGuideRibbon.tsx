import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X } from 'lucide-react';
import type { GameState, SiteId } from '../types/game';

interface InvestigationGuideRibbonProps {
  state: GameState;
  onNavigateSite?: (site: SiteId, targetId?: string) => void;
}

interface StageDirection {
  tag: string;
  text: string;
  actionLabel?: string;
  actionSite?: SiteId;
  actionDocId?: string;
}

function resolveStageDirection(state: GameState): StageDirection {
  if (!state.unlockedSites.includes('qinghe')) {
    return {
      tag: '第一步',
      text: '先阅读林知夏留下的定时邮件，留意她叮嘱你核查的那张照片与禁忌，点击信末按钮进入青禾数字民俗馆。',
    };
  }

  if (!state.readDocIds.includes('qh-37-09')) {
    return {
      tag: '调查切入',
      text: '进入青禾数字民俗馆后，优先打开《晒谷场收工图》，开启【光学放大镜】细数背身人数与地面影子，并留意编号断层。',
      actionLabel: state.currentSite !== 'qinghe' ? '回到青禾馆' : undefined,
      actionSite: state.currentSite !== 'qinghe' ? 'qinghe' : undefined,
    };
  }

  if (!state.readDocIds.includes('mail-prologue-step2')) {
    return {
      tag: '新信送达',
      text: '已核查《晒谷场收工图》！收件箱刚刚自动投递了林知夏的第二封分段死信，内含树洞口令、陈默网名与后续三条追查路线。',
      actionLabel: state.currentSite !== 'mail' ? '拆阅第二封续信' : undefined,
      actionSite: state.currentSite !== 'mail' ? 'mail' : undefined,
      actionDocId: 'mail-prologue-step2',
    };
  }

  if (!state.unlockedSites.includes('chronicles')) {
    return {
      tag: '跨站追查',
      text: '前往「树洞 & 显影液BBS」：在树洞 #40918 查 OA 访客口令规律，并在显影液论坛找【逆光底片】（陈默）的求助长帖。',
      actionLabel: state.currentSite !== 'bbs' ? '前往树洞/BBS' : undefined,
      actionSite: state.currentSite !== 'bbs' ? 'bbs' : undefined,
    };
  }

  if (state.oaLevel < 1) {
    return {
      tag: '潜入内网',
      text: '青禾馆网页最底部藏着「教职工内部 OA 工单系统」。结合树洞 #40918 规则与《项目立项概况》中的编号和截流月日登录 qh_guest。',
      actionLabel: state.currentSite !== 'oa' && state.unlockedSites.includes('oa') ? '前往 OA 登录' : undefined,
      actionSite: state.unlockedSites.includes('oa') ? 'oa' : undefined,
    };
  }

  if (state.oaLevel === 1) {
    return {
      tag: '第二幕',
      text: '交叉核查水利网的淹没台账（记得开启高程图紫外显影）与 OA 内部草稿：结合论坛器材签名档推算陈默的二级权限密钥。',
    };
  }

  const rescuedCount = Object.values(state.rescued).filter(Boolean).length;
  const reelsDone =
    state.b2Progress.reel04Passed && state.b2Progress.reel09Passed && state.b2Progress.reel12Passed;

  if (state.oaLevel === 2) {
    return {
      tag: '第三幕',
      text: `牢记 OA 中的《安全审片十诫》：前往 B2 审片台合规检视三卷母带（${
        [state.b2Progress.reel04Passed, state.b2Progress.reel09Passed, state.b2Progress.reel12Passed].filter(Boolean).length
      }/3），并结合云笔记与多站点暗语解救四名受困成员（${rescuedCount}/4）。`,
      actionLabel: !reelsDone && state.currentSite !== 'b2' && state.unlockedSites.includes('b2') ? '进入 B2 终端' : undefined,
      actionSite: state.unlockedSites.includes('b2') ? 'b2' : undefined,
    };
  }

  return {
    tag: '终局核验',
    text: '已触及院长绝密专档。在 B2 总控台做出最终抉择前，务必比对水利网电子版方志与木刻原叶影印件——不要轻信被篡改过的祀典顺序。',
    actionLabel: state.currentSite !== 'b2' ? '前往 B2 总控台' : undefined,
    actionSite: 'b2',
  };
}

export const InvestigationGuideRibbon: React.FC<InvestigationGuideRibbonProps> = ({
  state,
  onNavigateSite,
}) => {
  const [hidden, setHidden] = useState(false);
  const direction = resolveStageDirection(state);

  if (hidden) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={direction.tag + direction.text}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22 }}
        className="border-b border-[#e4ddce] bg-[#f8f4ea] px-4 py-1.5"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex shrink-0 items-center rounded border border-[#9e2a2b]/35 bg-[#9e2a2b]/8 px-2 py-0.5 font-mono-tech text-[11px] font-semibold text-[#9e2a2b]">
              {direction.tag}
            </span>
            <p className="truncate sm:whitespace-normal text-stone-700 leading-relaxed">
              {direction.text}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {direction.actionLabel && direction.actionSite && onNavigateSite && (
              <button
                type="button"
                onClick={() => onNavigateSite(direction.actionSite!, direction.actionDocId)}
                className="inline-flex items-center gap-0.5 rounded-full border border-[#9e2a2b]/35 bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#9e2a2b] hover:bg-red-50 cursor-pointer transition"
              >
                <span>{direction.actionLabel}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setHidden(true)}
              className="rounded p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              title="暂时收起方向提示"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
