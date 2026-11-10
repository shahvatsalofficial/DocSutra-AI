// Strict config validation: unknown keys and wrong types fail loudly (exit 2) instead of being silently ignored.
const KEYS = new Set(['schemaVersion', 'ignore', 'maxFiles', 'maxBytes', 'ignoreRules', 'cliContracts', 'failOn']);
export function validateConfig(cfg) {
  const bad = m => { throw new Error(`Invalid docsutra config: ${m}`); };
  if (cfg === null || typeof cfg !== 'object' || Array.isArray(cfg)) bad('top level must be an object');
  for (const k of Object.keys(cfg)) if (!KEYS.has(k)) bad(`unknown key '${k}' (allowed: ${[...KEYS].join(', ')})`);
  for (const k of ['ignore', 'ignoreRules']) if (cfg[k] !== undefined && !(Array.isArray(cfg[k]) && cfg[k].every(x => typeof x === 'string'))) bad(`'${k}' must be an array of strings`);
  for (const k of ['maxFiles', 'maxBytes']) if (cfg[k] !== undefined && !(Number.isInteger(cfg[k]) && cfg[k] > 0)) bad(`'${k}' must be a positive integer`);
  if (cfg.failOn !== undefined && !['error', 'warning', 'none'].includes(cfg.failOn)) bad("'failOn' must be error, warning or none");
  if (cfg.cliContracts !== undefined) {
    if (typeof cfg.cliContracts !== 'object' || cfg.cliContracts === null || Array.isArray(cfg.cliContracts)) bad("'cliContracts' must be an object");
    for (const [bin, c] of Object.entries(cfg.cliContracts)) {
      if (typeof c !== 'object' || c === null) bad(`cliContracts.${bin} must be an object`);
      for (const k of ['subcommands', 'flags']) if (c[k] !== undefined && !(Array.isArray(c[k]) && c[k].every(x => typeof x === 'string'))) bad(`cliContracts.${bin}.${k} must be an array of strings`);
    }
  }
  return cfg;
}
