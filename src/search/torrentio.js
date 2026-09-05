'use strict';
// Provider Torrentio integrato: due mirror pubblici provati in parallelo,
// si usa il primo che risponde. Se l'utente imposta un URL esplicito
// (cfg.torrentioUrl, es. Torrentio personale con Debrid) si usa quello.
const { searchUpstream, cleanBase } = require('./upstream');

const MIRRORS = [
  'https://icv.stremio-italia.eu/language=italian|qualityfilter=cam,unknown,720p,480p,other,scr,threed|debridoptions=nocatalog,nodownloadlinks|torbox=',
  'https://torrentio.strem.fun',
];

function resolveBases(cfg) {
  const explicit = cleanBase(cfg && cfg.torrentioUrl);
  if (explicit) return [explicit];
  return MIRRORS;
}

async function search(type, fullId, cfg) {
  if (!['movie', 'series'].includes(type) || !fullId) return [];
  const bases = resolveBases(cfg);
  if (bases.length === 1) {
    return searchUpstream(bases[0], type, fullId, 14000);
  }
  const results = await Promise.all(bases.map(b => searchUpstream(b, type, fullId, 14000)));
  for (const out of results) {
    if (out && out.length) {
      return out.map(x => ({ ...x, indexer: 'Torrentio' }));
    }
  }
  console.log('[torrentio] nessun mirror raggiungibile');
  return [];
}

module.exports = { search, MIRRORS };
