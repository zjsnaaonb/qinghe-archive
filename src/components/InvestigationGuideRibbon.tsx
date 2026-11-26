import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, ChevronRight, X } from 'lucide-react';
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

/**
 * 克制、不剧透的阶段调查方向引导条（解决“不知从何下手”但绝不替玩家给出谜底）
 */
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

  if (!state.unlockedSites.includes('chronicles')) {
    return {
      tag: '跨站追查',
      text: '已解锁校园树洞与显影液 BBS！翻看老胶片修复求助帖寻找外部水利档案网，同时用鼠标划选任何可疑数字/日期即可【摘录到手记】。',
      actionLabel: state.currentSite !== 'bbs' ? '前往树洞/BBS' : undefined,
      actionSite: state.currentSite !== 'bbs' ? 'bbs' : undefined,
    };
  }

  if (state.oaLevel < 1) {
    return {
      tag: '潜入内网',
      text: '青禾馆页脚藏着「内部教职工 OA 入口」。结合校园树洞吐槽的规则与公开网页里的关键编号/日期，推算公共访客账号密码。',
      actionLabel: state.currentSite !== 'oa' && state.unlockedSites.includes('oa') ? '前往 OA 登录' : undefined,
      actionSite: state.unlockedSites.includes('oa') ? 'oa' : undefined,
    };
  }

  if (state.oaLevel === 1) {
    return {
      tag: '第二幕',
      text: '交叉核查水利网的淹没台账与 OA 门禁考勤异常：查清技术员陈默的去向，根据草稿备忘与论坛签名推算二级权限密码。',
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
      }/3），并结合云笔记与多站点暗语设法解救四名受困成员（${rescuedCount}/4）。`,
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
        className="border-b border-zinc-800/80 bg-zinc-900/70 px-4 py-1.5 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
              <Compass className="h-3 w-3" />
              {direction.tag}
            </span>
            <p className="truncate sm:whitespace-normal text-zinc-300/95 leading-relaxed">
              {direction.text}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {direction.actionLabel && direction.actionSite && onNavigateSite && (
              <button
                type="button"
                onClick={() => onNavigateSite(direction.actionSite!, direction.actionDocId)}
                className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-200 hover:bg-amber-500/25 cursor-pointer transition"
              >
                <span>{direction.actionLabel}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setHidden(true)}
              className="rounded p-0.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
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
