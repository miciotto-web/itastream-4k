'use strict';
// TorBox API reale (da https://api.torbox.app/openapi.json):
//   POST multipart /v1/api/torrents/createtorrent   (magnet, seed, allow_zip, name)
//   GET  /v1/api/torrents/checkcached?hash=a,b&format=object
//   GET  /v1/api/torrents/mylist?id=X&bypass_cache=true
//   GET  /v1/api/torrents/requestdl?token=KEY&torrent_id=X&file_id=Y
// NOTA: TorBox NON espone una ricerca pubblica per titolo: la ricerca titoli
// avviene tramite gli altri provider (Jackett, YTS, EZTV, ...), TorBox fornisce
// cache istantanea + streaming Debrid.

const TB_BASE = 'https://api.torbox.app';

function baseOf(cfg) {
  return (cfg.torboxUrl || TB_BASE).replace(/\/+$/, '');
}

function headers(cfg) {
  if (!cfg.torboxKey) return {};
  return { Authorization: `Bearer ${cfg.torboxKey}` };
}

// Ricerca per titolo: NON supportata dalle API pubbliche -> [].
// (Tenuta per compatibilità; la pipeline non la usa più.)
async function search() {
  return [];
}

function hashFromMagnet(magnet = '') {
  const m = /btih:([a-f0-9]{40})/i.exec(magnet || '');
  return m ? m[1].toLowerCase() : '';
}

// checkCached(hashes, cfg) -> { cached:Set(lowerHash), map:{lowerHash: info} }
async function checkCached(hashes, cfg) {
  const out = { cached: new Set(), map: {} };
  if (!cfg.torboxKey) return out;
  const uniq = [...new Set((hashes || []).map(h => String(h || '').toLowerCase()).filter(h => /^[a-f0-9]{40}$/.test(h)))].slice(0, 100);
  if (!uniq.length) return out;
  const base = baseOf(cfg);
  try {
    for (let i = 0; i < uniq.length; i += 50) {
      const chunk = uniq.slice(i, i + 50);
      const url = `${base}/v1/api/torrents/checkcached?hash=${chunk.join(',')}&format=object&list_files=false`;
      const r = await fetch(url, { headers: headers(cfg) });
      if (!r.ok) continue;
      const j = await r.json();
      const data = j.data;
      if (Array.isArray(data)) {
        for (const e of data) {
          const h = String((e && (e.hash || e.infohash)) || '').toLowerCase();
          if (h && e && (e.cached !== false)) { out.cached.add(h); out.map[h] = e; }
        }
      } else if (data && typeof data === 'object') {
        for (const h of chunk) {
          const v = data[h];
          if (v && v.hash) { out.cached.add(h); out.map[h] = v; }
        }
      }
    }
  } catch (e) {
    console.error('TorBox checkcached error:', e.message);
  }
  return out;
}

// Crea il torrent sull'account -> { torrent_id, ... } oppure null
async function createTorrent(magnet, cfg, name = '') {
  if (!cfg.torboxKey || !magnet) return null;
  const base = baseOf(cfg);
  try {
    const form = new FormData();
    form.append('magnet', magnet);
    form.append('seed', '1');
    form.append('allow_zip', 'false');
    if (name) form.append('name', String(name).slice(0, 200));
    const r = await fetch(`${base}/v1/api/torrents/createtorrent`, {
      method: 'POST',
      headers: headers(cfg),
      body: form
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) {
      console.error('TorBox create error:', (j.detail || j.error || r.status));
      return null;
    }
    return j.data || null;
  } catch (e) {
    console.error('TorBox create error:', e.message);
    return null;
  }
}

// Dettaglio torrent (file disponibili) oppure null
async function getTorrent(torrentId, cfg) {
  if (!cfg.torboxKey || !torrentId) return null;
  const base = baseOf(cfg);
  try {
    const r = await fetch(`${base}/v1/api/torrents/mylist?id=${torrentId}&bypass_cache=true`, { headers: headers(cfg) });
    if (!r.ok) return null;
    const j = await r.json();
    const d = j.data;
    if (Array.isArray(d)) return d[0] || null;
    return d || null;
  } catch (e) {
    console.error('TorBox mylist error:', e.message);
    return null;
  }
}

// Link di download diretto per un file -> URL oppure null
async function requestDownloadLink(torrentId, fileId, cfg) {
  if (!cfg.torboxKey || !torrentId) return null;
  const base = baseOf(cfg);
  try {
    let url = `${base}/v1/api/torrents/requestdl?token=${encodeURIComponent(cfg.torboxKey)}&torrent_id=${torrentId}`;
    if (fileId !== undefined && fileId !== null && fileId !== '') url += `&file_id=${encodeURIComponent(fileId)}`;
    const r = await fetch(url, { headers: headers(cfg) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) {
      console.error('TorBox requestdl error:', (j.detail || j.error || r.status));
      return null;
    }
    if (typeof j.data === 'string') return j.data;
    if (j.data && typeof j.data === 'object') return j.data.url || j.data.link || j.data.download || null;
    return null;
  } catch (e) {
    console.error('TorBox requestdl error:', e.message);
    return null;
  }
}

const sleep = ms => new Promise(res => setTimeout(res, ms));

function pickVideoFile(info) {
  const files = (info && info.files) || [];
  if (!Array.isArray(files) || !files.length) return null;
  const video = files.filter(f => /\.(mkv|mp4|avi|webm|ts|m4v|mov)$/i.test(String((f && (f.name || f.short_name)) || '')));
  const pool = video.length ? video : files;
  pool.sort((a, b) => (Number(b.size) || 0) - (Number(a.size) || 0));
  return pool[0];
}

// Flusso completo magnet -> URL streaming (attende i metadati fino a ~12s)
async function magnetToStream(magnet, cfg, name = '') {
  const created = await createTorrent(magnet, cfg, name);
  const torrentId = created && (created.torrent_id || created.id);
  if (!torrentId) return null;
  for (let i = 0; i < 6; i++) {
    const info = await getTorrent(torrentId, cfg);
    const file = pickVideoFile(info);
    if (info && file) {
      const link = await requestDownloadLink(torrentId, file.id, cfg);
      if (link) return link;
      return null;
    }
    const state = info && (info.download_state || info.state);
    if (state && /error|failed/i.test(state)) return null;
    await sleep(2000);
  }
  return null;
}

module.exports = {
  search,
  hashFromMagnet,
  checkCached,
  createTorrent,
  getTorrent,
  requestDownloadLink,
  magnetToStream
};
