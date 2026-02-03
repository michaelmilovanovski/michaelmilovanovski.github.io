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

// Simple bar chart with custom colors per bar
async function buildSimpleBar(canvas) {
  ensureRequired(canvas, ["csv", "labelCol", "yCol"]);

  const rowsRaw = await loadCsv(canvas.dataset.csv);
  const rows = applySortLimit(rowsRaw, canvas);

  const labelCol = canvas.dataset.labelCol;
  const yCol = canvas.dataset.yCol;
  const yLabel = canvas.dataset.yLabel || yCol;
  const title = canvas.dataset.title || "";
  const colorsRaw = canvas.dataset.colors ? canvas.dataset.colors.split(";") : ["#3498db"];
  const colors = colorsRaw.map(c => c.trim());
  const yAxisLabel = canvas.dataset.yAxisLabel || "";

  const labels = rows.map(r => r[labelCol]);
  const vals = rows.map(r => r[yCol]);
  const bgColors = labels.map((_, i) => colors[i % colors.length]);

  const ctx = get2dContext(canvas);
  if (!ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: yLabel,
        data: vals,
        backgroundColor: bgColors,
        borderColor: "#333",
        borderWidth: 1
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: { display: !!title, text: title, font: { size: 16, weight: "bold" } },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.parsed.y.toLocaleString()}${canvas.dataset.yUnit || ""}`
          }
        }
      },
      scales: {
        y: { beginAtZero: true, title: { display: !!yAxisLabel, text: yAxisLabel } },
        x: { ticks: { maxRotation: 45, minRotation: 0 } },
      },
    },
  });
}

// Model comparison grouped bar chart
async function buildModelComparison(canvas) {
  ensureRequired(canvas, ["csv"]);

  const rows = await loadCsv(canvas.dataset.csv);
  const title = canvas.dataset.title || "";

  const models = rows.map(r => r.MODEL);
  const metrics = ["ACCURACY", "PRECISION", "RECALL", "F1_SCORE", "ROC_AUC"];
  const metricLabels = ["Accuracy", "Precision", "Recall", "F1-Score", "ROC-AUC"];
  const colors = ["#3498db", "#2ecc71", "#e74c3c"];

  const datasets = models.map((model, i) => ({
    label: model,
    data: metrics.map(m => rows[i][m]),
    backgroundColor: colors[i % colors.length],
    borderColor: colors[i % colors.length],
    borderWidth: 1
  }));

  const ctx = get2dContext(canvas);
  if (!ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: metricLabels,
      datasets
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        title: { display: !!title, text: title, font: { size: 16, weight: "bold" } },
        legend: {
          position: "bottom",
          labels: { padding: 20, usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(3)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 1,
          title: { display: true, text: "Score" },
          ticks: { callback: (v) => v.toFixed(1) }
        },
        x: { ticks: { maxRotation: 45, minRotation: 0 } },
      },
    },
  });
}

// ROC Curves line chart
async function buildRocCurves(canvas) {
  ensureRequired(canvas, ["csv"]);

  const rows = await loadCsv(canvas.dataset.csv);
  const title = canvas.dataset.title || "";

  const colors = ["#3498db", "#2ecc71", "#e74c3c"];
  const modelNames = ["Logistic Regression (AUC=0.842)", "Random Forest (AUC=0.839)", "XGBoost (AUC=0.841)"];
  const tprCols = ["TPR_LR", "TPR_RF", "TPR_XGB"];

  const datasets = tprCols.map((col, i) => ({
    label: modelNames[i],
    data: rows.map(r => ({ x: r.FPR, y: r[col] })),
    borderColor: colors[i],
    backgroundColor: colors[i] + "33",
    borderWidth: 3,
    fill: false,
    tension: 0.4,
    pointRadius: 4,
    pointHoverRadius: 8,
    pointBackgroundColor: colors[i],
    pointBorderColor: "#fff",
    pointBorderWidth: 2
  }));

  // Add diagonal reference line
  datasets.push({
    label: "Random Classifier",
    data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    borderColor: "#999",
    borderDash: [8, 4],
    borderWidth: 2,
    fill: false,
    pointRadius: 0,
    pointHoverRadius: 0
  });

  const ctx = get2dContext(canvas);
  if (!ctx) return;

  new Chart(ctx, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.2,
      interaction: {
        mode: "nearest",
        intersect: false
      },
      plugins: {
        title: { display: !!title, text: title, font: { size: 16, weight: "bold" } },
        legend: {
          position: "bottom",
          labels: { padding: 20, usePointStyle: true, pointStyle: "circle" }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: TPR=${ctx.parsed.y.toFixed(3)} at FPR=${ctx.parsed.x.toFixed(3)}`
          }
        }
      },
      scales: {
        x: {
          type: "linear",
          min: 0, max: 1,
          title: { display: true, text: "False Positive Rate", font: { size: 12 } },
          ticks: { stepSize: 0.2 },
          grid: { color: "rgba(0,0,0,0.1)" }
        },
        y: {
          min: 0, max: 1,
          title: { display: true, text: "True Positive Rate", font: { size: 12 } },
          ticks: { stepSize: 0.2 },
          grid: { color: "rgba(0,0,0,0.1)" }
        },
      },
    },
  });
}

// Horizontal bar chart for feature importance
async function buildHorizontalBar(canvas) {
  ensureRequired(canvas, ["csv", "labelCol", "yCol"]);

  const rowsRaw = await loadCsv(canvas.dataset.csv);
  const rows = applySortLimit(rowsRaw, canvas);

  const labelCol = canvas.dataset.labelCol;
  const yCol = canvas.dataset.yCol;
  const title = canvas.dataset.title || "";

  const labels = rows.map(r => r[labelCol]);
  const vals = rows.map(r => r[yCol]);

  // Generate gradient colors from purple to green
  const colorScale = labels.map((_, i) => {
    const ratio = i / Math.max(labels.length - 1, 1);
    const r = Math.round(142 - ratio * 100);
    const g = Math.round(68 + ratio * 136);
    const b = Math.round(173 - ratio * 80);
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
  });

  const borderColors = labels.map((_, i) => {
    const ratio = i / Math.max(labels.length - 1, 1);
    const r = Math.round(142 - ratio * 100);
    const g = Math.round(68 + ratio * 136);
    const b = Math.round(173 - ratio * 80);
    return `rgba(${r}, ${g}, ${b}, 1)`;
  });

  const ctx = get2dContext(canvas);
  if (!ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Importance",
        data: vals,
        backgroundColor: colorScale,
        borderColor: borderColors,
        borderWidth: 2
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        title: { display: !!title, text: title, font: { size: 16, weight: "bold" } },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Importance: ${ctx.parsed.x.toFixed(3)}`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: "Importance" },
          grid: { color: "rgba(0,0,0,0.1)" }
        },
        y: {
          ticks: { font: { size: 11 } },
          grid: { display: false }
        },
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

  document.querySelectorAll("canvas[data-chart='simple-bar']").forEach(c => {
    buildSimpleBar(c).catch(err => {
      console.error("simple-bar chart failed:", err);
      console.error("canvas dataset:", c.dataset);
    });
  });

  document.querySelectorAll("canvas[data-chart='model-comparison']").forEach(c => {
    buildModelComparison(c).catch(err => {
      console.error("model-comparison chart failed:", err);
      console.error("canvas dataset:", c.dataset);
    });
  });

  document.querySelectorAll("canvas[data-chart='roc-curves']").forEach(c => {
    buildRocCurves(c).catch(err => {
      console.error("roc-curves chart failed:", err);
      console.error("canvas dataset:", c.dataset);
    });
  });

  document.querySelectorAll("canvas[data-chart='horizontal-bar']").forEach(c => {
    buildHorizontalBar(c).catch(err => {
      console.error("horizontal-bar chart failed:", err);
      console.error("canvas dataset:", c.dataset);
    });
  });
});
