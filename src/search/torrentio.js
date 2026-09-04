'use strict';
// Torrentio (https://torrentio.strem.fun) espone endpoint stream pubblici:
//   GET /stream/:type/:id.json  (stessi ID Cinemeta/IMDb usati da Stremio)
// Risponde { streams: [{ infoHash?, url?, name, title, behaviorHints }] }.
// Li normalizziamo nei nostri item così passano da filtri, sort e formatter.

const DEFAULT_BASE = 'https://torrentio.strem.fun';

function baseOf(cfg) {
  let b = String((cfg && cfg.torrentioUrl) || DEFAULT_BASE).trim().replace(/\/+$/, '');
  // se incollano il link manifest, togli la coda /manifest.json
  b = b.replace(/\/manifest\.json$/i, '');
  return b || DEFAULT_BASE;
}

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
  // Torrentio mette il filename nelle prime righe (spesso con 📁); salta etichette provider
  for (const l of lines) {
    const clean = l.replace(/^[📁📦🏷️]+\s*/, '');
    if (/[._-](mkv|mp4|avi|ts|m4v|webm)\b/i.test(clean) || /\b(2160p|1080p|720p|4k)\b/i.test(clean)) return clean.slice(0, 220);
  }
  return (lines[0] || '').slice(0, 220);
}

async function search(type, fullId, cfg) {
  if (!['movie', 'series'].includes(type) || !fullId) return [];
  const base = baseOf(cfg);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(`${base}/stream/${type}/${encodeURIComponent(fullId)}.json`, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Stremio-ITA-Torrent/3.0)', Accept: 'application/json' }
    });
    if (!r.ok) return [];
    const j = await r.json();
    const streams = (j && j.streams) || [];
    return streams.slice(0, 50).map(s => {
      const text = `${s.name || ''}\n${s.title || ''}`;
      const hash = String(s.infoHash || '').toLowerCase();
      const url = s.url || '';
      return {
        title: firstFileName(s.title) || firstFileName(s.name) || fullId,
        infoHash: /^[a-f0-9]{40}$/.test(hash) ? hash : '',
        magnet: url.startsWith('magnet:') ? url : (hash ? `magnet:?xt=urn:btih:${hash}` : ''),
        url: url && !url.startsWith('magnet:') ? url : '',
        size: bytesFromHuman(/💾\s*([^\n]+)/i.exec(text)?.[1] || ''),
        seeders: Number((/👤\s*(\d+)/.exec(text) || [])[1] || 0),
        indexer: 'Torrentio'
      };
    }).filter(x => x.infoHash || x.magnet || x.url);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

module.exports = { search };
