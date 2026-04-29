import { GoogleGenAI } from "@google/genai";
import { BetType, Sport } from "../db/db";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ParsedBet {
  sport: Sport;
  teams: string[];
  betType: BetType;
  odds: number;
  stake: number;
  bookmaker: string;
  gameDate?: string;
  gameTime?: string;
  daysRest?: number;
}

export async function parseBetScreenshot(base64Image: string): Promise<ParsedBet | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(",")[1] || base64Image,
          },
        },
        {
          text: `Extract the sports betting details from this screenshot. 
          Identify:
          - Sport (one of: NBA, NFL, MLB, WNBA)
          - Teams or Players involved
          - Bet Type (Spread, Total, Moneyline, or Player Prop)
          - Odds (convert to decimal format if American/Fractional)
          - Stake (amount wagered)
          - Bookmaker/App name
          - Game Date (YYYY-MM-DD)
          - Game Time (HH:mm, 24h format if possible)
          - Rest context (if visible, e.g. "2nd of B2B" means 0 days rest)
          
          Return only a valid JSON matching this structure:
          {
            "sport": "SportName",
            "teams": ["Team1", "Team2"],
            "betType": "Type",
            "odds": 1.91,
            "stake": 100.0,
            "bookmaker": "Name",
            "gameDate": "YYYY-MM-DD",
            "gameTime": "19:30",
            "daysRest": 1
          }`,
        },
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    
    // Normalize values
    return {
      sport: normalizeSport(parsed.sport),
      teams: Array.isArray(parsed.teams) ? parsed.teams : [],
      betType: normalizeBetType(parsed.betType),
      odds: typeof parsed.odds === 'number' ? parsed.odds : 2.0,
      stake: typeof parsed.stake === 'number' ? parsed.stake : 0,
      bookmaker: parsed.bookmaker || 'Unknown',
      gameDate: parsed.gameDate,
      gameTime: parsed.gameTime,
      daysRest: parsed.daysRest
    };
  } catch (error) {
    console.error("Error parsing screenshot:", error);
    return null;
  }
}

function normalizeSport(val: string): Sport {
  const v = val?.toUpperCase();
  if (v?.includes('NBA')) return Sport.NBA;
  if (v?.includes('NFL')) return Sport.NFL;
  if (v?.includes('MLB')) return Sport.MLB;
  if (v?.includes('WNBA')) return Sport.WNBA;
  return Sport.NBA; // Default
}

function normalizeBetType(val: string): BetType {
  const v = val?.toUpperCase();
  if (v?.includes('SPREAD')) return BetType.SPREAD;
  if (v?.includes('TOTAL')) return BetType.TOTAL;
  if (v?.includes('MONEYLINE')) return BetType.MONEYLINE;
  if (v?.includes('PROP')) return BetType.PLAYER_PROP;
  return BetType.MONEYLINE;
}
