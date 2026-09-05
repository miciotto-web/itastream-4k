'use strict';
// Torrentio: due mirror pubblici. Si provano in parallelo e si usa il primo
// che risponde — cosi' il mirror lento (icv) non blocca i risultati.
const MIRRORS = [
  'https://icv.stremio-italia.eu/language=italian|qualityfilter=cam,unknown,720p,480p,other,scr,threed|debridoptions=nocatalog,nodownloadlinks|torbox=',
  'https://torrentio.strem.fun',
];

function bytesFromHuman(str = '') {
  const m = /([\d.,]+)\s*(TB|GB|MB|KB)/i.exec(String(str));
  if (!m) return 0;
  const n = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toUpperCase();
  const k = u === 'TB' ? 1e12 : u === 'GB' ? 1e9 : u === 'MB' ? 1e6 : 1e3;
  return Math.round(n * k);
}

function firstFileName(multiline = '') {
  const lines = String(multiline || '').split('\n').map(l => l.trim()).filter(Boolean);
  for (const l of lines) {
    const clean = l.replace(/^[📁📦🏷️]+\s*/, '');
    if (/[._-](mkv|mp4|avi|ts|m4v|webm)\b/i.test(clean) || /\b(2160p|1080p|720p|4k)\b/i.test(clean)) return clean.slice(0, 220);
  }
  return (lines[0] || '').slice(0, 220);
}

// Se l'utente ha fornito un URL esplicito nella config (backward compat), usiamolo.
function resolveBase(cfg) {
  if (cfg && cfg.torrentioUrl) {
    let b = String(cfg.torrentioUrl).trim().replace(/\/+$/, '');
    return b.replace(/\/manifest\.json$/i, '') || MIRRORS[0];
  }
  return null;
}

async function fetchOne(base, type, fullId) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 14000);
  try {
    const url = base + `/stream/${type}/${encodeURIComponent(fullId)}.json`;
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Stremio-ITA-Torrent/3.0)', Accept: 'application/json' }
    });
    if (!r.ok) return null;
    const j = await r.json();
    const streams = (j && j.streams) || [];
    const out = [];
    for (const s of streams.slice(0, 50)) {
      const text = `${s.name || ''}\n${s.title || ''}`;
      const hash = String(s.infoHash || '').toLowerCase();
      const url = s.url || '';
      out.push({
        title: firstFileName(s.title) || firstFileName(s.name) || fullId,
        infoHash: /^[a-f0-9]{40}$/.test(hash) ? hash : '',
        magnet: url.startsWith('magnet:') ? url : (hash ? `magnet:?xt=urn:btih:${hash}` : ''),
        url: url && !url.startsWith('magnet:') ? url : '',
        size: bytesFromHuman(/💾\s*([^\n]+)/i.exec(text)?.[1] || ''),
        seeders: Number((/👤\s*(\d+)/.exec(text) || [])[1] || 0),
        indexer: 'Torrentio'
      });
    }
    return out.filter(x => x.infoHash || x.magnet || x.url);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function search(type, fullId, cfg) {
  if (!['movie', 'series'].includes(type) || !fullId) return [];
  const explicitBase = resolveBase(cfg);
  if (explicitBase) {
    const out = await fetchOne(explicitBase, type, fullId);
    if (out) return out;
    console.log('[torrentio] URL esplicito non raggiungibile');
    return [];
  }
  // mirror automatici: prova tutti in parallelo, usa il primo che risponde
  const results = await Promise.all(MIRRORS.map(b => fetchOne(b, type, fullId)));
  for (const out of results) {
    if (out && out.length) return out;
  }
  console.log('[torrentio] nessun mirror raggiungibile');
  return [];
}

module.exports = { search };
