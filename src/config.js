'use strict';

const DEFAULTS = {
  preferredLang: 'it',
  excludedLangs: [],
  sortItalianFirst: true,
  sortMode: 'balanced', // balanced (mix 4K/1080p/720p) | quality (qualità max) | seeds (più seeders)
  // risoluzioni ammesse (multi-selezione). Default: 720p -> 4K tutte
  resolutions: ['720p', '1080p', '2160p'],
  minResolution: '720p',
  // tipi 4K / dinamica: [] = tutti
  hdrTypes: [],
  maxResults: 20,
  // Debrid
  torboxUrl: 'https://api.torbox.app',
  torboxKey: '',
  torboxSearchEnabled: true,
  torboxCachedOnly: false,
  realDebridKey: '',
  realDebridEnabled: true,
  realDebridCachedOnly: false,
  debridService: 'auto', // auto | torbox | realdebrid | none | external (Nuvio/app esterna: infoHash diretti, nessuna key)
  // Sorgenti generiche
  jackettUrl: '',
  jackettKey: '',
  // Provider torrent selezionati (id). [] = tutti
  providers: ['torbox', 'torrentio', 'knaben', 'solidtorrents', 'ilcorsaronero', 'tntvillage', 'piratebay', 'x1337', 'eztv', 'yts', 'jackett'],
  _v: 4 // NOTA: se lo aumenti, aggiorna anche il _v hardcoded in src/configpage.js
};

const RESOLUTIONS = ['720p', '1080p', '2160p'];
const RES_LABELS = { '720p': '720p', '1080p': '1080p', '2160p': '4K (2160p)' };
const LANGUAGES = ['it', 'en', 'fr', 'de', 'es', 'multi'];
const LANG_LABELS = {
  it: '🇮🇹 Italiano',
  en: '🇬🇧 Inglese',
  fr: '🇫🇷 Francese',
  de: '🇩🇪 Tedesco',
  es: '🇪🇸 Spagnolo',
  multi: '🌐 Multi'
};
const HDR_TYPES = ['DV', 'HDR10+', 'HDR10', 'HDR', 'HLG', 'SDR'];
const HDR_LABELS = {
  DV: '✨ Dolby Vision',
  'HDR10+': 'HDR10+',
  HDR10: 'HDR10',
  HDR: 'HDR',
  HLG: 'HLG',
  SDR: 'SDR'
};

const PROVIDERS = [
  { id: 'torbox', name: 'TorBox Debrid', flag: '⚡', desc: 'Cache istantanea + streaming (la ricerca titoli usa gli altri provider)', italian: true },
  { id: 'realdebrid', name: 'Real-Debrid Cache', flag: '🟣', desc: 'Check cache RD + unrestrict via API Key', italian: false },
  { id: 'torrentio', name: 'Torrentio', flag: '🌊', desc: 'Flussi Torrentio (EN + ITA/MULTI dove presenti)', italian: false },
  { id: 'knaben', name: 'Knaben (multi-tracker)', flag: '🌐', desc: 'Aggregatore senza chiavi, include release ITA', italian: true },
  { id: 'solidtorrents', name: 'SolidTorrents', flag: '🧱', desc: 'Meta-motore senza chiavi, include ITA', italian: false },
  { id: 'ilcorsaronero', name: 'Il Corsaro Nero / Viola', flag: '🏴‍☠️', desc: 'Principale indexer ITA (film + serie)', italian: true },
  { id: 'tntvillage', name: 'TNT Village', flag: '📺', desc: 'Storico catalogo italiano (via Jackett)', italian: true },
  { id: 'piratebay', name: 'The Pirate Bay ITA', flag: '🏴', desc: 'Filtro automatico titoli ITA/MULTI', italian: false },
  { id: 'x1337', name: '1337x', flag: '🔎', desc: 'Mirror 1337x con filtro ITA', italian: false },
  { id: 'eztv', name: 'EZTV (serie TV)', flag: '📡', desc: 'Serie TV, filtro ITA dove presente', italian: false },
  { id: 'yts', name: 'YTS (film)', flag: '🎬', desc: 'Film 720p/1080p/2160p', italian: false },
  { id: 'jackett', name: 'Jackett / Prowlarr', flag: '🧲', desc: 'I tuoi indexer custom (consigliato per ITA)', italian: true }
];
const PROVIDER_IDS = PROVIDERS.map(p => p.id);

function defaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULTS));
}

function encodeConfig(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeConfig(str) {
  try {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return JSON.parse(Buffer.from(s, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function normalize(raw) {
  const base = defaultConfig();
  if (!raw || typeof raw !== 'object') return base;
  const cfg = { ...base, ...raw };
  if (!LANGUAGES.includes(cfg.preferredLang)) cfg.preferredLang = 'it';
  if (!Array.isArray(cfg.excludedLangs)) cfg.excludedLangs = [];
  cfg.excludedLangs = cfg.excludedLangs.filter(l => LANGUAGES.includes(l));
  // retro-compatibilità: minResolution -> resolutions
  if (!Array.isArray(cfg.resolutions) || !cfg.resolutions.length) {
    const order = ['720p', '1080p', '2160p'];
    const minIdx = order.indexOf(cfg.minResolution);
    cfg.resolutions = minIdx >= 0 ? order.slice(minIdx) : [...order];
  }
  cfg.resolutions = [...new Set(cfg.resolutions)].filter(r => RESOLUTIONS.includes(r));
  if (!cfg.resolutions.length) cfg.resolutions = [...RESOLUTIONS];
  if (!RESOLUTIONS.includes(cfg.minResolution)) {
    cfg.minResolution = cfg.resolutions.includes('720p') ? '720p' : cfg.resolutions[0];
  }
  if (!Array.isArray(cfg.hdrTypes)) cfg.hdrTypes = [];
  cfg.hdrTypes = cfg.hdrTypes.filter(h => HDR_TYPES.includes(h));
  cfg.torboxUrl = String(cfg.torboxUrl || base.torboxUrl).replace(/\/+$/, '');
  cfg.torboxKey = String(cfg.torboxKey || '').trim();
  cfg.realDebridKey = String(cfg.realDebridKey || cfg.rdKey || '').trim();
  delete cfg.rdKey;
  cfg.maxResults = Math.max(1, Math.min(50, Number(cfg.maxResults) || base.maxResults));
  cfg.torboxSearchEnabled = !!cfg.torboxSearchEnabled;
  cfg.torboxCachedOnly = !!cfg.torboxCachedOnly;
  cfg.realDebridEnabled = cfg.realDebridEnabled !== false;
  cfg.realDebridCachedOnly = !!cfg.realDebridCachedOnly;
  if (!['auto', 'torbox', 'realdebrid', 'none', 'external'].includes(cfg.debridService)) cfg.debridService = 'auto';
  cfg.sortItalianFirst = cfg.sortItalianFirst !== false;
  if (!['balanced', 'quality', 'seeds'].includes(cfg.sortMode)) cfg.sortMode = 'balanced';
  cfg.jackettUrl = String(cfg.jackettUrl || '').trim().replace(/\/+$/, '');
  cfg.jackettKey = String(cfg.jackettKey || '').trim();
  if (!Array.isArray(cfg.providers) || !cfg.providers.length) cfg.providers = [...PROVIDER_IDS];
  cfg.providers = [...new Set(cfg.providers)].filter(p => PROVIDER_IDS.includes(p));
  if (!cfg.providers.length) cfg.providers = [...PROVIDER_IDS];
  // migrazione: le config salvate prima di Knaben/Torrentio/SolidTorrents li ricevono in automatico
  if ((!raw._v || raw._v < 2) && !cfg.providers.includes('knaben')) cfg.providers.unshift('knaben');
  if ((!raw._v || raw._v < 3) && !cfg.providers.includes('torrentio')) cfg.providers.unshift('torrentio');
  if ((!raw._v || raw._v < 4) && !cfg.providers.includes('solidtorrents')) cfg.providers.unshift('solidtorrents');
  cfg._v = 4;
  return cfg;
}

function resolveConfig(param) {
  return normalize(decodeConfig(param));
}

module.exports = {
  DEFAULTS,
  RESOLUTIONS,
  RES_LABELS,
  LANGUAGES,
  LANG_LABELS,
  HDR_TYPES,
  HDR_LABELS,
  PROVIDERS,
  PROVIDER_IDS,
  defaultConfig,
  encodeConfig,
  decodeConfig,
  normalize,
  resolveConfig
};
