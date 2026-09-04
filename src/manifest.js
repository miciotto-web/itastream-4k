'use strict';

const BASE_MANIFEST = {
  id: 'org.ita.torrentsearch.4k',
  version: '3.0.0',
  name: 'ItaStream 4K',
  description: 'Scraper torrent ITA 🇮🇹 • 720p → 4K • HDR/HDR10/Dolby Vision • TorBox + Real-Debrid via API Key • App esterna/Nuvio.',
  logo: 'https://cdn-icons-png.flaticon.com/512/250/250208.png',
  resources: ['stream'],
  types: ['movie', 'series'],
  idPrefixes: ['tt'],
  catalogs: [],
  behaviorHints: { configurable: true, configurationRequired: false }
};

function manifestFor(cfg, host = '') {
  const lang = String(cfg.preferredLang || 'it').toUpperCase();
  const res = Array.isArray(cfg.resolutions) && cfg.resolutions.length
    ? (cfg.resolutions.includes('2160p') ? (cfg.resolutions.length === 1 ? '4K' : cfg.resolutions.join('+')) : cfg.resolutions.join('+'))
    : (cfg.minResolution || '720p');
  const logo = host ? `${String(host).replace(/\/+$/, '')}/logo.png` : BASE_MANIFEST.logo;
  return { ...BASE_MANIFEST, name: `ItaStream 4K [${lang}|${res}]`, logo };
}

module.exports = { manifestFor, BASE_MANIFEST };
