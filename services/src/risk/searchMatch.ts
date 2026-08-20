export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/₮/g, "t")
    .replace(/[^a-z0-9]/g, "");
}

function aliasesMatch(label: string, needle: string): boolean {
  if (needle === "okb" || needle === "wokb") {
    return label === "okb" || label === "wokb";
  }
  if (needle === "usdt" || needle === "usdt0") {
    return label === "usdt" || label === "usdt0";
  }
  return false;
}

/** Higher is a closer name/symbol match. Zero means the token is unrelated. */
export function searchLabelScore(
  query: string,
  symbol?: string,
  name?: string,
): number {
  const needle = normalizeSearch(query);
  if (needle.length < 2) return 0;
  let score = 0;
  const sym = normalizeSearch(symbol ?? "");
  const nam = normalizeSearch(name ?? "");
  if (sym) {
    if (sym === needle || aliasesMatch(sym, needle)) score += 100;
    else if (sym.startsWith(needle)) score += 60;
    else if (sym.includes(needle)) score += 30;
  }
  if (nam) {
    if (nam === needle || aliasesMatch(nam, needle)) score += 80;
    else if (nam.startsWith(needle)) score += 40;
    else if (nam.includes(needle)) score += 20;
  }
  return score;
}
