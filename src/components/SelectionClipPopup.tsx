import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Pin, Search, Check } from 'lucide-react';
import type { SiteId } from '../types/game';
import { horrorAudio } from '../engine/audio';

interface SelectionClipPopupProps {
  currentSite: SiteId;
  onClipText: (snippet: string, site: SiteId) => void;
  onSearchText: (query: string) => void;
}

export const SelectionClipPopup: React.FC<SelectionClipPopupProps> = ({
  currentSite,
  onClipText,
  onSearchText,
}) => {
  const [selectionInfo, setSelectionInfo] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const [clippedToast, setClippedToast] = useState(false);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // 忽略点击弹窗本身或输入框内部
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-clip-popup="true"]')) return;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        setSelectionInfo(null);
        return;
      }

      setTimeout(() => {
        const sel = window.getSelection();
        const raw = sel?.toString().trim() ?? '';
        if (raw.length >= 2 && raw.length <= 220 && sel && sel.rangeCount > 0) {
          const rect = sel.getRangeAt(0).getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const x = Math.max(120, Math.min(window.innerWidth - 140, rect.left + rect.width / 2));
            const y = Math.max(72, rect.top - 12);
            setSelectionInfo({ text: raw, x, y });
            setClippedToast(false);
            return;
          }
        }
        setSelectionInfo(null);
      }, 10);
    };

    const handleScroll = () => setSelectionInfo(null);

    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const handleClip = () => {
    if (!selectionInfo) return;
    horrorAudio.playClick('unlock');
    onClipText(selectionInfo.text, currentSite);
    setClippedToast(true);
    setTimeout(() => {
      setSelectionInfo(null);
      setClippedToast(false);
      window.getSelection()?.removeAllRanges();
    }, 650);
  };

  const handleSearch = () => {
    if (!selectionInfo) return;
    horrorAudio.playClick('ui');
    const q = selectionInfo.text.slice(0, 28);
    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
    onSearchText(q);
  };

  return (
    <AnimatePresence>
      {selectionInfo && (
        <motion.div
          data-clip-popup="true"
          initial={{ opacity: 0, y: 8, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.95 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: selectionInfo.x,
            top: selectionInfo.y,
            transform: 'translate(-50%, -100%)',
          }}
          className="z-[110] flex items-center gap-1 rounded-full border border-amber-500/50 bg-zinc-950/95 px-2 py-1 text-xs text-zinc-100 shadow-2xl shadow-black/80 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={handleClip}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-amber-200 hover:bg-amber-500/20 cursor-pointer transition"
          >
            {clippedToast ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300">已摘录</span>
              </>
            ) : (
              <>
                <Pin className="h-3.5 w-3.5 text-amber-400" />
                <span>摘录到手记</span>
              </>
            )}
          </button>
          <span className="h-3.5 w-px bg-zinc-700" />
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition"
          >
            <Search className="h-3.5 w-3.5 text-sky-400" />
            <span>跨站检索</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
