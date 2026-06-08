/** ExerciseDB 이름 매칭 (CSV 로컬 검색용) */

function norm(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** searchHint 우선, 없으면 nameEn 기준 최적 후보 */
function pickBestMatch(nameEn, searchHint, catalogRows) {
  const query = norm(searchHint || nameEn);
  const words = query.split(' ').filter(Boolean);
  if (words.length === 0) return null;

  let best = null;
  let bestScore = -1;

  for (const row of catalogRows) {
    const name = norm(row.name);
    if (!name) continue;

    const matchedWords = words.filter((w) => name.includes(w)).length;
    const exactBonus = name === query ? 200 : name.includes(query) ? 80 : 0;
    const prefixBonus = name.startsWith(query) ? 30 : 0;
    const score = matchedWords * 15 + exactBonus + prefixBonus - name.length * 0.01;

    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  // 최소 2단어 이상 매칭 또는 exact/include 보너스
  if (!best) return null;
  const name = norm(best.name);
  const matchedWords = words.filter((w) => name.includes(w)).length;
  const ok = name === query || name.includes(query) || matchedWords >= Math.min(2, words.length);
  return ok ? best : null;
}

module.exports = { norm, pickBestMatch };
