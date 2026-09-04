'use strict';
// Real-Debrid API: https://api.real-debrid.com/rest/1.0
// Endpoints usati: /torrents/instantAvailability, /torrents/addMagnet, /torrents/info, /torrents/selectFiles, /unrestrict/link

const RD_BASE = 'https://api.real-debrid.com/rest/1.0';

function headers(cfg) {
  return { Authorization: `Bearer ${cfg.realDebridKey}` };
}

function magnetHash(magnet = '') {
  const m = /btih:([a-f0-9]{40})/i.exec(magnet || '');
  return m ? m[1].toLowerCase() : '';
}

// checkCached(hashes, cfg) -> { cached:Set, map:{hash: true} }
async function checkCached(hashes, cfg) {
  const out = { cached: new Set(), map: {} };
  if (!cfg.realDebridKey || cfg.realDebridEnabled === false) return out;
  const uniq = [...new Set((hashes || []).filter(Boolean))].slice(0, 50);
  if (!uniq.length) return out;
  try {
    // RD instantAvailability accetta fino a ~100 hash per chiamata ma con formato /hash1/hash2...
    // Usiamo chunk da 10 per sicurezza.
    for (let i = 0; i < uniq.length; i += 10) {
      const chunk = uniq.slice(i, i + 10);
      const url = `${RD_BASE}/torrents/instantAvailability/${chunk.join('/')}`;
      const r = await fetch(url, { headers: headers(cfg) });
      if (!r.ok) continue;
      const j = await r.json();
      // risposta: { hash: [ {host, ...} ] } oppure [] se nulla
      if (Array.isArray(j)) continue;
      for (const h of chunk) {
        const v = j[h];
        if (Array.isArray(v) && v.length) {
          out.cached.add(h.toLowerCase());
          out.map[h.toLowerCase()] = v;
        }
      }
    }
  } catch (e) {
    console.error('RealDebrid checkcached error', e.message);
  }
  return out;
}

async function unrestrict(magnetOrUrl, cfg) {
  if (!cfg.realDebridKey) return null;
  try {
    // 1. addMagnet
    const form = new URLSearchParams({ magnet: magnetOrUrl });
    let r = await fetch(`${RD_BASE}/torrents/addMagnet`, {
      method: 'POST',
      headers: { ...headers(cfg), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    if (!r.ok) return null;
    const added = await r.json();
    const id = added.id;
    if (!id) return null;
    // 2. info -> seleziona file video più grande
    r = await fetch(`${RD_BASE}/torrents/info/${id}`, { headers: headers(cfg) });
    if (!r.ok) return null;
    const info = await r.json();
    const files = info.files || [];
    let fileIds = 'all';
    if (files.length) {
      const video = files
        .map((f, idx) => ({ ...f, idx: idx + 1 }))
        .filter(f => /\.(mkv|mp4|avi|webm|ts|m4v|mov)$/i.test(f.path || ''))
        .sort((a, b) => (b.bytes || 0) - (a.bytes || 0));
      if (video.length) fileIds = String(video[0].idx);
    }
    await fetch(`${RD_BASE}/torrents/selectFiles/${id}`, {
      method: 'POST',
      headers: { ...headers(cfg), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ files: fileIds }).toString()
    });
    // 3. info di nuovo -> links
    r = await fetch(`${RD_BASE}/torrents/info/${id}`, { headers: headers(cfg) });
    if (!r.ok) return null;
    const info2 = await r.json();
    const link = (info2.links || [])[0];
    if (!link) return null;
    // 4. unrestrict
    r = await fetch(`${RD_BASE}/unrestrict/link`, {
      method: 'POST',
      headers: { ...headers(cfg), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ link }).toString()
    });
    if (!r.ok) return null;
    const un = await r.json();
    return un.download || null;
  } catch (e) {
    console.error('RealDebrid unrestrict error', e.message);
    return null;
  }
}

module.exports = { checkCached, unrestrict, magnetHash, RD_BASE };
