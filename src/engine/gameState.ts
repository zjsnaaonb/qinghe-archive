import type { DiscoveredClue, EndingId, GameState, OALevel, ScareMode, SiteId } from '../types/game';

const STORAGE_KEY = 'qinghe_arg_save_v1';

export function createInitialGameState(): GameState {
  return {
    act: 1,
    currentSite: 'mail',
    unlockedSites: ['mail'],
    oaLevel: 0,
    zhixiaDeepUnlocked: false,
    scareMode: 'full',
    audioMuted: false,
    contamination: 0,
    readDocIds: [],
    searchHistory: [],
    photoViewCounts: {},
    discoveredClues: [],
    unlockedKeywords: [],
    playerMemo: '',
    rescued: {
      suXiaotang: false,
      zhaoYiming: false,
      chenMo: false,
      linZhixia: false,
    },
    b2Progress: {
      reel04Passed: false,
      reel09Passed: false,
      reel12Passed: false,
      violations: 0,
    },
    decryptedCache: {},
    unlockedEndings: [],
    activeEnding: null,
    startedAt: Date.now(),
    totalClicks: 0,
    hasEnteredGame: false,
  };
}

export function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialGameState();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return {
      ...createInitialGameState(),
      ...parsed,
      rescued: {
        ...createInitialGameState().rescued,
        ...(parsed.rescued || {}),
      },
      b2Progress: {
        ...createInitialGameState().b2Progress,
        ...(parsed.b2Progress || {}),
      },
    };
  } catch {
    return createInitialGameState();
  }
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function exportSaveCode(state: GameState): string {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return 'QH98-' + btoa(bin);
}

export function importSaveCode(code: string): GameState | null {
  try {
    const trimmed = code.trim();
    const payload = trimmed.startsWith('QH98-') ? trimmed.slice(5) : trimmed;
    const bin = atob(payload);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<GameState>;
    if (!parsed.unlockedSites || !Array.isArray(parsed.unlockedSites)) return null;
    return {
      ...createInitialGameState(),
      ...parsed,
    };
  } catch {
    return null;
  }
}

export function computeDerivedAct(state: GameState): 1 | 2 | 3 | 4 | 5 {
  if (state.activeEnding) return 5;
  if (state.oaLevel >= 3) return 4;
  if (state.oaLevel >= 2 || state.unlockedSites.includes('b2') || state.unlockedSites.includes('notes')) return 3;
  if (state.oaLevel >= 1 || state.unlockedSites.includes('chronicles')) return 2;
  return 1;
}

export type { DiscoveredClue, EndingId, OALevel, ScareMode, SiteId };
