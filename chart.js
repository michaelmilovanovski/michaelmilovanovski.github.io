// charts.js
// Requires: Chart.js + PapaParse loaded before this file.

async function loadCsv(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV not found: ${url} (${res.status})`);
  const text = await res.text();

  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  if (parsed.errors?.length) {
    console.warn("PapaParse errors:", parsed.errors);
  }
  return parsed.data;
}

function getLabel(row, labelCol, seasonCol) {
  const team = row[labelCol] ?? "";
  const season = seasonCol ? row[seasonCol] : null;
  return season !== null && season !== undefined && season !== ""
    ? `${team} (${season})`
    : `${team}`;
}

async function buildBarWinsLosses(canvas) {
  const csv = canvas.dataset.csv;                 // e.g. "data/worst_records_in_nba_history.csv"
  const labelCol = canvas.dataset.labelCol;       // e.g. "TEAM_NAME"
  const seasonCol = canvas.dataset.seasonCol;     // e.g. "SEASON"
  const winsCol = canvas.dataset.winsCol;         // e.g. "WINS"
  const lossesCol = canvas.dataset.lossesCol;     // e.g. "LOSSES"
  const title = canvas.dataset.title || "";

  const rows = await loadCsv(csv);

  const labels = rows.map(r => getLabel(r, labelCol, seasonCol));
  const wins = rows.map(r => r[winsCol]);
  const losses = rows.map(r => r[lossesCol]);

  new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Wins", data: wins, backgroundColor: "rgba(37, 99, 235, 0.85)" },
        { label: "Losses", data: losses, backgroundColor: "rgba(239, 68, 68, 0.85)" }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        title: { display: !!title, text: title },
        legend: { position: "top" }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Number of Games" } },
        x: { ticks: { maxRotation: 45, minRotation: 30 } }
      }
    }
  });
}

async function buildLine(canvas) {
  const csv = canvas.dataset.csv;           // e.g. "data/avg_price_over_time.csv"
  const xCol = canvas.dataset.xCol;         // e.g. "MONTH"
  const yCol = canvas.dataset.yCol;         // e.g. "AVG_PRICE"
  const title = canvas.dataset.title || "";
  const yLabel = canvas.dataset.yLabel || yCol;

  const rows = await loadCsv(csv);

  const labels = rows.map(r => r[xCol]);
  const y = rows.map(r => r[yCol]);

  new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: yLabel,
          data: y,
          tension: 0.25,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: !!title, text: title },
        legend: { display: true }
      },
      scales: {
        y: { beginAtZero: false }
      }
    }
  });
}

async function buildSimpleBar(canvas) {
  const csv = canvas.dataset.csv;
  const xCol = canvas.dataset.xCol;       // category
  const yCol = canvas.dataset.yCol;       // value
  const title = canvas.dataset.title || "";
  const yLabel = canvas.dataset.yLabel || yCol;

  const rows = await loadCsv(csv);

  const labels = rows.map(r => r[xCol]);
  const y = rows.map(r => r[yCol]);

  new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: yLabel, data: y, backgroundColor: "rgba(37, 99, 235, 0.85)" }]
    },
    options: {
      responsive: true,
      plugins: { title: { display: !!title, text: title }, legend: { position: "top" } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

async function initCharts() {
  // Wins vs Losses (NBA-type)
  document.querySelectorAll("canvas[data-chart='wins-losses']").forEach(async (c) => {
    try { await buildBarWinsLosses(c); } catch (e) { console.error(e); }
  });

  // Simple bar (category vs value)
  document.querySelectorAll("canvas[data-chart='bar']").forEach(async (c) => {
    try { await buildSimpleBar(c); } catch (e) { console.error(e); }
  });

  // Line (time vs value)
  document.querySelectorAll("canvas[data-chart='line']").forEach(async (c) => {
    try { await buildLine(c); } catch (e) { console.error(e); }
  });
}

document.addEventListener("DOMContentLoaded", initCharts);
