// plot-nifty.ts

import fs from "fs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import yahooFinance from "yahoo-finance2";

// 1. Canvas size
const width = 800;
const height = 400;

// 2. Chart.js callback
const chartCallback = (ChartJS: any) => {
  /* no-op */
};
const chartCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

async function fetchAndPlot(): Promise<void> {
  const symbol = "^NSEI";

  // 3. Fetch 1m bars for last 5 days using the "chart" endpoint
  const rawResult: any = await yahooFinance.chart(symbol, {
    period: "5d",
    interval: "1m",
  });
  const raw = rawResult.chart.result[0];

  // 4. Build typed bar array
  interface Bar {
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
  }
  const timestamps: number[] = raw.timestamp;
  const quote = raw.indicators.quote[0];
  const bars: Bar[] = timestamps.map((t: number, i: number) => ({
    date: new Date(t * 1000),
    open: quote.open[i],
    high: quote.high[i],
    low: quote.low[i],
    close: quote.close[i],
  }));

  // 5. Filter 09:15–09:19
  const morningBars = bars.filter((b) => {
    const h = b.date.getHours(),
      m = b.date.getMinutes();
    return h === 9 && m >= 15 && m < 20;
  });

  // 6. Prepare Chart.js data
  const labels = morningBars.map(
    (b) =>
      b.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) +
      " " +
      b.date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
  const closes = morningBars.map((b) => b.close);

  const config = {
    type: "line" as const,
    data: {
      labels,
      datasets: [
        {
          label: "Nifty Close (9:15–9:19)",
          data: closes,
          fill: false,
          tension: 0.1,
        },
      ],
    },
    options: {
      scales: {
        x: { title: { display: true, text: "Date & Time" } },
        y: { title: { display: true, text: "Close Price" } },
      },
      plugins: {
        title: {
          display: true,
          text: "Nifty 50 1-Min Closes (Last 5 Days, 9:15–9:19)",
        },
      },
    },
  };

  // 7. Render + Save
  const image = await chartCanvas.renderToBuffer(config);
  fs.writeFileSync("nifty-morning.png", image);
  console.log("✅ Chart saved as nifty-morning.png");
}

fetchAndPlot().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
