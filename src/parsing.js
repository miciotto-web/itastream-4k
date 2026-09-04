'use strict';

const RES_RANK = { '480p': 0, '720p': 1, '1080p': 2, '2160p': 3 };
const RES_LABEL = { '480p': '480p', '720p': '720p', '1080p': '1080p', '2160p': '4K' };

function parseResolution(title = '') {
  const t = title.toLowerCase();
  if (/(2160p|4k\b|uhd)/.test(t)) return '2160p';
  if (/(1080p|1080i|full.?hd)/.test(t)) return '1080p';
  if (/(720p|720i)/.test(t)) return '720p';
  if (/(480p|480i|dvd.?rip|hdtv)/.test(t)) return '480p';
  return 'unknown';
}

function parseHdr(title = '') {
  const t = title.toLowerCase();
  const out = [];
  if (/(dolby.?vision|\b\dov[i|.|\s]\d|\bdv\b(?!.*hdr))/.test(t)) out.push('DV');
  if (/hdr10\+|\bhdr\s*10\s*\+/.test(t)) out.push('HDR10+');
  else if (/hdr\s*10\b|\bhdr10\b/.test(t)) out.push('HDR10');
  if (/\bhlg\b/.test(t)) out.push('HLG');
  if (/10.?bit|hdr|\buhd\b/.test(t) && !out.some(h => h.startsWith('HDR'))) out.push('HDR');
  if (out.length === 0) out.push('SDR');
  return out;
}

function parseLangs(title = '') {
  const t = title.toLowerCase();
  const langs = new Set();
  if (/\bita(?:lian)?\b|doppiaggio|sub.?ita/.test(t)) langs.add('it');
  if (/sub.?it(?:a|lian)?\b|\bita.?sub\b/.test(t)) { langs.add('it'); }
  if (/\beng\b|\benglish\b|sub.?eng/.test(t)) langs.add('en');
  if (/\bmulti\b/u.test(t)) { langs.add('multi'); }
  if (/\bvff\b|french/.test(t)) langs.add('fr');
  if (/\bgerman\b|german\./.test(t)) langs.add('de');
  if (/\bspanish\b|\besp\b/.test(t)) langs.add('es');
  if (!langs.size) return ['unknown'];
  return [...langs];
}

function parseCodec(title = '') {
  const t = title.toLowerCase();
  if (/hevc|x265|h\.?265/.test(t)) return 'HEVC';
  if (/av1/.test(t)) return 'AV1';
  if (/x264|h\.?264|avc/.test(t)) return 'x264';
  return '';
}

function hasLanguage(title, lang) {
  // true solo se la lingua richiesta è presente e non contraddetta
  const langs = parseLangs(title);
  if (langs.includes(lang)) return true;
  // "IT EN" stesso film con lingue separate: IT presente ma l'audio preferito potrebbe essere ENG
  if (lang === 'it' && /it.*(truehd|eac|dts|ac3)/i.test(title)) return true;
  return false;
}

function formatSize(bytes) {
  if (!bytes || !Number.isFinite(Number(bytes))) return 'ignota';
  const b = Number(bytes);
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB';
  if (b >= 1e6) return Math.round(b / 1e6) + ' MB';
  return Math.round(b / 1e3) + ' KB';
}

function langFlag(lang) {
  switch (lang) {
    case 'it': return '🇮🇹 ITA';
    case 'en': return '🇬🇧 ENG';
    case 'multi': return '🌐 MULTI';
    case 'fr': return '🇫🇷 FRA';
    case 'de': return '🇩🇪 DEU';
    case 'es': return '🇪🇸 ESP';
    default: return '🌐 ' + String(lang).toUpperCase();
  }
}

module.exports = {
  RES_RANK,
  RES_LABEL,
  parseResolution,
  parseHdr,
  parseLangs,
  parseCodec,
  hasLanguage,
  formatSize,
  langFlag
};