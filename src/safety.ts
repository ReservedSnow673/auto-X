/**
 * Lightweight keyword/heuristic filter so we skip posts that are likely
 * political, hostile, NSFW, or otherwise high-risk for short casual replies.
 */

const BLOCKED_PATTERNS: RegExp[] = [
  /\b(trump|biden|harris|maga|democrat|republican|liberal|conservative)\b/i,
  /\b(israel|palestine|gaza|hamas|idf|ukraine|putin|zelensky)\b/i,
  /\b(genocide|terrorist|nazi|fascist|racist|white.?suprem)\b/i,
  /\b(kill yourself|kys|rape|molest|pedophil|groomer)\b/i,
  /\b(nigg|faggot|retard)\b/i,
  /\b(onlyfans|porn|nsfw|xxx|sex tape)\b/i,
  /\b(crypto.?pump|guaranteed.?returns|double your money)\b/i,
  /\b(shooting|mass.?shoot|bomb.?threat)\b/i,
];

export type SafetyResult =
  | { ok: true }
  | { ok: false; reason: string };

export function assessPostSafety(input: {
  text: string;
  authorHandle?: string;
}): SafetyResult {
  const text = input.text.trim();
  if (!text) {
    return { ok: false, reason: "empty_text" };
  }

  if (text.length < 12) {
    return { ok: false, reason: "too_short" };
  }

  if (text.length > 600) {
    return { ok: false, reason: "too_long" };
  }

  // Heavy link / promo dumps
  const urlCount = (text.match(/https?:\/\//g) ?? []).length;
  if (urlCount >= 3) {
    return { ok: false, reason: "too_many_links" };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, reason: `blocked_pattern:${pattern.source}` };
    }
  }

  // All-caps shouting
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 20) {
    const upper = letters.replace(/[^A-Z]/g, "").length;
    if (upper / letters.length > 0.7) {
      return { ok: false, reason: "shouting" };
    }
  }

  return { ok: true };
}

export function sanitizeReply(reply: string): string {
  return reply
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}
