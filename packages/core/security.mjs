// Credential patterns: high-precision formats only. Matches are redacted before they reach any report.
const PATTERNS = [
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/g],
  ['npm-token', /\bnpm_[A-Za-z0-9]{30,}\b/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['slack-token', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g],
  ['stripe-key', /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g],
  ['google-api-key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['openai-style-key', /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,}\b/g],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY(?: BLOCK)?-----/g],
];
export function findSecrets(text) {
  const hits = [];
  for (const [type, re] of PATTERNS) for (const m of text.matchAll(re)) hits.push({ type, index: m.index, length: m[0].length });
  return hits;
}
export function redact(text) {
  let out = text;
  for (const [type, re] of PATTERNS) out = out.replace(re, `[REDACTED:${type}]`);
  return out;
}
export const excerpt = (line, max = 160) => {
  const r = redact(line.trim());
  return r.length > max ? r.slice(0, max - 1) + '…' : r;
};
