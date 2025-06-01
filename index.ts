// api/index.ts
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
  from.setFullYear(today.getFullYear() - 2); // last 2 years

  try {
    /* -------- fetch data from Yahoo Finance -------- */
    const rows = await yahooFinance.historical(symbol, {
      period1: from,
      period2: today,
      interval: "1d",
    });

    /* -------- transform & sort by biggest moves -------- */
    const table = rows
      .map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        open: r.open,
        close: r.close,
        diff: r.close - r.open,
      }))
      .sort((a, b) => b.diff - a.diff);

    /* -------- build <tbody> -------- */
    const body = table
      .map(
        (r) =>
          `<tr>
           <td>${r.date}</td>
           <td>${r.open.toFixed(2)}</td>
           <td>${r.close.toFixed(2)}</td>
           <td>${r.diff.toFixed(2)}</td>
         </tr>`
      )
      .join("");

    /* -------- full HTML document -------- */
    const html = `<!doctype html>
      <html lang="en"><head>
        <meta charset="utf-8" />
        <title>${symbol} open–close sorter</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          body{font-family:sans-serif;padding:1rem}
          table{border-collapse:collapse;margin-top:.8rem}
          td,th{padding:.35rem .6rem;border:1px solid #ccc;text-align:right}
          th{cursor:pointer}
          input{padding:.25rem .5rem;font-size:1rem}
          button{padding:.25rem .7rem;font-size:1rem;margin-left:.4rem}
        </style>
      </head><body>
        <h2>${symbol} – biggest close-minus-open moves (last 2 yrs)</h2>

        <form>
          <input name="symbol" value="${symbol}" placeholder="e.g. INFY.NS">
          <button type="submit">Go</button>
        </form>

        <table id="data-table">
          <thead>
            <tr>
              <th onclick="sortTable(0)">Date</th>
              <th>Open</th>
              <th>Close</th>
              <th onclick="sortTable(3)">Close–Open</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>

        <script>
          let ascending = true;
          function sortTable(colIndex) {
            const table = document.getElementById("data-table");
            const tbody = table.querySelector("tbody");
            const rows  = Array.from(tbody.rows);

            rows.sort((a, b) => {
              const valA = a.cells[colIndex].innerText;
              const valB = b.cells[colIndex].innerText;
              const numA = colIndex === 0 ? new Date(valA) : parseFloat(valA);
              const numB = colIndex === 0 ? new Date(valB) : parseFloat(valB);
              return ascending ? numA - numB : numB - numA;
            });

            ascending = !ascending;
            tbody.innerHTML = '';
            rows.forEach(row => tbody.appendChild(row));
          }
        </script>
      </body></html>`;

    res.send(html);
  } catch (err: unknown) {
    res.status(500).send(
      `<pre>❌ ${(err as Error).message}
(Symbol may be wrong or delisted)</pre>`
    );
  }
});

/* ----------  EXPORT instead of listen() (Vercel) ---------- */
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}

/* ----------  Local dev: listen on port 3000 ---------- */
if (process.env.VERCEL !== "1") {
  app.listen(3000, () => console.log("▶︎ local http://localhost:3000"));
}
