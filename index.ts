import express, { Request, Response } from "express";
import yahooFinance from "yahoo-finance2";

const app = express();

/** Helper: force req.query.symbol → string */
function getSymbol(req: Request): string {
  const q = req.query.symbol;
  // handle ?symbol=AAA&symbol=BBB (array) or missing param
  const raw = Array.isArray(q) ? q[0] : q;
  return (raw ?? "CCL.NS").toString().toUpperCase();
}

app.get("/", async (req: Request, res: Response) => {
  const symbol = getSymbol(req);

  const today = new Date(); // e.g. 2025-05-08
  const yearAgo = new Date(today); // clone
  yearAgo.setFullYear(today.getFullYear() - 2); // 2024-05-08

  try {
    const rows = await yahooFinance.historical(symbol, {
      period1: yearAgo, // ← must be Date or 'YYYY-MM-DD'
      period2: today, //   period2 is optional but explicit is fine
      interval: "1d",
    });

    const table = rows
      .map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        open: r.open,
        close: r.close,
        diff: r.close - r.open,
      }))
      .sort((a, b) => b.diff - a.diff);

    const body = table
      .map(
        (r) =>
          `<tr><td>${r.date}</td><td>${r.open.toFixed(
            2
          )}</td><td>${r.close.toFixed(2)}</td><td>${r.diff.toFixed(
            2
          )}</td></tr>`
      )
      .join("");

    res.send(`<!doctype html>
      <html><head>
        <meta charset="utf-8" />
        <title>${symbol} open–close sorter</title>
        <style>
          body{font-family:sans-serif;padding:1rem}
          table{border-collapse:collapse;margin-top:.8rem}
          td,th{padding:.3rem .6rem;border:1px solid #ccc;text-align:right}
          th{cursor:pointer}
        </style>
      </head><body>
        <h2>${symbol} – biggest close-minus-open moves (last 1 yr)</h2>
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
            const rows = Array.from(tbody.rows);
    
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
      </body></html>`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res
      .status(500)
      .send(`<pre>❌ ${msg}\n(Symbol maybe wrong or delisted)</pre>`);
  }
});

app.listen(3000, () => console.log("server live on 3000"));
