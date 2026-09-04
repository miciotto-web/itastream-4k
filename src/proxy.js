'use strict';

const torbox = require('./search/torbox');

// Risolve un job (magnet/infoHash) in URL riproducibile via Debrid e fa redirect.
async function serve(job, res) {
  if (!job || !job.cfg) return res.status(400).json({ error: 'job scaduto' });
  const { cfg } = job;
  const item = job.item || {};
  const magnet = item.magnet || item.url || '';
  const service = cfg.debridService || 'auto';

  const tryTorbox = (service === 'torbox' || service === 'auto') && cfg.torboxKey && magnet;
  const tryRD = (service === 'realdebrid' || service === 'auto') && cfg.realDebridKey && magnet;

  // 1) TorBox: create -> mylist -> requestdl
  if (tryTorbox) {
    try {
      const url = await torbox.magnetToStream(magnet, cfg, item.title || '');
      if (url) return res.redirect(302, url);
    } catch (e) {
      console.error('proxy torbox error:', e.message);
    }
  }

  // 2) Real-Debrid: addMagnet -> selectFiles -> unrestrict
  if (tryRD) {
    try {
      const realdebrid = require('./search/realdebrid');
      const url = await realdebrid.unrestrict(magnet, cfg);
      if (url) return res.redirect(302, url);
    } catch (e) {
      console.error('proxy RD error:', e.message);
    }
  }

  // 3) Fallback: magnet diretto (Stremio lo apre con un client esterno)
  if (magnet && magnet.startsWith('magnet:')) {
    return res.redirect(302, magnet);
  }
  return res.status(502).json({ error: 'Impossibile generare lo stream Debrid (controlla API Key e log server)' });
}

module.exports = { serve };
