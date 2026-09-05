'use strict';
// Passthrough generico per addon Stremio upstream già configurati
// (Comet, MediaFusion, Torrentio personale, ...):
//   GET <base>/stream/:type/:id.json  -> item normalizzati

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

function friendlyName(base) {
  let host = '';
  try { host = new URL(base).hostname.toLowerCase(); } catch { return 'Upstream'; }
  if (host.includes('comet')) return 'Comet';
  if (host.includes('mediafusion')) return 'MediaFusion';
  if (host.includes('torrentio')) return 'Torrentio';
  if (host.includes('stremio-italia') || host.startsWith('icv.')) return 'ICV-Torrentio';
  if (host.includes('jackett')) return 'Jackett';
  return host.split('.')[0].replace(/[^a-z0-9-]/gi, '').slice(0, 24) || 'Upstream';
}

function cleanBase(raw) {
  let b = String(raw || '').trim().replace(/\/+$/, '').replace(/\/manifest\.json$/i, '');
  if (!/^https?:\/\//i.test(b)) return '';
  return b;
}

function mapStreams(streams, fullId, label) {
  const out = [];
  for (const s of (streams || []).slice(0, 50)) {
    if (!s || typeof s !== 'object') continue;
    if (s.externalUrl && !s.infoHash && !s.url) continue; // voci non-stream (donazioni, link)
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
      indexer: label
    });
  }
  return out.filter(x => x.infoHash || x.magnet || x.url);
}

async function searchUpstream(base, type, fullId, timeoutMs = 10000) {
  const label = friendlyName(base);
  if (!['movie', 'series'].includes(type) || !fullId) return [];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${base}/stream/${type}/${encodeURIComponent(fullId)}.json`, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Stremio-ITA-Torrent/3.0)', Accept: 'application/json' }
    });
    if (!r.ok) {
      console.log(`[upstream:${label}] HTTP ${r.status}`);
      return [];
    }
    const j = await r.json();
    return mapStreams(j.streams, fullId, label);
  } catch (e) {
    console.log(`[upstream:${label}] errore: ${e.message || e}`);
    return [];
  } finally {
    clearTimeout(t);
  }
}

module.exports = { searchUpstream, mapStreams, cleanBase, friendlyName, bytesFromHuman, firstFileName };
