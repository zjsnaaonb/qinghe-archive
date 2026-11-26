export type SiteId =
  | 'mail'        // 序幕/收件箱：林知夏定时求救邮件 & 系统通知
  | 'qinghe'      // 站点1：青禾数字民俗馆（高校公开检索门户）
  | 'bbs'         // 站点2：紫荆站树洞 & 显影液论坛（双版块网络都市传说快照）
  | 'chronicles'  // 站点3：云溪县水利移民与方志查询网（老旧政务档案网）
  | 'oa'          // 站点4：青禾工程内部 OA 与工单系统（三级权限社工登录）
  | 'notes'       // 站点5：林知夏私人加密云笔记『夏夜拾遗』
  | 'b2';         // 站点6：地下 B2 远程逐帧审片台与安防监控终端

export type ActNumber = 1 | 2 | 3 | 4 | 5;

export type ScareMode = 'full' | 'psychological';

export type OALevel = 0 | 1 | 2 | 3; // 0: 未登录, 1: qh_guest, 2: chen_mo, 3: zheng_gd

export type EndingId =
  | 'ending_assimilation'
  | 'ending_overload'
  | 'ending_sacrifice'
  | 'ending_mirror_leak'
  | 'ending_true';

export interface ArchiveEntry {
  id: string;
  code: string;
  title: string;
  village: string;
  year: string;
  category: '图像档案' | '口述访谈' | '器物标本' | '工作公示' | '异常残卷';
  photographer?: string;
  hiddenFromList?: boolean; // 仅通过特定检索词可见
  keywords: string[];
  summary: string;
  content: string;
  act3MutatedContent?: string;
  act4MutatedContent?: string;
  specialPhotoId?:
    | 'threshing_1998'
    | 'team_portraits'
    | 'nuo_mask'
    | 'village_mist'
    | 'shrine_1998'
    | 'qh_01_02'
    | 'qh_05_08'
    | 'qh_08_01'
    | 'qh_10_04'
    | 'qh_12_03'
    | 'qh_19_02'
    | 'qh_21_09'
    | 'qh_23_05'
    | 'qh_26_03'
    | 'qh_28_08'
    | 'qh_31_02'
    | 'qh_38_n03';
  clueNote?: {
    id: string;
    title: string;
    detail: string;
  };
}

export interface BBSReply {
  floor: number;
  author: string;
  avatarTag: string;
  time: string;
  ipLocation: string;
  content: string;
  act3Appended?: boolean; // 第三幕后动态浮现的诡异新回复
  isAssimilatedTone?: boolean;
  hiddenKeywordRequired?: string;
}

export interface BBSThread {
  id: string;
  board: 'zijing' | 'developer'; // 紫荆树洞 | 显影液DV论坛
  tag: string;
  title: string;
  author: string;
  createdAt: string;
  views: number;
  isHot?: boolean;
  isLocked?: boolean;
  keywords: string[];
  replies: BBSReply[];
  unlocksSite?: SiteId;
  clueNote?: {
    id: string;
    title: string;
    detail: string;
  };
}

export interface ChronicleDoc {
  id: string;
  docNumber: string;
  department: string;
  year: string;
  title: string;
  classification: '公开政务' | '历史台账' | '古籍影印' | '内部协查' | '信访卷宗';
  hiddenFromDefault?: boolean;
  keywords: string[];
  summary: string;
  content: string;
  specialVisual?: 'elevation_map' | 'woodblock_seal' | 'thumbprint_ledger';
  clueNote?: {
    id: string;
    title: string;
    detail: string;
  };
}

export interface OADocument {
  id: string;
  minLevel: 1 | 2 | 3;
  folder: '通知公告' | '门禁考勤' | '内部邮件' | '修复工单' | '安全规范' | '院长专档';
  code: string;
  title: string;
  senderOrAuthor: string;
  date: string;
  isAlert?: boolean;
  encryptedVaultId?: string; // 对应 AES-GCM 密文块 ID
  fallbackPlainContent?: string; // Level 1 或非密文补充
  keywords: string[];
  unlocksSite?: SiteId;
  clueNote?: {
    id: string;
    title: string;
    detail: string;
  };
}

export interface ZhixiaNote {
  id: string;
  date: string;
  title: string;
  weather: string;
  requiresDeepUnlock?: boolean;
  encryptedVaultId?: string;
  plainContent?: string;
  keywords: string[];
  clueNote?: {
    id: string;
    title: string;
    detail: string;
  };
}

export interface DiscoveredClue {
  id: string;
  title: string;
  detail: string;
  sourceSite: SiteId;
  sourceDocId?: string;
  discoveredAt: string;
  isPlayerClip?: boolean;
}

export interface RescueStatus {
  suXiaotang: boolean;  // 苏晓棠：善本库 B1-09 切断 WS-B2-04 屏幕锚点 (1140)
  zhaoYiming: boolean;  // 赵一鸣：音频分轨辨伪锁定 B2-05 消音棚
  chenMo: boolean;      // 陈默：回滚 EyeGen 补帧权重 (BLIND-1998-REVERT)
  linZhixia: boolean;   // 林知夏：解除双重视野朱砂锚点 (ZX-1017)
}

export interface B2InspectionProgress {
  reel04Passed: boolean; // QH-38-04 迎社入祠（人数骤减 + 琥珀黄滤光跳帧）
  reel09Passed: boolean; // QH-38-09 锣响三声（先静音再读白底剧目牌）
  reel12Passed: boolean; // QH-38-12 戏台柱联（蓝布衫经过三号机柜关灯）
  violations: number;
}

export interface EncryptedBlock {
  iv: string;          // Base64 12-byte IV
  salt: string;        // Base64 16-byte PBKDF2 salt
  ciphertext: string;  // Base64 AES-GCM ciphertext + authTag
  keyHintHash: string; // SHA-256 verification digest
}

export interface EndingPayload {
  id: EndingId;
  code: string;
  subtitle: string;
  title: string;
  tone: 'bad' | 'normal' | 'bittersweet' | 'twist' | 'true';
  paragraphs: string[];
  epilogueDocTitle: string;
  epilogueDocBody: string;
}

export interface GameState {
  act: ActNumber;
  currentSite: SiteId;
  unlockedSites: SiteId[];
  oaLevel: OALevel;
  zhixiaDeepUnlocked: boolean;
  scareMode: ScareMode;
  audioMuted: boolean;
  contamination: number; // 0 - 100 认知/视网膜残留指数
  readDocIds: string[];
  searchHistory: string[];
  photoViewCounts: Record<string, number>;
  discoveredClues: DiscoveredClue[];
  unlockedKeywords: string[];
  playerMemo: string;
  rescued: RescueStatus;
  b2Progress: B2InspectionProgress;
  decryptedCache: Record<string, string>; // vaultId -> 已在浏览器实时解密的正文
  unlockedEndings: EndingId[];
  activeEnding: EndingId | null;
  startedAt: number;
  totalClicks: number;
  hasEnteredGame?: boolean;
}
