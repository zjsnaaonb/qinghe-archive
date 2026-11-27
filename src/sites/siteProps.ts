import type {
  DiscoveredClue,
  EndingId,
  GameState,
  OALevel,
  RescueStatus,
  SiteId,
} from '../types/game';

export interface ScarePayload {
  title: string;
  message: string;
  visualType: 'peeker' | 'shrine' | 'rule_break' | 'meta_eye';
}

export interface NavCommand {
  seq: number;
  site: SiteId;
  itemId: string;
}

export interface NavSnapshot {
  site: SiteId;
  itemId: string;
  label: string;
}

export interface CommonSiteProps {
  state: GameState;
  focusedItemId?: string | null;
  onClearFocus?: () => void;
  navCommand?: NavCommand | null;
  onRecordNav?: (itemId: string, label: string) => void;
  onNavigateSite: (site: SiteId, targetItemId?: string) => void;
  onUnlockSite: (site: SiteId) => void;
  onMarkRead: (docId: string) => void;
  onAddClue: (clue: Omit<DiscoveredClue, 'discoveredAt'>) => void;
  onAddKeywords: (keywords: string[]) => void;
  onRecordPhotoView: (photoId: string) => void;
  onAdjustContamination: (delta: number) => void;
  onTriggerScare: (scare: ScarePayload) => void;
  onElevateOaLevel: (level: OALevel) => void;
  onUnlockZhixiaDeep: () => void;
  onCacheDecrypted: (vaultId: string, plaintext: string) => void;
  onRescueMember: (member: keyof RescueStatus) => void;
  onPassB2Reel: (reel: 'reel04Passed' | 'reel09Passed' | 'reel12Passed') => void;
  onRecordB2Violation: () => void;
  onTriggerEnding: (endingId: EndingId) => void;
  onGlobalSearch: (query: string) => void;
}
