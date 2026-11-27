import type { ArchiveEntry, ChronicleDoc, OADocument, SiteId } from '../types/game';

/**
 * 轻量级零开销站点视图状态缓存（驻留内存）
 * 让每次只挂载当前激活的 1 个站点（杜绝多站点 DOM 与后台定时器造成的切页卡顿），
 * 同时切走再切回时毫秒级 100% 恢复上次停留的文档、版块、搜索词、展开楼层与滚动条位置。
 */
export interface SiteUiMemoryStore {
  mail: {
    selectedId: string;
    scrollY: number;
  };
  qinghe: {
    viewMode: 'home' | 'detail';
    category: '全部馆藏' | ArchiveEntry['category'] | '已发现残卷';
    localQuery: string;
    selectedEntryId: string;
    fullCatalogOpen: boolean;
    scrollY: number;
  };
  bbs: {
    viewMode: 'list' | 'thread';
    activeBoard: 'zijing' | 'developer';
    selectedThreadId: string;
    searchInput: string;
    visibleFloorLimit: number;
    onlyOp: boolean;
    expandAllThreads: boolean;
    scrollY: number;
  };
  chronicles: {
    viewMode: 'list' | 'detail';
    activeTab: '全部公开卷宗' | ChronicleDoc['classification'];
    searchInput: string;
    selectedDocId: string;
    scrollY: number;
  };
  oa: {
    activeFolder: '全部卷宗' | OADocument['folder'];
    searchQuery: string;
    selectedDocId: string;
    scrollY: number;
  };
  notes: {
    activeTab: 'surface' | 'deep';
    selectedNoteId: string;
    searchQuery: string;
    scrollY: number;
  };
  b2: {
    activeTab: 'telecine' | 'audio' | 'rescue' | 'master';
    scrollY: number;
  };
}

export const siteUiMemory: SiteUiMemoryStore = {
  mail: {
    selectedId: 'mail-prologue',
    scrollY: 0,
  },
  qinghe: {
    viewMode: 'home',
    category: '全部馆藏',
    localQuery: '',
    selectedEntryId: 'qh-37-09',
    fullCatalogOpen: false,
    scrollY: 0,
  },
  bbs: {
    viewMode: 'list',
    activeBoard: 'zijing',
    selectedThreadId: 'zijing-40918',
    searchInput: '',
    visibleFloorLimit: 8,
    onlyOp: false,
    expandAllThreads: false,
    scrollY: 0,
  },
  chronicles: {
    viewMode: 'list',
    activeTab: '全部公开卷宗',
    searchInput: '',
    selectedDocId: 'chr-1999-closure',
    scrollY: 0,
  },
  oa: {
    activeFolder: '全部卷宗',
    searchQuery: '',
    selectedDocId: '',
    scrollY: 0,
  },
  notes: {
    activeTab: 'surface',
    selectedNoteId: '',
    searchQuery: '',
    scrollY: 0,
  },
  b2: {
    activeTab: 'telecine',
    scrollY: 0,
  },
};

export function saveSiteScroll(site: SiteId, scrollY: number) {
  siteUiMemory[site].scrollY = scrollY;
}

export function getSiteScroll(site: SiteId): number {
  return siteUiMemory[site].scrollY || 0;
}

export function resetAllSiteMemory() {
  siteUiMemory.mail = { selectedId: 'mail-prologue', scrollY: 0 };
  siteUiMemory.qinghe = {
    viewMode: 'home',
    category: '全部馆藏',
    localQuery: '',
    selectedEntryId: 'qh-37-09',
    fullCatalogOpen: false,
    scrollY: 0,
  };
  siteUiMemory.bbs = {
    viewMode: 'list',
    activeBoard: 'zijing',
    selectedThreadId: 'zijing-40918',
    searchInput: '',
    visibleFloorLimit: 8,
    onlyOp: false,
    expandAllThreads: false,
    scrollY: 0,
  };
  siteUiMemory.chronicles = {
    viewMode: 'list',
    activeTab: '全部公开卷宗',
    searchInput: '',
    selectedDocId: 'chr-1999-closure',
    scrollY: 0,
  };
  siteUiMemory.oa = { activeFolder: '全部卷宗', searchQuery: '', selectedDocId: '', scrollY: 0 };
  siteUiMemory.notes = { activeTab: 'surface', selectedNoteId: '', searchQuery: '', scrollY: 0 };
  siteUiMemory.b2 = { activeTab: 'telecine', scrollY: 0 };
}
