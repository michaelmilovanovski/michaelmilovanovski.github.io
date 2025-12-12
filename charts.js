// charts.js
// Requires Chart.js + PapaParse loaded BEFORE this file.

async function loadCsv(url) {
  if (!url) throw new Error("Missing data-csv attribute on canvas.");

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV not found: ${url} (${res.status})`);

  const text = await res.text();
  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  const rows = Array.isArray(parsed.data) ? parsed.data : [];
  return rows.filter(r => r && typeof r === "object" && Object.keys(r).length > 0);
}

function toNumberMaybe(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function applySortLimit(rows, canvas) {
  const sortCol = canvas.dataset.sortCol;
  const sortDir = (canvas.dataset.sortDir || "desc").toLowerCase();
  const limit = parseInt(canvas.dataset.limit || "0", 10);

  let out = rows.slice();

  if (sortCol) {
    out.sort((a, b) => {
      const avRaw = a?.[sortCol];
      const bvRaw = b?.[sortCol];

      if (avRaw === bvRaw) return 0;
      if (avRaw === undefined || avRaw === null || avRaw === "") return 1;
      if (bvRaw === undefined || bvRaw === null || bvRaw === "") return -1;

      const avNum = toNumberMaybe(avRaw);
      const bvNum = toNumberMaybe(bvRaw);

      // numeric sort if both are numbers
      if (avNum !== null && bvNum !== null) {
        return sortDir === "asc" ? avNum - bvNum : bvNum - avNum;
      }

      // otherwise string compare
      const avStr = String(avRaw);
      const bvStr = String(bvRaw);
      return sortDir === "asc"
        ? avStr.localeCompare(bvStr)
        : bvStr.localeCompare(avStr);
    });
  }

  if (limit && limit > 0) out = out.slice(0, limit);
  return out;
}

function labelTeamSeason(row, labelCol, seasonCol) {
  const team = row?.[labelCol];
  const season = seasonCol ? row?.[seasonCol] : null;

  const teamText = team !== undefined && team !== null ? String(team) : "";
  const seasonText =
    season !== null && season !== undefined && season !== "" ? String(season) : "";

  return seasonText ? `${teamText} (${seasonText})` : `${teamText}`;
}

function get2dContext(canvas) {
  if (!canvas) return null;
  // If the canvas is display:none or has 0 size, Chart.js can behave weirdly.
  // Still allow it, but guard missing context.
  const ctx = canvas.getContext && canvas.getContext("2d");
  return ctx || null;
}

function ensureRequired(canvas, keys) {
  const missing = keys.filter(k => !canvas.dataset[k] || canvas.dataset[k].trim?.() === "");
  if (missing.length) {
    throw new Error(
      `Canvas is missing required data-* attributes: ${missing
        .map(k => `data-${k.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}`)
        .join(", ")}`
    );
  }
}

async function buildWinsLosses(canvas) {
  ensureRequired(canvas, ["csv", "labelCol", "winsCol", "lossesCol"]);

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

  const winsColor = canvas.dataset.winsColor || "rgba(34, 197, 94, 0.85)";
  const lossesColor = canvas.dataset.lossesColor || "rgba(239, 68, 68, 0.85)";

  const ctx = get2dContext(canvas);
  if (!ctx) return; // fail silently if no canvas context

  new Chart(ctx, {
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
  ensureRequired(canvas, ["csv", "labelCol", "yCol"]);

  const rowsRaw = await loadCsv(canvas.dataset.csv);
  const rows = applySortLimit(rowsRaw, canvas);

  const labelCol = canvas.dataset.labelCol;
  const seasonCol = canvas.dataset.seasonCol || "";
  const yCol = canvas.dataset.yCol;
  const yLabel = canvas.dataset.yLabel || yCol;
  const title = canvas.dataset.title || "";

  const labels = rows.map(r => labelTeamSeason(r, labelCol, seasonCol || null));
  const vals = rows.map(r => r[yCol]);

  const barColor = canvas.dataset.barColor || "rgba(59, 130, 246, 0.9)";

  const ctx = get2dContext(canvas);
  if (!ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: yLabel, data: vals, backgroundColor: barColor }],
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
    buildWinsLosses(c).catch(err => {
      console.error("wins-losses chart failed:", err);
      console.error("canvas dataset:", c.dataset);
    });
  });

  document.querySelectorAll("canvas[data-chart='bar']").forEach(c => {
    buildBar(c).catch(err => {
      console.error("bar chart failed:", err);
      console.error("canvas dataset:", c.dataset);
    });
  });
});
