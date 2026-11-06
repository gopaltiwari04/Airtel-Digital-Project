/**
 * Token-based string similarity utility for fuzzy KYC matching.
 * Implements token sort ratio and Levenshtein similarity without native C++ deps.
 */

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

export function stringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();
  if (s1 === s2) return 100;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 100;
  const dist = levenshteinDistance(s1, s2);
  return Math.round(((maxLen - dist) / maxLen) * 1000) / 10;
}

export function tokenSortRatio(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const cleanTokens = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(" ");

  const s1 = cleanTokens(str1);
  const s2 = cleanTokens(str2);
  return stringSimilarity(s1, s2);
}
