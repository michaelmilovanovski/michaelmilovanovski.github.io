// charts.js
// Requires Chart.js + PapaParse loaded before this file.

async function loadCsv(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV not found: ${url} (${res.status})`);
  const text = await res.text();

  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  return parsed.data.filter(r => Object.keys(r).length > 0);
}

function applySortLimit(rows, canvas) {
  const sortCol = canvas.dataset.sortCol;
  const sortDir = (canvas.dataset.sortDir || "desc").toLowerCase();
  const limit = parseInt(canvas.dataset.limit || "0", 10);

  let out = rows.slice();

  if (sortCol) {
    out.sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }

  if (limit && limit > 0) out = out.slice(0, limit);
  return out;
}

function labelTeamSeason(row, labelCol, seasonCol) {
  const team = row[labelCol];
  const season = seasonCol ? row[seasonCol] : null;
  return season !== null && season !== undefined && season !== ""
    ? `${team} (${season})`
    : `${team}`;
}

async function buildWinsLosses(canvas) {
  const rowsRaw = await loadCsv(canvas.dataset.csv);
  const rows = applySortLimit(rowsRaw, canvas);

  const labelCol = canvas.dataset.labelCol;
  const seasonCol = canvas.dataset.seasonCol || "";
  const winsCol = canvas.dataset.winsCol;
  const lossesCol = canvas.dataset.lossesCol;

  const winsLabel = canvas.dataset.winsLabel || "Wins";
  const lossesLabel = canvas.dataset.lossesLabel || "Losses";
  const title = canvas.dataset.title || "";

  const labels = rows.map(r => labelTeamSeason(r, labelCol, seasonCol || null));
  const wins = rows.map(r => r[winsCol]);
  const losses = rows.map(r => r[lossesCol]);

  // ✅ define colors OUTSIDE the chart config object
  const winsColor   = canvas.dataset.winsColor   || "rgba(34, 197, 94, 0.85)";  // green
  const lossesColor = canvas.dataset.lossesColor || "rgba(239, 68, 68, 0.85)"; // red

  new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: winsLabel, data: wins, backgroundColor: winsColor },
        { label: lossesLabel, data: losses, backgroundColor: lossesColor },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        title: { display: !!title, text: title },
        legend: { position: "top" },
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Number of Games" } },
        x: { ticks: { maxRotation: 45, minRotation: 30 } },
      },
    },
  });
}


async function buildBar(canvas) {
  const rowsRaw = await loadCsv(canvas.dataset.csv);
  const rows = applySortLimit(rowsRaw, canvas);

  const labelCol = canvas.dataset.labelCol;
  const seasonCol = canvas.dataset.seasonCol || "";
  const yCol = canvas.dataset.yCol;
  const yLabel = canvas.dataset.yLabel || yCol;
  const title = canvas.dataset.title || "";

  const labels = rows.map(r => labelTeamSeason(r, labelCol, seasonCol || null));
  const vals = rows.map(r => r[yCol]);

  new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      const barColor = canvas.dataset.barColor || "rgba(59, 130, 246, 0.9)"; // blue
datasets: [
  { label: yLabel, data: vals, backgroundColor: barColor },
],
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: !!title, text: title },
        legend: { position: "top" },
      },
      scales: {
        y: { beginAtZero: true },
        x: { ticks: { maxRotation: 45, minRotation: 30 } },
      },
    },
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("canvas[data-chart='wins-losses']").forEach(c => {
    buildWinsLosses(c).catch(console.error);
  });

  document.querySelectorAll("canvas[data-chart='bar']").forEach(c => {
    buildBar(c).catch(console.error);
  });
});

