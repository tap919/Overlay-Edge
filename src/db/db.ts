import Dexie, { type Table } from 'dexie';

export enum Sport {
  NBA = 'NBA',
  NFL = 'NFL',
  MLB = 'MLB',
  WNBA = 'WNBA',
  NCAAB = 'NCAAB',
  NHL = 'NHL',
}

export enum BetType {
  SPREAD = 'SPREAD',
  TOTAL = 'TOTAL',
  MONEYLINE = 'MONEYLINE',
  PLAYER_PROP = 'PLAYER_PROP',
}

export enum BetStatus {
  PENDING = 'PENDING',
  WIN = 'WIN',
  LOSS = 'LOSS',
  PUSH = 'PUSH',
}

export interface ParlayLeg {
  sport: Sport;
  description: string;
  odds: number;
  status: BetStatus;
}

export interface Strategy {
  id?: number;
  name: string;
  description: string;
  formula?: string;
  isActive: boolean;
  createdAt: number;
}

export interface Bet {
  id?: number;
  sport: Sport;
  league: string;
  teams: string[];
  betType: BetType;
  odds: number;
  stake: number;
  bookmaker: string;
  strategyId: number;
  status: BetStatus;
  resultProfit?: number;
  timestamp: number;
  gameDate: number;
  gameTime?: string;
  timezone?: string;
  daysRest?: number;
  isParlay?: boolean;
  legs?: ParlayLeg[];
  tags?: string[];
  parsedDataRaw?: string;
}

export interface WatchedStat {
  id?: number;
  name: string;
  category: 'PLAYER' | 'TEAM';
  sport: Sport;
  targetValue: number;
  trendDirection: 'OVER' | 'UNDER';
  currentValue?: number;
  lastUpdated?: number;
  notes?: string;
}

export interface Dataset {
  id?: number;
  name: string;
  source: string;
  rowCount: number;
  lastSync: number;
  data: any[];
}

export interface ApiConfig {
  id?: number;
  label: string;
  key: string;
  endpoint?: string;
  status: 'active' | 'error' | 'pending';
  addedAt: number;
}

export interface UserSettings {
  id: number;
  bankroll: number;
  currency: string;
  theOddsApiKey?: string;
  syncFrequency: number;
  lastSync?: number;
  pin?: string; // bcrypt-style hash stored client-side
  accentColor?: string;
  hudOpacity?: number;
  animationsEnabled?: boolean;
  glowEffects?: boolean;
  compactMode?: boolean;
  fontSize?: 'xs' | 'sm' | 'base';
  dashboardLayout?: 'grid' | 'list';
  modelPriority?: string;
  edgeSensitivity?: number;
}

export interface LiveMarket {
  id?: number;
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: number;
  bookmakers: any[];
  lastUpdate: number;
}

export class AppDatabase extends Dexie {
  bets!: Table<Bet>;
  strategies!: Table<Strategy>;
  settings!: Table<UserSettings>;
  watchedStats!: Table<WatchedStat>;
  datasets!: Table<Dataset>;
  liveMarkets!: Table<LiveMarket>;
  apiConfigs!: Table<ApiConfig>;

  constructor() {
    super('OverlayEdgeDB');
    this.version(4).stores({
      bets: '++id, sport, strategyId, status, timestamp, gameDate, isParlay',
      strategies: '++id, name, isActive',
      settings: 'id',
      watchedStats: '++id, name, sport, category',
      datasets: '++id, name',
      liveMarkets: '++id, gameId, sport, commenceTime',
      apiConfigs: '++id, label, status',
    });
  }
}

export const db = new AppDatabase();

export async function seedData() {
  const strategyCount = await db.strategies.count();
  if (strategyCount === 0) {
    await db.strategies.bulkAdd([
      { name: 'NBA Prop Model v1', description: 'Focuses on player rebounds/assists overlays.', isActive: true, createdAt: Date.now() },
      { name: 'NFL Totals System', description: 'Unders on prime time games logic.', isActive: true, createdAt: Date.now() },
      { name: 'MLB Home Dog Strategy', description: 'Betting home favorites with specific pitcher matchups.', isActive: true, createdAt: Date.now() },
    ]);
  }
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      id: 1,
      bankroll: 1000,
      currency: 'USD',
      syncFrequency: 4,
      accentColor: '#FF6B00',
      hudOpacity: 90,
      animationsEnabled: true,
      glowEffects: true,
      compactMode: false,
      fontSize: 'sm',
      dashboardLayout: 'grid',
      modelPriority: 'DEEPSEEK',
      edgeSensitivity: 85,
    });
  }
}
