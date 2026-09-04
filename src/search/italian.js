'use strict';
// Provider torrent ITA + internazionali, senza dipendenze extra.
// Tutti ritornano item normalizzati: { title, infoHash, magnet, size, seeders, indexer }

function hashFromMagnet(magnet = '') {
  const m = /btih:([a-f0-9]{40})/i.exec(magnet || '');
  return m ? m[1].toLowerCase() : '';
}

function sizeToBytes(str = '') {
  const m = /([\d.,]+)\s*(GB|MB|KB|TB|GIB|MIB)/i.exec(String(str));
  if (!m) return 0;
  const n = parseFloat(m[1].replace(',', '.'));
  const u = m[2].toUpperCase();
  const k = u.startsWith('TB') ? 1e12 : u.startsWith('GB') || u.startsWith('GIB') ? 1e9 : u.startsWith('MB') || u.startsWith('MIB') ? 1e6 : 1e3;
  return Math.round(n * k);
}

async function fetchText(url, timeoutMs = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Stremio-ITA-Torrent/3.0)', Accept: 'text/html,application/json,*/*' }
    });
    if (!r.ok) return '';
    return await r.text();
  } catch {
    return '';
  } finally {
    clearTimeout(t);
  }
}

// ---------- Il Corsaro Nero (best-effort HTML) ----------
async function searchIlCorsaro(query) {
  // Dominio che cambia spesso: proviamo i mirror noti in sequenza
  const mirrors = [
    'https://ilcorsaronero.pro',
    'https://ilcorsaronero.link',
    'https://ilcorsaroviola.pro'
  ];
  for (const base of mirrors) {
    try {
      const html = await fetchText(`${base}/argomen/${encodeURIComponent(query)}`);
      if (!html || html.length < 2000) continue;
      const items = parseIlCorsaro(html);
      if (items.length) return items;
    } catch { /* prossimo mirror */ }
  }
  return [];
}

function parseIlCorsaro(html) {
  const out = [];
  // righe tabella con magnet
  const rowRe = /<tr[\s\S]*?<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) && out.length < 30) {
    const row = m[0];
    const mag = /magnet:\?[^"'\s<>]+/i.exec(row);
    if (!mag) continue;
    const titleM = /<a[^>]*>([^<>]{6,180})<\/a>/i.exec(row);
    const title = titleM ? titleM[1].trim() : mag[0].slice(0, 80);
    const sizeM = /(\d[\d.,]*\s*(?:GB|MB|KB|TB))/i.exec(row);
    const seedM = /<td[^>]*class="[^"]*s[^"]*"[^>]*>(\d+)</i.exec(row);
    out.push({
      title,
      infoHash: hashFromMagnet(mag[0]),
      magnet: mag[0],
      size: sizeToBytes(sizeM ? sizeM[1] : ''),
      seeders: seedM ? Number(seedM[1]) : 0,
      indexer: 'IlCorsaroNero'
    });
  }
  return out;
}

// ---------- TNT Village (via tabella / tabella mirror, best-effort) ----------
async function searchTNT(query) {
  // TNT Village ufficiale è chiuso; i mirror cambiano. Ritorniamo vuoto se non raggiungibile:
  // la via consigliata resta Jackett con indexer TNTVillage.
  // Teniamo comunque un tentativo su mirror comunitario.
  try {
    const html = await fetchText(`https://tntvillage.scambioetico.org/src/releases.php?s=${encodeURIComponent(query)}`);
    if (!html) return [];
    const out = [];
    const magRe = /magnet:\?[^"'\s<>]+/gi;
    let m;
    while ((m = magRe.exec(html)) && out.length < 20) {
      out.push({
        title: `${query} TNTVillage release`,
        infoHash: hashFromMagnet(m[0]),
        magnet: m[0],
        size: 0,
        seeders: 0,
        indexer: 'TNTVillage'
      });
    }
    return out;
  } catch {
    return [];
  }
}

// ---------- ThePirateBay via apibay.org ----------
async function searchPirateBay(query) {
  try {
    const txt = await fetchText(`https://apibay.org/q.php?q=${encodeURIComponent(query)}&cat=0`);
    if (!txt) return [];
    const j = JSON.parse(txt);
    if (!Array.isArray(j)) return [];
    return j.slice(0, 30).map(r => ({
      title: r.name || query,
      infoHash: String(r.info_hash || '').toLowerCase(),
      magnet: `magnet:?xt=urn:btih:${r.info_hash}&dn=${encodeURIComponent(r.name || query)}`,
      size: Number(r.size || 0),
      seeders: Number(r.seeders || 0),
      indexer: 'PirateBay'
    })).filter(x => x.infoHash.length === 40);
  } catch {
    return [];
  }
}

// ---------- 1337x (best-effort: search page + parse) ----------
async function search1337x(query) {
  try {
    const html = await fetchText(`https://1337x.to/search/${encodeURIComponent(query)}/1/`);
    if (!html) return [];
    const out = [];
    const re = /<a href="(\/torrent\/\d+\/[^"]+?\/)">([^<>]{6,180})<\/a>[\s\S]{0,400}?<td[^>]*class="coll-2[^"]*"[^>]*>([^<]*)<\/td>[\s\S]{0,400}?<td[^>]*class="coll-4[^"]*"[^>]*>([^<]*)</gi;
    let m;
    while ((m = re.exec(html)) && out.length < 20) {
      out.push({
        title: m[2].trim(),
        infoHash: '',
        magnet: '',
        url1337: `https://1337x.to${m[1]}`,
        size: sizeToBytes(m[3] || ''),
        seeders: parseInt(m[4] || '0', 10) || 0,
        indexer: '1337x'
      });
    }
    // prova a risolvere i magnet delle prime voci (max 5 per velocità)
    for (const it of out.slice(0, 5)) {
      try {
        const page = await fetchText(it.url1337, 7000);
        const mag = /magnet:\?[^"'\s<>]+/i.exec(page || '');
        if (mag) {
          it.magnet = mag[0];
          it.infoHash = hashFromMagnet(mag[0]);
        }
      } catch { /* ignora */ }
      delete it.url1337;
    }
    return out.filter(x => x.magnet || x.title);
  } catch {
    return [];
  }
}

// ---------- EZTV (serie TV, API ufficiale: filtra SOLO per imdb_id) ----------
async function searchEZTV(query, imdbId) {
  try {
    const num = String(imdbId || '').replace(/^tt/i, ''); // EZTV vuole gli zeri: "0903747", non "903747"
    let url;
    if (/^\d+$/.test(num)) {
      url = `https://eztvx.to/api/get-torrents?limit=30&imdb_id=${num}`;
    } else {
      return []; // senza imdb numerico l'API restituirebbe gli ultimi torrent a caso
    }
    const txt = await fetchText(url.replace('limit=30', 'limit=100'));
    if (!txt) return [];
    const j = JSON.parse(txt);
    let list = j.torrents || [];
    // tieni solo l'episodio cercato (S01E01); ripiega sulla stagione (S01), mai su episodi a caso
    const ep = /S(\d{1,2})E(\d{1,2})/i.exec(query || '');
    if (ep) {
      const s = String(Number(ep[1])), e = String(Number(ep[2]));
      const reEp = new RegExp(`S0?${s}E0?${e}\\b`, 'i');
      const reSe = new RegExp(`\\bS0?${s}\\b`, 'i');
      const titleOf = t => String(t.title || t.filename || '');
      const exact = list.filter(t => reEp.test(titleOf(t)));
      list = exact.length ? exact : list.filter(t => reSe.test(titleOf(t)));
    }
    return list.slice(0, 30).map(t => ({
      title: t.title || t.filename || query,
      infoHash: String(t.hash || '').toLowerCase(),
      magnet: t.magnet_url || (t.hash ? `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(t.title || query)}` : ''),
      size: Number(t.size_bytes || 0),
      seeders: Number(t.seeds || 0),
      indexer: 'EZTV'
    })).filter(x => x.magnet);
  } catch {
    return [];
  }
}

// ---------- YTS (film, API ufficiale, con fallback mirror) ----------
const YTS_MIRRORS = ['https://yts.lt', 'https://yts.am', 'https://yts.mx'];
async function searchYTS(query) {
  for (const base of YTS_MIRRORS) {
    try {
      const txt = await fetchText(`${base}/api/v2/list_movies.json?limit=20&query_term=${encodeURIComponent(query)}`);
      if (!txt) continue;
      const j = JSON.parse(txt);
      const movies = ((j.data || {}).movies || []);
      if (!movies.length) continue;
      const out = [];
      for (const mv of movies.slice(0, 10)) {
        for (const t of (mv.torrents || [])) {
          if (!t.hash) continue;
          out.push({
            title: `${mv.title} ${mv.year} ${t.quality} ${t.type} ${t.video_codec} ${t.audio_channels} YTS`,
            infoHash: String(t.hash || '').toLowerCase(),
            magnet: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(mv.title + ' ' + t.quality)}&tr=udp://tracker.opentrackr.org:1337/announce`,
            size: Number(t.size_bytes || 0),
            seeders: Number(t.seeds || 0),
            indexer: 'YTS'
          });
        }
      }
      if (out.length) return out;
    } catch {
      continue;
    }
  }
  return [];
}

// ---------- Knaben (aggregatore multi-tracker, API pubblica senza chiavi) ----------
// POST https://api.knaben.org/v1 {search_field, query, order_by, order_direction, from, size}
async function searchKnaben(query) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    let j;
    try {
      const r = await fetch('https://api.knaben.org/v1', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Stremio-ITA-Torrent/3.0)' },
        body: JSON.stringify({
          search_field: 'title',
          query,
          order_by: 'seeders',
          order_direction: 'desc',
          from: 0,
          size: 50,
          hide_unsafe: true,
          hide_xxx: false
        })
      });
      if (!r.ok) return [];
      j = await r.json();
    } finally {
      clearTimeout(t);
    }
    const hits = (j && j.hits) || [];
    return hits.slice(0, 50).map(h => {
      const magnet = h.magnetUrl || h.link || '';
      return {
        title: h.title || query,
        infoHash: hashFromMagnet(magnet),
        magnet: magnet && magnet.startsWith('magnet:') ? magnet : '',
        size: Number(h.bytes || 0),
        seeders: Number(h.seeders || 0),
        indexer: 'Knaben'
      };
    }).filter(x => x.magnet);
  } catch {
    return [];
  }
}

module.exports = {
  searchIlCorsaro,
  searchTNT,
  searchPirateBay,
  search1337x,
  searchEZTV,
  searchYTS,
  searchKnaben
};
