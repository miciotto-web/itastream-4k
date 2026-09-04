'use strict';

async function search(query, cfg) {
  if (!cfg.jackettUrl || !cfg.jackettKey) return [];
  const base = cfg.jackettUrl.replace(/\/+$/, '');
  const url = `${base}/api/v2.0/indexers/all/results/torznab/?apikey=${encodeURIComponent(cfg.jackettKey)}&t=search&q=${encodeURIComponent(query)}`;
  try {
    const r = await fetch(url, { headers: { Accept: 'application/xml', 'User-Agent': 'Stremio-ITA-Torrent/2.0' } });
    if (!r.ok) return [];
    return parseTorznab(await r.text());
  } catch (e) {
    console.error('Jackett error', e.message);
    return [];
  }
}

function parseTorznab(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const get = (tag) => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const f = re.exec(block);
      return f ? f[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
    };
    const title = get('title');
    const link = get('link');
    if (!title) continue;

    let infoHash = '';
    const ihRe = /<torznab:attr[^>]*name="infohash"[^>]*value="([^"]*)"/i;
    const ihf = ihRe.exec(block);
    if (ihf) infoHash = ihf[1].toLowerCase();
    if (!infoHash && link) {
      const btih = /btih:([a-f0-9]{40})/i.exec(link);
      if (btih) infoHash = btih[1].toLowerCase();
    }

    const seedRe = /<torznab:attr[^>]*name="seeders"[^>]*value="([^"]*)"/i;
    const sf = seedRe.exec(block);
    const sizeRe = /<torznab:attr[^>]*name="size"[^>]*value="([^"]*)"/i;
    const sif = sizeRe.exec(block);

    items.push({
      title,
      infoHash,
      magnet: link && link.startsWith('magnet:') ? link : null,
      url: link,
      size: sif ? Number(sif[1]) : 0,
      seeders: sf ? Number(sf[1]) : 0,
      indexer: (['jackettindexer', 'prowlarrindexer'].map(t => {
        const re = new RegExp(`<torznab:attr[^>]*name="${t}"[^>]*value="([^"]*)"`, 'i');
        const f = re.exec(block);
        return f ? f[1] : '';
      }).find(Boolean)) || 'Jackett'
    });
  }
  return items;
}

module.exports = { search, parseTorznab };