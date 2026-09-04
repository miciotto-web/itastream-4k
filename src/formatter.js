'use strict';
// Formattazione risultati stile foto:
//   name (riga bold in Stremio): "2160p TB Instant" / "2160p RD Instant" / "1080p Torrent"
//   title (dettaglio):
//     📦 filename
//     📁 filename (compatibilità con vecchie UI)
//     💾 size
//     🎧 bandiere lingua
//     🎞️ badges qualità (4K, HDR, DV, codec...)
//     🔗 provider 👥 seeds (+ 🟢 Cached se disponibile)

const { parseResolution, parseHdr, parseLangs, parseCodec, formatSize, RES_LABEL, langFlag } = require('./parsing');

const HDR_BADGE = { DV: 'DV', 'HDR10+': 'HDR10+', HDR10: 'HDR10', HDR: 'HDR', HLG: 'HLG' };
let jobSeq = 0;
const jobs = new Map();

function registerJob(cfg, item) {
  const id = 'j' + (++jobSeq) + Date.now().toString(36);
  jobs.set(id, { cfg, item });
  setTimeout(() => jobs.delete(id), 10 * 60 * 1000);
  return id;
}

function getJob(id) {
  return jobs.get(id);
}

function flagsFor(langs) {
  const out = [];
  if (langs.includes('it')) out.push('🇮🇹');
  if (langs.includes('multi')) out.push('🌐');
  if (langs.includes('en')) out.push('🇬🇧');
  if (langs.includes('fr')) out.push('🇫🇷');
  if (langs.includes('de')) out.push('🇩🇪');
  if (langs.includes('es')) out.push('🇪🇸');
  if (!out.length) {
    if (langs.includes('unknown')) out.push('🌐');
    else out.push(...langs.map(l => langFlag(l)));
  }
  return out.join(' ');
}

function buildStream(cfg, item, availability) {
  const res = parseResolution(item.title);
  const resLabel = RES_LABEL[res] || res || 'N/A';
  const hdrArr = parseHdr(item.title);
  const codec = parseCodec(item.title);
  const langs = parseLangs(item.title);
  const size = formatSize(item.size);
  const seeders = Number(item.seeders) || 0;
  const indexer = item.indexer || item._provider || 'Torrent';

  const badges = [];
  if (res === '2160p') badges.push('4K');
  else if (resLabel !== 'N/A') badges.push(String(resLabel).toUpperCase());
  for (const h of hdrArr) {
    if (HDR_BADGE[h]) badges.push(HDR_BADGE[h]);
  }
  if (badges.length === 1 && hdrArr.includes('SDR')) badges.push('SDR');
  if (codec) badges.push(codec);
  if (langs.includes('it')) badges.push('ITA');
  else if (langs.includes('multi')) badges.push('MULTI');

  const isCachedTB = availability && availability.torbox;
  const isCachedRD = availability && availability.realdebrid;
  const instant = isCachedTB || isCachedRD;
  const tag = isCachedTB && isCachedRD ? 'TB+RD Instant'
    : isCachedTB ? 'TB Instant'
    : isCachedRD ? 'RD Instant'
    : (cfg.torboxKey || cfg.realDebridKey) ? 'Debrid' : 'Torrent';

  // name = riga principale (come nella foto)
  const name = `${resLabel} ${tag}`;
  // title = dettaglio multipagina
  const titleLines = [
    `📦 ${item.title}`,
    ``,
    `📁 ${item.title}`,
    `💾 ${size}`,
    `🎧 ${flagsFor(langs)}`,
    `🎞️ ${badges.join(' | ')}`,
    `🔗 ${indexer} 👥 ${seeders}${instant ? '  🟢 Cached' : ''}`
  ];
  const title = titleLines.join('\n');

  const s = {
    name: name.slice(0, 100),
    title,
    behaviorHints: {
      bingeGroup: `ita-${res}-${hdrArr.join('.')}-${langs.join('.')}`,
      notWebReady: true
    }
  };

  // Modalità "app esterna" (Nuvio / TorBox Instant integrato nell'app):
  // stream diretti con infoHash, nessuna chiave nell'addon, nessun proxy.
  // L'app risolve cache + streaming con la SUA chiave: risultati più veloci.
  const external = cfg.debridService === 'external' || (!cfg.torboxKey && !cfg.realDebridKey);

  if (item.infoHash && /^[a-f0-9]{40}$/i.test(item.infoHash)) s.infoHash = item.infoHash.toLowerCase();
  if (item.magnet && !external) s.url = item.magnet;
  else if (item.url && !item.magnet && !external) s.url = item.url;

  // Se c'è una chiave Debrid (e non siamo in modalità app esterna),
  // instrada tramite proxy unrestrict (on-demand)
  const useDebrid = !external && (
    (cfg.debridService === 'torbox' && cfg.torboxKey) ||
    (cfg.debridService === 'realdebrid' && cfg.realDebridKey) ||
    (cfg.debridService === 'auto' && (cfg.torboxKey || cfg.realDebridKey))
  );
  if (useDebrid && item.infoHash) {
    const jobId = registerJob(cfg, item);
    s.url = `${cfg.baseHost}/${cfg.cfgId}/tb/${jobId}`;
    delete s.infoHash;
  }

  return s;
}

function toStreams(items, cfg, cfgId, availabilityMap, baseHost) {
  const max = Math.min(cfg.maxResults || 20, 50);
  const out = [];
  const seen = new Set();
  for (const it of items) {
    if (out.length >= max) break;
    const key = (it.infoHash || it.magnet || it.title || '').toLowerCase();
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    const h = (it.infoHash || '').toLowerCase();
    const availability = h && availabilityMap ? (availabilityMap[h] || null) : null;
    const fullCfg = { ...cfg, cfgId, baseHost };
    out.push(buildStream(fullCfg, it, availability));
  }
  return out;
}

module.exports = { toStreams, getJob, buildStream };
