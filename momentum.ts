import express from "express";
import yahooFinance from "yahoo-finance2";

const app = express();
const PORT = 3000;

// NSE stock list (use full list if needed)
const symbols = [
  "ABB", "ACC", "APLAPOLLO", "ATUL", "AUBANK", "AARTIIND", "ABBOTINDIA", "ADANIENSOL", "ADANIENT", "ADANIGREEN",
  "ADANIPORTS", "ATGL", "ABCAPITAL", "ABFRL", "ALKEM", "AMBUJACEM", "ANGELONE", "APOLLOHOSP", "APOLLOTYRE", "ASHOKLEY",
  "ASIANPAINT", "ASTRAL", "AUROPHARMA", "DMART", "AXISBANK", "BSE", "BAJAJ-AUTO", "BAJFINANCE", "BAJAJFINSV", "BALKRISIND",
  "BANDHANBNK", "BANKBARODA", "BANKINDIA", "BATAINDIA", "BERGEPAINT", "BEL", "BHARATFORG", "BHEL", "BPCL", "BHARTIARTL",
  "BIOCON", "BSOFT", "BOSCHLTD", "BRITANNIA", "CDSL", "CESC", "CGPOWER", "CANFINHOME", "CANBK", "CHAMBLFERT", "CHOLAFIN",
  "CIPLA", "CUB", "COALINDIA", "COFORGE", "COLPAL", "CAMS", "CONCOR", "COROMANDEL", "CROMPTON", "CUMMINSIND", "CYIENT",
  "DLF", "DABUR", "DALBHARAT", "DEEPAKNTR", "DELHIVERY", "DIVISLAB", "DIXON", "DRREDDY", "LALPATHLAB", "EICHERMOT",
  "ESCORTS", "ETERNAL", "EXIDEIND", "FEDERALBNK", "GAIL", "GMRAIRPORT", "GLENMARK", "GODREJCP", "GODREJPROP", "GRANULES",
  "GRASIM", "GUJGASLTD", "GNFC", "HCLTECH", "HDFCAMC", "HDFCBANK", "HDFCLIFE", "HFCL", "HUDCO", "HAVELLS", "HEROMOTOCO",
  "HINDALCO", "HAL", "HINDCOPPER", "HINDPETRO", "HINDUNILVR", "HINDZINC", "ICICIBANK", "ICICIGI", "ICICIPRULI",
  "IDFCFIRSTB", "IIFL", "IPCALAB", "IRB", "IRCTC", "IREDA", "IRFC", "ITC", "INDIACEM", "INDIAMART", "INDIANB", "IEX",
  "INDHOTEL", "IOC", "IGL", "INDUSTOWER", "INDUSINDBK", "NAUKRI", "INFY", "INOXWIND", "INDIGO", "JKCEMENT", "JSWENERGY",
  "JSWSTEEL", "JSL", "JINDALSTEL", "JIOFIN", "JUBLFOOD", "KEI", "KPITTECH", "KALYANKJIL", "KOTAKBANK", "LTF", "LTTS",
  "LICHSGFIN", "LICI", "LTIM", "LT", "LAURUSLABS", "LUPIN", "M&MFIN", "MCX", "MRF", "LODHA", "MGL", "M&M", "MANAPPURAM",
  "MARICO", "MARUTI", "MFSL", "MAXHEALTH", "METROPOLIS", "MPHASIS", "MUTHOOTFIN", "NATIONALUM", "NBCC", "NCC", "NHPC",
  "NMDC", "NTPC", "NAVINFLUOR", "NESTLEIND", "NYKAA", "OBEROIRLTY", "ONGC", "OIL", "PAYTM", "OFSS", "POLICYBZR", "PIIND",
  "PNBHOUSING", "PVRINOX", "PAGEIND", "PATANJALI", "PERSISTENT", "PETRONET", "PHOENIXLTD", "PIDILITIND", "PEL", "POLYCAB",
  "POONAWALLA", "PFC", "POWERGRID", "PRESTIGE", "PNB", "RBLBANK", "RECLTD", "RAMCOCEM", "RELIANCE", "SBICARD", "SBILIFE",
  "SJVN", "SRF", "MOTHERSON", "SHREECEM", "SHRIRAMFIN", "SIEMENS", "SOLARINDS", "SONACOMS", "SBIN", "SAIL", "SUNPHARMA",
  "SUNTV", "SUPREMEIND", "SYNGENE", "TVSMOTOR", "TATACHEM", "TATACOMM", "TCS", "TATACONSUM", "TATAELXSI", "TATAMOTORS",
  "TATAPOWER", "TATASTEEL", "TATATECH", "TECHM", "TITAGARH", "TITAN", "TORNTPHARM", "TORNTPOWER", "TRENT", "TIINDIA",
  "UPL", "ULTRACEMCO", "UNIONBANK", "UBL", "UNITDSPR", "VBL", "VEDL", "IDEA", "VOLTAS", "WIPRO", "YESBANK", "ZYDUSLIFE"
].map((s) => s + ".NS");
// const symbols = [
//   "TCS", "INFY", "RELIANCE", "HDFCBANK", "ICICIBANK",
//   "LT", "SBIN", "WIPRO", "ITC", "AXISBANK"
// ].map((s) => s + ".NS");

async function getWeeklyMomentum(symbol: string): Promise<{
  symbol: string;
  week1Close: number;
  week2Close: number;
  delta: number;
}> {
  const today = new Date();
  const fiveWeeksAgo = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 35); // ~5 weeks ago

  try {
    const data = await yahooFinance.historical(symbol, {
      period1: fiveWeeksAgo,
      period2: today,
      interval: "1wk",
    });

    if (!data || data.length < 5) throw new Error("Not enough data");

    const week1Close = data[data.length - 3].close!; // 2 weeks ago
    const week2Close = data[data.length - 2].close!; // last week

    const delta = ((week2Close - week1Close) / week1Close) * 100;

    return { symbol, week1Close, week2Close, delta };
  } catch (err) {
    console.error(`⚠️ Error for ${symbol}:`, err);
    return { symbol, week1Close: NaN, week2Close: NaN, delta: NaN };
  }
}
async function getWeeklyReturns(symbol: string): Promise<{
  symbol: string;
  lastWeek: number;
  prevWeek: number;
}> {
  const today = new Date();
  const fiveWeeksAgo = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 35);

  try {
    const data = await yahooFinance.historical(symbol, {
      period1: fiveWeeksAgo,
      period2: today,
      interval: "1wk",
    });

    if (!data || data.length < 5) throw new Error("Not enough weekly data");

    const w1 = data[data.length - 4].close!;
    const w2 = data[data.length - 3].close!;
    const w3 = data[data.length - 2].close!;

    const prevWeek = ((w2 - w1) / w1) * 100;
    const lastWeek = ((w3 - w2) / w2) * 100;

    return { symbol, lastWeek, prevWeek };
  } catch (err) {
    console.error(`⚠️ Error for ${symbol}:`, err);
    return { symbol, lastWeek: NaN, prevWeek: NaN };
  }
}




app.get("/", async (_req, res) => {

  // New: Weekly top return lists
const weeklyReturns = await Promise.all(symbols.map(getWeeklyReturns));
const lastWeekSorted = weeklyReturns
  .filter((r) => !isNaN(r.lastWeek))
  .sort((a, b) => b.lastWeek - a.lastWeek)
  .slice(0, 10);

const prevWeekSorted = weeklyReturns
  .filter((r) => !isNaN(r.prevWeek))
  .sort((a, b) => b.prevWeek - a.prevWeek)
  .slice(0, 10);

  res.setHeader("Content-Type", "text/html");

  res.write(`<!doctype html><html><head>
    <meta charset="utf-8" />
    <title>NSE Weekly Momentum</title>
    <style>
      body { font-family: sans-serif; padding: 1rem; }
      table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
      th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: right; }
      th { background: #f0f0f0; }
      td:first-child, th:first-child { text-align: left; }
      .pos { color: green; }
      .neg { color: red; }
    </style>
  </head><body>
    <h2>NSE Stocks – Weekly Momentum Acceleration</h2>
    <p>Return calculated based on weekly close prices</p>
    <table><thead>
     <tr>
  <th>Symbol</th>
  <th>Week 1 Close</th>
  <th>Week 2 Close</th>
  <th>Δ Momentum (%)</th>
</tr>

    </thead><tbody>
  `);

  const results = await Promise.all(symbols.map(getWeeklyMomentum));
  const filtered = results.filter((r) => !isNaN(r.delta));
  const sorted = filtered.sort((a, b) => b.delta - a.delta); // Sort descending by acceleration

  for (const row of sorted) {
    const css = row.delta >= 0 ? "pos" : "neg";
    res.write(`<tr>
      <td>${row.symbol}</td>
      <td>₹${row.week1Close.toFixed(2)}</td>
      <td>₹${row.week2Close.toFixed(2)}</td>
      <td class="${css}">${row.delta.toFixed(2)}%</td>
    </tr>`);
  }
  
  res.write(`<h2>🏆 Top 10 Last Week Performers</h2>
    <table><thead>
    <tr><th>Symbol</th><th>Last Week Return (%)</th></tr>
    </thead><tbody>`);
    
    for (const r of lastWeekSorted) {
      const css = r.lastWeek >= 0 ? "pos" : "neg";
      res.write(`<tr><td>${r.symbol}</td><td class="${css}">${r.lastWeek.toFixed(2)}%</td></tr>`);
    }
    
    res.write(`</tbody></table>`);
    
    
    res.write(`<h2>📉 Top 10 Previous Week Performers</h2>
    <table><thead>
    <tr><th>Symbol</th><th>Prev Week Return (%)</th></tr>
    </thead><tbody>`);
    
    for (const r of prevWeekSorted) {
      const css = r.prevWeek >= 0 ? "pos" : "neg";
      res.write(`<tr><td>${r.symbol}</td><td class="${css}">${r.prevWeek.toFixed(2)}%</td></tr>`);
    }
    
    res.write(`</tbody></table>`);
    

  res.end(`</tbody></table></body></html>`);
});

app.listen(PORT, () => {
  console.log(`🚀 Server live at http://localhost:${PORT}`);
});
