import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Player {
  name: string;
  photo?: string; // base64 or uri
}

export interface GameState {
  teams: string[];
  target: number;
  round: number;
  scores: Record<string, number>;
  eliminated: string[];
  rejoined: string[];
  hasRejoined: string[];
  elimOrder: string[];
  podium: string[];
  log: string[];
  roundHistory: Snapshot[];
  gameOver: boolean;
}

export interface Snapshot {
  scores: Record<string, number>;
  eliminated: string[];
  rejoined: string[];
  hasRejoined: string[];
  elimOrder: string[];
  podium: string[];
  round: number;
  log: string[];
}

export interface HistoryEntry {
  id: number;
  date: string;
  podium: { name: string; score: number }[];
  players: number;
  rounds: number;
  target: number;
  finalScores: { name: string; score: number }[];
}

// ── Storage keys ──────────────────────────────────────────────────────────────
const LS_PLAYERS = 'tst_players';
const LS_SELECTED = 'tst_selected';
const LS_GAME = 'tst_game';
const LS_HISTORY = 'tst_history';
const LS_PHOTOS = 'tst_photos';

export const DEFAULT_PLAYERS: string[] = [
  'Chandra', 'Sandhya', 'Pavan', 'Swathi', 'Hari', 'Monica', 'Balu', 'Radha',
  'Vivek', 'Kalpana', 'Sandra', 'Kundhana', 'Abhi', 'SreeBodha', 'Jay',
  'Ranveeth', 'Yashu', 'Diya', 'Kushi',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
export async function loadPlayerList(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(LS_PLAYERS);
    return raw ? JSON.parse(raw) : [...DEFAULT_PLAYERS];
  } catch { return [...DEFAULT_PLAYERS]; }
}

export async function savePlayerList(list: string[], sel: string[]) {
  await AsyncStorage.setItem(LS_PLAYERS, JSON.stringify(list));
  await AsyncStorage.setItem(LS_SELECTED, JSON.stringify(sel));
}

export async function loadSelected(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(LS_SELECTED);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveGameState(state: GameState) {
  if (!state.teams.length) { await AsyncStorage.removeItem(LS_GAME); return; }
  await AsyncStorage.setItem(LS_GAME, JSON.stringify(state));
}

export async function loadGameState(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(LS_GAME);
    if (!raw) return null;
    const g = JSON.parse(raw) as GameState;
    return g;
  } catch { return null; }
}

export async function clearGameState() {
  await AsyncStorage.removeItem(LS_GAME);
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LS_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveHistory(history: HistoryEntry[]) {
  await AsyncStorage.setItem(LS_HISTORY, JSON.stringify(history));
}

export async function loadPhotos(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(LS_PHOTOS);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export async function savePhotos(photos: Record<string, string>) {
  await AsyncStorage.setItem(LS_PHOTOS, JSON.stringify(photos));
}

export async function deletePlayer(name: string) {
  const list = await loadPlayerList();
  const sel  = await loadSelected();
  const newList = list.filter(p => p !== name);
  const newSel  = sel.filter(p => p !== name);
  await savePlayerList(newList, newSel);
  // Also remove photo
  const photos = await loadPhotos();
  delete photos[name];
  await savePhotos(photos);
  return { newList, newSel };
}

// ── Pure game logic helpers ────────────────────────────────────────────────────
export function getSortedTeams(teams: string[], scores: Record<string, number>) {
  return [...teams].sort((a, b) => scores[a] - scores[b]);
}

export function getLeader(teams: string[], scores: Record<string, number>, eliminated: string[]) {
  const active = teams.filter(t => !eliminated.includes(t));
  if (!active.length) return null;
  return active.reduce((a, b) => scores[a] <= scores[b] ? a : b);
}

export function getHighestActiveScore(teams: string[], scores: Record<string, number>, eliminated: string[]) {
  const active = teams.filter(t => !eliminated.includes(t));
  return active.length ? Math.max(...active.map(t => scores[t])) : 0;
}

export function buildPodium(remaining: string[], elimOrder: string[], scores: Record<string, number>) {
  const survivors = [...remaining].sort((a, b) => scores[a] - scores[b]);
  const losers = [...elimOrder].reverse();
  return [...survivors, ...losers];
}

export function createSnapshot(state: GameState): Snapshot {
  return {
    scores: { ...state.scores },
    eliminated: [...state.eliminated],
    rejoined: [...state.rejoined],
    hasRejoined: [...state.hasRejoined],
    elimOrder: [...state.elimOrder],
    podium: [...state.podium],
    round: state.round,
    log: [...state.log],
  };
}

export function getBarColor(pct: number): string {
  if (pct >= 80) return '#e05050';
  if (pct >= 50) return '#f0a030';
  return '#00cccc';
}
