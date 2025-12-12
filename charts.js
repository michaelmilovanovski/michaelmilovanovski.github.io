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

