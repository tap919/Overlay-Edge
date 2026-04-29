import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Proxy for The Odds API
  app.get("/api/odds", async (req, res) => {
    try {
      const apiKey = process.env.THE_ODDS_API_KEY;
      if (!apiKey) throw new Error("THE_ODDS_API_KEY not configured");

      const { sport = 'americanfootball_nfl', regions = 'us', markets = 'h2h,spreads' } = req.query;
      
      const response = await axios.get(`https://api.the-odds-api.com/v4/sports/${sport}/odds`, {
        params: {
          apiKey,
          regions,
          markets,
          oddsFormat: 'decimal'
        }
      });
      
      res.json(response.data);
    } catch (error: any) {
      console.error("Odds API Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // API Proxy for DeepSeek
  app.post("/api/chat/deepseek", async (req, res) => {
    try {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

      const response = await axios.post("https://api.deepseek.com/v1/chat/completions", req.body, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      });
      
      res.json(response.data);
    } catch (error: any) {
      console.error("DeepSeek Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
