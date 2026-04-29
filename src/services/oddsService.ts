import { db, LiveMarket } from '../db/db';

export async function syncLiveOdds(sport: string = 'basketball_nba') {
  try {
    const response = await fetch(`/api/odds?sport=${sport}`);
    if (!response.ok) {
      throw new Error('Failed to fetch odds from proxy');
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      const markets: LiveMarket[] = data.map((game: any) => ({
        gameId: game.id,
        sport: game.sport_key,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        commenceTime: new Date(game.commence_time).getTime(),
        bookmakers: game.bookmakers,
        lastUpdate: Date.now()
      }));

      // Upsert into IndexedDB
      for (const market of markets) {
        const existing = await db.liveMarkets.where('gameId').equals(market.gameId).first();
        if (existing) {
          await db.liveMarkets.put({ ...market, id: existing.id });
        } else {
          await db.liveMarkets.add(market);
        }
      }
      
      return markets.length;
    }
    
    return 0;
  } catch (error) {
    console.error('Odds Sync Error:', error);
    throw error;
  }
}
