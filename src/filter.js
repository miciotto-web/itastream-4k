'use strict';

const { RES_RANK, parseResolution, parseHdr, parseLangs } = require('./parsing');

function allowedResolutions(cfg) {
  if (Array.isArray(cfg.resolutions) && cfg.resolutions.length) return new Set(cfg.resolutions);
  const order = ['720p', '1080p', '2160p'];
  const minIdx = Math.max(0, order.indexOf(cfg.minResolution));
  return new Set(order.slice(minIdx));
}

function applyFilters(items, cfg) {
  const allowed = allowedResolutions(cfg);
  const excl = new Set(cfg.excludedLangs || []);
  const hdrWanted = new Set(cfg.hdrTypes || []);

  return items.filter(it => {
    const res = parseResolution(it.title);
    if (res === 'unknown' || res === '480p') {
      // 480p/SD scartato sempre (partiamo da 720p come richiesto)
      return false;
    }
    if (!allowed.has(res)) return false;

    if (hdrWanted.size) {
      const hdr = new Set(parseHdr(it.title));
      if (!isHdrMatched(hdr, hdrWanted)) return false;
    }

    if (excl.size) {
      const langs = parseLangs(it.title);
      if (langs.some(l => excl.has(l))) return false;
    }

    // filtro provider (se item ha _provider)
    if (Array.isArray(cfg.providers) && cfg.providers.length && it._provider) {
      if (!cfg.providers.includes(it._provider)) return false;
    }

    return true;
  });
}

function isHdrMatched(present, wanted) {
  if (wanted.has('SDR')) return present.has('SDR');
  const overlap = [...present].filter(h => wanted.has(h));
  if (overlap.length) return true;
  if (present.has('DV') && wanted.has('HDR')) return true;
  if (present.has('HDR10') && wanted.has('HDR')) return true;
  if (present.has('HDR10+') && (wanted.has('HDR10') || wanted.has('HDR'))) return true;
  return false;
}

function sortItems(items, cfg) {
  const mode = cfg.sortMode || 'balanced';
  qualitySort(items, cfg);
  if (mode === 'seeds') {
    const preferred = cfg.preferredLang || 'it';
    items.sort((a, b) => {
      const la = parseLangs(a.title), lb = parseLangs(b.title);
      if (cfg.sortItalianFirst) {
        const ai = la.includes('it') || la.includes('multi') ? 1 : 0;
        const bi = lb.includes('it') || lb.includes('multi') ? 1 : 0;
        if (ai !== bi) return bi - ai;
      }
      const ap = la.includes(preferred) ? 1 : 0, bp = lb.includes(preferred) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return (Number(b.seeders) || 0) - (Number(a.seeders) || 0);
    });
    return items;
  }
  if (mode === 'balanced') return roundRobinByResolution(items);
  return items;
}

// Alterna 4K/1080p/720p così ogni risoluzione è visibile nei primi risultati
function roundRobinByResolution(items) {
  const order = ['2160p', '1080p', '720p', '480p', 'unknown'];
  const groups = new Map(order.map(r => [r, []]));
  for (const it of items) {
    const r = parseResolution(it.title);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(it);
  }
  const active = order.filter(r => (groups.get(r) || []).length);
  for (const [r, g] of groups) {
    if (g.length && !active.includes(r)) active.push(r);
  }
  const out = [];
  let i = 0;
  let added = true;
  while (added) {
    added = false;
    for (const r of active) {
      const g = groups.get(r);
      if (g && i < g.length) { out.push(g[i]); added = true; }
    }
    i++;
  }
  return out;
}

function qualitySort(items, cfg) {
  const hdrRank = { DV: 5, 'HDR10+': 4, HDR10: 3, HDR: 2, HLG: 1, SDR: 0 };
  const preferred = cfg.preferredLang || 'it';

  items.sort((a, b) => {
    const la = parseLangs(a.title), lb = parseLangs(b.title);
    if (cfg.sortItalianFirst) {
      const ai = la.includes('it') || la.includes('multi') ? 1 : 0;
      const bi = lb.includes('it') || lb.includes('multi') ? 1 : 0;
      if (ai !== bi) return bi - ai;
    }
    const ap = la.includes(preferred) ? 1 : 0, bp = lb.includes(preferred) ? 1 : 0;
    if (ap !== bp) return bp - ap;

    const ra = RES_RANK[parseResolution(a.title)] ?? -1;
    const rb = RES_RANK[parseResolution(b.title)] ?? -1;
    if (ra !== rb) return rb - ra;

    const ha = hdrOf(a.title, hdrRank), hb = hdrOf(b.title, hdrRank);
    if (ha !== hb) return hb - ha;

    return (Number(b.seeders) || 0) - (Number(a.seeders) || 0);
  });
  return items;
}

function hdrOf(title, rank) {
  const arr = parseHdr(title);
  return Math.max(...arr.map(h => rank[h] ?? 0));
}

module.exports = { applyFilters, sortItems, allowedResolutions };
