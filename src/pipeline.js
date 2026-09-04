'use strict';

const torbox = require('./search/torbox');
const realdebrid = require('./search/realdebrid');
const jackett = require('./search/jackett');
const torrentio = require('./search/torrentio');
const italian = require('./search/italian');

async function getMetaTitle(type, id) {
  const parts = String(id).split(':');
  const imdb = parts[0];
  try {
    const r = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${imdb}.json`);
    if (!r.ok) return { query: imdb, imdb };
    const j = await r.json();
    const m = j.meta || {};
    let q = m.name || imdb;
    // per le serie Cinemeta dà anni tipo "2008–2013": tieni solo il primo anno
    let year = String((m.year || '').match(/^\d{4}/) || '');
    if (year) q += ` ${year}`;
    if (type === 'series' && parts.length >= 3) {
      const s = String(parts[1]).padStart(2, '0');
      const e = String(parts[2]).padStart(2, '0');
      q += ` S${s}E${e}`;
    }
    return { query: q, imdb, name: m.name || imdb, year };
  } catch {
    return { query: imdb, imdb };
  }
}

function withTimeout(promise, ms = 10000, fallback = []) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms))
  ]).catch(() => fallback);
}

function tag(list, provider) {
  return (list || []).map(x => ({ ...x, _provider: provider }));
}

async function searchAll(metaOrQuery, cfg, type = '', fullId = '') {
  const query = typeof metaOrQuery === 'string' ? metaOrQuery : metaOrQuery.query;
  const imdb = typeof metaOrQuery === 'object' ? metaOrQuery.imdb : null;
  const sid = fullId || (typeof metaOrQuery === 'object' ? metaOrQuery.imdb : metaOrQuery) || '';
  // per le serie l'anno nella query testuale aggiunge solo rumore (S01E01 basta):
  // "Breaking Bad 2008 S01E01" -> "Breaking Bad S01E01"
  const textQuery = type === 'series' ? query.replace(/\s+(19|20)\d{2}(?=\s+S\d{1,2}E\d{1,2})/i, '') : query;
  const enabled = new Set(cfg.providers || []);
  const jobs = [];

  // NOTA: TorBox non ha ricerca pubblica per titolo: contribuisce con
  // check cache istantanea (checkAvailability) + streaming (proxy).
  if (enabled.has('torbox') && cfg.torboxKey) {
    console.log('[search] TorBox: solo cache/stream (nessuna ricerca per titolo nelle API pubbliche)');
  }
  if (enabled.has('ilcorsaronero')) {
    jobs.push(withTimeout(italian.searchIlCorsaro(textQuery).then(r => tag(r, 'ilcorsaronero')), 6000));
  }
  if (enabled.has('tntvillage')) {
    jobs.push(withTimeout(italian.searchTNT(textQuery).then(r => tag(r, 'tntvillage')), 6000));
  }
  if (enabled.has('piratebay')) {
    jobs.push(withTimeout(italian.searchPirateBay(textQuery).then(r => tag(r, 'piratebay')), 8000));
  }
  if (enabled.has('knaben')) {
    jobs.push(withTimeout(italian.searchKnaben(textQuery).then(r => tag(r, 'knaben')), 9000));
    // seconda query con "ITA": pesca le release italiane sepolte in basso nel ranking
    if (!/ita/i.test(textQuery)) {
      jobs.push(withTimeout(italian.searchKnaben(`${textQuery} ITA`).then(r => tag(r, 'knaben')), 9000));
    }
  }
  if (enabled.has('solidtorrents')) {
    jobs.push(withTimeout(italian.searchSolidTorrents(textQuery).then(r => tag(r, 'solidtorrents')), 9000));
  }
  // Torrentio: endpoint stream pubblico interrogato con lo stesso ID Stremio (film o S/E).
  // Se l'utente imposta un URL Torrentio personalizzato (con Debrid), i flussi arrivano già pronti.
  if (enabled.has('torrentio') && sid) {
    jobs.push(withTimeout(torrentio.search(type, sid, cfg).then(r => tag(r, 'torrentio')), 10000));
  }
  if (enabled.has('x1337')) {
    jobs.push(withTimeout(italian.search1337x(textQuery).then(r => tag(r, 'x1337')), 8000));
  }
  // EZTV: solo serie TV (l'API ignora la query testuale, filtra solo per imdb_id)
  if (enabled.has('eztv') && type !== 'movie') {
    jobs.push(withTimeout(italian.searchEZTV(textQuery, imdb).then(r => tag(r, 'eztv')), 12000));
  }
  // YTS: solo film
  if (enabled.has('yts') && type !== 'series') {
    jobs.push(withTimeout(italian.searchYTS(query).then(r => tag(r, 'yts')), 8000));
  }
  if (enabled.has('jackett') && cfg.jackettUrl && cfg.jackettKey) {
    jobs.push(withTimeout(jackett.search(textQuery, cfg).then(r => tag(r, 'jackett')), 9000));
  }

  if (!jobs.length) {
    console.log('[search] nessun provider di ricerca attivo (controlla provider + Jackett). Query:', query);
    return [];
  }
  const results = await Promise.all(jobs);
  const flat = results.flat().filter(x => x && (x.magnet || x.url || x.infoHash));
  const byProv = {};
  for (const it of flat) byProv[it._provider || '?'] = (byProv[it._provider || '?'] || 0) + 1;
  console.log(`[search] "${query}" -> ${flat.length} risultati grezzi da ${jobs.length} provider ${JSON.stringify(byProv)}`);
  return flat;
}

// availabilityMap: { hashLower: { torbox: bool, realdebrid: bool } }
async function checkAvailability(items, cfg) {
  const map = {};
  const hashes = [...new Set(items.map(i => (i.infoHash || '').toLowerCase()).filter(h => /^[a-f0-9]{40}$/.test(h)))].slice(0, 40);
  if (!hashes.length) return map;
  const [tb, rd] = await Promise.all([
    (cfg.torboxKey && cfg.debridService !== 'realdebrid')
      ? torbox.checkCached(hashes, cfg).catch(() => ({ cached: new Set() }))
      : { cached: new Set() },
    (cfg.realDebridKey && cfg.debridService !== 'torbox' && cfg.realDebridEnabled !== false)
      ? realdebrid.checkCached(hashes, cfg).catch(() => ({ cached: new Set() }))
      : { cached: new Set() }
  ]);
  for (const h of hashes) {
    map[h] = {
      torbox: !!(tb.cached && tb.cached.has(h)),
      realdebrid: !!(rd.cached && rd.cached.has(h))
    };
  }
  // se richiesto solo cached, filtriamo dopo (lo fa il server)
  return map;
}

module.exports = { getMetaTitle, searchAll, checkAvailability, torbox, realdebrid, jackett, torrentio, italian };
