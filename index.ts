// api/index.ts  (was app.ts or similar)
import express, { Request, Response } from "express";
import yahooFinance from "yahoo-finance2";
import { VercelRequest, VercelResponse } from "@vercel/node";

const app = express();

/** Helper: force req.query.symbol → string */
function getSymbol(req: Request): string {
  const q = req.query.symbol;
  const raw = Array.isArray(q) ? q[0] : q;
  return (raw ?? "CCL.NS").toString().toUpperCase();
}

app.get("/", async (req: Request, res: Response) => {
  const symbol = getSymbol(req);
  const today = new Date();
  const from = new Date(today);
  from.setFullYear(today.getFullYear() - 2);

  try {
    const rows = await yahooFinance.historical(symbol, {
      period1: from,
      period2: today,
      interval: "1d",
    });

    /* … build HTML exactly as in your snippet … */

    res.send(html);
  } catch (err: unknown) {
    res.status(500).send(`<pre>❌ ${(err as Error).message}</pre>`);
  }
});

/* ----------  EXPORT instead of listen()  ---------- */
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}

/* Optional: enable `vercel dev` hot-reload locally */
if (process.env.VERCEL !== "1") {
  app.listen(3000, () => console.log("▶︎ local http://localhost:3000"));
}
